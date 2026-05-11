import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { Save, CheckCircle } from 'lucide-react';

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

// Helper Component for Score Selection
const ScoreSelector = ({ value, onChange, label, tooltips }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0" title={tooltips ? "Passe o mouse sobre as notas para ver a rubrica" : undefined}>
    <span className="text-sm" style={{ flex: 1, paddingRight: '1rem' }}>{label}</span>
    <div className="score-group">
      {scores.map(s => (
        <label key={s} title={tooltips ? tooltips[s] : undefined} style={{ cursor: 'help' }}>
          <input 
            type="radio" 
            className="score-radio" 
            name={label} 
            value={s} 
            checked={value === s} 
            onChange={() => onChange(s)} 
          />
          <span className="score-label">{s}</span>
        </label>
      ))}
    </div>
  </div>
);

export default function ObservationForm() {
  const [schools, setSchools] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [seriesList, setSeriesList] = useState([]); // renamed from classes
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    school_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    teacher_id: '',
    subject_id: '',
    series_id: '', // renamed from class_id
    visit_type: '',
    visit_type_other: '',
    visit_objectives: [],
    visit_objectives_other: '',
    
    planning_evaluation: '', plan_alignment_score: null, plan_content_score: null, plan_objectives_score: null, plan_references_score: null, planning_observations: '',
    methodology_evaluation: '', meth_adequate_score: null, meth_strategies_score: null, meth_resources_score: null, meth_clarity_score: null, methodology_observations: '',
    learning_evaluation: '', learn_instruments_score: null, learn_formative_score: null, learn_feedback_score: null, learn_criteria_score: null, learning_observations: '',
    management_evaluation: '', man_space_score: null, man_respect_score: null, man_conflict_score: null, man_environment_score: null, man_material_score: null, man_content_score: null, man_activities_score: null, man_monitoring_score: null, management_observations: '',
    identity_evaluation: '', ident_values_score: null, ident_posture_score: null, ident_language_score: null, identity_observations: '',
    
    strong_points: '', improvement_opportunities: '', observation_synthesis: '', pedagogical_guidelines: '', forwarding: '', teacher_aware: false
  });

  useEffect(() => {
    async function loadData() {
      const [
        { data: tData }, 
        { data: sData },
        { data: schData },
        { data: subData }
      ] = await Promise.all([
        supabase.from('teachers').select('*, teacher_series(series_id), teacher_subjects(subject_id)').order('name'),
        supabase.from('series').select('id, name, segment_id, segments(name)').order('name'),
        supabase.from('schools').select('id, name, code').order('name'),
        supabase.from('subjects').select('id, name, segment_subjects(segment_id)').order('name')
      ]);
      
      if (tData) setTeachers(tData);
      if (sData) setSeriesList(sData);
      if (schData) setSchools(schData);
      if (subData) setSubjects(subData);
    }
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleObjectiveChange = (objective) => {
    setFormData(prev => {
      const objectives = [...prev.visit_objectives];
      if (objectives.includes(objective)) {
        return { ...prev, visit_objectives: objectives.filter(o => o !== objective) };
      } else {
        return { ...prev, visit_objectives: [...objectives, objective] };
      }
    });
  };

  const setScore = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Auto-fill segment_id based on selected series
      const selectedSeriesObj = seriesList.find(s => s.id === formData.series_id);
      const segment_id = selectedSeriesObj ? selectedSeriesObj.segment_id : null;

      const payload = { ...formData, segment_id, user_id: user?.id };
      
      const { error } = await supabase.from('observations').insert([payload]);
      
      if (error) throw error;
      setSuccess(true);
      window.scrollTo(0,0);
    } catch (error) {
      console.error('Error saving observation:', error);
      alert('Erro ao salvar formulário.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Filtering based on selected Teacher
  const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
  let availableSeries = seriesList;
  let availableSubjects = subjects;

  if (selectedTeacher) {
    // Regente e Especialista ambos tem Séries atreladas
    if (selectedTeacher.teacher_series?.length > 0) {
      const allowedSeriesIds = selectedTeacher.teacher_series.map(ts => ts.series_id);
      availableSeries = seriesList.filter(s => allowedSeriesIds.includes(s.id));
    }
    
    if (selectedTeacher.teacher_type === 'especialista') {
      // Especialista tem Disciplinas atreladas explicitamente
      if (selectedTeacher.teacher_subjects?.length > 0) {
        const allowedSubjectIds = selectedTeacher.teacher_subjects.map(ts => ts.subject_id);
        availableSubjects = subjects.filter(s => allowedSubjectIds.includes(s.id));
      } else {
        availableSubjects = [];
      }
    } else {
      // Regente: filtra disciplinas baseadas nos segmentos das séries que ele atua
      const allowedSegments = Array.from(new Set(selectedTeacher.teacher_series.map(ts => {
        const seriesObj = seriesList.find(s => s.id === ts.series_id);
        return seriesObj ? seriesObj.segment_id : null;
      }).filter(Boolean)));
      
      availableSubjects = subjects.filter(sub => 
        sub.segment_subjects && sub.segment_subjects.some(ss => allowedSegments.includes(ss.segment_id))
      );
    }
  }

  if (success) {
    return (
      <div className="container flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
        <h1 className="h1">Salvo com Sucesso!</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>O instrumento de observação foi registrado na base de dados.</p>
        <Button onClick={() => window.location.reload()}>Preencher Nova Observação</Button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-2)' }}>Instrumento de Observação</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>Preencha as informações referentes à visita em sala de aula.</p>
      
      <form onSubmit={handleSubmit}>
        
        {/* 1. IDENTIFICAÇÃO */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="h2" style={{ marginBottom: 'var(--space-4)', color: 'var(--primary)' }}>1. Identificação</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Unidade Escolar" 
              name="school_id" 
              value={formData.school_id} 
              onChange={handleChange} 
              options={schools.map(s => ({value: s.id, label: `${s.code} - ${s.name}`}))} 
              required 
            />
            <Input label="Data da Visita" type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} required />
            
            <Select 
              label="Professor(a)" 
              name="teacher_id" 
              value={formData.teacher_id} 
              onChange={(e) => {
                handleChange(e);
                // Reset dependent fields
                setFormData(prev => ({ ...prev, series_id: '', subject_id: '' }));
              }} 
              options={teachers.map(t => ({value: t.id, label: t.name}))} 
              required 
            />
            
            <Select 
              label="Disciplina" 
              name="subject_id" 
              value={formData.subject_id} 
              onChange={handleChange} 
              options={availableSubjects.map(s => ({value: s.id, label: s.name}))} 
              required 
            />
            
            <Select 
              label="Turma / Série Observada" 
              name="series_id" 
              value={formData.series_id} 
              onChange={handleChange} 
              options={availableSeries.map(s => ({value: s.id, label: `${s.segments?.name} - ${s.name}`}))} 
              required 
            />
            
            <div>
              <Select 
                label="Tipo de Visita" 
                name="visit_type" 
                value={formData.visit_type} 
                onChange={handleChange} 
                options={[{value:'Formativa',label:'Formativa'},{value:'Acompanhamento',label:'Acompanhamento'},{value:'Devolutiva',label:'Devolutiva'},{value:'Outro',label:'Outro'}]} 
                required 
                style={{ marginBottom: formData.visit_type === 'Outro' ? 'var(--space-2)' : 0 }}
              />
              {formData.visit_type === 'Outro' && (
                <Input 
                  placeholder="Especifique o tipo de visita..." 
                  name="visit_type_other" 
                  value={formData.visit_type_other || ''} 
                  onChange={handleChange} 
                  required 
                />
              )}
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Objetivos da Visita:</label>
            <div className="grid grid-cols-2 gap-2">
              {['Acompanhar a prática pedagógica', 'Observar a aplicação da BNCC e dos referenciais institucionais', 'Apoiar o desenvolvimento profissional docente', 'Monitorar processos de ensino e aprendizagem', 'Outro'].map(obj => (
                <label key={obj} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.visit_objectives.includes(obj)} onChange={() => handleObjectiveChange(obj)} /> {obj}
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* 3. PLANEJAMENTO E ALINHAMENTO CURRICULAR */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: 'var(--primary)' }}>3. Planejamento e Alinhamento Curricular</h2>
            <Select name="planning_evaluation" value={formData.planning_evaluation} onChange={handleChange} options={evaluationOptions} style={{ minWidth: '200px' }} />
          </div>
          
          <div className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <ScoreSelector tooltips={rubrics.planejamento} label="O plano de aula está alinhado às habilidades/competências da BNCC." value={formData.plan_alignment_score} onChange={v => setScore('plan_alignment_score', v)} />
            <ScoreSelector tooltips={rubrics.planejamento} label="O conteúdo aplicado está de acordo com a Sequência Didática da AP" value={formData.plan_content_score} onChange={v => setScore('plan_content_score', v)} />
            <ScoreSelector tooltips={rubrics.planejamento} label="Os objetivos da aula estão claros e coerentes com a série/ano." value={formData.plan_objectives_score} onChange={v => setScore('plan_objectives_score', v)} />
            <ScoreSelector tooltips={rubrics.planejamento} label="Há conexão com os referenciais curriculares institucionais." value={formData.plan_references_score} onChange={v => setScore('plan_references_score', v)} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Observações da Coordenação:</label>
            <textarea className="form-input" rows="3" name="planning_observations" value={formData.planning_observations} onChange={handleChange} />
          </div>
        </Card>

        {/* 4. METODOLOGIA E ESTRATÉGIAS DE ENSINO */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: 'var(--primary)' }}>4. Metodologia e Estratégias de Ensino</h2>
            <Select name="methodology_evaluation" value={formData.methodology_evaluation} onChange={handleChange} options={evaluationOptions} />
          </div>
          <div className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <ScoreSelector tooltips={rubrics.metodologia} label="Metodologias adequadas à faixa etária e ao componente curricular." value={formData.meth_adequate_score} onChange={v => setScore('meth_adequate_score', v)} />
            <ScoreSelector tooltips={rubrics.metodologia} label="Estratégias que favorecem o aprendizado do estudante." value={formData.meth_strategies_score} onChange={v => setScore('meth_strategies_score', v)} />
            <ScoreSelector tooltips={rubrics.metodologia} label="Uso intencional de recursos didáticos e tecnológicos." value={formData.meth_resources_score} onChange={v => setScore('meth_resources_score', v)} />
            <ScoreSelector tooltips={rubrics.metodologia} label="Clareza na condução da aula e nas orientações dadas aos alunos." value={formData.meth_clarity_score} onChange={v => setScore('meth_clarity_score', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações da Coordenação:</label>
            <textarea className="form-input" rows="3" name="methodology_observations" value={formData.methodology_observations} onChange={handleChange} />
          </div>
        </Card>

        {/* 5. AVALIAÇÃO DA APRENDIZAGEM */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: 'var(--primary)' }}>5. Avaliação da Aprendizagem</h2>
            <Select name="learning_evaluation" value={formData.learning_evaluation} onChange={handleChange} options={evaluationOptions} />
          </div>
          <div className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <ScoreSelector tooltips={rubrics.avaliacao} label="Instrumentos avaliativos coerentes com os objetivos da aula." value={formData.learn_instruments_score} onChange={v => setScore('learn_instruments_score', v)} />
            <ScoreSelector tooltips={rubrics.avaliacao} label="Avaliação formativa presente durante a aula." value={formData.learn_formative_score} onChange={v => setScore('learn_formative_score', v)} />
            <ScoreSelector tooltips={rubrics.avaliacao} label="Devolutivas claras aos estudantes." value={formData.learn_feedback_score} onChange={v => setScore('learn_feedback_score', v)} />
            <ScoreSelector tooltips={rubrics.avaliacao} label="Critérios de avaliação compreensíveis e alinhados ao planejamento." value={formData.learn_criteria_score} onChange={v => setScore('learn_criteria_score', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações da Coordenação:</label>
            <textarea className="form-input" rows="3" name="learning_observations" value={formData.learning_observations} onChange={handleChange} />
          </div>
        </Card>

        {/* 6. GESTÃO DE SALA DE AULA E CLIMA ESCOLAR */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: 'var(--primary)' }}>6. Gestão de Sala de Aula e Clima Escolar</h2>
            <Select name="management_evaluation" value={formData.management_evaluation} onChange={handleChange} options={evaluationOptions} />
          </div>
          <div className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <ScoreSelector tooltips={rubrics.gestao} label="Organização do espaço e do tempo pedagógico." value={formData.man_space_score} onChange={v => setScore('man_space_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="Relação respeitosa entre professor e estudantes." value={formData.man_respect_score} onChange={v => setScore('man_respect_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="Estratégias de mediação de conflitos, quando necessário." value={formData.man_conflict_score} onChange={v => setScore('man_conflict_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="Ambiente favorável à aprendizagem." value={formData.man_environment_score} onChange={v => setScore('man_environment_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="Uso adequado do material didático." value={formData.man_material_score} onChange={v => setScore('man_material_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="Registro do conteúdo no caderno dos alunos." value={formData.man_content_score} onChange={v => setScore('man_content_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="As atividades são bem orientadas." value={formData.man_activities_score} onChange={v => setScore('man_activities_score', v)} />
            <ScoreSelector tooltips={rubrics.gestao} label="O professor acompanha sua realização circulando pela sala tirando dúvidas." value={formData.man_monitoring_score} onChange={v => setScore('man_monitoring_score', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações da Coordenação:</label>
            <textarea className="form-input" rows="3" name="management_observations" value={formData.management_observations} onChange={handleChange} />
          </div>
        </Card>

        {/* 7. IDENTIDADE CONFESSIONAL */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="h2" style={{ color: 'var(--primary)' }}>7. Identidade Confessional e Valores Adventistas</h2>
            <Select name="identity_evaluation" value={formData.identity_evaluation} onChange={handleChange} options={evaluationOptions} />
          </div>
          <div className="flex flex-col gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <ScoreSelector tooltips={rubrics.identidade} label="Integração de valores filosóficos de forma natural e ética." value={formData.ident_values_score} onChange={v => setScore('ident_values_score', v)} />
            <ScoreSelector tooltips={rubrics.identidade} label="Postura docente coerente com os princípios da Educação Adventista." value={formData.ident_posture_score} onChange={v => setScore('ident_posture_score', v)} />
            <ScoreSelector tooltips={rubrics.identidade} label="Linguagem, atitudes e exemplos alinhados à proposta confessional." value={formData.ident_language_score} onChange={v => setScore('ident_language_score', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Observações da Coordenação:</label>
            <textarea className="form-input" rows="3" name="identity_observations" value={formData.identity_observations} onChange={handleChange} />
          </div>
        </Card>

        {/* 8, 9 e 10 - SÍNTESE E DEVOLUTIVA */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="h2" style={{ marginBottom: 'var(--space-4)', color: 'var(--primary)' }}>Síntese e Devolutiva</h2>
          
          <div className="form-group">
            <label className="form-label">8. Pontos Fortes da Aula:</label>
            <textarea className="form-input" rows="3" name="strong_points" value={formData.strong_points} onChange={handleChange} />
          </div>
          
          <div className="form-group">
            <label className="form-label">9. Oportunidades de Aprimoramento:</label>
            <textarea className="form-input" rows="3" name="improvement_opportunities" value={formData.improvement_opportunities} onChange={handleChange} />
          </div>
          
          <h3 className="h3" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>10. Devolutiva ao(à) Professor(a)</h3>
          
          <div className="form-group">
            <label className="form-label">Síntese da Observação:</label>
            <textarea className="form-input" rows="3" name="observation_synthesis" value={formData.observation_synthesis} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Orientações Pedagógicas:</label>
            <textarea className="form-input" rows="3" name="pedagogical_guidelines" value={formData.pedagogical_guidelines} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Combinados e Encaminhamentos:</label>
            <textarea className="form-input" rows="3" name="forwarding" value={formData.forwarding} onChange={handleChange} />
          </div>
          
          <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-4)' }}>
            <input type="checkbox" id="teacher_aware" name="teacher_aware" checked={formData.teacher_aware} onChange={handleChange} />
            <label htmlFor="teacher_aware" className="text-sm font-semibold">Professor(a) ciente da devolutiva?</label>
          </div>
        </Card>

        <div className="flex justify-end gap-4" style={{ marginBottom: 'var(--space-8)' }}>
          <Button type="button" variant="secondary" onClick={() => window.scrollTo(0,0)}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            <Save size={18} /> {loading ? 'Salvando...' : 'Finalizar Registro'}
          </Button>
        </div>

      </form>
    </div>
  );
}
