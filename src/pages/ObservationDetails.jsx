import React from 'react';
import { Card } from '../components/ui';
import { User, Calendar, BookOpen, GraduationCap, CheckCircle2, ClipboardList, Printer } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import bannerImg from '../assets/banner-institucional.png';

const DetailSection = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-6)' }}>
    <h3 className="h3" style={{ 
      color: 'var(--primary)', 
      borderBottom: '1px solid var(--border)', 
      paddingBottom: 'var(--space-2)',
      marginBottom: 'var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }}>
      {title}
    </h3>
    {children}
  </div>
);

const ScoreProgression = ({ label, scores = {} }) => {
  const renderBadge = (score, visitNum, isVisible) => {
    const colors = {
      1: { text: 'var(--primary)', bg: 'var(--primary-light)' },
      2: { text: 'var(--success)', bg: '#ecfdf5' },
      3: { text: 'var(--warning)', bg: '#fffbeb' }
    };
    const { text, bg } = colors[visitNum];
    
    return (
      <div style={{ width: '28px', display: 'flex', justifyContent: 'center' }}>
        {isVisible && score !== null && score !== undefined && (
          <span title={`Visita ${visitNum}`} style={{ 
            color: text, backgroundColor: bg, 
            width: '24px', height: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '4px', 
            fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${text}40`
          }}>
            {score}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-muted" style={{ flex: 1 }}>{label}</span>
      <div className="flex items-center gap-1">
        {renderBadge(scores.v1, 1, true)}
        {renderBadge(scores.v2, 2, scores.v2 !== undefined && scores.v2 !== null && scores.v2 !== scores.v1)}
        {renderBadge(scores.v3, 3, scores.v3 !== undefined && scores.v3 !== null && scores.v3 !== scores.v2)}
      </div>
    </div>
  );
};

const EvaluationBadge = ({ evaluation }) => {
  const getStyles = () => {
    switch (evaluation) {
      case 'Atende plenamente': return { color: 'var(--success)', bg: '#ecfdf5' };
      case 'Atende parcialmente': return { color: '#f59e0b', bg: '#fffbeb' };
      case 'Não atende': return { color: 'var(--error)', bg: '#fef2f2' };
      default: return { color: 'var(--text-muted)', bg: '#f3f4f6' };
    }
  };
  const { color, bg } = getStyles();
  return (
    <span style={{ 
      color, backgroundColor: bg, 
      padding: '4px 12px', borderRadius: 'var(--radius-full)', 
      fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${color}40`
    }}>
      {evaluation || 'N/A'}
    </span>
  );
};

export default function ObservationDetails({ observation }) {
  const { schools, selectedSchoolId } = useSchool();
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      } else if (user?.email) {
        setUserName(user.email.split('@')[0]);
      }
    });
  }, []);

  if (!observation) return null;

  const evaluationOptions = [
    { label: 'Atende plenamente', value: 'Atende plenamente' },
    { label: 'Atende parcialmente', value: 'Atende parcialmente' },
    { label: 'Não atende', value: 'Não atende' },
    { label: 'Não observado', value: 'Não observado' }
  ];

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);



  const [reportModel, setReportModel] = useState('sosa');
  
  useEffect(() => {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      if (reportModel === 'institutional') {
        modal.classList.add('hide-modal-title');
      } else {
        modal.classList.remove('hide-modal-title');
      }
    }
    // Cleanup on unmount
    return () => {
      const modal = document.querySelector('.modal-overlay');
      if (modal) modal.classList.remove('hide-modal-title');
    };
  }, [reportModel]);

  const handlePrint = () => {
    window.print();
  };

  const renderSosaModel = () => (
    <>
      {/* 1. IDENTIFICAÇÃO */}
      <DetailSection title={<><User size={20} className="no-print" /> 1. Identificação</>}>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <label className="text-xs font-bold text-muted uppercase block">Professor(a)</label>
            <p className="text-sm font-medium">{observation.teachers?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase block">Data da Visita Original</label>
            <p className="text-sm font-medium">{observation.visit_date ? observation.visit_date.split('-').reverse().join('/') : 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase block">Bimestre</label>
            <p className="text-sm font-medium">{observation.bimestre || 'N/A'}</p>
          </div>
          {observation.revisit_date_1 && (
            <div>
              <label className="text-xs font-bold text-muted uppercase block" style={{ color: 'var(--success)' }}>1ª Revisita</label>
              <p className="text-sm font-medium">{observation.revisit_date_1.split('-').reverse().join('/')}</p>
            </div>
          )}
          {observation.revisit_date_2 && (
            <div>
              <label className="text-xs font-bold text-muted uppercase block" style={{ color: 'var(--warning)' }}>2ª Revisita</label>
              <p className="text-sm font-medium">{observation.revisit_date_2.split('-').reverse().join('/')}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-muted uppercase block">Disciplina</label>
            <p className="text-sm font-medium">{observation.subjects?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase block">Série / Turma</label>
            <p className="text-sm font-medium">
              {observation.series?.segments?.name || observation.series?.name || 'N/A'} {observation.series?.name ? `- ${observation.series.name}` : ''}
            </p>
          </div>
          <div className="grid-cols-2">
            <label className="text-xs font-bold text-muted uppercase block">Tipo de Visita</label>
            <p className="text-sm font-medium">{observation.visit_type === 'Outro' ? observation.visit_type_other : observation.visit_type}</p>
          </div>
        </div>
        
        <div style={{ marginTop: 'var(--space-4)' }}>
          <label className="text-xs font-bold text-muted uppercase block" style={{ marginBottom: 'var(--space-2)' }}>Objetivos da Visita</label>
          <div className="flex flex-wrap gap-2">
            {observation.visit_objectives?.map((obj, i) => (
              <span key={i} className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid #ddd' }}>
                {obj === 'Outro' ? observation.visit_objectives_other : obj}
              </span>
            ))}
          </div>
        </div>
      </DetailSection>

      {/* EVALUATIONS */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* 3. Planejamento */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">3. Planejamento e Alinhamento Curricular</h4>
            <div className="flex gap-2">
              <EvaluationBadge evaluation={observation.planning_evaluation} />
              {observation.evaluations_v2?.planning_evaluation && observation.evaluations_v2.planning_evaluation !== observation.planning_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v2.planning_evaluation} />
              )}
              {observation.evaluations_v3?.planning_evaluation && observation.evaluations_v3.planning_evaluation !== observation.evaluations_v2?.planning_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v3.planning_evaluation} />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <ScoreProgression label="Alinhamento às habilidades/competências da BNCC" scores={{v1: observation.plan_alignment_score, v2: observation.scores_v2?.plan_alignment_score, v3: observation.scores_v3?.plan_alignment_score}} />
            <ScoreProgression label="Conteúdo de acordo com Sequência Didática" scores={{v1: observation.plan_content_score, v2: observation.scores_v2?.plan_content_score, v3: observation.scores_v3?.plan_content_score}} />
            <ScoreProgression label="Objetivos claros e coerentes" scores={{v1: observation.plan_objectives_score, v2: observation.scores_v2?.plan_objectives_score, v3: observation.scores_v3?.plan_objectives_score}} />
            <ScoreProgression label="Conexão com referenciais institucionais" scores={{v1: observation.plan_references_score, v2: observation.scores_v2?.plan_references_score, v3: observation.scores_v3?.plan_references_score}} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {observation.planning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>1ª Visita</p>
                <p className="text-[10px]">{observation.planning_observations}</p>
              </div>
            )}
            {observation.comments_v2?.planning_observations && observation.comments_v2.planning_observations !== observation.planning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#4ade80', textTransform: 'uppercase', marginBottom: '2px' }}>2ª Visita</p>
                <p className="text-[10px]">{observation.comments_v2.planning_observations}</p>
              </div>
            )}
            {observation.comments_v3?.planning_observations && observation.comments_v3.planning_observations !== observation.comments_v2?.planning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>3ª Visita</p>
                <p className="text-[10px]">{observation.comments_v3.planning_observations}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 4. Metodologia */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">4. Metodologia e Estratégias de Ensino</h4>
            <div className="flex gap-2">
              <EvaluationBadge evaluation={observation.methodology_evaluation} />
              {observation.evaluations_v2?.methodology_evaluation && observation.evaluations_v2.methodology_evaluation !== observation.methodology_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v2.methodology_evaluation} />
              )}
              {observation.evaluations_v3?.methodology_evaluation && observation.evaluations_v3.methodology_evaluation !== observation.evaluations_v2?.methodology_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v3.methodology_evaluation} />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <ScoreProgression label="Adequação à faixa etária/componente" scores={{v1: observation.meth_adequate_score, v2: observation.scores_v2?.meth_adequate_score, v3: observation.scores_v3?.meth_adequate_score}} />
            <ScoreProgression label="Estratégias que favorecem o aprendizado" scores={{v1: observation.meth_strategies_score, v2: observation.scores_v2?.meth_strategies_score, v3: observation.scores_v3?.meth_strategies_score}} />
            <ScoreProgression label="Uso intencional de recursos" scores={{v1: observation.meth_resources_score, v2: observation.scores_v2?.meth_resources_score, v3: observation.scores_v3?.meth_resources_score}} />
            <ScoreProgression label="Clareza na condução e orientações" scores={{v1: observation.meth_clarity_score, v2: observation.scores_v2?.meth_clarity_score, v3: observation.scores_v3?.meth_clarity_score}} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {observation.methodology_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>1ª Visita</p>
                <p className="text-[10px]">{observation.methodology_observations}</p>
              </div>
            )}
            {observation.comments_v2?.methodology_observations && observation.comments_v2.methodology_observations !== observation.methodology_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#4ade80', textTransform: 'uppercase', marginBottom: '2px' }}>2ª Visita</p>
                <p className="text-[10px]">{observation.comments_v2.methodology_observations}</p>
              </div>
            )}
            {observation.comments_v3?.methodology_observations && observation.comments_v3.methodology_observations !== observation.comments_v2?.methodology_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>3ª Visita</p>
                <p className="text-[10px]">{observation.comments_v3.methodology_observations}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 5. Avaliação */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">5. Avaliação da Aprendizagem</h4>
            <div className="flex gap-2">
              <EvaluationBadge evaluation={observation.learning_evaluation} />
              {observation.evaluations_v2?.learning_evaluation && observation.evaluations_v2.learning_evaluation !== observation.learning_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v2.learning_evaluation} />
              )}
              {observation.evaluations_v3?.learning_evaluation && observation.evaluations_v3.learning_evaluation !== observation.evaluations_v2?.learning_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v3.learning_evaluation} />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <ScoreProgression label="Instrumentos coerentes com objetivos" scores={{v1: observation.learn_instruments_score, v2: observation.scores_v2?.learn_instruments_score, v3: observation.scores_v3?.learn_instruments_score}} />
            <ScoreProgression label="Avaliação formativa presente" scores={{v1: observation.learn_formative_score, v2: observation.scores_v2?.learn_formative_score, v3: observation.scores_v3?.learn_formative_score}} />
            <ScoreProgression label="Devolutivas claras aos estudantes" scores={{v1: observation.learn_feedback_score, v2: observation.scores_v2?.learn_feedback_score, v3: observation.scores_v3?.learn_feedback_score}} />
            <ScoreProgression label="Critérios alinhados ao planejamento" scores={{v1: observation.learn_criteria_score, v2: observation.scores_v2?.learn_criteria_score, v3: observation.scores_v3?.learn_criteria_score}} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {observation.learning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>1ª Visita</p>
                <p className="text-[10px]">{observation.learning_observations}</p>
              </div>
            )}
            {observation.comments_v2?.learning_observations && observation.comments_v2.learning_observations !== observation.learning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#4ade80', textTransform: 'uppercase', marginBottom: '2px' }}>2ª Visita</p>
                <p className="text-[10px]">{observation.comments_v2.learning_observations}</p>
              </div>
            )}
            {observation.comments_v3?.learning_observations && observation.comments_v3.learning_observations !== observation.comments_v2?.learning_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>3ª Visita</p>
                <p className="text-[10px]">{observation.comments_v3.learning_observations}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 6. Gestão */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">6. Gestão de Sala e Clima Escolar</h4>
            <div className="flex gap-2">
              <EvaluationBadge evaluation={observation.management_evaluation} />
              {observation.evaluations_v2?.management_evaluation && observation.evaluations_v2.management_evaluation !== observation.management_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v2.management_evaluation} />
              )}
              {observation.evaluations_v3?.management_evaluation && observation.evaluations_v3.management_evaluation !== observation.evaluations_v2?.management_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v3.management_evaluation} />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <ScoreProgression label="Organização do espaço/tempo" scores={{v1: observation.man_space_score, v2: observation.scores_v2?.man_space_score, v3: observation.scores_v3?.man_space_score}} />
            <ScoreProgression label="Relação respeitosa" scores={{v1: observation.man_respect_score, v2: observation.scores_v2?.man_respect_score, v3: observation.scores_v3?.man_respect_score}} />
            <ScoreProgression label="Mediação de conflitos" scores={{v1: observation.man_conflict_score, v2: observation.scores_v2?.man_conflict_score, v3: observation.scores_v3?.man_conflict_score}} />
            <ScoreProgression label="Ambiente favorável à aprendizagem" scores={{v1: observation.man_environment_score, v2: observation.scores_v2?.man_environment_score, v3: observation.scores_v3?.man_environment_score}} />
            <ScoreProgression label="Uso do material didático" scores={{v1: observation.man_material_score, v2: observation.scores_v2?.man_material_score, v3: observation.scores_v3?.man_material_score}} />
            <ScoreProgression label="Registro no caderno" scores={{v1: observation.man_content_score, v2: observation.scores_v2?.man_content_score, v3: observation.scores_v3?.man_content_score}} />
            <ScoreProgression label="Atividades bem orientadas" scores={{v1: observation.man_activities_score, v2: observation.scores_v2?.man_activities_score, v3: observation.scores_v3?.man_activities_score}} />
            <ScoreProgression label="Acompanhamento circulando pela sala" scores={{v1: observation.man_monitoring_score, v2: observation.scores_v2?.man_monitoring_score, v3: observation.scores_v3?.man_monitoring_score}} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {observation.management_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>1ª Visita</p>
                <p className="text-[10px]">{observation.management_observations}</p>
              </div>
            )}
            {observation.comments_v2?.management_observations && observation.comments_v2.management_observations !== observation.management_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#4ade80', textTransform: 'uppercase', marginBottom: '2px' }}>2ª Visita</p>
                <p className="text-[10px]">{observation.comments_v2.management_observations}</p>
              </div>
            )}
            {observation.comments_v3?.management_observations && observation.comments_v3.management_observations !== observation.comments_v2?.management_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>3ª Visita</p>
                <p className="text-[10px]">{observation.comments_v3.management_observations}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 7. Identidade */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">7. Identidade Confessional e Valores</h4>
            <div className="flex gap-2">
              <EvaluationBadge evaluation={observation.identity_evaluation} />
              {observation.evaluations_v2?.identity_evaluation && observation.evaluations_v2.identity_evaluation !== observation.identity_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v2.identity_evaluation} />
              )}
              {observation.evaluations_v3?.identity_evaluation && observation.evaluations_v3.identity_evaluation !== observation.evaluations_v2?.identity_evaluation && (
                <EvaluationBadge evaluation={observation.evaluations_v3.identity_evaluation} />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <ScoreProgression label="Integração de valores" scores={{v1: observation.ident_values_score, v2: observation.scores_v2?.ident_values_score, v3: observation.scores_v3?.ident_values_score}} />
            <ScoreProgression label="Postura docente coerente" scores={{v1: observation.ident_posture_score, v2: observation.scores_v2?.ident_posture_score, v3: observation.scores_v3?.ident_posture_score}} />
            <ScoreProgression label="Linguagem/exemplos alinhados" scores={{v1: observation.ident_language_score, v2: observation.scores_v2?.ident_language_score, v3: observation.scores_v3?.ident_language_score}} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {observation.identity_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>1ª Visita</p>
                <p className="text-[10px]">{observation.identity_observations}</p>
              </div>
            )}
            {observation.comments_v2?.identity_observations && observation.comments_v2.identity_observations !== observation.identity_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#4ade80', textTransform: 'uppercase', marginBottom: '2px' }}>2ª Visita</p>
                <p className="text-[10px]">{observation.comments_v2.identity_observations}</p>
              </div>
            )}
            {observation.comments_v3?.identity_observations && observation.comments_v3.identity_observations !== observation.comments_v2?.identity_observations && (
              <div style={{ padding: 'var(--space-2)', backgroundColor: '#fffbeb', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                <p style={{ fontSize: '9px', fontWeight: 500, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '2px' }}>3ª Visita</p>
                <p className="text-[10px]">{observation.comments_v3.identity_observations}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 8-10. SÍNTESE E DEVOLUTIVA - FORCE PAGE BREAK */}
      <div className="page-break" />
      <DetailSection title={<><ClipboardList size={20} className="no-print" /> Síntese e Devolutiva</>}>
        <div className="grid grid-cols-1 gap-4">
          <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', borderLeft: '4px solid #0ea5e9' }}>
            <label className="text-xs font-bold uppercase block mb-1" style={{ color: '#0369a1' }}>8. Pontos Fortes</label>
            <p className="text-sm">{observation.strong_points || 'Nenhum registro.'}</p>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', borderLeft: '4px solid #f97316' }}>
            <label className="text-xs font-bold uppercase block mb-1" style={{ color: '#c2410c' }}>9. Oportunidades de Aprimoramento</label>
            <p className="text-sm">{observation.improvement_opportunities || 'Nenhum registro.'}</p>
          </div>
          <div style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
            <h4 className="font-bold text-sm mb-3">10. Devolutiva ao(à) Professor(a)</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase block mb-1">Síntese da Observação</label>
                <p className="text-sm">{observation.observation_synthesis || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase block mb-1">Orientações Pedagógicas</label>
                <p className="text-sm">{observation.pedagogical_guidelines || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-muted uppercase block mb-1">Combinados e Encaminhamentos</label>
                <p className="text-sm">{observation.forwarding || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ padding: 'var(--space-2)' }}>
            <CheckCircle2 size={16} color={observation.teacher_aware ? 'var(--success)' : 'var(--text-tertiary)'} />
            <span className="text-xs font-bold">
              {observation.teacher_aware ? 'Professor(a) ciente da devolutiva' : 'Professor(a) NÃO ciente da devolutiva'}
            </span>
          </div>
        </div>
      </DetailSection>
    </>
  );

  const renderInstitutionalModel = () => {
    if (!observation) return null;

    // Helper to get data for a specific visit with inheritance fallbacks
    const getVisitData = (visitNum) => {
      const v1 = observation;
      const v2 = observation.evaluations_v2 || {};
      const v3 = observation.evaluations_v3 || {};
      const s2 = observation.scores_v2 || {};
      const s3 = observation.scores_v3 || {};
      const c2 = observation.comments_v2 || {};
      const c3 = observation.comments_v3 || {};

      const getField = (field, type = 'evaluation') => {
        const val1 = v1[field];
        let val2, val3;
        
        if (type === 'score') {
          val2 = s2[field];
          val3 = s3[field];
        } else if (type === 'comment') {
          val2 = c2[field];
          val3 = c3[field];
        } else {
          val2 = v2[field];
          val3 = v3[field];
        }

        if (visitNum === 1) return val1;
        if (visitNum === 2) return (val2 !== undefined && val2 !== null) ? val2 : val1;
        if (visitNum === 3) {
          if (val3 !== undefined && val3 !== null) return val3;
          if (val2 !== undefined && val2 !== null) return val2;
          return val1;
        }
        return null;
      };

      return {
        date: visitNum === 1 ? observation.visit_date : (visitNum === 2 ? observation.revisit_date_1 : observation.revisit_date_2),
        type: getField('visit_type'),
        type_other: getField('visit_type_other'),
        objectives: getField('visit_objectives') || [],
        objectives_other: getField('visit_objectives_other'),
        evaluations: {
          planning: getField('planning_evaluation'),
          methodology: getField('methodology_evaluation'),
          learning: getField('learning_evaluation'),
          management: getField('management_evaluation'),
          identity: getField('identity_evaluation')
        },
        scores: {
          plan_alignment: getField('plan_alignment_score', 'score'),
          plan_content: getField('plan_content_score', 'score'),
          plan_objectives: getField('plan_objectives_score', 'score'),
          plan_references: getField('plan_references_score', 'score'),
          meth_adequate: getField('meth_adequate_score', 'score'),
          meth_strategies: getField('meth_strategies_score', 'score'),
          meth_resources: getField('meth_resources_score', 'score'),
          meth_clarity: getField('meth_clarity_score', 'score'),
          learn_instruments: getField('learn_instruments_score', 'score'),
          learn_formative: getField('learn_formative_score', 'score'),
          learn_feedback: getField('learn_feedback_score', 'score'),
          learn_criteria: getField('learn_criteria_score', 'score'),
          man_space: getField('man_space_score', 'score'),
          man_respect: getField('man_respect_score', 'score'),
          man_conflict: getField('man_conflict_score', 'score'),
          man_environment: getField('man_environment_score', 'score'),
          man_material: getField('man_material_score', 'score'),
          man_content: getField('man_content_score', 'score'),
          man_activities: getField('man_activities_score', 'score'),
          man_monitoring: getField('man_monitoring_score', 'score'),
          ident_values: getField('ident_values_score', 'score'),
          ident_posture: getField('ident_posture_score', 'score'),
          ident_language: getField('ident_language_score', 'score')
        },
        comments: {
          planning: getField('planning_observations', 'comment'),
          methodology: getField('methodology_observations', 'comment'),
          learning: getField('learning_observations', 'comment'),
          management: getField('management_observations', 'comment'),
          identity: getField('identity_observations', 'comment'),
          strong_points: getField('strong_points', 'comment'),
          improvement: getField('improvement_opportunities', 'comment'),
          guidelines: getField('pedagogical_guidelines', 'comment'),
          synthesis: getField('observation_synthesis', 'comment'),
          forwarding: getField('forwarding', 'comment')
        },
        teacher_aware: getField('teacher_aware')
      };
    };

    const visitCount = observation.revisit_date_2 ? 3 : (observation.revisit_date_1 ? 2 : 1);
    const pages = [];

    const isChecked = (val, target) => val === target ? '(X)' : '( )';
    
    // NEW: Smart colored markers for rubric grid only
    const renderScoreMarkers = (field, score, currentPage) => {
      const v1 = observation[field];
      const v2 = observation.scores_v2?.[field];
      const v3 = observation.scores_v3?.[field];

      const markers = [];
      const colors = { 1: '#0ea5e9', 2: '#10b981', 3: '#f59e0b' };

      // Rule: Page 1 always shows original in Blue (or black if you prefer, but Blue is the 'Original' ID)
      if (v1 === score) {
        markers.push(<span key="1" style={{ color: colors[1] }}>X</span>);
      }

      // Rule: Page 2 shows V2 if it changed from V1
      if (currentPage >= 2 && v2 !== undefined && v2 !== null && v2 !== v1 && v2 === score) {
        markers.push(<span key="2" style={{ color: colors[2] }}>X</span>);
      }

      // Rule: Page 3 shows V3 if it changed from V2 (or V1)
      if (currentPage === 3 && v3 !== undefined && v3 !== null && v3 !== v2 && v3 !== v1 && v3 === score) {
        markers.push(<span key="3" style={{ color: colors[3] }}>X</span>);
      }

      return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', fontWeight: 'bold' }}>
          {markers}
        </div>
      );
    };

    for (let v = 1; v <= visitCount; v++) {
      const data = getVisitData(v);

      pages.push(
        <div key={v} className="institutional-model" style={{ 
          color: '#000', 
          fontFamily: '"Times New Roman", Times, serif',
          lineHeight: '1.2',
          backgroundColor: 'white',
          padding: '20px',
          marginBottom: v < visitCount ? '50px' : '0',
          pageBreakAfter: 'always'
        }}>
          {/* HEADER */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img 
              src={bannerImg} 
              alt="Banner Institucional" 
              style={{ width: '100%', maxHeight: '100px', objectFit: 'contain', marginBottom: '10px' }} 
            />
            <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
              INSTRUMENTO DE OBSERVAÇÃO EM SALA DE AULA
            </h1>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0' }}>
              Coordenação Pedagógica – {observation.series?.segments?.name || observation.series?.name || 'N/A'}
            </h2>
          </div>

          {/* 1. IDENTIFICAÇÃO */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <thead>
              <tr>
                <th colSpan="4" style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '12px' }}>
                  1. IDENTIFICAÇÃO
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px', width: '50%' }}>
                  <strong>Unidade Escolar:</strong> {selectedSchool?.name}
                </td>
                <td colSpan="3" style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                  <strong>Data da Visita:</strong> {data.date ? data.date.split('-').reverse().join('/') : 'N/A'}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                  <strong>Professor(a):</strong> {observation.teachers?.name}
                </td>
                <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px', width: '25%' }}>
                  <strong>Disciplina:</strong> {observation.subjects?.name}
                </td>
                <td colSpan="2" style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                  <strong>Ano/Série:</strong> {observation.series?.name}
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                  <strong>Tipo de Visita:</strong> 
                  <span style={{ marginLeft: '10px' }}>{isChecked(data.type, 'Formativa')} Formativa</span>
                  <span style={{ marginLeft: '10px' }}>{isChecked(data.type, 'Acompanhamento')} Acompanhamento</span>
                  <span style={{ marginLeft: '10px' }}>{isChecked(data.type, 'Devolutiva')} Devolutiva</span>
                  <span style={{ marginLeft: '10px' }}>{data.type === 'Outro' ? `(X) Outro: ${data.type_other}` : '( ) Outro: __________'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* OBJECTIVES */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '12px', width: '90%' }}>
                  Objetivos da Visita
                </th>
                <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', backgroundColor: '#f3f4f6', fontSize: '12px' }}>
                  (✓)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                'Acompanhar a prática pedagógica',
                'Observar a aplicação da BNCC e dos referenciais institucionais',
                'Apoiar o desenvolvimento profissional docente',
                'Monitorar processos de ensino e aprendizagem'
              ].map((obj, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>{obj}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                    {data.objectives.includes(obj) ? '✓' : ''}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                  <strong>Outro:</strong> {data.objectives.includes('Outro') ? data.objectives_other : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {data.objectives.includes('Outro') ? '✓' : ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* RUBRICS */}
          {[
            { 
              id: 3, title: 'PLANEJAMENTO E ALINHAMENTO CURRICULAR', 
              base: 'Baseado na Sequência Didática (SD) e Plano de Aula (PA)',
              eval: data.evaluations.planning,
              obs: data.comments.planning,
              items: [
                { label: 'O plano de aula está alinhado às habilidades/competências da BNCC.', key: 'plan_alignment_score' },
                { label: 'O conteúdo aplicado está de acordo com a Sequência Didática da AP.', key: 'plan_content_score' },
                { label: 'Os objetivos da aula estão claros e coerentes com a série/ano.', key: 'plan_objectives_score' },
                { label: 'Há conexão com os referenciais curriculares institucionais.', key: 'plan_references_score' }
              ]
            },
            { 
              id: 4, title: 'METODOLOGIA E ESTRATÉGIAS DE ENSINO', 
              eval: data.evaluations.methodology,
              obs: data.comments.methodology,
              items: [
                { label: 'Metodologias adequadas à faixa etária e ao componente curricular.', key: 'meth_adequate_score' },
                { label: 'Estratégias que favorecem o aprendizado do estudante.', key: 'meth_strategies_score' },
                { label: 'Uso Intencional de recursos didáticos e tecnológicos.', key: 'meth_resources_score' },
                { label: 'Clareza na condução da aula e nas orientações dadas aos alunos.', key: 'meth_clarity_score' }
              ]
            },
            { 
              id: 5, title: 'AVALIAÇÃO DA APRENDIZAGEM', 
              subtitle: 'Conforme princípios da avaliação formativa e institucional',
              eval: data.evaluations.learning,
              obs: data.comments.learning,
              items: [
                { label: 'Instrumentos avaliativos coerentes com os objetivos propostos.', key: 'learn_instruments_score' },
                { label: 'Evidências de avaliação formativa e acompanhamento individual.', key: 'learn_formative_score' },
                { label: 'Devolutivas claras aos estudantes sobre seu desempenho.', key: 'learn_feedback_score' },
                { label: 'Critérios de avaliação alinhados ao planejamento.', key: 'learn_criteria_score' }
              ]
            },
            { 
              id: 6, title: 'GESTÃO DE SALA DE AULA E CLIMA ESCOLAR', 
              eval: data.evaluations.management,
              obs: data.comments.management,
              items: [
                { label: 'Organização do espaço e do tempo pedagógico.', key: 'man_space_score' },
                { label: 'Relação respeitosa entre professor e estudantes.', key: 'man_respect_score' },
                { label: 'Estratégias de mediação de conflitos, quando necessário.', key: 'man_conflict_score' },
                { label: 'Ambiente favorável à aprendizagem.', key: 'man_environment_score' },
                { label: 'Uso adequado do material didático.', key: 'man_material_score' },
                { label: 'Registro do conteúdo no caderno dos alunos.', key: 'man_content_score' },
                { label: 'As atividades são bem orientadas.', key: 'man_activities_score' },
                { label: 'O professor acompanha sua realização circulando pela sala tirando dúvidas dos alunos.', key: 'man_monitoring_score' }
              ]
            },
            { 
              id: 7, title: 'IDENTIDADE CONFESSIONAL E VALORES ADVENTISTAS', 
              eval: data.evaluations.identity,
              obs: data.comments.identity,
              items: [
                { label: 'Integração de valores filosóficos de forma natural e ética.', key: 'ident_values_score' },
                { label: 'Postura docente coerente com os princípios da Ed. Adventista.', key: 'ident_posture_score' },
                { label: 'Linguagem, atitudes e exemplos alinhados à proposta confessional.', key: 'ident_language_score' }
              ]
            }
          ].map((section) => (
            <table key={section.id} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <thead>
                <tr>
                  <th colSpan="5" style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '11px' }}>
                    {section.id}. {section.title}
                    {section.base && <div style={{ fontSize: '9px', fontWeight: 'normal', fontStyle: 'italic' }}>{section.base}</div>}
                    {section.subtitle && <div style={{ fontSize: '9px', fontWeight: 'normal', fontStyle: 'italic' }}>{section.subtitle}</div>}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #000', padding: '4px', fontSize: '10px' }}>
                    <strong>Avaliação:</strong>
                    <span style={{ marginLeft: '10px' }}>{isChecked(section.eval, 'Atende plenamente')} Atende plenamente</span>
                    <span style={{ marginLeft: '10px' }}>{isChecked(section.eval, 'Atende parcialmente')} Atende parcialmente</span>
                    <span style={{ marginLeft: '10px' }}>{isChecked(section.eval, 'Não atende')} Não atende</span>
                    <span style={{ marginLeft: '10px' }}>{isChecked(section.eval, 'Não observado')} Não observado</span>
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f9fafb', textAlign: 'center', fontSize: '9px' }}>
                  <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'left', width: '80%' }}>4- Excelente / 3- Adequado / 2 – Em desenvolvimento / 1- Necessita de Acompanhamento</td>
                  <td style={{ border: '1px solid #000', padding: '2px', width: '5%' }}>4</td>
                  <td style={{ border: '1px solid #000', padding: '2px', width: '5%' }}>3</td>
                  <td style={{ border: '1px solid #000', padding: '2px', width: '5%' }}>2</td>
                  <td style={{ border: '1px solid #000', padding: '2px', width: '5%' }}>1</td>
                </tr>
                {section.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '4px', fontSize: '10px' }}>{item.label}</td>
                    {[4, 3, 2, 1].map(s => (
                      <td key={s} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px' }}>
                        {renderScoreMarkers(item.key, s, v)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', minHeight: '40px' }}>
                    <strong>Observações da Coordenação:</strong> {section.obs}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}

          {/* REMAINING SECTIONS */}
          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            <strong>8. PONTOS FORTES DA AULA:</strong>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{data.comments.strong_points}</div>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            <strong>9. OPORTUNIDADES DE APRIMORAMENTO:</strong>
            <div style={{ fontSize: '9px', fontStyle: 'italic' }}>(Orientações formativas da coordenação pedagógica)</div>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{data.comments.improvement}</div>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            <strong>10. DEVOLUTIVA AO(À) PROFESSOR(A)</strong>
            <div style={{ fontWeight: 'bold' }}>Síntese da Observação:</div>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{data.comments.synthesis}</div>
            
            <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Orientações Pedagógicas:</div>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{data.comments.guidelines}</div>
            
            <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Combinados e Encaminhamentos:</div>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{data.comments.forwarding}</div>
          </div>

          <div style={{ fontSize: '11px', marginTop: '20px' }}>
            <strong>11. REGISTRO FINAL</strong> - Professor(a) ciente da devolutiva: 
            <span style={{ marginLeft: '10px' }}>{isChecked(data.teacher_aware, true)} Sim</span>
            <span style={{ marginLeft: '10px' }}>{isChecked(data.teacher_aware, false)} Não</span>
          </div>

          <div style={{ marginTop: '40px', fontSize: '11px' }}>
            <div style={{ marginBottom: '15px' }}>Assinatura da Coordenação Pedagógica: ________________________________________________</div>
            <div style={{ marginBottom: '15px' }}>Assinatura do(a) Professor(a): ________________________________________________</div>
            <div>Data: ____ / ____ / ________</div>
          </div>

          <div style={{ marginTop: '30px', fontSize: '10px', fontStyle: 'italic', textAlign: 'justify', color: '#444' }}>
            <strong>Observação Institucional:</strong> Este instrumento tem caráter formativo, orientador e colaborativo, conforme o Regimento Escolar e a proposta pedagógica da Rede Adventista de Educação, visando ao fortalecimento da prática docente e à melhoria contínua da aprendizagem dos estudantes.
          </div>
        </div>
      );
    }

    return (
      <div className="institutional-model-wrapper no-scrollbar" style={{ 
        maxWidth: '850px', 
        margin: '0 auto',
        backgroundColor: '#eee',
        padding: '20px'
      }}>
        {pages}
      </div>
    );
  };

  return (
    <div className="printable-area animate-fade-in" style={{ padding: '0 var(--space-2)' }}>
      {/* CABEÇALHO PROFISSIONAL (Apenas para Modelo SOSA) */}
      {reportModel === 'sosa' && (
        <div className="print-only" style={{ marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ 
                width: '50px', height: '50px', backgroundColor: 'var(--primary)', 
                borderRadius: '8px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px' 
              }}>S</div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#000' }}>SOSA</h1>
                <p style={{ fontSize: '11px', margin: 0, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Sistema de Observação em Sala de Aula
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#000' }}>{selectedSchool?.name || 'Unidade Escolar'}</h2>
              <p style={{ fontSize: '11px', margin: 0, color: '#444' }}>Relatório Individual de Observação Pedagógica</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center no-print" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex gap-2">
          <button 
            onClick={() => setReportModel('sosa')} 
            className={`btn btn-xs ${reportModel === 'sosa' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Modelo SOSA
          </button>
          <button 
            onClick={() => setReportModel('institutional')} 
            className={`btn btn-xs ${reportModel === 'institutional' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Modelo Institucional
          </button>
        </div>
        <button onClick={handlePrint} className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Printer size={18} /> Gerar PDF / Imprimir
        </button>
      </div>

      {reportModel === 'sosa' ? renderSosaModel() : renderInstitutionalModel()}

      {/* ÁREA DE ASSINATURAS (Apenas para Modelo SOSA) */}
      {reportModel === 'sosa' && (
        <div className="print-only signature-container" style={{ marginTop: '100px', textAlign: 'center' }}>
          <div style={{ width: '250px', borderTop: '1px solid #000', paddingTop: '15px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{userName || 'Coordenação Pedagógica'}</p>
            <p style={{ fontSize: '11px', color: '#444', margin: 0 }}>Coordenação Pedagógica</p>
          </div>
          <div style={{ width: '250px', borderTop: '1px solid #000', paddingTop: '15px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{observation.teachers?.name || 'Professor(a) Observado(a)'}</p>
            <p style={{ fontSize: '11px', color: '#444', margin: 0 }}>Professor(a) Observado(a)</p>
            <p style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>Ciente em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
