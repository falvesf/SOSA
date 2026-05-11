import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { Trash2, Plus, Edit2, X } from 'lucide-react';

export default function Registries() {
  const [activeTab, setActiveTab] = useState('schools'); // schools, series, subjects, teachers

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>Cadastros</h1>
      
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Button variant={activeTab === 'schools' ? 'primary' : 'secondary'} onClick={() => setActiveTab('schools')}>Unidades Escolares</Button>
        <Button variant={activeTab === 'series' ? 'primary' : 'secondary'} onClick={() => setActiveTab('series')}>Turmas e Séries</Button>
        <Button variant={activeTab === 'subjects' ? 'primary' : 'secondary'} onClick={() => setActiveTab('subjects')}>Disciplinas</Button>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('teachers')}>Professores</Button>
      </div>

      <Card className="animate-fade-in">
        {activeTab === 'schools' && <SchoolsCrud />}
        {activeTab === 'series' && <SeriesCrud />}
        {activeTab === 'subjects' && <SubjectsCrud />}
        {activeTab === 'teachers' && <TeachersCrud />}
      </Card>
    </div>
  );
}

// Schools Component
function SchoolsCrud() {
  const [schools, setSchools] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    
    if (editingId) {
      await supabase.from('schools').update({ code, name }).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('schools').insert([{ code, name }]);
    }
    
    setCode('');
    setName('');
    fetchSchools();
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setCode(s.code);
    setName(s.name);
    window.scrollTo(0, 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCode('');
    setName('');
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('schools').delete().eq('id', id);
      fetchSchools();
    }
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Unidades Escolares</h2>
      <form onSubmit={handleAddOrEdit} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ flex: 1 }}><Input placeholder="Código da Unidade (ex: 001)" value={code} onChange={e => setCode(e.target.value)} required /></div>
        <div style={{ flex: 2 }}><Input placeholder="Nome da Unidade" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            {editingId ? <><Edit2 size={18} /> Salvar</> : <><Plus size={18} /> Adicionar</>}
          </Button>
          {editingId && <Button type="button" variant="secondary" onClick={cancelEdit}><X size={18} /></Button>}
        </div>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Código</th><th>Nome da Unidade</th><th style={{ width: '100px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {schools.map(s => (
              <tr key={s.id}>
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEdit(s)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {schools.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhuma unidade cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Segments and Series Component
function SeriesCrud() {
  const [segments, setSegments] = useState([]);
  const [series, setSeries] = useState([]);
  
  // Segment form
  const [segmentName, setSegmentName] = useState('');
  const [editingSegment, setEditingSegment] = useState(null);
  
  // Series form
  const [seriesName, setSeriesName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [editingSeries, setEditingSeries] = useState(null);

  const fetchData = async () => {
    const { data: segData } = await supabase.from('segments').select('*').order('name');
    if (segData) setSegments(segData);
    
    const { data: serData } = await supabase.from('series').select('*, segments(name)').order('name');
    if (serData) setSeries(serData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddOrEditSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim()) return;
    
    if (editingSegment) {
      await supabase.from('segments').update({ name: segmentName }).eq('id', editingSegment);
      setEditingSegment(null);
    } else {
      await supabase.from('segments').insert([{ name: segmentName }]);
    }
    setSegmentName('');
    fetchData();
  };

  const handleAddOrEditSeries = async (e) => {
    e.preventDefault();
    if (!seriesName.trim() || !segmentId) return;
    
    if (editingSeries) {
      await supabase.from('series').update({ name: seriesName, segment_id: segmentId }).eq('id', editingSeries);
      setEditingSeries(null);
    } else {
      await supabase.from('series').insert([{ name: seriesName, segment_id: segmentId }]);
    }
    setSeriesName('');
    setSegmentId('');
    fetchData();
  };

  const startEditSegment = (s) => {
    setEditingSegment(s.id);
    setSegmentName(s.name);
  };

  const startEditSeries = (s) => {
    setEditingSeries(s.id);
    setSeriesName(s.name);
    setSegmentId(s.segment_id);
    // Scroll smoothly to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSegment = async (id) => {
    if(confirm('Atenção: Excluir a Turma (Segmento) excluirá TODAS as Séries atreladas a ela! Tem certeza?')) {
      await supabase.from('segments').delete().eq('id', id);
      fetchData();
    }
  };

  const handleDeleteSeries = async (id) => {
    if(confirm('Tem certeza que deseja excluir esta série?')) {
      await supabase.from('series').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Cadastro de Turmas / Segmentos */}
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h2 className="h3" style={{ marginBottom: 'var(--space-2)' }}>Gerenciar Turmas (Segmentos)</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>Crie categorias para agrupar suas séries (ex: Fundamental I, Educação Infantil).</p>
        
        <form onSubmit={handleAddOrEditSegment} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}><Input placeholder="Nome da nova turma/segmento..." value={segmentName} onChange={e => setSegmentName(e.target.value)} required /></div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">{editingSegment ? 'Salvar' : 'Adicionar Turma'}</Button>
            {editingSegment && <Button type="button" variant="secondary" onClick={() => {setEditingSegment(null); setSegmentName('');}}><X size={18} /></Button>}
          </div>
        </form>

        <div className="table-container">
          <table className="table text-sm">
            <thead>
              <tr><th>Nome da Turma</th><th style={{ width: '100px' }}>Ações</th></tr>
            </thead>
            <tbody>
              {segments.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEditSegment(s)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteSegment(s.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {segments.length === 0 && <tr><td colSpan="2" className="text-center text-muted">Nenhuma turma cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cadastro de Séries */}
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h2 className="h3" style={{ marginBottom: 'var(--space-4)' }}>{editingSeries ? 'Editar Série' : 'Adicionar Nova Série'}</h2>
        
        <form onSubmit={handleAddOrEditSeries} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: 1 }}>
            <Input placeholder="Nome da Série (ex: 1º Ano A)" value={seriesName} onChange={e => setSeriesName(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <Select 
              value={segmentId} 
              onChange={e => setSegmentId(e.target.value)} 
              options={segments.map(s => ({ value: s.id, label: s.name }))}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">{editingSeries ? 'Salvar' : 'Adicionar Série'}</Button>
            {editingSeries && <Button type="button" variant="secondary" onClick={() => {setEditingSeries(null); setSeriesName(''); setSegmentId('');}}><X size={18} /></Button>}
          </div>
        </form>

        {/* Listagem Agrupada */}
        <div className="flex flex-col gap-4">
          {segments.map(seg => {
            const segSeries = series.filter(s => s.segment_id === seg.id);
            if (segSeries.length === 0) return null;
            return (
              <div key={seg.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-3)', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="font-semibold" style={{ color: 'var(--primary)' }}>{seg.name}</h4>
                  <span className="text-xs text-muted" style={{ padding: '2px 8px', backgroundColor: 'var(--border)', borderRadius: '12px' }}>{segSeries.length} Séries</span>
                </div>
                <table className="table text-sm" style={{ margin: 0, borderTop: 'none' }}>
                  <tbody>
                    {segSeries.map(s => (
                      <tr key={s.id}>
                        <td style={{ borderTop: 'none' }}>{s.name}</td>
                        <td style={{ width: '100px', borderTop: 'none', textAlign: 'right' }}>
                          <div className="flex gap-2 justify-end">
                            <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEditSeries(s)}>
                              <Edit2 size={16} />
                            </Button>
                            <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteSeries(s.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// Subjects Component
function SubjectsCrud() {
  const [subjects, setSubjects] = useState([]);
  const [segments, setSegments] = useState([]);
  const [name, setName] = useState('');
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const { data: subData } = await supabase.from('subjects').select(`
      *,
      segment_subjects ( segment_id, segments ( name ) )
    `).order('name');
    if (subData) setSubjects(subData);

    const { data: segData } = await supabase.from('segments').select('*').order('name');
    if (segData) setSegments(segData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let subjectId = editingId;
    
    if (editingId) {
      // Update subject name
      await supabase.from('subjects').update({ name }).eq('id', editingId);
      // Delete old mappings
      await supabase.from('segment_subjects').delete().eq('subject_id', editingId);
    } else {
      // Insert new subject
      const { data: newSubject, error } = await supabase.from('subjects').insert([{ name }]).select().single();
      if (error) return console.error(error);
      subjectId = newSubject.id;
    }

    // Insert mappings
    if (subjectId && selectedSegments.length > 0) {
      const mappings = selectedSegments.map(sid => ({ subject_id: subjectId, segment_id: sid }));
      await supabase.from('segment_subjects').insert(mappings);
    }
    
    setName('');
    setSelectedSegments([]);
    setEditingId(null);
    fetchData();
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setName(s.name);
    setSelectedSegments(s.segment_subjects.map(ss => ss.segment_id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('subjects').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleSegment = (id) => setSelectedSegments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Disciplinas</h2>
      <form onSubmit={handleAddOrEdit} className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex gap-4">
          <div style={{ flex: 1 }}><Input placeholder="Nome da Disciplina (ex: Matemática)" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">{editingId ? <><Edit2 size={18}/> Salvar</> : <><Plus size={18}/> Adicionar</>}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => {setEditingId(null); setName(''); setSelectedSegments([]);}}><X size={18} /></Button>}
          </div>
        </div>
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ marginBottom: 'var(--space-2)' }}>Atrelar às Turmas (Segmentos):</p>
          <div className="flex flex-wrap gap-3">
            {segments.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedSegments.includes(s.id)} onChange={() => toggleSegment(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Disciplina</th><th>Turmas Atreladas</th><th style={{ width: '100px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {subjects.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="text-xs text-muted">
                  {s.segment_subjects?.map(ss => ss.segments?.name).join(', ') || '-'}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEdit(s)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhuma disciplina cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Teachers Component
function TeachersCrud() {
  const [teachers, setTeachers] = useState([]);
  const [series, setSeries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teacherType, setTeacherType] = useState('regente');
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const { data: tData } = await supabase.from('teachers').select(`
      *,
      teacher_series ( series_id, series (name, segments(name)) ),
      teacher_subjects ( subject_id, subjects (name) )
    `).order('name');
    if (tData) setTeachers(tData);

    const { data: serData } = await supabase.from('series').select('*, segments(name)').order('name');
    if (serData) setSeries(serData);

    const { data: subData } = await supabase.from('subjects').select('*').order('name');
    if (subData) setSubjects(subData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let teacherId = editingId;

    if (editingId) {
      await supabase.from('teachers').update({ name, email, teacher_type: teacherType }).eq('id', editingId);
      // Delete old mappings
      await supabase.from('teacher_series').delete().eq('teacher_id', editingId);
      await supabase.from('teacher_subjects').delete().eq('teacher_id', editingId);
    } else {
      const { data: newTeacher, error } = await supabase.from('teachers').insert([{ name, email, teacher_type: teacherType }]).select().single();
      if (error) return console.error(error);
      teacherId = newTeacher.id;
    }

    if (teacherId) {
      if (selectedSeries.length > 0) {
        const seriesMappings = selectedSeries.map(sid => ({ teacher_id: teacherId, series_id: sid }));
        await supabase.from('teacher_series').insert(seriesMappings);
      }
      
      if (teacherType === 'especialista' && selectedSubjects.length > 0) {
        const subjectMappings = selectedSubjects.map(sid => ({ teacher_id: teacherId, subject_id: sid }));
        await supabase.from('teacher_subjects').insert(subjectMappings);
      }
    }

    setName('');
    setEmail('');
    setTeacherType('regente');
    setSelectedSeries([]);
    setSelectedSubjects([]);
    setEditingId(null);
    fetchData();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setName(t.name);
    setEmail(t.email || '');
    setTeacherType(t.teacher_type || 'regente');
    setSelectedSeries(t.teacher_series?.map(ts => ts.series_id) || []);
    setSelectedSubjects(t.teacher_subjects?.map(ts => ts.subject_id) || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleSeries = (id) => setSelectedSeries(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSubject = (id) => setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Professores</h2>
      <form onSubmit={handleAddOrEdit} className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        
        <div className="flex gap-4 items-center">
          <div style={{ flex: 1 }}><Input placeholder="Nome do Professor" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ flex: 1 }}><Input type="email" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div className="flex gap-6 items-center" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <span className="text-sm font-medium">Tipo do Professor:</span>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="regente" checked={teacherType === 'regente'} onChange={(e) => { setTeacherType(e.target.value); setSelectedSubjects([]); }} />
            Regente
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="especialista" checked={teacherType === 'especialista'} onChange={(e) => setTeacherType(e.target.value)} />
            Especialista
          </label>
        </div>

        {/* Both Regente and Especialista get Series */}
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-2)' }}>Séries Atreladas (Salas de Aula):</p>
          <div className="flex flex-wrap gap-3">
            {series.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedSeries.includes(s.id)} onChange={() => toggleSeries(s.id)} />
                {s.segments?.name} - {s.name}
              </label>
            ))}
            {series.length === 0 && <span className="text-xs text-muted">Cadastre séries primeiro.</span>}
          </div>
        </div>

        {/* Only Especialista gets Subjects */}
        {teacherType === 'especialista' && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-2)' }}>Disciplinas Atreladas (Especialidade):</p>
            <div className="flex flex-wrap gap-3">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={() => toggleSubject(s.id)} />
                  {s.name}
                </label>
              ))}
              {subjects.length === 0 && <span className="text-xs text-muted">Cadastre disciplinas primeiro.</span>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary">{editingId ? <><Edit2 size={18} /> Salvar Alterações</> : <><Plus size={18} /> Adicionar Professor</>}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={() => {setEditingId(null); setName(''); setEmail(''); setTeacherType('regente'); setSelectedSeries([]); setSelectedSubjects([]);}}><X size={18} /> Cancelar</Button>}
        </div>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th>Disciplinas</th><th>Séries</th><th style={{ width: '100px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id}>
                <td>{t.name}<br/><span className="text-xs text-muted">{t.email}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{t.teacher_type || 'N/A'}</td>
                <td className="text-xs text-muted">
                  {t.teacher_subjects?.map(ts => ts.subjects?.name).join(', ') || '-'}
                </td>
                <td className="text-xs text-muted">
                  {t.teacher_series?.map(ts => ts.series?.name).join(', ') || '-'}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEdit(t)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Nenhum professor cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
