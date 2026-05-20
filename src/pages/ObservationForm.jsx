import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, Toast } from '../components/ui';
import { Save, CheckCircle, AlertCircle, Edit3, Trash2, X, PlusCircle, User, Target, ClipboardList, Zap, ArrowLeft, Award, Heart, Settings } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui';
import { useSync } from '../contexts/SyncContext';
import { cacheMetadata, getCachedMetadata, getQueue, withTimeout, findCachedObservation } from '../lib/offlineStore';

const evaluationOptions = [
  { value: 'Atende plenamente', label: 'Atende plenamente' },
  { value: 'Atende parcialmente', label: 'Atende parcialmente' },
  { value: 'Não atende', label: 'Não atende' },
  { value: 'Não observado', label: 'Não observado' }
];

const scores = [4, 3, 2, 1];

const rubrics = {
  planejamento: {
    4: "4 – Excelente: Aula claramente alinhada às habilidades da BNCC, aos referenciais da rede e à progressão das aprendizagens.",
    3: "3 – Adequado: Aula alinhada à BNCC e aos referenciais da rede, com objetivos claros, ainda que pouco contextualizados.",
    2: "2 – Em Desenvolvimento: Alinhamento parcial à BNCC e referenciais ou objetivos pouco claros.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de alinhamento ao planejamento, referenciais ou à BNCC."
  },
  metodologia: {
    4: "4 – Excelente: Metodologias diversificadas, ativas e adequadas à faixa etária, promovendo protagonismo e engajamento. Recursos utilizados de forma intencional.",
    3: "3 – Adequado: Estratégias adequadas, com participação dos alunos, ainda que pouco diversificadas.",
    2: "2 – Em Desenvolvimento: Metodologias pouco variadas ou centradas no professor. Uso pouco intencional de recursos.",
    1: "1 – Necessita de Acompanhamento: Estratégias inadequadas ou inexistentes. Não utiliza recursos ou utiliza de forma inadequada."
  },
  avaliacao: {
    4: "4 – Excelente: Avaliação formativa presente, com feedbacks claros e critérios alinhados aos objetivos.",
    3: "3 – Adequado: Avaliação coerente, com feedbacks pontuais.",
    2: "2 – Em Desenvolvimento: Avaliação pouco clara ou desalinhada aos objetivos.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de avaliação durante a aula."
  },
  gestao: {
    4: "4 – Excelente: Excelente organização do tempo, espaço e condução da turma, com clima positivo de aprendizagem. Relação respeitosa e acolhedora.",
    3: "3 – Adequado: Boa organização e condução da turma. Relação respeitosa.",
    2: "2 – Em Desenvolvimento: Dificuldades pontuais na gestão da sala. Relação pouco acolhedora.",
    1: "1 – Necessita de Acompanhamento: Gestão inadequada do tempo ou da turma. Relação inadequada ou desrespeitosa."
  },
  identidade: {
    4: "4 – Excelente: Valores cristãos integrados de forma natural, ética e coerente com a proposta adventista.",
    3: "3 – Adequado: Valores presentes de forma pontual e adequada.",
    2: "2 – Em Desenvolvimento: Valores pouco evidenciados na prática pedagógica.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de integração dos valores institucionais."
  }
};

