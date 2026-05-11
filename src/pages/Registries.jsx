import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select } from '../components/ui';
import { Trash2, Plus, Edit } from 'lucide-react';

export default function Registries() {
  const [activeTab, setActiveTab] = useState('teachers'); // teachers, series, classes

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>Cadastros</h1>
      
      <div className="flex gap-2" style={{ marginBottom: 'var(--space-6)' }}>
        <Button variant={activeTab === 'teachers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('teachers')}>Professores</Button>
        <Button variant={activeTab === 'series' ? 'primary' : 'secondary'} onClick={() => setActiveTab('series')}>Séries</Button>
        <Button variant={activeTab === 'classes' ? 'primary' : 'secondary'} onClick={() => setActiveTab('classes')}>Turmas</Button>
      </div>

      <Card className="animate-fade-in">
        {activeTab === 'teachers' && <TeachersCrud />}
        {activeTab === 'series' && <SeriesCrud />}
        {activeTab === 'classes' && <ClassesCrud />}
      </Card>
    </div>
  );
}

// Teachers Component
function TeachersCrud() {
  const [teachers, setTeachers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*').order('name');
    if (data) setTeachers(data);
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from('teachers').insert([{ name, email }]);
    setName('');
    setEmail('');
    fetchTeachers();
  };

  const handleDelete = async (id) => {
    if(confirm('Tem certeza?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchTeachers();
    }
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Professores</h2>
      <form onSubmit={handleAdd} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ flex: 1 }}><Input placeholder="Nome do Professor" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div style={{ flex: 1 }}><Input type="email" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <Button type="submit" variant="primary"><Plus size={18} /> Adicionar</Button>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th style={{ width: '80px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.email || '-'}</td>
                <td>
                  <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(t.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhum professor cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Series Component
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

// Classes Component
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
