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

const ScoreDisplay = ({ label, score }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-muted">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-bold" style={{ 
        color: score >= 3 ? 'var(--success)' : score === 2 ? '#f59e0b' : 'var(--error)',
        backgroundColor: score >= 3 ? '#ecfdf5' : score === 2 ? '#fffbeb' : '#fef2f2',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem'
      }}>
        Nota: {score || 'N/A'}
      </span>
    </div>
  </div>
);

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
            <label className="text-xs font-bold text-muted uppercase block">Data da Visita</label>
            <p className="text-sm font-medium">{observation.visit_date ? observation.visit_date.split('-').reverse().join('/') : 'N/A'}</p>
          </div>
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
            <EvaluationBadge evaluation={observation.planning_evaluation} />
          </div>
          <div className="flex flex-col">
            <ScoreDisplay label="Alinhamento às habilidades/competências da BNCC" score={observation.plan_alignment_score} />
            <ScoreDisplay label="Conteúdo de acordo com Sequência Didática" score={observation.plan_content_score} />
            <ScoreDisplay label="Objetivos claros e coerentes" score={observation.plan_objectives_score} />
            <ScoreDisplay label="Conexão com referenciais institucionais" score={observation.plan_references_score} />
          </div>
          {observation.planning_observations && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px dashed #ccc' }}>
              <p className="text-xs font-bold text-muted uppercase mb-1">Observações da Coordenação:</p>
              <p className="text-xs">{observation.planning_observations}</p>
            </div>
          )}
        </Card>

        {/* 4. Metodologia */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">4. Metodologia e Estratégias de Ensino</h4>
            <EvaluationBadge evaluation={observation.methodology_evaluation} />
          </div>
          <div className="flex flex-col">
            <ScoreDisplay label="Adequação à faixa etária/componente" score={observation.meth_adequate_score} />
            <ScoreDisplay label="Estratégias que favorecem o aprendizado" score={observation.meth_strategies_score} />
            <ScoreDisplay label="Uso intencional de recursos" score={observation.meth_resources_score} />
            <ScoreDisplay label="Clareza na condução e orientações" score={observation.meth_clarity_score} />
          </div>
          {observation.methodology_observations && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px dashed #ccc' }}>
              <p className="text-xs font-bold text-muted uppercase mb-1">Observações da Coordenação:</p>
              <p className="text-xs">{observation.methodology_observations}</p>
            </div>
          )}
        </Card>

        {/* 5. Avaliação */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">5. Avaliação da Aprendizagem</h4>
            <EvaluationBadge evaluation={observation.learning_evaluation} />
          </div>
          <div className="flex flex-col">
            <ScoreDisplay label="Instrumentos coerentes com objetivos" score={observation.learn_instruments_score} />
            <ScoreDisplay label="Avaliação formativa presente" score={observation.learn_formative_score} />
            <ScoreDisplay label="Devolutivas claras aos estudantes" score={observation.learn_feedback_score} />
            <ScoreDisplay label="Critérios alinhados ao planejamento" score={observation.learn_criteria_score} />
          </div>
          {observation.learning_observations && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px dashed #ccc' }}>
              <p className="text-xs font-bold text-muted uppercase mb-1">Observações da Coordenação:</p>
              <p className="text-xs">{observation.learning_observations}</p>
            </div>
          )}
        </Card>

        {/* 6. Gestão */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">6. Gestão de Sala e Clima Escolar</h4>
            <EvaluationBadge evaluation={observation.management_evaluation} />
          </div>
          <div className="flex flex-col">
            <ScoreDisplay label="Organização do espaço/tempo" score={observation.man_space_score} />
            <ScoreDisplay label="Relação respeitosa" score={observation.man_respect_score} />
            <ScoreDisplay label="Mediação de conflitos" score={observation.man_conflict_score} />
            <ScoreDisplay label="Ambiente favorável à aprendizagem" score={observation.man_environment_score} />
            <ScoreDisplay label="Uso do material didático" score={observation.man_material_score} />
            <ScoreDisplay label="Registro no caderno" score={observation.man_content_score} />
            <ScoreDisplay label="Atividades bem orientadas" score={observation.man_activities_score} />
            <ScoreDisplay label="Acompanhamento circulando pela sala" score={observation.man_monitoring_score} />
          </div>
          {observation.management_observations && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px dashed #ccc' }}>
              <p className="text-xs font-bold text-muted uppercase mb-1">Observações da Coordenação:</p>
              <p className="text-xs">{observation.management_observations}</p>
            </div>
          )}
        </Card>

        {/* 7. Identidade */}
        <Card style={{ padding: 'var(--space-4)', border: '1px solid #eee' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <h4 className="font-bold text-sm">7. Identidade Confessional e Valores</h4>
            <EvaluationBadge evaluation={observation.identity_evaluation} />
          </div>
          <div className="flex flex-col">
            <ScoreDisplay label="Integração de valores" score={observation.ident_values_score} />
            <ScoreDisplay label="Postura docente coerente" score={observation.ident_posture_score} />
            <ScoreDisplay label="Linguagem/exemplos alinhados" score={observation.ident_language_score} />
          </div>
          {observation.identity_observations && (
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px dashed #ccc' }}>
              <p className="text-xs font-bold text-muted uppercase mb-1">Observações da Coordenação:</p>
              <p className="text-xs">{observation.identity_observations}</p>
            </div>
          )}
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
    const isChecked = (val, target) => val === target ? '(X)' : '( )';
    const scoreX = (val, target) => val === target ? 'X' : '';

    return (
      <div className="institutional-model" style={{ 
        color: '#000', 
        fontFamily: '"Times New Roman", Times, serif',
        lineHeight: '1.2'
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
                <strong>Data da Visita:</strong> {observation.visit_date ? observation.visit_date.split('-').reverse().join('/') : 'N/A'}
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
                <span style={{ marginLeft: '10px' }}>{isChecked(observation.visit_type, 'Formativa')} Formativa</span>
                <span style={{ marginLeft: '10px' }}>{isChecked(observation.visit_type, 'Acompanhamento')} Acompanhamento</span>
                <span style={{ marginLeft: '10px' }}>{isChecked(observation.visit_type, 'Devolutiva')} Devolutiva</span>
                <span style={{ marginLeft: '10px' }}>{observation.visit_type === 'Outro' ? `(X) Outro: ${observation.visit_type_other}` : '( ) Outro: __________'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* OBJECTIVES */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '12px', width: '90%' }}>
                +
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
                  {observation.visit_objectives?.includes(obj) ? '✓' : ''}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px', fontSize: '11px' }}>
                <strong>Outro:</strong> {observation.visit_objectives_other || ''}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                {observation.visit_objectives?.includes('Outro') ? '✓' : ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTIONS 3-7 (Iterative) */}
        {[
          { 
            id: 3, title: 'PLANEJAMENTO E ALINHAMENTO CURRICULAR', 
            base: 'Base: BNCC, Referenciais Curriculares da Educação Infantil e Regimento da Educação Adventista',
            eval: observation.planning_evaluation,
            obs: observation.planning_observations,
            items: [
              { label: 'O plano de aula está alinhado às habilidades/competências da BNCC.', score: observation.plan_alignment_score },
              { label: 'O conteúdo aplicado está de acordo com a Sequência Didática da AP.', score: observation.plan_content_score },
              { label: 'Os objetivos da aula estão claros e coerentes com a série/ano.', score: observation.plan_objectives_score },
              { label: 'Há conexão com os referenciais curriculares institucionais.', score: observation.plan_references_score }
            ]
          },
          { 
            id: 4, title: 'METODOLOGIA E ESTRATÉGIAS DE ENSINO', 
            eval: observation.methodology_evaluation,
            obs: observation.methodology_observations,
            items: [
              { label: 'Metodologias adequadas à faixa etária e ao componente curricular.', score: observation.meth_adequate_score },
              { label: 'Estratégias que favorecem o aprendizado do estudante.', score: observation.meth_strategies_score },
              { label: 'Uso Intencional de recursos didáticos e tecnológicos.', score: observation.meth_resources_score },
              { label: 'Clareza na condução da aula e nas orientações dadas aos alunos.', score: observation.meth_clarity_score }
            ]
          },
          { 
            id: 5, title: 'AVALIAÇÃO DA APRENDIZAGEM', 
            subtitle: 'Conforme princípios da avaliação formativa e institucional',
            eval: observation.learning_evaluation,
            obs: observation.learning_observations,
            items: [
              { label: 'Instrumentos avaliativos coerentes com os objetivos da aula.', score: observation.learn_instruments_score },
              { label: 'Avaliação formativa presente durante a aula.', score: observation.learn_formative_score },
              { label: 'Devolutivas claras aos estudantes.', score: observation.learn_feedback_score },
              { label: 'Critérios de avaliação compreensíveis e alinhados ao planejamento.', score: observation.learn_criteria_score }
            ]
          },
          { 
            id: 6, title: 'GESTÃO DE SALA DE AULA E CLIMA ESCOLAR', 
            eval: observation.management_evaluation,
            obs: observation.management_observations,
            items: [
              { label: 'Organização do espaço e do tempo pedagógico.', score: observation.man_space_score },
              { label: 'Relação respeitosa entre professor e estudantes.', score: observation.man_respect_score },
              { label: 'Estratégias de mediação de conflitos, quando necessário.', score: observation.man_conflict_score },
              { label: 'Ambiente favorável à aprendizagem.', score: observation.man_environment_score },
              { label: 'Uso adequado do material didático.', score: observation.man_material_score },
              { label: 'Registro do conteúdo no caderno dos alunos.', score: observation.man_content_score },
              { label: 'As atividades são bem orientadas.', score: observation.man_activities_score },
              { label: 'O professor acompanha sua realização circulando pela sala tirando dúvidas.', score: observation.man_monitoring_score }
            ]
          },
          { 
            id: 7, title: 'IDENTIDADE CONFESSIONAL E VALORES ADVENTISTAS', 
            eval: observation.identity_evaluation,
            obs: observation.identity_observations,
            items: [
              { label: 'Integração de valores filosóficos de forma natural e ética.', score: observation.ident_values_score },
              { label: 'Postura docente coerente com os princípios da Educação Adventista.', score: observation.ident_posture_score },
              { label: 'Linguagem, atitudes e exemplos alinhados à proposta confessional.', score: observation.ident_language_score }
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
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{scoreX(item.score, 4)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{scoreX(item.score, 3)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{scoreX(item.score, 2)}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{scoreX(item.score, 1)}</td>
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

        {/* 8-11 REMAINING SECTIONS */}
        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          <strong>8. PONTOS FORTES DA AULA:</strong>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{observation.strong_points}</div>
        </div>

        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          <strong>9. OPORTUNIDADES DE APRIMORAMENTO:</strong>
          <div style={{ fontSize: '9px', fontStyle: 'italic' }}>(Orientações formativas da coordenação pedagógica)</div>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{observation.improvement_opportunities}</div>
        </div>

        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          <strong>10. DEVOLUTIVA AO(À) PROFESSOR(A)</strong>
          <div style={{ fontWeight: 'bold' }}>Síntese da Observação:</div>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{observation.observation_synthesis}</div>
          
          <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Orientações Pedagógicas:</div>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{observation.pedagogical_guidelines}</div>
          
          <div style={{ fontWeight: 'bold', marginTop: '10px' }}>Combinados e Encaminhamentos:</div>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: '40px', padding: '5px' }}>{observation.forwarding}</div>
        </div>

        <div style={{ fontSize: '11px', marginTop: '20px' }}>
          <strong>11. REGISTRO FINAL</strong> - Professor(a) ciente da devolutiva: 
          <span style={{ marginLeft: '10px' }}>{isChecked(observation.teacher_aware, true)} Sim</span>
          <span style={{ marginLeft: '10px' }}>{isChecked(observation.teacher_aware, false)} Não</span>
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