const initialFormState = {
  visit_date: '',
  teacher_id: '',
  subject_id: '',
  series_id: '',
  visit_type: '',
  visit_type_other: '',
  visit_objectives: [],
  visit_objectives_other: '',
  
  planning_evaluation: '', plan_alignment_score: null, plan_content_score: null, plan_objectives_score: null, plan_references_score: null, planning_observations: '',
  methodology_evaluation: '', meth_adequate_score: null, meth_strategies_score: null, meth_resources_score: null, meth_clarity_score: null, methodology_observations: '',
  learning_evaluation: '', learn_instruments_score: null, learn_formative_score: null, learn_feedback_score: null, learn_criteria_score: null, learning_observations: '',
  management_evaluation: '', man_space_score: null, man_respect_score: null, man_conflict_score: null, man_environment_score: null, man_material_score: null, man_content_score: null, man_activities_score: null, man_monitoring_score: null, management_observations: '',
  identity_evaluation: '', ident_values_score: null, ident_posture_score: null, ident_language_score: null, identity_observations: '',
  
  strong_points: '', improvement_opportunities: '', observation_synthesis: '', pedagogical_guidelines: '', forwarding: '', teacher_aware: false,
  
  revisit_date_1: '',
  revisit_date_2: '',
  scores_v2: {},
  scores_v3: {},
  evaluations_v2: {},
  evaluations_v3: {},
  comments_v2: {},
  comments_v3: {}
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ObservationForm() {
  const { selectedSchoolId, selectedBimestre } = useSchool();
  const { isOnline, addToOfflineQueue } = useSync();
  const { id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // States for Tabs and Visits
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState(1);
  const [dbVisitCount, setDbVisitCount] = useState(1);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [lastId, setLastId] = useState(id);
  const [toast, setToast] = useState(null);

  // Scroll to top on mount or id change
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [id]);

  // Navigation Guard & Form Reset
  useEffect(() => {
    if (!id) {
      setFormData(initialFormState);
      setIsDirty(false);
      setDbVisitCount(1);
      setActiveTab(1);
      setLastId(null);
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, visit_date: localDate }));
    } else {
      setLastId(id);
    }
  }, [id]);

  const confirmExit = () => {
    setIsDirty(false);
    setShowExitModal(false);
    navigate('/');
  };

  const cancelExit = () => setShowExitModal(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load Metadata
  useEffect(() => {
    if (!selectedSchoolId) return;
    async function loadData() {
      let tList = [];
      let sList = [];
      let subList = [];
      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        const [tRes, sRes, subRes] = await withTimeout(Promise.all([
          supabase.from('teachers').select('*, teacher_series(series_id), teacher_subjects(subject_id)').eq('school_id', selectedSchoolId).order('name'),
          supabase.from('series').select('id, name, segment_id, segments!inner(name)').eq('school_id', selectedSchoolId).order('name'),
          supabase.from('subjects').select('id, name, segment_subjects(segment_id)').eq('school_id', selectedSchoolId).order('name')
        ]), 2000);

        if (tRes.error || sRes.error || subRes.error) {
          throw new Error('Supabase metadata fetch error');
        }

        tList = tRes.data || [];
        sList = sRes.data || [];
        subList = subRes.data || [];

        // Cache the metadata for this school ID
        await cacheMetadata(`teachers_${selectedSchoolId}`, tList);
        await cacheMetadata(`series_${selectedSchoolId}`, sList);
        await cacheMetadata(`subjects_${selectedSchoolId}`, subList);
      } catch (fetchError) {
        console.warn('Failed to fetch observation form metadata from Supabase, loading from cache:', fetchError);
        const cachedT = await getCachedMetadata(`teachers_${selectedSchoolId}`);
        const cachedS = await getCachedMetadata(`series_${selectedSchoolId}`);
        const cachedSub = await getCachedMetadata(`subjects_${selectedSchoolId}`);

        if (cachedT) tList = cachedT;
        if (cachedS) sList = cachedS;
        if (cachedSub) subList = cachedSub;
      }
      setTeachers(tList);
      setSeriesList(sList);
      setSubjects(subList);
    }
    loadData();
  }, [selectedSchoolId]);

  // Fetch Observation
  useEffect(() => {
    if (!id) return;
    async function fetchObservation() {
      setFetching(true);
      
      // Always look in the local offline queue first (handles both UUIDs and offline_ prefixed IDs)
      const queue = await getQueue();
      const item = queue.find(q => q.id === id || (q.payload && q.payload.id === id));
      
      if (item) {
        const data = item.payload;
        setFormData({
          ...data,
          visit_date: data.visit_date ? String(data.visit_date).substring(0, 10) : '',
          revisit_date_1: data.revisit_date_1 ? String(data.revisit_date_1).substring(0, 10) : '',
          revisit_date_2: data.revisit_date_2 ? String(data.revisit_date_2).substring(0, 10) : '',
          visit_objectives: data.visit_objectives || [],
          scores_v2: data.scores_v2 || {},
          scores_v3: data.scores_v3 || {},
          evaluations_v2: data.evaluations_v2 || {},
          evaluations_v3: data.evaluations_v3 || {},
          comments_v2: data.comments_v2 || {},
          comments_v3: data.comments_v3 || {}
        });
        if (data.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
        else if (data.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
        else { setDbVisitCount(1); setActiveTab(1); }
      } else {
        // If not found locally in the offline queue, check if it's cached in IndexedDB metadata observations
        const cachedItem = await findCachedObservation(id);
        if (cachedItem) {
          setFormData({
            ...cachedItem,
            visit_date: cachedItem.visit_date ? String(cachedItem.visit_date).substring(0, 10) : '',
            revisit_date_1: cachedItem.revisit_date_1 ? String(cachedItem.revisit_date_1).substring(0, 10) : '',
            revisit_date_2: cachedItem.revisit_date_2 ? String(cachedItem.revisit_date_2).substring(0, 10) : '',
            visit_objectives: cachedItem.visit_objectives || [],
            scores_v2: cachedItem.scores_v2 || {},
            scores_v3: cachedItem.scores_v3 || {},
            evaluations_v2: cachedItem.evaluations_v2 || {},
            evaluations_v3: cachedItem.evaluations_v3 || {},
            comments_v2: cachedItem.comments_v2 || {},
            comments_v3: cachedItem.comments_v3 || {}
          });
          if (cachedItem.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
          else if (cachedItem.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
          else { setDbVisitCount(1); setActiveTab(1); }
        } else {
          // If not found in cache and we are online, query Supabase
          try {
            const { data, error } = await supabase.from('observations').select('*').eq('id', id).single();
            if (data && !error) {
              setFormData({
                ...data,
                visit_date: data.visit_date ? String(data.visit_date).substring(0, 10) : '',
                revisit_date_1: data.revisit_date_1 ? String(data.revisit_date_1).substring(0, 10) : '',
                revisit_date_2: data.revisit_date_2 ? String(data.revisit_date_2).substring(0, 10) : '',
                visit_objectives: data.visit_objectives || [],
                scores_v2: data.scores_v2 || {},
                scores_v3: data.scores_v3 || {},
                evaluations_v2: data.evaluations_v2 || {},
                evaluations_v3: data.evaluations_v3 || {},
                comments_v2: data.comments_v2 || {},
                comments_v3: data.comments_v3 || {}
              });
              if (data.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
              else if (data.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
              else { setDbVisitCount(1); setActiveTab(1); }
            }
          } catch (err) {
            console.error('Failed to fetch from Supabase:', err);
          }
        }
      }
      setFetching(false);
    }
    fetchObservation();
  }, [id]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sidebarWidth = '260px';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persistent Settings (User Metadata)
  const [thresholds, setThresholds] = useState({ full: 80, partial: 60 });
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    async function loadUserSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.sosa_thresholds) {
        setThresholds(user.user_metadata.sosa_thresholds);
      }
    }
    loadUserSettings();
  }, []);

  const updateThresholds = async (newThresholds) => {
    setThresholds(newThresholds);
    await supabase.auth.updateUser({
      data: { sosa_thresholds: newThresholds }
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStartRevisit = (num) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (num === 2) {
        newData.revisit_date_1 = new Date().toISOString().split('T')[0];
        
        // Map original fields to v2 objects
        newData.scores_v2 = {
          plan_alignment_score: prev.plan_alignment_score,
          plan_content_score: prev.plan_content_score,
          plan_objectives_score: prev.plan_objectives_score,
          plan_references_score: prev.plan_references_score,
          meth_adequate_score: prev.meth_adequate_score,
          meth_strategies_score: prev.meth_strategies_score,
          meth_resources_score: prev.meth_resources_score,
          meth_clarity_score: prev.meth_clarity_score,
          learn_instruments_score: prev.learn_instruments_score,
          learn_formative_score: prev.learn_formative_score,
          learn_feedback_score: prev.learn_feedback_score,
          learn_criteria_score: prev.learn_criteria_score,
          man_space_score: prev.man_space_score,
          man_respect_score: prev.man_respect_score,
          man_conflict_score: prev.man_conflict_score,
          man_environment_score: prev.man_environment_score,
          man_material_score: prev.man_material_score,
          man_content_score: prev.man_content_score,
          man_activities_score: prev.man_activities_score,
          man_monitoring_score: prev.man_monitoring_score,
          ident_values_score: prev.ident_values_score,
          ident_posture_score: prev.ident_posture_score,
          ident_language_score: prev.ident_language_score
        };

        newData.evaluations_v2 = {
          planning_evaluation: prev.planning_evaluation,
          methodology_evaluation: prev.methodology_evaluation,
          learning_evaluation: prev.learning_evaluation,
          management_evaluation: prev.management_evaluation,
          identity_evaluation: prev.identity_evaluation,
          visit_type: prev.visit_type,
          visit_type_other: prev.visit_type_other,
          visit_objectives: [...(prev.visit_objectives || [])],
          visit_objectives_other: prev.visit_objectives_other
        };

        newData.comments_v2 = {
          planning_observations: prev.planning_observations,
          methodology_observations: prev.methodology_observations,
          learning_observations: prev.learning_observations,
          management_observations: prev.management_observations,
          identity_observations: prev.identity_observations
        };

      } else if (num === 3) {
        newData.revisit_date_2 = new Date().toISOString().split('T')[0];
        newData.scores_v3 = { ...prev.scores_v2 };
        newData.evaluations_v3 = { ...prev.evaluations_v2 };
        newData.comments_v3 = { ...prev.comments_v2 };
      }
      return newData;
    });
    setDbVisitCount(num);
    setActiveTab(num);
  };

  const handleObjectiveChange = (objective) => {
    setIsDirty(true);
    setFormData(prev => {
      const objectives = [...prev.visit_objectives];
      return { ...prev, visit_objectives: objectives.includes(objective) ? objectives.filter(o => o !== objective) : [...objectives, objective] };
    });
  };

  // Revisit Logic
  const startRevisit = (num) => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFormData(prev => {
      if (num === 2) {
        const comments = { strong_points: prev.strong_points, improvement_opportunities: prev.improvement_opportunities, observation_synthesis: prev.observation_synthesis, pedagogical_guidelines: prev.pedagogical_guidelines, forwarding: prev.forwarding };
        const evaluations = { planning_evaluation: prev.planning_evaluation, methodology_evaluation: prev.methodology_evaluation, learning_evaluation: prev.learning_evaluation, management_evaluation: prev.management_evaluation, identity_evaluation: prev.identity_evaluation };
        const scores = {};
        Object.keys(prev).forEach(key => { if(key.endsWith('_score')) scores[key] = prev[key]; });
        return { ...prev, revisit_date_1: localDate, comments_v2: comments, evaluations_v2: evaluations, scores_v2: scores };
      } else if (num === 3) {
        return { ...prev, revisit_date_2: localDate, comments_v3: { ...prev.comments_v2 }, evaluations_v3: { ...prev.evaluations_v2 }, scores_v3: { ...prev.scores_v2 } };
      }
      return prev;
    });
    setActiveTab(num);
  };



  const openDeleteModal = (visitNum) => {
    setVisitToDelete(visitNum);
    setShowDeleteModal(true);
  };

  const confirmDeleteRevisit = async () => {
    if (!visitToDelete) return;
    setLoading(true);
    try {
      let updateData = {};
      if (visitToDelete === 2) {
        updateData = { 
          revisit_date_1: null, revisit_date_2: null,
          scores_v2: {}, evaluations_v2: {}, comments_v2: {},
          scores_v3: {}, evaluations_v3: {}, comments_v3: {}
        };
      } else if (visitToDelete === 3) {
        updateData = { 
          revisit_date_2: null,
          scores_v3: {}, evaluations_v3: {}, comments_v3: {}
        };
      }
      const { error } = await supabase.from('observations').update(updateData).eq('id', id);
      if (error) throw error;
      setFormData(prev => ({ ...prev, ...updateData }));
      setDbVisitCount(visitToDelete - 1);
      setActiveTab(visitToDelete - 1);
      setToast({ message: 'Revisita excluída com sucesso!' });
    } catch (error) {
      console.error('Error deleting revisit:', error);
      setToast({ message: 'Erro ao excluir revisita.', type: 'error' });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setVisitToDelete(null);
    }
  };

  // Tab-Aware Helpers
  const getScore = (field) => {
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];
    const v3 = formData.scores_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return v2 !== undefined && v2 !== null ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined && v3 !== null) return v3;
      if (v2 !== undefined && v2 !== null) return v2;
      return v1;
    }
    return null;
  };

  const getHistory = (field) => {
    const history = [];
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];
    const v3 = formData.scores_v3?.[field];

    if (v1 !== null && v1 !== undefined) history.push({ visit: 1, score: v1 });
    if (v2 !== null && v2 !== undefined) history.push({ visit: 2, score: v2 });
    if (v3 !== null && v3 !== undefined) history.push({ visit: 3, score: v3 });
    return history;
  };

  const setScore = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, scores_v2: { ...prev.scores_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, scores_v3: { ...prev.scores_v3, [field]: val } };
      return prev;
    });
  };

  const getEvaluation = (field) => {
    const v1 = formData[field];
    const v2 = formData.evaluations_v2?.[field];
    const v3 = formData.evaluations_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return (v2 !== undefined && v2 !== null) ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined && v3 !== null) return v3;
      if (v2 !== undefined && v2 !== null) return v2;
      return v1;
    }
    return '';
  };

  const setEvaluation = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, evaluations_v2: { ...prev.evaluations_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, evaluations_v3: { ...prev.evaluations_v3, [field]: val } };
      return prev;
    });
  };

  const getComment = (field) => {
    const v1 = formData[field];
    const v2 = formData.comments_v2?.[field];
    const v3 = formData.comments_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return (v2 !== undefined && v2 !== null) ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined && v3 !== null) return v3;
      if (v2 !== undefined && v2 !== null) return v2;
      return v1;
    }
    return '';
  };
  const setComment = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, comments_v2: { ...prev.comments_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, comments_v3: { ...prev.comments_v3, [field]: val } };
      return prev;
    });
  };

  // Smart Color Logic for Scores
  const getScoreColorClass = (visitIndex, scoreValue, field) => {
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];

    if (visitIndex === 1) return 'v1';
    
    if (visitIndex === 2) {
      if (scoreValue === v1) return 'v1'; // Same as original, keep blue
      return 'v2'; // Changed in v2, use green
    }
    
    if (visitIndex === 3) {
      if (scoreValue === v2) {
        // If it's same as v2, use whatever color v2 had
        return (v2 === v1) ? 'v1' : 'v2';
      }
      return 'v3'; // Changed in v3, use orange
    }
    return 'v1';
  };

  // Score Selector Component
  const ScoreSelector = ({ field, rubricsKey, label }) => {
    const currentScore = getScore(field);
    const history = getHistory(field);
    const tooltips = rubrics[rubricsKey];

    return (
      <div 
        className="score-selector-row"
        style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) 0',
          borderBottom: '1px solid var(--border)',
          gap: 'var(--space-3)'
        }}
      >
        <div style={{ flex: 1 }}>
          <p className="text-sm font-medium text-gray-700 leading-tight mb-1">{label}</p>
          <p className="text-[10px] text-muted italic">
            {currentScore ? tooltips?.[currentScore] : 'Selecione uma pontuação...'}
          </p>
        </div>
        <div className="score-group" style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[4, 3, 2, 1].map(num => (
            <div key={num} className="relative">
              <input 
                type="radio" 
                id={`${field}-${num}`} 
                name={field} 
                className="score-radio"
                checked={currentScore === num}
                onChange={() => setScore(field, num)}
              />
              <label 
                htmlFor={`${field}-${num}`} 
                className={`score-label ${getScoreColorClass(activeTab, num, field)} ${currentScore !== num && history.some(h => h.score === num) ? `v${history.find(h => h.score === num)?.visit}-ghost` : ''}`}
                title={tooltips?.[num]}
              >
                {num}
                <div className="score-pips">
                  {history.map((h, i) => h.score === num && (
                    <div key={i} className={`score-pip pip-v${h.visit}`} />
                  ))}
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const calculateEvaluation = (scoreFields) => {
    const scoresList = scoreFields.map(f => getScore(f));
    const validScores = scoresList.filter(s => s !== null && s !== undefined);
    
    if (validScores.length === 0) return 'Não observado';
    
    const totalEarned = validScores.reduce((a, b) => a + Number(b), 0);
    const totalPossible = scoreFields.length * 4;
    const percentage = (totalEarned / totalPossible) * 100;

    if (percentage >= thresholds.full) return 'Atende plenamente';
    if (percentage >= thresholds.partial) return 'Atende parcialmente';
    return 'Não atende';
  };

  // Automation Effect: Update evaluations based on scores
  useEffect(() => {
    const sections = [
      { evalField: 'planning_evaluation', scoreFields: ['plan_alignment_score', 'plan_content_score', 'plan_objectives_score', 'plan_references_score'] },
      { evalField: 'methodology_evaluation', scoreFields: ['meth_adequate_score', 'meth_strategies_score', 'meth_resources_score', 'meth_clarity_score'] },
      { evalField: 'learning_evaluation', scoreFields: ['learn_instruments_score', 'learn_formative_score', 'learn_feedback_score', 'learn_criteria_score'] },
      { evalField: 'management_evaluation', scoreFields: ['man_space_score', 'man_respect_score', 'man_conflict_score', 'man_environment_score', 'man_material_score', 'man_content_score', 'man_activities_score', 'man_monitoring_score'] },
      { evalField: 'identity_evaluation', scoreFields: ['ident_values_score', 'ident_posture_score', 'ident_language_score'] }
    ];

    let hasChanges = false;
    const updates = {};

    sections.forEach(section => {
      const newValue = calculateEvaluation(section.scoreFields);
      const currentValue = getEvaluation(section.evalField);
      
      if (newValue !== currentValue) {
        updates[section.evalField] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFormData(prev => {
        const newData = { ...prev };
        if (activeTab === 1) {
          Object.assign(newData, updates);
        } else if (activeTab === 2) {
          newData.evaluations_v2 = { ...(prev.evaluations_v2 || {}), ...updates };
        } else if (activeTab === 3) {
          newData.evaluations_v3 = { ...(prev.evaluations_v3 || {}), ...updates };
        }
        return newData;
      });
    }
  }, [
    formData.plan_alignment_score, formData.plan_content_score, formData.plan_objectives_score, formData.plan_references_score,
    formData.meth_adequate_score, formData.meth_strategies_score, formData.meth_resources_score, formData.meth_clarity_score,
    formData.learn_instruments_score, formData.learn_formative_score, formData.learn_feedback_score, formData.learn_criteria_score,
    formData.man_space_score, formData.man_respect_score, formData.man_conflict_score, formData.man_environment_score,
    formData.man_material_score, formData.man_content_score, formData.man_activities_score, formData.man_monitoring_score,
    formData.ident_values_score, formData.ident_posture_score, formData.ident_language_score,
    formData.scores_v2, formData.scores_v3, activeTab, thresholds
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let userId = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch (authErr) {
        console.warn('Failed to get session during offline submit:', authErr);
      }

      const selectedSeriesObj = seriesList.find(s => s.id === formData.series_id);
      const segment_id = selectedSeriesObj ? selectedSeriesObj.segment_id : null;
      const { id: _id, created_at, updated_at, teachers: _unused_t, subjects: _unused_s, series: _unused_ser, segments: _unused_seg, ...cleanData } = formData;
      const payload = { 
        ...cleanData, 
        school_id: selectedSchoolId, 
        segment_id, 
        user_id: userId, 
        visit_date: cleanData.visit_date || null, 
        revisit_date_1: cleanData.revisit_date_1 || null, 
        revisit_date_2: cleanData.revisit_date_2 || null, 
        bimestre: selectedBimestre 
      };

      if (id) {
        payload.id = id;
        delete payload.is_new_offline; // CRITICAL: Ensure it is never treated as a new offline insert!
      } else {
        payload.id = generateUUID();
        payload.is_new_offline = true;
      }

      if (!isOnline) {
        const teacherObj = teachers.find(t => t.id === formData.teacher_id);
        const subjectObj = subjects.find(s => s.id === formData.subject_id);
        const seriesObj = seriesList.find(s => s.id === formData.series_id);

        await addToOfflineQueue(payload, {
          teacherName: teacherObj ? teacherObj.name : 'N/A',
          subjectName: subjectObj ? subjectObj.name : 'N/A',
          seriesName: seriesObj ? seriesObj.name : 'N/A'
        });

        setIsDirty(false);
        setSuccess(true);
        window.scrollTo(0,0);
      } else {
        const { error } = id ? await supabase.from('observations').update(payload).eq('id', id) : await supabase.from('observations').insert([payload]);
        
        if (error) {
          if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
            console.warn('Network error during save, falling back to offline queue');
            const teacherObj = teachers.find(t => t.id === formData.teacher_id);
            const subjectObj = subjects.find(s => s.id === formData.subject_id);
            const seriesObj = seriesList.find(s => s.id === formData.series_id);

            await addToOfflineQueue(payload, {
              teacherName: teacherObj ? teacherObj.name : 'N/A',
              subjectName: subjectObj ? subjectObj.name : 'N/A',
              seriesName: seriesObj ? seriesObj.name : 'N/A'
            });

            setIsDirty(false);
            setSuccess(true);
            window.scrollTo(0,0);
          } else {
            throw error;
          }
        } else {
          setIsDirty(false);
          setSuccess(true);
          window.scrollTo(0,0);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      setToast({ message: 'Erro ao salvar formulário.', type: 'error' });
    } finally { setLoading(false); }
  };

  // Agrupa professores duplicados pelo mesmo nome para exibir apenas uma vez no seletor
  const uniqueTeachers = useMemo(() => {
    const seen = new Set();
    const result = [];
    teachers.forEach(t => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        result.push(t);
      }
    });
    return result;
  }, [teachers]);

  // Deriva o nome do professor selecionado a partir do teacher_id
  const selectedTeacherName = useMemo(() => {
    if (!formData.teacher_id) return '';
    const t = teachers.find(x => x.id === formData.teacher_id);
    return t ? t.name : '';
  }, [formData.teacher_id, teachers]);

  // Busca todos os registros correspondentes ao nome do professor selecionado (ex: caso seja cadastrado com mais de uma disciplina)
  const matchingTeacherRecords = useMemo(() => {
    if (!selectedTeacherName) return [];
    return teachers.filter(t => t.name === selectedTeacherName);
  }, [selectedTeacherName, teachers]);

  // Função auxiliar para determinar qual ID de cadastro do professor usar com base na série/disciplina selecionada
  const findBestTeacherRecord = (records, seriesId, subjectId) => {
    if (records.length <= 1) return records[0];
    
    // 1. Tenta achar o cadastro que atende à série E à disciplina (ou é regente)
    const bothMatch = records.find(t => 
      t.teacher_series?.some(ts => ts.series_id === seriesId) &&
      (t.teacher_subjects?.some(ts => ts.subject_id === subjectId) || t.teacher_type === 'regente')
    );
    if (bothMatch) return bothMatch;

    // 2. Tenta achar o cadastro que atende à disciplina
    if (subjectId) {
      const subjectMatch = records.find(t => 
        t.teacher_subjects?.some(ts => ts.subject_id === subjectId)
      );
      if (subjectMatch) return subjectMatch;
    }

    // 3. Tenta achar o cadastro que atende à série
    if (seriesId) {
      const seriesMatch = records.find(t => 
        t.teacher_series?.some(ts => ts.series_id === seriesId)
      );
      if (seriesMatch) return seriesMatch;
    }

    return records[0];
  };

  let availableSeries = seriesList;
  let availableSubjects = subjects;
  
  if (matchingTeacherRecords.length > 0) {
    // 1. Filtrar registros de séries com base na disciplina selecionada (se houver) para evitar mostrar todas as séries juntas
    let recordsForSeries = matchingTeacherRecords;
    if (formData.subject_id) {
      const subjectMatchedRecords = matchingTeacherRecords.filter(t => 
        t.teacher_subjects?.some(ts => ts.subject_id === formData.subject_id) || t.teacher_type === 'regente'
      );
      if (subjectMatchedRecords.length > 0) {
        recordsForSeries = subjectMatchedRecords;
      }
    }

    // Coleta a união de todas as séries permitidas a partir dos registros filtrados
    const allowedSeriesIds = new Set();
    recordsForSeries.forEach(t => {
      if (t.teacher_series?.length > 0) {
        t.teacher_series.forEach(ts => allowedSeriesIds.add(ts.series_id));
      }
    });

    if (allowedSeriesIds.size > 0) {
      availableSeries = seriesList.filter(s => allowedSeriesIds.has(s.id));
    }
    
    // 2. Filtrar registros de disciplinas com base na série selecionada (se houver)
    let recordsForSubjects = matchingTeacherRecords;
    if (formData.series_id) {
      const seriesMatchedRecords = matchingTeacherRecords.filter(t => 
        t.teacher_series?.some(ts => ts.series_id === formData.series_id)
      );
      if (seriesMatchedRecords.length > 0) {
        recordsForSubjects = seriesMatchedRecords;
      }
    }

    // Coleta a união de todas as disciplinas permitidas
    const allowedSubjectIds = new Set();
    let hasRegente = false;
    
    recordsForSubjects.forEach(t => {
      if (t.teacher_type === 'regente') {
        hasRegente = true;
      }
      if (t.teacher_subjects?.length > 0) {
        t.teacher_subjects.forEach(ts => allowedSubjectIds.add(ts.subject_id));
      }
    });

    if (hasRegente) {
      const allowedSegments = new Set();
      recordsForSubjects.forEach(t => {
        if (t.teacher_series?.length > 0) {
          t.teacher_series.forEach(ts => {
            const seriesObj = seriesList.find(s => s.id === ts.series_id);
            if (seriesObj?.segment_id) {
              allowedSegments.add(seriesObj.segment_id);
            }
          });
        }
      });
      availableSubjects = subjects.filter(sub => {
        if (!sub.segment_subjects || sub.segment_subjects.length === 0) {
          return true; // Safe fallback if mapping data is missing or not fetched yet
        }
        return sub.segment_subjects.some(ss => allowedSegments.has(ss.segment_id));
      });
    } else {
      availableSubjects = subjects.filter(s => allowedSubjectIds.has(s.id));
    }

    // Ultra-defensive fallback: if the filtered list is empty but we have subjects, show all of them
    // so that the user is never locked out of submitting the form due to a missing mapping.
    if (availableSubjects.length === 0 && subjects.length > 0) {
      availableSubjects = subjects;
    }
  }

  if (success) {
    return (
      <div className="container flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
        <h1 className="h1">Salvo com Sucesso!</h1>
        <Button onClick={() => id ? navigate('/') : window.location.reload()}>{id ? 'Voltar ao Dashboard' : 'Nova Observação'}</Button>
      </div>
    );
  }

  const activeThemeColor = activeTab === 1 ? 'var(--primary)' : (activeTab === 2 ? 'var(--success)' : 'var(--warning)');

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* STICKY HEADER: Title and Tabs */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 20, 
        backgroundColor: '#f8fafc', // Match system background
        paddingTop: 'var(--space-6)',
        paddingBottom: 'var(--space-2)',
        margin: '0 -1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
          <h1 className="h2 md:h1">Observação Pedagógica</h1>
          <button 
            type="button" 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ 
              backgroundColor: '#f1f5f9', // Light gray background
              border: '1px solid #e2e8f0',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            title="Configurações de Rigor"
          >
            <Settings size={20} />
          </button>
        </div>

        {showConfig && (
          <div className="mb-4 p-5 bg-white rounded-xl border border-gray-200 shadow-lg animate-fade-in" style={{ margin: 'var(--space-2) 0' }}>
            <div className="flex items-center gap-2 mb-5 text-sm font-bold text-gray-800">
              <Settings size={18} className="text-primary" /> 
              <span>Ajuste do Rigor Pedagógico</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Atende plenamente (&ge;)</label>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{thresholds.full}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={thresholds.full} 
                  onChange={(e) => updateThresholds({ ...thresholds, full: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Atende parcialmente (&ge;)</label>
                  <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-bold">{thresholds.partial}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={thresholds.partial} 
                  onChange={(e) => updateThresholds({ ...thresholds, partial: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-success"
                />
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-gray-50 flex justify-between items-center">
              <p className="text-[10px] text-muted italic">
                * As configurações são salvas automaticamente na sua conta e aplicadas em tempo real.
              </p>
              <button type="button" onClick={() => setShowConfig(false)} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">Fechar</button>
            </div>
          </div>
        )}

        {/* Modern Tabs Structure */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '-1px', 
          position: 'relative', 
          zIndex: 1,
          paddingLeft: 'var(--space-2)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }} className="no-scrollbar">
          {/* Tab 1: Original */}
          <button 
            type="button" 
            onClick={() => setActiveTab(1)} 
            className="transition-all"
            style={{ 
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: activeTab === 1 ? 'white' : 'transparent',
              borderTop: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderLeft: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderRight: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: activeTab === 1 ? '1px solid white' : '1px solid var(--border)',
              borderRadius: '8px 8px 0 0',
              color: activeTab === 1 ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              boxShadow: activeTab === 1 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            1ª Visita
          </button>
          
          {/* Tab 2: Revisita 1 */}
          {id && (formData.revisit_date_1 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(2)} 
              className="transition-all"
              style={{ 
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: activeTab === 2 ? 'white' : 'transparent',
                borderTop: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderLeft: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderRight: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: activeTab === 2 ? '1px solid white' : '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: activeTab === 2 ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: activeTab === 2 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}
            >
              2ª Visita
              {!formData.revisit_date_2 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(2); }}
                  className="hover:bg-red-50 p-1 rounded-full transition-colors"
                  style={{ color: 'var(--error)', display: 'flex' }}
                >
                  <X size={14} />
                </span>
              )}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                const now = new Date().toISOString().split('T')[0];
                setFormData(prev => ({ ...prev, revisit_date_1: now }));
                setActiveTab(2);
                setIsDirty(true);
              }} 
              className="transition-all"
              style={{ 
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: '1px dashed var(--border)',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <PlusCircle size={14} /> Adicionar Revisita
            </button>
          ))}

          {/* Tab 3: Revisita 2 */}
          {id && formData.revisit_date_1 && (formData.revisit_date_2 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(3)} 
              className="transition-all"
              style={{ 
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: activeTab === 3 ? 'white' : 'transparent',
                borderTop: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderLeft: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderRight: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: activeTab === 3 ? '1px solid white' : '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: activeTab === 3 ? 'var(--warning)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: activeTab === 3 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}
            >
              3ª Visita
              <span 
                onClick={(e) => { e.stopPropagation(); openDeleteModal(3); }}
                className="hover:bg-red-50 p-1 rounded-full transition-colors"
                style={{ color: 'var(--error)', display: 'flex' }}
              >
                <X size={14} />
              </span>
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                const d = new Date();
                const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setFormData(prev => ({ ...prev, revisit_date_2: localDate }));
                setActiveTab(3);
                setIsDirty(true);
              }} 
              className="transition-all"
              style={{ 
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: '1px dashed var(--border)',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <PlusCircle size={14} /> Adicionar Revisita
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-in" style={{ marginTop: 'var(--space-6)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: 'var(--space-8)' }}>
          <Card>
            <h3 className="h3 mb-4 flex items-center gap-2"><User size={20} color={activeThemeColor} /> 1. Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Professor(a)</label>
                <select 
                  className="form-input"
                  value={selectedTeacherName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matches = teachers.filter(t => t.name === name);
                    if (matches.length > 0) {
                      // Define o cadastro inicial mas deixa série e disciplina vazias para permitir livre escolha
                      const defaultTeacher = matches[0];
                      setFormData(prev => ({ 
                        ...prev, 
                        teacher_id: defaultTeacher.id, 
                        series_id: '',
                        subject_id: ''
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        teacher_id: '', 
                        series_id: '',
                        subject_id: ''
                      }));
                    }
                  }}
                  required
                >
                  <option value="">Selecione o professor</option>
                  {uniqueTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data da Visita</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={activeTab === 1 ? (formData.visit_date || '') : (activeTab === 2 ? (formData.revisit_date_1 || '') : (formData.revisit_date_2 || ''))}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => {
                      if (activeTab === 1) return { ...prev, visit_date: val };
                      if (activeTab === 2) return { ...prev, revisit_date_1: val };
                      if (activeTab === 3) return { ...prev, revisit_date_2: val };
                      return prev;
                    });
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ano/Série</label>
                <select 
                  className="form-input"
                  value={formData.series_id || ''}
                  onChange={(e) => {
                    const sId = e.target.value;
                    let finalTeacherId = formData.teacher_id;
                    if (matchingTeacherRecords.length > 1) {
                      const bestTeacher = findBestTeacherRecord(matchingTeacherRecords, sId, formData.subject_id);
                      if (bestTeacher) finalTeacherId = bestTeacher.id;
                    }
                    
                    // Reseta a disciplina se ela não pertencer à nova série selecionada
                    let finalSubjectId = formData.subject_id;
                    const nextMatchedRecords = matchingTeacherRecords.filter(t => 
                      t.teacher_series?.some(ts => ts.series_id === sId)
                    );
                    const nextAllowedSubjectIds = new Set();
                    nextMatchedRecords.forEach(t => {
                      t.teacher_subjects?.forEach(ts => nextAllowedSubjectIds.add(ts.subject_id));
                    });
                    const isAnyRegente = nextMatchedRecords.some(t => t.teacher_type === 'regente');
                    if (!isAnyRegente && finalSubjectId && !nextAllowedSubjectIds.has(finalSubjectId)) {
                      finalSubjectId = '';
                    }

                    setFormData(prev => ({ 
                      ...prev, 
                      series_id: sId,
                      teacher_id: finalTeacherId,
                      subject_id: finalSubjectId
                    }));
                  }}
                  required
                >
                  <option value="">Selecione a série</option>
                  {availableSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Disciplina</label>
                <select 
                  className="form-input"
                  value={formData.subject_id || ''}
                  onChange={(e) => {
                    const subId = e.target.value;
                    let finalTeacherId = formData.teacher_id;
                    if (matchingTeacherRecords.length > 1) {
                      const bestTeacher = findBestTeacherRecord(matchingTeacherRecords, formData.series_id, subId);
                      if (bestTeacher) finalTeacherId = bestTeacher.id;
                    }
                    
                    // Reseta a série se ela não pertencer à nova disciplina selecionada
                    let finalSeriesId = formData.series_id;
                    const nextMatchedRecords = matchingTeacherRecords.filter(t => 
                      t.teacher_subjects?.some(ts => ts.subject_id === subId) || t.teacher_type === 'regente'
                    );
                    const nextAllowedSeriesIds = new Set();
                    nextMatchedRecords.forEach(t => {
                      t.teacher_series?.forEach(ts => nextAllowedSeriesIds.add(ts.series_id));
                    });
                    if (finalSeriesId && !nextAllowedSeriesIds.has(finalSeriesId)) {
                      finalSeriesId = '';
                    }

                    setFormData(prev => ({ 
                      ...prev, 
                      subject_id: subId,
                      teacher_id: finalTeacherId,
                      series_id: finalSeriesId
                    }));
                  }}
                  required
                >
                  <option value="">Selecione a disciplina</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="form-group mt-4">
              <label className="form-label">Tipo de Visita</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {['Formativa', 'Acompanhamento', 'Devolutiva', 'Outro'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="visit_type" 
                      className="radio" 
                      checked={getEvaluation('visit_type') === type}
                      onChange={() => setEvaluation('visit_type', type)}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
              {getEvaluation('visit_type') === 'Outro' && (
                <input 
                  type="text" 
                  className="form-input mt-2" 
                  placeholder="Especifique o tipo..."
                  value={getEvaluation('visit_type_other') || ''}
                  onChange={(e) => setEvaluation('visit_type_other', e.target.value)}
                />
              )}
            </div>
          </Card>

          <Card>
            <h3 className="h3 mb-4 flex items-center gap-2"><Target size={20} color={activeThemeColor}/> 2. Objetivos</h3>
            <div className="flex flex-col gap-2">
              {[
                'Acompanhar a prática pedagógica',
                'Observar a aplicação da BNCC e dos referenciais institucionais',
                'Apoiar o desenvolvimento profissional docente',
                'Monitorar processos de ensino e aprendizagem'
              ].map(obj => (
                <label key={obj} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="checkbox" 
                    checked={(getEvaluation('visit_objectives') || []).includes(obj)}
                    onChange={(e) => {
                      const current = getEvaluation('visit_objectives') || [];
                      const next = e.target.checked ? [...current, obj] : current.filter(o => o !== obj);
                      setEvaluation('visit_objectives', next);
                    }}
                  />
                  <span className="text-sm">{obj}</span>
                </label>
              ))}
              <div className="flex items-center gap-3 p-2 mt-2">
                <input 
                  type="checkbox" 
                  className="checkbox" 
                  checked={(getEvaluation('visit_objectives') || []).includes('Outro')}
                  onChange={(e) => {
                    const current = getEvaluation('visit_objectives') || [];
                    const next = e.target.checked ? [...current, 'Outro'] : current.filter(o => o !== 'Outro');
                    setEvaluation('visit_objectives', next);
                  }}
                />
                <input 
                  type="text" 
                  className="form-input flex-1" 
                  placeholder="Outro objetivo..."
                  disabled={!(getEvaluation('visit_objectives') || []).includes('Outro')}
                  value={getEvaluation('visit_objectives_other') || ''}
                  onChange={(e) => setEvaluation('visit_objectives_other', e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><ClipboardList size={20} color={activeThemeColor}/> 3. Planejamento</h3>
            <Select value={getEvaluation('planning_evaluation')} onChange={(e) => setEvaluation('planning_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="plan_alignment_score" rubricsKey="planejamento" label="Alinhamento às habilidades BNCC" />
          <ScoreSelector field="plan_content_score" rubricsKey="planejamento" label="Conteúdo conforme Sequência Didática" />
          <ScoreSelector field="plan_objectives_score" rubricsKey="planejamento" label="Objetivos claros e coerentes" />
          <ScoreSelector field="plan_references_score" rubricsKey="planejamento" label="Conexão com referenciais institucionais" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('planning_observations')} onChange={(e) => setComment('planning_observations', e.target.value)} />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Zap size={20} color={activeThemeColor}/> 4. Metodologia</h3>
            <Select value={getEvaluation('methodology_evaluation')} onChange={(e) => setEvaluation('methodology_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="meth_adequate_score" rubricsKey="metodologia" label="Metodologias adequadas à faixa etária" />
          <ScoreSelector field="meth_strategies_score" rubricsKey="metodologia" label="Estratégias que favorecem o aprendizado" />
          <ScoreSelector field="meth_resources_score" rubricsKey="metodologia" label="Uso intencional de recursos" />
          <ScoreSelector field="meth_clarity_score" rubricsKey="metodologia" label="Clareza na condução da aula" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('methodology_observations')} onChange={(e) => setComment('methodology_observations', e.target.value)} />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><CheckCircle size={20} color={activeThemeColor}/> 5. Avaliação</h3>
            <Select value={getEvaluation('learning_evaluation')} onChange={(e) => setEvaluation('learning_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="learn_instruments_score" rubricsKey="avaliacao" label="Instrumentos coerentes com objetivos" />
          <ScoreSelector field="learn_formative_score" rubricsKey="avaliacao" label="Avaliação formativa presente" />
          <ScoreSelector field="learn_feedback_score" rubricsKey="avaliacao" label="Devolutivas claras aos estudantes" />
          <ScoreSelector field="learn_criteria_score" rubricsKey="avaliacao" label="Critérios de avaliação compreensíveis" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('learning_observations')} onChange={(e) => setComment('learning_observations', e.target.value)} />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Settings size={20} color={activeThemeColor}/> 6. Gestão de Sala</h3>
            <Select value={getEvaluation('management_evaluation')} onChange={(e) => setEvaluation('management_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="man_space_score" rubricsKey="gestao" label="Organização do espaço e do tempo pedagógico" />
          <ScoreSelector field="man_respect_score" rubricsKey="gestao" label="Relação respeitosa entre professor e estudantes" />
          <ScoreSelector field="man_conflict_score" rubricsKey="gestao" label="Estratégias de mediação de conflitos, quando necessário" />
          <ScoreSelector field="man_environment_score" rubricsKey="gestao" label="Ambiente favorável à aprendizagem" />
          <ScoreSelector field="man_material_score" rubricsKey="gestao" label="Uso adequado do material didático" />
          <ScoreSelector field="man_content_score" rubricsKey="gestao" label="Registro do conteúdo no caderno dos alunos" />
          <ScoreSelector field="man_activities_score" rubricsKey="gestao" label="As atividades são bem orientadas" />
          <ScoreSelector field="man_monitoring_score" rubricsKey="gestao" label="O professor acompanha sua realização circulando pela sala" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('management_observations')} onChange={(e) => setComment('management_observations', e.target.value)} />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Heart size={20} color={activeThemeColor}/> 7. Identidade Confessional</h3>
            <Select value={getEvaluation('identity_evaluation')} onChange={(e) => setEvaluation('identity_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="ident_values_score" rubricsKey="identidade" label="Integração de valores naturais e éticos" />
          <ScoreSelector field="ident_posture_score" rubricsKey="identidade" label="Postura coerente com princípios EA" />
          <ScoreSelector field="ident_language_score" rubricsKey="identidade" label="Linguagem, atitudes e exemplos alinhados à proposta" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('identity_observations')} onChange={(e) => setComment('identity_observations', e.target.value)} />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Award size={20} color={activeThemeColor}/> 8. Pontos Fortes da Aula</h3>
          <div className="form-group">
            <textarea 
              className="form-input" 
              rows="3" 
              placeholder="Descreva os pontos positivos observados..."
              value={getComment('strong_points')} 
              onChange={(e) => setComment('strong_points', e.target.value)} 
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Zap size={20} color={activeThemeColor}/> 9. Oportunidades de Aprimoramento</h3>
          <div className="form-group">
            <label className="text-xs text-muted mb-2">(Orientações formativas da coordenação pedagógica)</label>
            <textarea 
              className="form-input" 
              rows="3" 
              placeholder="Indique pontos a serem desenvolvidos..."
              value={getComment('improvement_opportunities')} 
              onChange={(e) => setComment('improvement_opportunities', e.target.value)} 
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><ClipboardList size={20} color={activeThemeColor}/> 10. Devolutiva ao(à) Professor(a)</h3>
          
          <div className="form-group">
            <label className="form-label">Síntese da Observação:</label>
            <textarea 
              className="form-input" 
              rows="3" 
              value={getComment('observation_synthesis')} 
              onChange={(e) => setComment('observation_synthesis', e.target.value)} 
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Orientações Pedagógicas:</label>
            <textarea 
              className="form-input" 
              rows="3" 
              value={getComment('pedagogical_guidelines')} 
              onChange={(e) => setComment('pedagogical_guidelines', e.target.value)} 
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Combinados e Encaminhamentos:</label>
            <textarea 
              className="form-input" 
              rows="3" 
              value={getComment('forwarding')} 
              onChange={(e) => setComment('forwarding', e.target.value)} 
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Heart size={20} color={activeThemeColor}/> 11. Registro Final</h3>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <input 
              type="checkbox" 
              id="teacher_aware" 
              className="checkbox"
              checked={formData.teacher_aware} 
              onChange={(e) => setFormData(prev => ({ ...prev, teacher_aware: e.target.checked }))} 
            />
            <label htmlFor="teacher_aware" className="text-sm font-semibold cursor-pointer">
              Professor(a) ciente da devolutiva?
            </label>
          </div>
        </Card>

        {/* STICKY FOOTER: Actions */}
        <div style={{ 
          position: 'sticky', 
          bottom: 0, 
          zIndex: 100, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(8px)',
          padding: 'var(--space-4)',
          margin: '0 -1rem -2rem -1rem', // Match container padding
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 15px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div className="container flex justify-between md:justify-end gap-3" style={{ padding: 0, maxWidth: '1200px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>Cancelar</Button>
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Finalizar Registro')}
              </Button>
            </div>
          </div>
        </div>

        {/* Padding for content below fixed footer */}
        <div style={{ height: '80px' }} />

        <Modal isOpen={showExitModal} onClose={cancelExit} title="Alterações não salvas">
          <div style={{ padding: 'var(--space-2)' }}>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>Você tem alterações não salvas. Se sair agora, perderá os dados digitados.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancelExit}>Continuar</Button>
              <Button type="button" variant="danger" onClick={confirmExit}>Sair</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Excluir Revisita">
          <div style={{ padding: 'var(--space-2)' }}>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              Deseja realmente excluir a <strong>{visitToDelete - 1}ª Revisita</strong>? Todos os dados preenchidos nesta aba serão perdidos.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)}>Não, Manter</Button>
              <Button type="button" variant="danger" onClick={confirmDeleteRevisit}>Sim, Excluir</Button>
            </div>
          </div>
        </Modal>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </form>
    </div>
  );
}
