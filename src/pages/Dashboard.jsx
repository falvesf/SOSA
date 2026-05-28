import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, handleAuthError } from '../lib/supabase';
import { Card, Button, Modal, ConfirmModal, Toast } from '../components/ui';
import { useSchool } from '../contexts/SchoolContext';
import { Eye, Trash2, Calendar, User, BookOpen, GraduationCap, Edit, Filter, BarChart3, TrendingUp, ClipboardList, Pin, CloudOff, ArrowUpDown } from 'lucide-react';
import ObservationDetails from './ObservationDetails';
import { useSync } from '../contexts/SyncContext';
import { removeQueueItem, cacheMetadata, getCachedMetadata, withTimeout } from '../lib/offlineStore';
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
  const { offlineQueue, loadQueue } = useSync();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteIsOffline, setDeleteIsOffline] = useState(false);
  const [toast, setToast] = useState(null);

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!selectedSchoolId) return;
    async function loadSubjects() {
      try {
        const cachedSub = await getCachedMetadata(`subjects_${selectedSchoolId}`);
        if (cachedSub) {
          setSubjects(cachedSub);
          return;
        }
        const { data, error } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('school_id', selectedSchoolId)
          .order('name');
        if (data && !error) {
          setSubjects(data);
        }
      } catch (err) {
        console.error('Failed to load subjects in dashboard:', err);
      }
    }
    loadSubjects();
  }, [selectedSchoolId]);

  const getObservationSubjectNames = (obs) => {
    if (obs.isOffline && obs.subjects?.name) {
      return obs.subjects.name;
    }
    if (obs.subject_ids && obs.subject_ids.length > 0 && subjects.length > 0) {
      const names = subjects
        .filter(s => obs.subject_ids.includes(s.id))
        .map(s => s.name);
      if (names.length > 0) return names.join(', ');
    }
    return obs.subjects?.name || 'N/A';
  };

  // Card Selectors State
  const totalFilter = 'data';
  const [periodRange, setPeriodRange] = useState('mes'); // semana, mes, bimestre, semestre, ano
  const [statusFilter, setStatusFilter] = useState('Atende plenamente');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Compact Mode State (persisted in localStorage)
  const [isCompactMode, setIsCompactMode] = useState(() => {
    return localStorage.getItem('dashboard_compact_mode') === 'true';
  });

  // Pin State (persisted in localStorage)
  const [isPinned, setIsPinned] = useState(() => {
    return localStorage.getItem('dashboard_pinned') === 'true';
  });

  const fetchObservations = async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }

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

      const { data, error } = await withTimeout(query.order('visit_date', { ascending: false }), 2000);

      if (error) throw error;
      
      const obsData = data || [];
      setObservations(obsData);

      // Cache the observations list for this school and bimestre
      if (selectedSchoolId && selectedBimestre) {
        await cacheMetadata(`observations_${selectedSchoolId}_${selectedBimestre}`, obsData);
      }
    } catch (error) {
      if (handleAuthError(error)) return;
      console.error('Error fetching observations, loading from cache:', error);
      if (selectedSchoolId && selectedBimestre) {
        const cachedObs = await getCachedMetadata(`observations_${selectedSchoolId}_${selectedBimestre}`);
        if (cachedObs) {
          setObservations(cachedObs);
        } else {
          setObservations([]);
        }
      } else {
        setObservations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();

    const handleSyncCompleted = () => {
      fetchObservations();
    };
    window.addEventListener('sosa_sync_completed', handleSyncCompleted);
    return () => window.removeEventListener('sosa_sync_completed', handleSyncCompleted);
  }, [selectedSchoolId, selectedBimestre]);

  // Data Transformation for Charts
  const localOfflineObs = useMemo(() => {
    return offlineQueue
      .filter(item => item.payload.school_id === selectedSchoolId && item.payload.bimestre === selectedBimestre)
      .map(item => {
        return {
          ...item.payload,
          id: item.id,
          isOffline: true,
          teachers: { name: item.meta.teacherName },
          subjects: { name: item.meta.subjectName },
          series: { name: item.meta.seriesName }
        };
      });
  }, [offlineQueue, selectedSchoolId, selectedBimestre]);

  const allObservations = useMemo(() => {
    // If an offline edit exists in the queue for a record, hide the cached online version in the UI
    const offlineIds = new Set(localOfflineObs.map(obs => obs.id));
    const filteredOnline = observations.filter(obs => !offlineIds.has(obs.id));
    return [...localOfflineObs, ...filteredOnline];
  }, [localOfflineObs, observations]);

  const chartData = useMemo(() => {
    if (allObservations.length === 0) return { total: [], period: [], status: [] };

    // 1. Total Card Data
    let totalData = [];
    if (totalFilter === 'data') {
      const counts = {};
      allObservations.forEach(obs => {
        const date = obs.visit_date;
        counts[date] = (counts[date] || 0) + 1;
      });
      totalData = Object.entries(counts)
        .map(([date, count]) => ({ 
          dateKey: date,
          label: date ? date.split('-').reverse().slice(0, 2).join('/') : 'N/A', 
          value: count 
        }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    } else if (totalFilter === 'nome') {
      const counts = {};
      allObservations.forEach(obs => {
        const name = obs.teachers?.name?.split(' ')[0] || 'N/A';
        counts[name] = (counts[name] || 0) + 1;
      });
      totalData = Object.entries(counts)
        .map(([name, count]) => ({ label: name, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } else if (totalFilter === 'serie' || totalFilter === 'turma') {
      const counts = {};
      allObservations.forEach(obs => {
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
      allObservations.forEach(obs => {
        const d = new Date(obs.visit_date);
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        if (d >= weekAgo) counts[days[d.getDay()]] += 1;
      });
      periodData = days.map(d => ({ label: d, value: counts[d] }));
    } else if (periodRange === 'mes') {
      // Group by weeks
      const counts = { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4+': 0 };
      allObservations.forEach(obs => {
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
      allObservations.forEach(obs => {
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
      const count = allObservations.filter(obs => obs[dim.key] === statusFilter).length;
      return { label: dim.label, value: count };
    });

    return { total: totalData, period: periodData, status: statusData };
  }, [allObservations, totalFilter, periodRange, statusFilter]);

  const stats = useMemo(() => {
    const totalCount = allObservations.length;
    const periodCount = chartData.period.reduce((a, b) => a + b.value, 0);
    // Soma total das avaliações que correspondem ao status selecionado nas 5 dimensões
    const statusCount = allObservations.reduce((sum, obs) => {
      const evals = [obs.planning_evaluation, obs.methodology_evaluation, obs.learning_evaluation, obs.management_evaluation, obs.identity_evaluation];
      return sum + evals.filter(e => e === statusFilter).length;
    }, 0);
    return { total: totalCount, period: periodCount, status: statusCount };
  }, [allObservations, chartData, statusFilter]);

  const requestSort = (key) => {
    setSortConfig(prev => {
      let direction = 'asc';
      if (prev.key === key && prev.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  };

  const renderHeader = (key, label) => {
    const isActive = sortConfig.key === key;
    return (
      <th 
        className="text-tiny cursor-pointer select-none" 
        onClick={() => requestSort(key)}
        style={{ padding: '12px 16px' }}
      >
        <div className="flex items-center gap-1 hover:text-primary transition-colors">
          <span>{label}</span>
          <ArrowUpDown 
            size={12} 
            className={isActive ? "text-primary" : "text-muted"} 
            style={{ 
              opacity: isActive ? 1 : 0.4, 
              transform: isActive && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s, opacity 0.2s'
            }} 
          />
        </div>
      </th>
    );
  };

  const sortedObservations = useMemo(() => {
    const sorted = [...allObservations];
    sorted.sort((a, b) => {
      let valA = '';
      let valB = '';
      
      if (sortConfig.key === 'date') {
        valA = a.visit_date || '';
        valB = b.visit_date || '';
        if (valA === valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return sortConfig.direction === 'asc' 
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA);
      }
      
      if (sortConfig.key === 'teacher') {
        valA = a.teachers?.name || '';
        valB = b.teachers?.name || '';
      } else if (sortConfig.key === 'series') {
        valA = a.series?.name || '';
        valB = b.series?.name || '';
      } else if (sortConfig.key === 'subject') {
        valA = a.subjects?.name || '';
        valB = b.subjects?.name || '';
      }
      
      if (sortConfig.direction === 'asc') {
        return valA.localeCompare(valB, 'pt-BR');
      } else {
        return valB.localeCompare(valA, 'pt-BR');
      }
    });
    return sorted;
  }, [allObservations, sortConfig]);

  const handleDelete = (id, isOffline = false) => {
    setDeleteConfirmId(id);
    setDeleteIsOffline(isOffline);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const idToDelete = deleteConfirmId;
    const isOffline = deleteIsOffline;
    setDeleteConfirmId(null);
    setDeleteIsOffline(false);
    setLoading(true);
    try {
      if (isOffline) {
        // Find the actual queue item ID
        const queueItem = offlineQueue.find(q => q.id === idToDelete || (q.payload && q.payload.id === idToDelete));
        const targetId = queueItem ? queueItem.id : idToDelete;
        await removeQueueItem(targetId);
        await loadQueue();
        setToast({ message: 'Observação offline excluída com sucesso!' });
      } else {
        const { error } = await supabase.from('observations').delete().eq('id', idToDelete);
        if (error) throw error;
        fetchObservations();
        setToast({ message: 'Observação excluída com sucesso!' });
      }
    } catch (error) {
      if (handleAuthError(error)) return;
      console.error(error);
      setToast({ message: 'Erro ao excluir registro.', type: 'error' });
    } finally {
      setLoading(false);
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
      {/* Title section (contains buttons on the right) */}
      <div className="flex justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Dashboard</h1>
          <p className="text-xs text-muted font-medium">{selectedBimestre}</p>
        </div>
        <div className="flex gap-2 items-center">
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
            {isCompactMode ? 'Modo Expandido' : 'Modo Compacto'}
          </Button>
          <Button variant="secondary" onClick={fetchObservations} style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} >
            <Calendar size={14} /> Atualizar
          </Button>
          <Button 
            variant={isPinned ? "primary" : "secondary"} 
            onClick={() => setIsPinned(prev => {
              const next = !prev;
              localStorage.setItem('dashboard_pinned', String(next));
              return next;
            })} 
            style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
            title={isPinned ? 'Desfixar Painel' : 'Fixar Painel'}
          >
            <Pin size={14} style={{ transform: isPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className={`dashboard-grid ${isCompactMode ? 'grid-compact' : 'grid-expanded'} ${isPinned ? 'sticky-metrics-container' : ''}`} style={{ marginBottom: isPinned ? 'var(--space-6)' : 0 }}>
        {/* Total Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--primary)' }}>
          {isCompactMode ? (
            <div className="metrics-compact-layout">
              <div className="metrics-compact-info">
                <div className="metrics-compact-header">
                  <div className="metrics-compact-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)' }}>
                    <Calendar size={13} className="text-primary" />
                  </div>
                  <span className="metrics-compact-value">{stats.total}</span>
                </div>
                <div className="metrics-compact-meta">
                  <p className="metrics-compact-label">Observações</p>
                  <span className="metrics-compact-sub">Por Data</span>
                </div>
              </div>
              <div className="metrics-compact-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.total} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="metrics-expanded-layout">
              <div className="metrics-expanded-header">
                <div className="metrics-expanded-title-block">
                  <div className="metrics-expanded-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)' }}>
                    <Calendar size={14} className="text-primary" />
                  </div>
                  <span className="metrics-expanded-label">Total de Observações:</span>
                  <span className="metrics-expanded-value text-primary">{stats.total}</span>
                </div>
                <span className="metrics-expanded-sub">Por Data</span>
              </div>
              <div className="metrics-expanded-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.total} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        {/* Period Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--success)' }}>
          {isCompactMode ? (
            <div className="metrics-compact-layout">
              <div className="metrics-compact-info">
                <div className="metrics-compact-header">
                  <div className="metrics-compact-icon-wrapper" style={{ backgroundColor: '#ecfdf5' }}>
                    <TrendingUp size={13} style={{ color: 'var(--success)' }} />
                  </div>
                  <span className="metrics-compact-value">{stats.period}</span>
                </div>
                <div className="metrics-compact-meta">
                  <p className="metrics-compact-label">Tendência</p>
                  <select style={cardSelectStyle} value={periodRange} onChange={(e) => setPeriodRange(e.target.value)}>
                    <option value="semana">Semana</option>
                    <option value="mes">Mês</option>
                    <option value="bimestre">Bimestre</option>
                    <option value="semestre">Semestre</option>
                    <option value="ano">Ano</option>
                  </select>
                </div>
              </div>
              <div className="metrics-compact-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.period} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="colorValueCompact" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="var(--success)" fillOpacity={1} fill="url(#colorValueCompact)" strokeWidth={1.5} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--success)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="metrics-expanded-layout">
              <div className="metrics-expanded-header">
                <div className="metrics-expanded-title-block">
                  <div className="metrics-expanded-icon-wrapper" style={{ backgroundColor: '#ecfdf5' }}>
                    <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                  </div>
                  <span className="metrics-expanded-label">Tendência do Período:</span>
                  <span className="metrics-expanded-value text-success">{stats.period}</span>
                </div>
                <select style={cardSelectStyle} value={periodRange} onChange={(e) => setPeriodRange(e.target.value)}>
                  <option value="semana">Nesta Semana</option>
                  <option value="mes">Neste Mês</option>
                  <option value="bimestre">Neste Bimestre</option>
                  <option value="semestre">Neste Semestre</option>
                  <option value="ano">Neste Ano</option>
                </select>
              </div>
              <div className="metrics-expanded-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.period} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="var(--success)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--success)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        {/* Status Card */}
        <Card className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'}`} style={{ borderLeft: '4px solid var(--warning)' }}>
          {isCompactMode ? (
            <div className="metrics-compact-layout">
              <div className="metrics-compact-info">
                <div className="metrics-compact-header">
                  <div className="metrics-compact-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                    <Filter size={13} style={{ color: 'var(--warning)' }} />
                  </div>
                  <span className="metrics-compact-value">{stats.status}</span>
                </div>
                <div className="metrics-compact-meta">
                  <p className="metrics-compact-label">Frequência</p>
                  <select style={cardSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="Atende plenamente">Plenamente</option>
                    <option value="Atende parcialmente">Parcialmente</option>
                    <option value="Não atende">Não Atende</option>
                    <option value="Não observado">Não Obs.</option>
                  </select>
                </div>
              </div>
              <div className="metrics-compact-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.status} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Bar dataKey="value" fill="var(--warning)" radius={[3, 3, 0, 0]}>
                      {chartData.status.map((entry, index) => (
                        <Cell key={`cell-compact-${index}`} fill={entry.value > 0 ? 'var(--warning)' : '#fef3c7'} />
                      ))}
                    </Bar>
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--warning)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="metrics-expanded-layout">
              <div className="metrics-expanded-header">
                <div className="metrics-expanded-title-block">
                  <div className="metrics-expanded-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                    <Filter size={14} style={{ color: 'var(--warning)' }} />
                  </div>
                  <span className="metrics-expanded-label">Frequência do Status:</span>
                  <span className="metrics-expanded-value text-warning">{stats.status}</span>
                </div>
                <select style={cardSelectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="Atende plenamente">Plenamente</option>
                  <option value="Atende parcialmente">Parcialmente</option>
                  <option value="Não atende">Não Atende</option>
                  <option value="Não observado">Não Obs.</option>
                </select>
              </div>
              <div className="metrics-expanded-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.status} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                    <Bar dataKey="value" fill="var(--warning)" radius={[4, 4, 0, 0]}>
                      {chartData.status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--warning)' : '#fef3c7'} />
                      ))}
                    </Bar>
                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantidade']}
                      contentStyle={{ 
                        fontSize: '10px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-primary)'
                      }} 
                      itemStyle={{ color: 'var(--warning)', fontWeight: 'bold' }}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
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
                  {renderHeader('date', 'Data')}
                  {renderHeader('teacher', 'Professor')}
                  {renderHeader('series', 'Série / Turma')}
                  {renderHeader('subject', 'Disciplina')}
                  <th className="text-tiny text-right" style={{ position: 'sticky', right: 0, backgroundColor: 'var(--surface-hover)', zIndex: 20 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedObservations.map(obs => (
                  <tr key={obs.id}>
                    <td className="text-xs font-bold text-primary">
                      <div className="flex items-center gap-1.5">
                        {obs.visit_date ? obs.visit_date.split('-').reverse().join('/') : 'N/A'}
                        {obs.isOffline && (
                          <div className="offline-badge-container">
                            <CloudOff size={13} className="text-danger animate-pulse" style={{ cursor: 'help' }} />
                            <span className="offline-tooltip" style={{ width: '180px' }}>
                              Registro salvo localmente offline. Sincronização automática pendente.
                            </span>
                          </div>
                        )}
                      </div>
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
                        <span className="text-xs">{getObservationSubjectNames(obs)}</span>
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
                        <Button variant="danger" style={{ padding: '4px' }} onClick={() => handleDelete(obs.id, obs.isOffline)}>
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
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir esta observação? Esta ação não pode ser desfeita."
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
