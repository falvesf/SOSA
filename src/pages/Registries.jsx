import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, Modal } from '../components/ui';
import { Trash2, Plus, Edit2, X, Book } from 'lucide-react';

export default function Registries() {
  const [activeTab, setActiveTab] = useState('schools'); // schools, series, subjects, teachers

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--background)', zIndex: 10, paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-4)', margin: 'calc(-1 * var(--space-6)) 0 var(--space-6) 0', borderBottom: '1px solid var(--border)' }}>
        <h1 className="h1" style={{ marginBottom: 'var(--space-4)' }}>Cadastros</h1>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant={activeTab === 'schools' ? 'primary' : 'secondary'} onClick={() => setActiveTab('schools')}>Unidades Escolares</Button>
          <Button variant={activeTab === 'series' ? 'primary' : 'secondary'} onClick={() => setActiveTab('series')}>Turmas e Séries</Button>
          <Button variant={activeTab === 'subjects' ? 'primary' : 'secondary'} onClick={() => setActiveTab('subjects')}>Disciplinas</Button>
          <Button variant={activeTab === 'teachers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('teachers')}>Professores</Button>
        </div>
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
  const [editingItem, setEditingItem] = useState(null);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    await supabase.from('schools').insert([{ code, name }]);
    setCode('');
    setName('');
    fetchSchools();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim() || !editingItem.code.trim()) return;
    await supabase.from('schools').update({ code: editingItem.code, name: editingItem.name }).eq('id', editingItem.id);
    setEditingItem(null);
    fetchSchools();
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
      <form onSubmit={handleAdd} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ flex: 1 }}><Input placeholder="Código da Unidade (ex: 001)" value={code} onChange={e => setCode(e.target.value)} required /></div>
        <div style={{ flex: 2 }}><Input placeholder="Nome da Unidade" value={name} onChange={e => setName(e.target.value)} required /></div>
        <Button type="submit" variant="primary"><Plus size={18} /> Adicionar</Button>
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
                    <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingItem({ ...s })}>
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

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Unidade Escolar">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input label="Código da Unidade" value={editingItem.code} onChange={e => setEditingItem({...editingItem, code: e.target.value})} required />
            <Input label="Nome da Unidade" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button type="submit" variant="primary">Salvar Alterações</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

// Segments and Series Component
function SeriesCrud() {
  const [segments, setSegments] = useState([]);
  const [series, setSeries] = useState([]);
  
  const [segmentName, setSegmentName] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [segmentId, setSegmentId] = useState('');

  const [editingSegment, setEditingSegment] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);

  const fetchData = async () => {
    const { data: segData } = await supabase.from('segments').select('*').order('name');
    if (segData) setSegments(segData);
    
    const { data: serData } = await supabase.from('series').select('*, segments(name)').order('name');
    if (serData) setSeries(serData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim()) return;
    await supabase.from('segments').insert([{ name: segmentName }]);
    setSegmentName('');
    fetchData();
  };

  const handleEditSegmentSubmit = async (e) => {
    e.preventDefault();
    if (!editingSegment.name.trim()) return;
    await supabase.from('segments').update({ name: editingSegment.name }).eq('id', editingSegment.id);
    setEditingSegment(null);
    fetchData();
  };

  const handleAddSeries = async (e) => {
    e.preventDefault();
    if (!seriesName.trim() || !segmentId) return;
    await supabase.from('series').insert([{ name: seriesName, segment_id: segmentId }]);
    setSeriesName('');
    setSegmentId('');
    fetchData();
  };

  const handleEditSeriesSubmit = async (e) => {
    e.preventDefault();
    if (!editingSeries.name.trim() || !editingSeries.segment_id) return;
    await supabase.from('series').update({ name: editingSeries.name, segment_id: editingSeries.segment_id }).eq('id', editingSeries.id);
    setEditingSeries(null);
    fetchData();
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
        
        <form onSubmit={handleAddSegment} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}><Input placeholder="Nome da nova turma/segmento..." value={segmentName} onChange={e => setSegmentName(e.target.value)} required /></div>
          <Button type="submit" variant="primary">Adicionar Turma</Button>
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
                      <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingSegment({ ...s })}>
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
        <h2 className="h3" style={{ marginBottom: 'var(--space-4)' }}>Adicionar Nova Série</h2>
        
        <form onSubmit={handleAddSeries} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
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
          <Button type="submit" variant="primary">Adicionar Série</Button>
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
                            <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingSeries({ ...s })}>
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

      {/* Modals */}
      <Modal isOpen={!!editingSegment} onClose={() => setEditingSegment(null)} title="Editar Turma (Segmento)">
        {editingSegment && (
          <form onSubmit={handleEditSegmentSubmit} className="flex flex-col gap-4">
            <Input label="Nome da Turma" value={editingSegment.name} onChange={e => setEditingSegment({...editingSegment, name: e.target.value})} required />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingSegment(null)}>Cancelar</Button>
              <Button type="submit" variant="primary">Salvar Alterações</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!editingSeries} onClose={() => setEditingSeries(null)} title="Editar Série">
        {editingSeries && (
          <form onSubmit={handleEditSeriesSubmit} className="flex flex-col gap-4">
            <Input label="Nome da Série" value={editingSeries.name} onChange={e => setEditingSeries({...editingSeries, name: e.target.value})} required />
            <Select 
              label="Turma / Segmento"
              value={editingSeries.segment_id} 
              onChange={e => setEditingSeries({...editingSeries, segment_id: e.target.value})} 
              options={segments.map(s => ({ value: s.id, label: s.name }))}
              required
            />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingSeries(null)}>Cancelar</Button>
              <Button type="submit" variant="primary">Salvar Alterações</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}

