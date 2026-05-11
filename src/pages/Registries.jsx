import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { Trash2, Plus } from 'lucide-react';

export default function Registries() {
  const [activeTab, setActiveTab] = useState('schools'); // schools, subjects, teachers, series, classes

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>Cadastros</h1>
      
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Button variant={activeTab === 'schools' ? 'primary' : 'secondary'} onClick={() => setActiveTab('schools')}>Unidades Escolares</Button>
        <Button variant={activeTab === 'series' ? 'primary' : 'secondary'} onClick={() => setActiveTab('series')}>Séries</Button>
        <Button variant={activeTab === 'classes' ? 'primary' : 'secondary'} onClick={() => setActiveTab('classes')}>Turmas</Button>
        <Button variant={activeTab === 'subjects' ? 'primary' : 'secondary'} onClick={() => setActiveTab('subjects')}>Disciplinas</Button>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('teachers')}>Professores</Button>
      </div>

      <Card className="animate-fade-in">
        {activeTab === 'schools' && <SchoolsCrud />}
        {activeTab === 'series' && <SeriesCrud />}
        {activeTab === 'classes' && <ClassesCrud />}
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
            <tr><th>Código</th><th>Nome da Unidade</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {schools.map(s => (
              <tr key={s.id}>
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                    <Trash2 size={16} />
                  </Button>
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

// Subjects Component
function SubjectsCrud() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);

  const fetchData = async () => {
    const { data: subData } = await supabase.from('subjects').select(`
      *,
      class_subjects (
        classes ( name, series (name) )
      )
    `).order('name');
    if (subData) setSubjects(subData);

    const { data: clsData } = await supabase.from('classes').select('*, series(name)').order('name');
    if (clsData) setClasses(clsData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Insert subject
    const { data: newSubject, error } = await supabase.from('subjects').insert([{ name }]).select().single();
    if (error) return console.error(error);

    // Insert class mappings
    if (newSubject && selectedClasses.length > 0) {
      const mappings = selectedClasses.map(cid => ({ subject_id: newSubject.id, class_id: cid }));
      await supabase.from('class_subjects').insert(mappings);
    }
    
    setName('');
    setSelectedClasses([]);
    fetchData();
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('subjects').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleClass = (id) => {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Disciplinas</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex gap-4">
          <div style={{ flex: 1 }}><Input placeholder="Nome da Disciplina (ex: Matemática)" value={name} onChange={e => setName(e.target.value)} required /></div>
          <Button type="submit" variant="primary"><Plus size={18} /> Adicionar</Button>
        </div>
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ marginBottom: 'var(--space-2)' }}>Atrelar à Turmas:</p>
          <div className="flex flex-wrap gap-3">
            {classes.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selectedClasses.includes(c.id)} onChange={() => toggleClass(c.id)} />
                {c.series?.name} - {c.name}
              </label>
            ))}
          </div>
        </div>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Disciplina</th><th>Turmas Atreladas</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {subjects.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="text-xs text-muted">
                  {s.class_subjects?.map(cs => `${cs.classes?.series?.name} ${cs.classes?.name}`).join(', ') || '-'}
                </td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                    <Trash2 size={16} />
                  </Button>
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
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teacherType, setTeacherType] = useState('regente');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const fetchData = async () => {
    const { data: tData } = await supabase.from('teachers').select(`
      *,
      teacher_classes ( classes (name, series(name)) ),
      teacher_subjects ( subjects (name) )
    `).order('name');
    if (tData) setTeachers(tData);

    const { data: cData } = await supabase.from('classes').select('*, series(name)').order('name');
    if (cData) setClasses(cData);

    const { data: sData } = await supabase.from('subjects').select('*').order('name');
    if (sData) setSubjects(sData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Insert teacher
    const { data: newTeacher, error } = await supabase.from('teachers').insert([{ name, email, teacher_type: teacherType }]).select().single();
    if (error) return console.error(error);

    if (newTeacher) {
      if (teacherType === 'especialista' && selectedClasses.length > 0) {
        const mappings = selectedClasses.map(cid => ({ teacher_id: newTeacher.id, class_id: cid }));
        await supabase.from('teacher_classes').insert(mappings);
      } else if (teacherType === 'regente' && selectedSubjects.length > 0) {
        const mappings = selectedSubjects.map(sid => ({ teacher_id: newTeacher.id, subject_id: sid }));
        await supabase.from('teacher_subjects').insert(mappings);
      }
    }

    setName('');
    setEmail('');
    setTeacherType('regente');
    setSelectedClasses([]);
    setSelectedSubjects([]);
    fetchData();
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchData();
    }
  };

  const toggleClass = (id) => setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSubject = (id) => setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Professores</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-4" style={{ marginBottom: 'var(--space-6)' }}>
        
        <div className="flex gap-4 items-center">
          <div style={{ flex: 1 }}><Input placeholder="Nome do Professor" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ flex: 1 }}><Input type="email" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div className="flex gap-6 items-center" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <span className="text-sm font-medium">Tipo do Professor:</span>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="regente" checked={teacherType === 'regente'} onChange={(e) => { setTeacherType(e.target.value); setSelectedClasses([]); }} />
            Regente
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="especialista" checked={teacherType === 'especialista'} onChange={(e) => { setTeacherType(e.target.value); setSelectedSubjects([]); }} />
            Especialista
          </label>
        </div>

        {teacherType === 'regente' && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-2)' }}>Disciplinas Atreladas (Regente):</p>
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

        {teacherType === 'especialista' && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium text-primary" style={{ marginBottom: 'var(--space-2)' }}>Turmas Atreladas (Especialista):</p>
            <div className="flex flex-wrap gap-3">
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedClasses.includes(c.id)} onChange={() => toggleClass(c.id)} />
                  {c.series?.name} - {c.name}
                </label>
              ))}
              {classes.length === 0 && <span className="text-xs text-muted">Cadastre turmas primeiro.</span>}
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
            <tr><th>Nome</th><th>Tipo</th><th>Atribuições</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id}>
                <td>{t.name}<br/><span className="text-xs text-muted">{t.email}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{t.teacher_type || 'N/A'}</td>
                <td className="text-xs text-muted">
                  {t.teacher_type === 'regente' 
                    ? t.teacher_subjects?.map(ts => ts.subjects?.name).join(', ') 
                    : t.teacher_classes?.map(tc => `${tc.classes?.series?.name} ${tc.classes?.name}`).join(', ')}
                </td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(t.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Nenhum professor cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Series Component (Unchanged)
function SeriesCrud() {
  const [series, setSeries] = useState([]);
  const [name, setName] = useState('');

  const fetchSeries = async () => {
    const { data } = await supabase.from('series').select('*').order('name');
    if (data) setSeries(data);
  };

  useEffect(() => { fetchSeries(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from('series').insert([{ name }]);
    setName('');
    fetchSeries();
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza? Remover uma série pode remover as turmas atreladas!')) {
      await supabase.from('series').delete().eq('id', id);
      fetchSeries();
    }
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Séries</h2>
      <form onSubmit={handleAdd} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ flex: 1 }}><Input placeholder="Nome da Série (ex: 3º Ano)" value={name} onChange={e => setName(e.target.value)} required /></div>
        <Button type="submit" variant="primary"><Plus size={18} /> Adicionar</Button>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Nome da Série</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {series.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(s.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {series.length === 0 && <tr><td colSpan="2" className="text-center text-muted">Nenhuma série cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Classes Component (Unchanged)
function ClassesCrud() {
  const [classes, setClasses] = useState([]);
  const [series, setSeries] = useState([]);
  const [name, setName] = useState('');
  const [seriesId, setSeriesId] = useState('');

  const fetchData = async () => {
    const { data: clsData } = await supabase.from('classes').select('*, series(name)').order('name');
    if (clsData) setClasses(clsData);
    
    const { data: srsData } = await supabase.from('series').select('*').order('name');
    if (srsData) setSeries(srsData);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !seriesId) return;
    await supabase.from('classes').insert([{ name, series_id: seriesId }]);
    setName('');
    setSeriesId('');
    fetchData();
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('classes').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Turmas</h2>
      <form onSubmit={handleAdd} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ flex: 1 }}>
          <Select 
            value={seriesId} 
            onChange={e => setSeriesId(e.target.value)} 
            options={series.map(s => ({ value: s.id, label: s.name }))}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <Input placeholder="Nome da Turma (ex: Turma A)" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <Button type="submit" variant="primary"><Plus size={18} /> Adicionar</Button>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Série</th><th>Turma</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {classes.map(c => (
              <tr key={c.id}>
                <td>{c.series?.name}</td>
                <td>{c.name}</td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(c.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhuma turma cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
