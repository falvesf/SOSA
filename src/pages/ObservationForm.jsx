import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { Save, CheckCircle, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui';

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

export default function ObservationForm() {
  const { selectedSchoolId } = useSchool();
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

  const confirmExit = () => { setIsDirty(false); setShowExitModal(false); };
  const cancelExit = () => { setShowExitModal(false); navigate(`/observacao/editar/${lastId}`); };

  useEffect(() => {
    const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load Metadata
  useEffect(() => {
    if (!selectedSchoolId) return;
    async function loadData() {
      const [{ data: tData }, { data: sData }, { data: subData }] = await Promise.all([
        supabase.from('teachers').select('*, teacher_series(series_id), teacher_subjects(subject_id)').eq('school_id', selectedSchoolId).order('name'),
        supabase.from('series').select('id, name, segment_id, segments!inner(name)').eq('school_id', selectedSchoolId).order('name'),
        supabase.from('subjects').select('id, name, segment_subjects(segment_id)').eq('school_id', selectedSchoolId).order('name')
      ]);
      if (tData) setTeachers(tData);
      if (sData) setSeriesList(sData);
      if (subData) setSubjects(subData);
    }
    loadData();
  }, [selectedSchoolId]);

  // Fetch Observation
  useEffect(() => {
    if (!id) return;
    async function fetchObservation() {
      setFetching(true);
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
      setFetching(false);
    }
    fetchObservation();
  }, [id]);

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  const openDeleteModal = (num) => {
    setVisitToDelete(num);
    setShowDeleteModal(true);
  };

  const confirmDeleteRevisit = async () => {
    const num = visitToDelete;
    setLoading(true);
    try {
      // Surgical update: only clear the necessary columns
      const updates = {};
      if (num === 2) {
        updates.revisit_date_1 = null;
        updates.scores_v2 = {};
        updates.evaluations_v2 = {};
        updates.comments_v2 = {};
      } else if (num === 3) {
        updates.revisit_date_2 = null;
        updates.scores_v3 = {};
        updates.evaluations_v3 = {};
        updates.comments_v3 = {};
      }

      const { error } = await supabase.from('observations').update(updates).eq('id', id);
      if (error) throw error;

      // Update local state ONLY after successful DB update
      setFormData(prev => ({ ...prev, ...updates }));
      setDbVisitCount(num - 1);
      setActiveTab(num - 1);
      setIsDirty(false);
    } catch (error) {
      console.error('Error deleting revisit:', error);
      alert('Erro ao excluir revisita: ' + (error.message || 'Erro no banco de dados'));
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
    const v2 = formData.scores_v2[field];

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
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm" style={{ flex: 1, paddingRight: '1rem' }}>{label}</span>
        <div className="flex gap-3 relative">
          {scores.map(score => {
            const isSelected = currentScore === score;
            const activeColorClass = isSelected ? getScoreColorClass(activeTab, score, field) : '';
            
            let historyClass = '';
            const pastVisits = history.filter(h => h.visit < activeTab && h.score === score);
            if (pastVisits.length > 0) {
              const lastPastVisit = pastVisits[pastVisits.length - 1].visit;
              // Smart ghost color
              const ghostColorClass = getScoreColorClass(lastPastVisit, score, field);
              historyClass = `${ghostColorClass}-ghost`;
            }

            return (
              <div key={score} className="relative" title={tooltips ? tooltips[score] : undefined}>
                <input type="radio" name={field} id={`${field}-${score}`} className="score-radio" checked={isSelected} onChange={() => setScore(field, score)} />
                <label htmlFor={`${field}-${score}`} className={`score-label ${activeColorClass} ${historyClass}`}>
                  {score}
                  <div className="score-pips">
                    {history.map(h => {
                      const pipColorClass = getScoreColorClass(h.visit, h.score, field);
                      return (
                        <div key={h.visit} className={`score-pip pip-${pipColorClass}`} style={{ opacity: h.score === score ? 1 : 0 }} />
                      );
                    })}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedSeriesObj = seriesList.find(s => s.id === formData.series_id);
      const segment_id = selectedSeriesObj ? selectedSeriesObj.segment_id : null;
      const { id: _id, created_at, updated_at, ...cleanData } = formData;
      const payload = { ...cleanData, school_id: selectedSchoolId, segment_id, user_id: user?.id, visit_date: cleanData.visit_date || null, revisit_date_1: cleanData.revisit_date_1 || null, revisit_date_2: cleanData.revisit_date_2 || null };
      const { error } = id ? await supabase.from('observations').update(payload).eq('id', id) : await supabase.from('observations').insert([payload]);
      if (error) throw error;
      setIsDirty(false);
      setSuccess(true);
      window.scrollTo(0,0);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erro ao salvar formulário.');
    } finally { setLoading(false); }
  };

  const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
  let availableSeries = seriesList;
  let availableSubjects = subjects;
  if (selectedTeacher) {
    if (selectedTeacher.teacher_series?.length > 0) {
      const allowedSeriesIds = selectedTeacher.teacher_series.map(ts => ts.series_id);
      availableSeries = seriesList.filter(s => allowedSeriesIds.includes(s.id));
    }
    if (selectedTeacher.teacher_type === 'especialista') {
      if (selectedTeacher.teacher_subjects?.length > 0) {
        const allowedSubjectIds = selectedTeacher.teacher_subjects.map(ts => ts.subject_id);
        availableSubjects = subjects.filter(s => allowedSubjectIds.includes(s.id));
      } else availableSubjects = [];
    } else {
      const allowedSegments = Array.from(new Set(selectedTeacher.teacher_series.map(ts => seriesList.find(s => s.id === ts.series_id)?.segment_id).filter(Boolean)));
      availableSubjects = subjects.filter(sub => sub.segment_subjects && sub.segment_subjects.some(ss => allowedSegments.includes(ss.segment_id)));
    }
  }

  if (success) {
    return (
      <div className="container flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
        <h1 className="h1">Salvo com Sucesso!</h1>
        <Button onClick={() => id ? navigate('/') : window.location.reload()}>{id ? 'Voltar ao Dashboard' : 'Preencher Nova Observação'}</Button>
      </div>
    );
  }

  const activeThemeColor = 'var(--primary)';

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
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <h1 className="h1">Observação em Sala de Aula</h1>
        </div>

        {/* Modern Tabs Structure */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '-1px', 
          position: 'relative', 
          zIndex: 1,
          paddingLeft: 'var(--space-2)'
        }}>
          {/* Tab 1: Original */}
          <button 
            type="button" 
            onClick={() => setActiveTab(1)} 
            className="transition-all"
            style={{ 
              padding: '12px 24px',
              fontSize: '14px',
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
              gap: '8px'
            }}
          >
            1ª Visita (Original)
          </button>
          
          {/* Tab 2: Revisita 1 */}
          {formData.revisit_date_1 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(2)} 
              className="transition-all"
              style={{ 
                padding: '12px 20px 12px 24px',
                fontSize: '14px',
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
                gap: '10px'
              }}
            >
              2ª Visita (Verde)
              {/* Show 'X' only if it's the LATEST revisit */}
              {!formData.revisit_date_2 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(2); }}
                  className="hover:bg-red-50 p-1 rounded-full transition-colors"
                  style={{ color: 'var(--error)', display: 'flex' }}
                >
                  <Trash2 size={14} />
                </span>
              )}
            </button>
          ) : id && dbVisitCount === 1 && (
            <button 
              type="button" 
              onClick={() => startRevisit(2)} 
              style={{ 
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                borderTop: '1px solid transparent',
                borderLeft: '1px solid transparent',
                borderRight: '1px solid transparent',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--success)',
                opacity: 0.7,
                cursor: 'pointer'
              }}
            >
              + Iniciar Revisita 1
            </button>
          )}

          {/* Tab 3: Revisita 2 */}
          {formData.revisit_date_2 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(3)} 
              className="transition-all"
              style={{ 
                padding: '12px 20px 12px 24px',
                fontSize: '14px',
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
                gap: '10px'
              }}
            >
              3ª Visita (Laranja)
              <span 
                onClick={(e) => { e.stopPropagation(); openDeleteModal(3); }}
                className="hover:bg-red-50 p-1 rounded-full transition-colors"
                style={{ color: 'var(--error)', display: 'flex' }}
              >
                <Trash2 size={14} />
              </span>
            </button>
          ) : id && dbVisitCount === 2 && (
            <button 
              type="button" 
              onClick={() => startRevisit(3)} 
              style={{ 
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                borderTop: '1px solid transparent',
                borderLeft: '1px solid transparent',
                borderRight: '1px solid transparent',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--warning)',
                opacity: 0.7,
                cursor: 'pointer'
              }}
            >
              + Iniciar Revisita 2
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card style={{ marginBottom: 'var(--space-6)', borderLeft: `4px solid ${activeThemeColor}` }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>1. Identificação</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              {activeTab === 1 && <Input label="Data da Visita Original" type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} required disabled={id} />}
              {activeTab === 2 && <Input label="Data da 1ª Revisita (Verde)" type="date" name="revisit_date_1" value={formData.revisit_date_1} onChange={handleChange} required disabled={dbVisitCount >= 2} />}
              {activeTab === 3 && <Input label="Data da 2ª Revisita (Laranja)" type="date" name="revisit_date_2" value={formData.revisit_date_2} onChange={handleChange} required disabled={dbVisitCount >= 3} />}
            </div>
            <Select label="Professor(a)" name="teacher_id" value={formData.teacher_id} onChange={(e) => { handleChange(e); setFormData(prev => ({ ...prev, series_id: '', subject_id: '' })); }} options={teachers.map(t => ({value: t.id, label: t.name}))} required disabled={id} />
            <Select label="Disciplina" name="subject_id" value={formData.subject_id} onChange={handleChange} options={availableSubjects.map(s => ({value: s.id, label: s.name}))} required disabled={id} />
            <Select label="Turma / Série Observada" name="series_id" value={formData.series_id} onChange={handleChange} options={availableSeries.map(s => ({value: s.id, label: `${s.segments?.name} - ${s.name}`}))} required disabled={id} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group mt-4">
              <label className="form-label">Tipo de Visita:</label>
              <Select 
                name="visit_type" 
                value={getEvaluation('visit_type')} 
                onChange={(e) => setEvaluation('visit_type', e.target.value)} 
                options={[
                  { value: 'Formativa', label: 'Formativa' },
                  { value: 'Acompanhamento', label: 'Acompanhamento' },
                  { value: 'Devolutiva', label: 'Devolutiva' },
                  { value: 'Outro', label: 'Outro' }
                ]} 
              />
              {getEvaluation('visit_type') === 'Outro' && (
                <input 
                  type="text" 
                  className="form-input mt-2" 
                  placeholder="Especifique o tipo..." 
                  value={getEvaluation('visit_type_other')} 
                  onChange={(e) => setEvaluation('visit_type_other', e.target.value)} 
                />
              )}
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Objetivos da Visita:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'Acompanhar a prática pedagógica',
                'Observar a aplicação da BNCC e dos referenciais institucionais',
                'Apoiar o desenvolvimento profissional docente',
                'Monitorar processos de ensino e aprendizagem',
                'Outro'
              ].map((obj) => (
                <label key={obj} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getEvaluation('visit_objectives')?.includes(obj) || false}
                    onChange={(e) => {
                      const current = getEvaluation('visit_objectives') || [];
                      const updated = e.target.checked 
                        ? [...current, obj] 
                        : current.filter(item => item !== obj);
                      setEvaluation('visit_objectives', updated);
                    }}
                  />
                  <span className="text-sm">{obj}</span>
                </label>
              ))}
            </div>
            {getEvaluation('visit_objectives')?.includes('Outro') && (
              <input 
                type="text" 
                className="form-input mt-2" 
                placeholder="Especifique outros objetivos..." 
                value={getEvaluation('visit_objectives_other')} 
                onChange={(e) => setEvaluation('visit_objectives_other', e.target.value)} 
              />
            )}
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>3. Planejamento</h2>
            <Select name="planning_evaluation" value={getEvaluation('planning_evaluation')} onChange={(e) => setEvaluation('planning_evaluation', e.target.value)} options={evaluationOptions} />
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

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>4. Metodologia</h2>
            <Select name="methodology_evaluation" value={getEvaluation('methodology_evaluation')} onChange={(e) => setEvaluation('methodology_evaluation', e.target.value)} options={evaluationOptions} />
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

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>5. Avaliação</h2>
            <Select name="learning_evaluation" value={getEvaluation('learning_evaluation')} onChange={(e) => setEvaluation('learning_evaluation', e.target.value)} options={evaluationOptions} />
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

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>6. Gestão de Sala</h2>
            <Select name="management_evaluation" value={getEvaluation('management_evaluation')} onChange={(e) => setEvaluation('management_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="man_space_score" rubricsKey="gestao" label="Organização do espaço e do tempo pedagógico" />
          <ScoreSelector field="man_respect_score" rubricsKey="gestao" label="Relação respeitosa entre professor e estudantes" />
          <ScoreSelector field="man_conflict_score" rubricsKey="gestao" label="Estratégias de mediação de conflitos, quando necessário" />
          <ScoreSelector field="man_environment_score" rubricsKey="gestao" label="Ambiente favorável à aprendizagem" />
          <ScoreSelector field="man_material_score" rubricsKey="gestao" label="Uso adequado do material didático" />
          <ScoreSelector field="man_content_score" rubricsKey="gestao" label="Registro do conteúdo no caderno dos alunos" />
          <ScoreSelector field="man_activities_score" rubricsKey="gestao" label="As atividades são bem orientadas" />
          <ScoreSelector field="man_monitoring_score" rubricsKey="gestao" label="O professor acompanha sua realização circulando pela sala tirando dúvidas" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('management_observations')} onChange={(e) => setComment('management_observations', e.target.value)} />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: activeThemeColor }}>7. Identidade Confessional</h2>
            <Select name="identity_evaluation" value={getEvaluation('identity_evaluation')} onChange={(e) => setEvaluation('identity_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="ident_values_score" rubricsKey="identidade" label="Integração de valores naturais e éticos" />
          <ScoreSelector field="ident_posture_score" rubricsKey="identidade" label="Postura coerente com princípios EA" />
          <ScoreSelector field="ident_language_score" rubricsKey="identidade" label="Linguagem, atitudes e exemplos alinhados à proposta confessional" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <textarea className="form-input" rows="3" value={getComment('identity_observations')} onChange={(e) => setComment('identity_observations', e.target.value)} />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="h2" style={{ color: activeThemeColor, marginBottom: 'var(--space-4)' }}>Síntese e Devolutiva</h2>
          <div className="form-group">
            <label className="form-label">Pontos Fortes:</label>
            <textarea className="form-input" rows="3" value={getComment('strong_points')} onChange={(e) => setComment('strong_points', e.target.value)} />
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Oportunidades de Melhoria:</label>
            <textarea className="form-input" rows="3" value={getComment('improvement_opportunities')} onChange={(e) => setComment('improvement_opportunities', e.target.value)} />
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Diretrizes Pedagógicas:</label>
            <textarea className="form-input" rows="3" value={getComment('pedagogical_guidelines')} onChange={(e) => setComment('pedagogical_guidelines', e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="teacher_aware" name="teacher_aware" checked={formData.teacher_aware} onChange={handleChange} />
            <label htmlFor="teacher_aware" className="text-sm font-semibold">Professor(a) ciente da devolutiva?</label>
          </div>
        </Card>

        {/* STICKY FOOTER: Save and Cancel Buttons */}
        <div className="flex justify-end gap-4 no-print" style={{ 
          position: 'sticky', 
          bottom: 0, 
          zIndex: 20, 
          backgroundColor: 'white', 
          padding: 'var(--space-4)',
          margin: '0 -1rem',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem'
        }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Finalizar Registro')}
          </Button>
        </div>

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
      </form>
    </div>
  );
}