// Subjects Component
function SubjectsCrud() {
  const [subjects, setSubjects] = useState([]);
  const [segments, setSegments] = useState([]);
  
  // Quick Add Form
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  
  const [editingItem, setEditingItem] = useState(null);

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

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !segmentId) return;
    
    // Check if subject exists (case-insensitive)
    const { data: existing } = await supabase.from('subjects').select('*').ilike('name', name.trim()).maybeSingle();
    
    let subjectId;
    if (existing) {
      subjectId = existing.id;
    } else {
      const { data: newSubject, error } = await supabase.from('subjects').insert([{ name: name.trim() }]).select().single();
      if (error) return console.error(error);
      subjectId = newSubject.id;
    }

    // Insert mapping
    const { data: existingMap } = await supabase.from('segment_subjects').select('*').eq('segment_id', segmentId).eq('subject_id', subjectId).maybeSingle();
    
    if (!existingMap) {
      await supabase.from('segment_subjects').insert([{ subject_id: subjectId, segment_id: segmentId }]);
    }
    
    setName('');
    fetchData();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim()) return;
    
    // Update subject name
    await supabase.from('subjects').update({ name: editingItem.name }).eq('id', editingItem.id);
    
    // Delete old mappings
    await supabase.from('segment_subjects').delete().eq('subject_id', editingItem.id);

    // Insert new mappings
    if (editingItem.selectedSegments.length > 0) {
      const mappings = editingItem.selectedSegments.map(sid => ({ subject_id: editingItem.id, segment_id: sid }));
      await supabase.from('segment_subjects').insert(mappings);
    }
    
    setEditingItem(null);
    fetchData();
  };

  const handleRemoveMapping = async (subjectId, segId) => {
    if(confirm('Remover esta disciplina desta turma?')) {
      await supabase.from('segment_subjects').delete().eq('subject_id', subjectId).eq('segment_id', segId);
      fetchData();
    }
  };

  const handleDeleteFullSubject = async (id) => {
    if(confirm('Atenção: Isso excluirá a disciplina de TODAS as turmas e professores! Tem certeza?')) {
      await supabase.from('subjects').delete().eq('id', id);
      setEditingItem(null);
      fetchData();
    }
  };

  const startEdit = (s) => {
    setEditingItem({
      id: s.id,
      name: s.name,
      selectedSegments: s.segment_subjects.map(ss => ss.segment_id)
    });
  };

  const toggleEditSegment = (id) => {
    setEditingItem(prev => {
      const sel = prev.selectedSegments;
      return { ...prev, selectedSegments: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] };
    });
  };

  // Find orphaned subjects (no segments attached)
  const orphanedSubjects = subjects.filter(sub => !sub.segment_subjects || sub.segment_subjects.length === 0);

  return (
    <div>
      {/* Top Form matching the image */}
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-6)' }}>
        <h3 className="h3 flex items-center gap-2" style={{ marginBottom: 'var(--space-4)' }}><Plus size={18} /> Adicionar Disciplina Local</h3>
        <form onSubmit={handleQuickAdd} className="flex gap-4 items-end flex-wrap">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Select 
              label="Turma"
              value={segmentId} 
              onChange={e => setSegmentId(e.target.value)} 
              options={segments.map(s => ({ value: s.id, label: s.name }))}
              required
            />
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <Input label="Nome da disciplina" placeholder="Ex: Robótica" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <Button type="submit" variant="primary" style={{ height: '42px', marginBottom: '1px' }}>+ Adicionar</Button>
        </form>
      </div>

      {/* Grouped View matching the image */}
      <div className="flex flex-col gap-4">
        {segments.map(seg => {
          const segSubjects = subjects.filter(sub => sub.segment_subjects.some(ss => ss.segment_id === seg.id));
          
          return (
            <div key={seg.id} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-4)' }}>
                <Book size={18} className="text-muted" />
                <h4 className="font-semibold text-primary">{seg.name}</h4>
                {segSubjects.length === 0 && <span className="text-xs text-muted" style={{ padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '12px' }}>Sem disciplinas configuradas</span>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {segSubjects.map(sub => (
                  <div key={sub.id} className="flex items-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '4px 12px', fontSize: '0.85rem', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ cursor: 'pointer', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => startEdit(sub)} title="Editar Disciplina">
                      {sub.name}
                    </span>
                    <button type="button" onClick={() => handleRemoveMapping(sub.id, seg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: '#94a3b8', borderRadius: '50%' }} title="Remover desta Turma">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Orphaned Subjects */}
        {orphanedSubjects.length > 0 && (
          <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: 0.8 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-4)' }}>
              <h4 className="font-semibold text-muted">Disciplinas Desativadas (Sem Turma)</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {orphanedSubjects.map(sub => (
                <div key={sub.id} className="flex items-center" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '4px 12px', fontSize: '0.85rem', color: '#64748b' }}>
                  <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={() => startEdit(sub)} title="Editar Disciplina">
                    {sub.name}
                  </span>
                  <button type="button" onClick={() => handleDeleteFullSubject(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: '#ef4444' }} title="Excluir Permanentemente">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Disciplina">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input label="Nome da Disciplina" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
            
            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-medium" style={{ marginBottom: 'var(--space-2)' }}>Turmas (Segmentos):</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {segments.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editingItem.selectedSegments.includes(s.id)} onChange={() => toggleEditSegment(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="danger" onClick={() => handleDeleteFullSubject(editingItem.id)} title="Excluir Permanentemente de todo o sistema">Excluir Tudo</Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancelar</Button>
                <Button type="submit" variant="primary">Salvar Alterações</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
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
  
  const [editingItem, setEditingItem] = useState(null);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const { data: newTeacher, error } = await supabase.from('teachers').insert([{ name, email: email || null, teacher_type: teacherType }]).select().single();
    if (error) {
      alert(`Erro ao adicionar professor: ${error.message}`);
      return console.error(error);
    }

    if (newTeacher) {
      if (selectedSeries.length > 0) {
        const seriesMappings = selectedSeries.map(sid => ({ teacher_id: newTeacher.id, series_id: sid }));
        await supabase.from('teacher_series').insert(seriesMappings);
      }
      
      if (teacherType === 'especialista' && selectedSubjects.length > 0) {
        const subjectMappings = selectedSubjects.map(sid => ({ teacher_id: newTeacher.id, subject_id: sid }));
        await supabase.from('teacher_subjects').insert(subjectMappings);
      }
    }

    setName('');
    setEmail('');
    setTeacherType('regente');
    setSelectedSeries([]);
    setSelectedSubjects([]);
    fetchData();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim()) return;
    
    const { error } = await supabase.from('teachers').update({ 
      name: editingItem.name, 
      email: editingItem.email || null, 
      teacher_type: editingItem.teacher_type 
    }).eq('id', editingItem.id);

    if (error) {
      alert(`Erro ao atualizar professor: ${error.message}`);
      return console.error(error);
    }

    // Rebuild series mappings
    await supabase.from('teacher_series').delete().eq('teacher_id', editingItem.id);
    if (editingItem.selectedSeries.length > 0) {
      const seriesMappings = editingItem.selectedSeries.map(sid => ({ teacher_id: editingItem.id, series_id: sid }));
      await supabase.from('teacher_series').insert(seriesMappings);
    }
    
    // Rebuild subject mappings
    await supabase.from('teacher_subjects').delete().eq('teacher_id', editingItem.id);
    if (editingItem.teacher_type === 'especialista' && editingItem.selectedSubjects.length > 0) {
      const subjectMappings = editingItem.selectedSubjects.map(sid => ({ teacher_id: editingItem.id, subject_id: sid }));
      await supabase.from('teacher_subjects').insert(subjectMappings);
    }

    setEditingItem(null);
    fetchData();
  };

  const startEdit = (t) => {
    setEditingItem({
      id: t.id,
      name: t.name,
      email: t.email || '',
      teacher_type: t.teacher_type || 'regente',
      selectedSeries: t.teacher_series?.map(ts => ts.series_id) || [],
      selectedSubjects: t.teacher_subjects?.map(ts => ts.subject_id) || []
    });
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleSeries = (id) => setSelectedSeries(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSubject = (id) => setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleEditSeries = (id) => {
    setEditingItem(prev => {
      const sel = prev.selectedSeries;
      return { ...prev, selectedSeries: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] };
    });
  };

  const toggleEditSubject = (id) => {
    setEditingItem(prev => {
      const sel = prev.selectedSubjects;
      return { ...prev, selectedSubjects: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] };
    });
  };

  const toggleSegment = (segId) => {
    const segSeriesIds = series.filter(s => s.segment_id === segId).map(s => s.id);
    const allSelected = segSeriesIds.every(id => selectedSeries.includes(id));
    if (allSelected) {
      setSelectedSeries(prev => prev.filter(id => !segSeriesIds.includes(id)));
    } else {
      setSelectedSeries(prev => Array.from(new Set([...prev, ...segSeriesIds])));
    }
  };

  const toggleEditSegment = (segId) => {
    const segSeriesIds = series.filter(s => s.segment_id === segId).map(s => s.id);
    setEditingItem(prev => {
      const allSelected = segSeriesIds.every(id => prev.selectedSeries.includes(id));
      const newSel = allSelected 
        ? prev.selectedSeries.filter(id => !segSeriesIds.includes(id))
        : Array.from(new Set([...prev.selectedSeries, ...segSeriesIds]));
      return { ...prev, selectedSeries: newSel };
    });
  };

  const uniqueSegments = series.reduce((acc, curr) => {
    if (!acc.find(x => x.id === curr.segment_id)) {
      acc.push({ id: curr.segment_id, name: curr.segments?.name });
    }
    return acc;
  }, []);

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Professores</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex gap-4 items-center flex-wrap">
          <div style={{ flex: '1 1 200px' }}><Input placeholder="Nome do Professor" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ flex: '1 1 200px' }}><Input type="email" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div className="flex gap-6 items-center flex-wrap" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
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
          <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-3)' }}>Séries Atreladas (Salas de Aula):</p>
          <div className="flex flex-col gap-3">
            {uniqueSegments.map(seg => {
              const segSeries = series.filter(s => s.segment_id === seg.id);
              return (
                <div key={seg.id} style={{ padding: 'var(--space-3)', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                    <p className="text-xs font-semibold text-muted m-0">{seg.name}</p>
                    <button type="button" className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer" style={{ padding: 0 }} onClick={() => toggleSegment(seg.id)}>
                      {segSeries.length > 0 && segSeries.every(s => selectedSeries.includes(s.id)) ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segSeries.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: selectedSeries.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: selectedSeries.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={selectedSeries.includes(s.id)} onChange={() => toggleSeries(s.id)} style={{ margin: 0 }} />
                        <span style={{ color: selectedSeries.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: selectedSeries.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            {series.length === 0 && <span className="text-xs text-muted">Cadastre séries primeiro.</span>}
          </div>
        </div>

        {/* Only Especialista gets Subjects */}
        {teacherType === 'especialista' && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-3)' }}>Disciplinas Atreladas (Especialidade):</p>
            <div className="flex flex-wrap gap-2" style={{ padding: 'var(--space-3)', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: selectedSubjects.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: selectedSubjects.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={() => toggleSubject(s.id)} style={{ margin: 0 }} />
                  <span style={{ color: selectedSubjects.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: selectedSubjects.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                </label>
              ))}
              {subjects.length === 0 && <span className="text-xs text-muted">Cadastre disciplinas primeiro.</span>}
            </div>
          </div>
        )}

        <div>
          <Button type="submit" variant="primary"><Plus size={18} /> Adicionar Professor</Button>
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

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Professor">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap">
              <div style={{ flex: '1 1 200px' }}><Input label="Nome" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required /></div>
              <div style={{ flex: '1 1 200px' }}><Input label="E-mail" type="email" value={editingItem.email} onChange={e => setEditingItem({...editingItem, email: e.target.value})} /></div>
            </div>

            <div className="flex gap-6 items-center flex-wrap" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span className="text-sm font-medium">Tipo:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" value="regente" checked={editingItem.teacher_type === 'regente'} onChange={(e) => setEditingItem({...editingItem, teacher_type: e.target.value})} /> Regente
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" value="especialista" checked={editingItem.teacher_type === 'especialista'} onChange={(e) => setEditingItem({...editingItem, teacher_type: e.target.value})} /> Especialista
              </label>
            </div>

            <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-medium" style={{ marginBottom: 'var(--space-3)' }}>Séries Atreladas:</p>
              <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
                {uniqueSegments.map(seg => {
                  const segSeries = series.filter(s => s.segment_id === seg.id);
                  return (
                    <div key={seg.id} style={{ padding: 'var(--space-3)', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                        <p className="text-xs font-semibold text-muted m-0">{seg.name}</p>
                        <button type="button" className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer" style={{ padding: 0 }} onClick={() => toggleEditSegment(seg.id)}>
                          {segSeries.length > 0 && segSeries.every(s => editingItem.selectedSeries.includes(s.id)) ? 'Desmarcar todas' : 'Selecionar todas'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {segSeries.map(s => (
                          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: editingItem.selectedSeries.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: editingItem.selectedSeries.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                            <input type="checkbox" checked={editingItem.selectedSeries.includes(s.id)} onChange={() => toggleEditSeries(s.id)} style={{ margin: 0 }} />
                            <span style={{ color: editingItem.selectedSeries.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: editingItem.selectedSeries.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {editingItem.teacher_type === 'especialista' && (
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-medium" style={{ marginBottom: 'var(--space-3)' }}>Disciplinas Atreladas:</p>
                <div className="flex flex-wrap gap-2" style={{ padding: 'var(--space-3)', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: editingItem.selectedSubjects.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: editingItem.selectedSubjects.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                      <input type="checkbox" checked={editingItem.selectedSubjects.includes(s.id)} onChange={() => toggleEditSubject(s.id)} style={{ margin: 0 }} />
                      <span style={{ color: editingItem.selectedSubjects.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: editingItem.selectedSubjects.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button type="submit" variant="primary">Salvar Alterações</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
