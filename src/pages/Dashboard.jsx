import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal } from '../components/ui';
import { useSchool } from '../contexts/SchoolContext';
import { Eye, Trash2, Calendar, User, BookOpen, GraduationCap, Edit, Filter, BarChart3, TrendingUp, ClipboardList } from 'lucide-react';
import ObservationDetails from './ObservationDetails';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedSchoolId, selectedBimestre } = useSchool();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Card Selectors State
  const [totalFilter, setTotalFilter] = useState('data'); // data, nome, serie, turma
  const [periodRange, setPeriodRange] = useState('mes'); // semana, mes, bimestre, semestre, ano
  const [statusFilter, setStatusFilter] = useState('Atende plenamente');

  // Compact Mode State (persisted in localStorage)
  const [isCompactMode, setIsCompactMode] = useState(() => {
    return localStorage.getItem('dashboard_compact_mode') === 'true';
  });

  const fetchObservations = async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from('observations')
        .select(`
          *,
          teachers:teachers!fk_observations_teacher(name),
          series:series!fk_observations_series(name, segments:segments!segment_id(name)),
          subjects:subjects!fk_observations_subject(name)
        `)
        .eq('school_id', selectedSchoolId);
      
      if (selectedBimestre) {
        query = query.eq('bimestre', selectedBimestre);
      }

      const { data, error } = await query.order('visit_date', { ascending: false });

      if (error) throw error;
      setObservations(data || []);
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [selectedSchoolId, selectedBimestre]);

  // Data Transformation for Charts
  const chartData = useMemo(() => {
    if (observations.length === 0) return { total: [], period: [], status: [] };

    // 1. Total Card Data
    let totalData = [];
    if (totalFilter === 'data') {
      const counts = {};
      observations.forEach(obs => {
        const date = obs.visit_date;
        counts[date] = (counts[date] || 0) + 1;
      });
      totalData = Object.entries(counts)
        .map(([date, count]) => ({ label: date.split('-').reverse().slice(0, 2).join('/'), value: count }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } else if (totalFilter === 'nome') {
      const counts = {};
      observations.forEach(obs => {
        const name = obs.teachers?.name?.split(' ')[0] || 'N/A';
        counts[name] = (counts[name] || 0) + 1;
      });
      totalData = Object.entries(counts)
        .map(([name, count]) => ({ label: name, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } else if (totalFilter === 'serie' || totalFilter === 'turma') {
      const counts = {};
      observations.forEach(obs => {
        const name = obs.series?.name || 'N/A';
        counts[name] = (counts[name] || 0) + 1;
      });
      totalData = Object.entries(counts)
        .map(([name, count]) => ({ label: name, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }

    // 2. Period Card Data (Trends)
    let periodData = [];
    const now = new Date();
    if (periodRange === 'semana') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
      const counts = days.reduce((acc, d) => ({ ...acc, [d]: 0 }), {});
      observations.forEach(obs => {
        const d = new Date(obs.visit_date);
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        if (d >= weekAgo) counts[days[d.getDay()]] += 1;
      });
      periodData = days.map(d => ({ label: d, value: counts[d] }));
    } else if (periodRange === 'mes') {
      // Group by weeks
      const counts = { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4+': 0 };
      observations.forEach(obs => {
        const d = new Date(obs.visit_date);
        if (d.getMonth() === now.getMonth()) {
          const day = d.getDate();
          if (day <= 7) counts['Sem 1']++;
          else if (day <= 14) counts['Sem 2']++;
          else if (day <= 21) counts['Sem 3']++;
          else counts['Sem 4+']++;
        }
      });
      periodData = Object.entries(counts).map(([l, v]) => ({ label: l, value: v }));
    } else {
      // Group by months for Bimestre, Semestre, Ano
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const counts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
      observations.forEach(obs => {
        const d = new Date(obs.visit_date);
        if (d.getFullYear() === now.getFullYear()) {
          counts[months[d.getMonth()]] += 1;
        }
      });
      periodData = months.map(m => ({ label: m, value: counts[m] })).filter(m => m.value > 0 || (months.indexOf(m.label) <= now.getMonth()));
    }

    // 3. Status Card Data: Frequência do status selecionado por dimensão pedagógica
    const dimensions = [
      { key: 'planning_evaluation', label: 'Plan.' },
      { key: 'methodology_evaluation', label: 'Metod.' },
      { key: 'learning_evaluation', label: 'Aprend.' },
      { key: 'management_evaluation', label: 'Gestão' },
      { key: 'identity_evaluation', label: 'Ident.' }
    ];
    
    const statusData = dimensions.map(dim => {
      const count = observations.filter(obs => obs[dim.key] === statusFilter).length;
      return { label: dim.label, value: count };
    });

    return { total: totalData, period: periodData, status: statusData };
  }, [observations, totalFilter, periodRange, statusFilter]);

  const stats = useMemo(() => {
    const totalCount = observations.length;
    const periodCount = chartData.period.reduce((a, b) => a + b.value, 0);
    // Soma total das avaliações que correspondem ao status selecionado nas 5 dimensões
    const statusCount = observations.reduce((sum, obs) => {
      const evals = [obs.planning_evaluation, obs.methodology_evaluation, obs.learning_evaluation, obs.management_evaluation, obs.identity_evaluation];
      return sum + evals.filter(e => e === statusFilter).length;
    }, 0);
    return { total: totalCount, period: periodCount, status: statusCount };
  }, [observations, chartData, statusFilter]);

  const sortedObservations = useMemo(() => {
    const sorted = [...observations];
    if (totalFilter === 'nome') sorted.sort((a, b) => (a.teachers?.name || '').localeCompare(b.teachers?.name || ''));
    else if (totalFilter === 'serie') sorted.sort((a, b) => (a.series?.name || '').localeCompare(b.series?.name || ''));
    else sorted.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
    return sorted;
  }, [observations, totalFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('observations').delete().eq('id', id);
      if (error) throw error;
      fetchObservations();
    } catch (error) {
      alert('Erro ao excluir registro.');
    }
  };

  if (!selectedSchoolId) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) 0' }}>
        <Card className="text-center p-12">
          <h2 className="h2" style={{ marginBottom: 'var(--space-2)' }}>Bem-vindo ao SOSA</h2>
          <p className="text-muted text-sm">Por favor, selecione uma Unidade Escolar no menu lateral para visualizar o Dashboard.</p>
        </Card>
      </div>
    );
  }

  const cardLabelStyle = { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' };
  const cardSelectStyle = { border: 'none', background: 'transparent', fontSize: '11px', padding: 0, outline: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' };

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-4) 0' }}>
      <div className="flex justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Dashboard</h1>
          <p className="text-xs text-muted font-medium">{selectedBimestre}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => setIsCompactMode(prev => {
              const next = !prev;
              localStorage.setItem('dashboard_compact_mode', String(next));
              return next;
            })} 
            style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isCompactMode ? <BarChart3 size={14} /> : <Eye size={14} />}
            {isCompactMode ? 'Ver Gráficos' : 'Modo Compacto'}
          </Button>
          <Button variant="secondary" onClick={fetchObservations} style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} >
            <Calendar size={14} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="dashboard-grid">
        {/* Total Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ backgroundColor: 'var(--primary-light)', padding: '6px', borderRadius: '6px' }}>
              <Calendar size={18} className="text-primary" />
            </div>
            <select style={cardSelectStyle} value={totalFilter} onChange={(e) => setTotalFilter(e.target.value)}>
              <option value="data">Por Data</option>
              <option value="nome">Por Nome</option>
              <option value="serie">Por Série</option>
              <option value="turma">Por Turma</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <p style={cardLabelStyle}>Total de Observações</p>
            <div className="flex items-end justify-between gap-4 flex-1">
              <p className="h2" style={{ margin: 0, lineHeight: 1 }}>{stats.total}</p>
              <div className="chart-container" style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.total}>
                    <Bar dataKey="value" fill="var(--primary-light)" radius={[4, 4, 0, 0]}>
                      {chartData.total.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--primary-light)'} />
                      ))}
                    </Bar>
                    {!isCompactMode && <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />}
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* Period Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ backgroundColor: '#ecfdf5', padding: '6px', borderRadius: '6px' }}>
              <TrendingUp size={18} style={{ color: 'var(--success)' }} />
            </div>
            <select style={cardSelectStyle} value={periodRange} onChange={(e) => setPeriodRange(e.target.value)}>
              <option value="semana">Nesta Semana</option>
              <option value="mes">Neste Mês</option>
              <option value="bimestre">Neste Bimestre</option>
              <option value="semestre">Neste Semestre</option>
              <option value="ano">Neste Ano</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <p style={cardLabelStyle}>Tendência do Período</p>
            <div className="flex items-end justify-between gap-4 flex-1">
              <p className="h2" style={{ margin: 0, lineHeight: 1 }}>{stats.period}</p>
              <div className="chart-container" style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.period}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="var(--success)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>

        {/* Status Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ backgroundColor: '#fffbeb', padding: '6px', borderRadius: '6px' }}>
              <Filter size={18} style={{ color: 'var(--warning)' }} />
            </div>
            <select style={cardSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Atende plenamente">Plenamente</option>
              <option value="Atende parcialmente">Parcialmente</option>
              <option value="Não atende">Não Atende</option>
              <option value="Não observado">Não Obs.</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <p style={cardLabelStyle}>Frequência do Status</p>
            <div className="flex items-end justify-between gap-4 flex-1">
              <p className="h2" style={{ margin: 0, lineHeight: 1 }}>{stats.status}</p>
              <div className="chart-container" style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.status}>
                    <Bar dataKey="value" fill="var(--warning)" radius={[4, 4, 0, 0]}>
                      {chartData.status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--warning)' : '#fef3c7'} />
                      ))}
                    </Bar>
                    {!isCompactMode && <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />}
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Observations */}
      <Card className="card-compact">
        <h2 className="h3 mb-4 flex items-center gap-2">
          <ClipboardList size={18} /> Observações Recentes
        </h2>

        {loading ? (
          <div className="text-center p-8 text-muted text-sm italic">Carregando registros...</div>
        ) : sortedObservations.length === 0 ? (
          <div className="text-center p-8 text-muted text-sm">Nenhuma observação no {selectedBimestre}.</div>
        ) : (
          <div className="table-container">
            <table className="table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th className="text-tiny">Data</th>
                  <th className="text-tiny">Professor</th>
                  <th className="text-tiny">Série / Turma</th>
                  <th className="text-tiny">Disciplina</th>
                  <th className="text-tiny text-right" style={{ position: 'sticky', right: 0, backgroundColor: 'var(--surface-hover)', zIndex: 20 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedObservations.map(obs => (
                  <tr key={obs.id}>
                    <td className="text-xs font-bold text-primary">
                      {obs.visit_date ? obs.visit_date.split('-').reverse().join('/') : 'N/A'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-muted" />
                        <span className="text-xs font-medium">{obs.teachers?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <GraduationCap size={12} className="text-muted" />
                        <span className="text-xs">
                          {obs.series?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <BookOpen size={12} className="text-muted" />
                        <span className="text-xs">{obs.subjects?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 10 }}>
                      <div className="flex gap-1 justify-end">
                        <Button variant="secondary" style={{ padding: '4px' }} onClick={() => { setSelectedObservation(obs); setIsModalOpen(true); }}>
                          <Eye size={14} />
                        </Button>
                        <Button variant="secondary" style={{ padding: '4px' }} onClick={() => navigate(`/observacao/editar/${obs.id}`)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="danger" style={{ padding: '4px' }} onClick={() => handleDelete(obs.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalhes da Observação">
        <ObservationDetails observation={selectedObservation} />
        <div className="flex justify-end mt-6">
          <Button onClick={() => setIsModalOpen(false)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  );
}
