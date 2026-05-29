import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, handleAuthError } from '../lib/supabase';
import { Card, Button, Modal, ConfirmModal, Toast } from '../components/ui';
import { useSchool } from '../contexts/SchoolContext';
import { Eye, Trash2, Calendar, User, BookOpen, GraduationCap, Edit, Filter, BarChart3, TrendingUp, ClipboardList, Pin, CloudOff, ArrowUpDown, Plus, Settings, X, Palette } from 'lucide-react';
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
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend
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

  // Card Selectors & Customization States
  const [customCards, setCustomCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Default cards definitions
  const getDefaultCards = () => [
    {
      id: 'default_total',
      title: 'TOTAL DE OBSERVAÇÕES',
      dataType: 'total',
      dataFilter: 'data',
      chartType: 'bar',
      color: '#4f46e5', // Indigo
      showLabels: true
    },
    {
      id: 'default_period',
      title: 'TENDÊNCIA DO PERÍODO',
      dataType: 'period',
      dataFilter: 'mes',
      chartType: 'area',
      color: '#10b981', // Emerald
      showLabels: false
    },
    {
      id: 'default_status',
      title: 'FREQUÊNCIA DO STATUS',
      dataType: 'status',
      dataFilter: 'Atende plenamente',
      chartType: 'bar',
      color: '#f59e0b', // Amber
      showLabels: true
    }
  ];

  const premiumColors = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Esmeralda', value: '#10b981' },
    { name: 'Âmbar', value: '#f59e0b' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Rubi', value: '#ef4444' },
    { name: 'Violeta', value: '#8b5cf6' },
    { name: 'Ciano', value: '#06b6d4' },
    { name: 'Menta', value: '#14b8a6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Grafite', value: '#64748b' }
  ];

  const saveCardsToCloud = async (newCards) => {
    try {
      localStorage.setItem('sosa_custom_dashboard_cards', JSON.stringify(newCards));
      if (navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.updateUser({
            data: { dashboard_config: newCards }
          });
        }
      }
    } catch (err) {
      console.error('Failed to save dashboard cards:', err);
    }
  };

  const loadCardsFromCloud = async () => {
    let cards = [];
    const local = localStorage.getItem('sosa_custom_dashboard_cards');
    if (local) {
      try {
        cards = JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }

    if (navigator.onLine) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata?.dashboard_config) {
          cards = session.user.user_metadata.dashboard_config;
          localStorage.setItem('sosa_custom_dashboard_cards', JSON.stringify(cards));
        }
      } catch (err) {
        console.error('Failed to load dashboard cards from cloud:', err);
      }
    }

    if (!cards || cards.length === 0) {
      cards = getDefaultCards();
    }
    setCustomCards(cards);
  };

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
    loadCardsFromCloud();

    const handleSyncCompleted = () => {
      fetchObservations();
      loadCardsFromCloud();
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

  const getDynamicChartData = (card, observationsList = allObservations) => {
    if (!card || observationsList.length === 0) return { data: [], value: 0 };

    let data = [];
    let value = 0;

    if (card.dataType === 'total') {
      if (card.dataFilter === 'data') {
        const counts = {};
        observationsList.forEach(obs => {
          const date = obs.visit_date;
          if (date) counts[date] = (counts[date] || 0) + 1;
        });
        data = Object.entries(counts)
          .map(([date, count]) => ({
            dateKey: date,
            label: date ? date.split('-').reverse().slice(0, 2).join('/') : 'N/A',
            value: count
          }))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      } else if (card.dataFilter === 'nome') {
        const counts = {};
        observationsList.forEach(obs => {
          const name = obs.teachers?.name?.split(' ')[0] || 'N/A';
          counts[name] = (counts[name] || 0) + 1;
        });
        data = Object.entries(counts)
          .map(([name, count]) => ({ label: name, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      } else if (card.dataFilter === 'serie' || card.dataFilter === 'turma') {
        const counts = {};
        observationsList.forEach(obs => {
          const name = obs.series?.name || 'N/A';
          counts[name] = (counts[name] || 0) + 1;
        });
        data = Object.entries(counts)
          .map(([name, count]) => ({ label: name, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
      }
      value = observationsList.length;
    } else if (card.dataType === 'period') {
      const now = new Date();
      if (card.dataFilter === 'semana') {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const counts = days.reduce((acc, d) => ({ ...acc, [d]: 0 }), {});
        observationsList.forEach(obs => {
          const d = new Date(obs.visit_date);
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          if (d >= weekAgo) counts[days[d.getDay()]] += 1;
        });
        data = days.map(d => ({ label: d, value: counts[d] }));
      } else if (card.dataFilter === 'mes') {
        const counts = { 'Sem 1': 0, 'Sem 2': 0, 'Sem 3': 0, 'Sem 4+': 0 };
        observationsList.forEach(obs => {
          const d = new Date(obs.visit_date);
          if (d.getMonth() === now.getMonth()) {
            const day = d.getDate();
            if (day <= 7) counts['Sem 1']++;
            else if (day <= 14) counts['Sem 2']++;
            else if (day <= 21) counts['Sem 3']++;
            else counts['Sem 4+']++;
          }
        });
        data = Object.entries(counts).map(([l, v]) => ({ label: l, value: v }));
      } else {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const counts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
        observationsList.forEach(obs => {
          const d = new Date(obs.visit_date);
          if (d.getFullYear() === now.getFullYear()) {
            counts[months[d.getMonth()]] += 1;
          }
        });
        data = months
          .map(m => ({ label: m, value: counts[m] }))
          .filter(m => m.value > 0 || (months.indexOf(m.label) <= now.getMonth()));
      }
      value = data.reduce((a, b) => a + b.value, 0);
    } else if (card.dataType === 'status') {
      const dimensions = [
        { key: 'planning_evaluation', label: 'Plan.' },
        { key: 'methodology_evaluation', label: 'Metod.' },
        { key: 'learning_evaluation', label: 'Aprend.' },
        { key: 'management_evaluation', label: 'Gestão' },
        { key: 'identity_evaluation', label: 'Ident.' }
      ];
      
      data = dimensions.map(dim => {
        const count = observationsList.filter(obs => obs[dim.key] === card.dataFilter).length;
        return { label: dim.label, value: count };
      });
      
      value = observationsList.reduce((sum, obs) => {
        const evals = [obs.planning_evaluation, obs.methodology_evaluation, obs.learning_evaluation, obs.management_evaluation, obs.identity_evaluation];
        return sum + evals.filter(e => e === card.dataFilter).length;
      }, 0);
    }

    return { data, value };
  };

  const renderCardChart = (card, data, cardColor) => {
    if (!data || data.length === 0) {
      return <div className="flex items-center justify-center h-full text-tiny text-muted italic">Sem dados</div>;
    }

    const renderTooltip = () => (
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
        itemStyle={{ color: cardColor, fontWeight: 'bold' }}
        labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}
      />
    );

    switch (card.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
              <Line type="monotone" dataKey="value" stroke={cardColor} strokeWidth={2} dot={{ r: isCompactMode ? 1 : 2 }} />
              {!isCompactMode && card.showLabels && <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />}
              {renderTooltip()}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`colorValue-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cardColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={cardColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={cardColor} fillOpacity={1} fill={`url(#colorValue-${card.id})`} strokeWidth={2} />
              {!isCompactMode && card.showLabels && <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />}
              {renderTooltip()}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={isCompactMode ? 8 : 16}
                outerRadius={isCompactMode ? 18 : 34}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={premiumColors[index % premiumColors.length].value} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [value, 'Quantidade']}
                contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={isCompactMode ? 14 : 32} data={data}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="label" fontSize={isCompactMode ? 6 : 8} tickLine={false} />
              <Radar name="Valor" dataKey="value" stroke={cardColor} fill={cardColor} fillOpacity={0.4} />
              <Tooltip 
                formatter={(value) => [value, 'Quantidade']}
                contentStyle={{ fontSize: '9px', borderRadius: '6px', border: 'none' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
              <Bar dataKey="value" fill={cardColor} radius={isCompactMode ? [3, 3, 0, 0] : [4, 4, 0, 0]} />
              {!isCompactMode && card.showLabels && <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={8} tickLine={false} axisLine={false} />}
              {renderTooltip()}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const handleAddNewCard = () => {
    setEditingCard({
      id: 'card_' + Date.now(),
      title: 'NOVA MÉTRICA',
      dataType: 'total',
      dataFilter: 'data',
      chartType: 'bar',
      color: '#4f46e5',
      showLabels: true,
      isNew: true
    });
    setIsEditModalOpen(true);
  };

  const handleEditCard = (card) => {
    setEditingCard({ ...card });
    setIsEditModalOpen(true);
  };

  const handleRemoveCard = async (cardId) => {
    const updated = customCards.filter(c => c.id !== cardId);
    setCustomCards(updated);
    await saveCardsToCloud(updated);
    setToast({ message: 'Gráfico removido com sucesso!' });
  };

  const handleCardFilterChange = async (cardId, newFilterValue) => {
    const updated = customCards.map(c => c.id === cardId ? { ...c, dataFilter: newFilterValue } : c);
    setCustomCards(updated);
    await saveCardsToCloud(updated);
  };

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
        {customCards.map((card) => {
          const { data, value } = getDynamicChartData(card);
          const cardColor = card.color || '#4f46e5';

          // Curated icons based on dataType
          let CardIcon = Calendar;
          if (card.dataType === 'period') CardIcon = TrendingUp;
          else if (card.dataType === 'status') CardIcon = Filter;

          return (
            <Card 
              key={card.id} 
              className={`card-compact overflow-hidden metrics-card ${isCompactMode ? 'mode-compact' : 'mode-normal'} group`} 
              style={{ 
                borderLeft: `4px solid ${cardColor}`, 
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {/* Quick Hover Actions */}
              <div 
                className="card-actions" 
                style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px', 
                  display: 'flex', 
                  gap: '4px', 
                  zIndex: 20,
                  opacity: 0.8
                }}
              >
                <button 
                  onClick={() => handleEditCard(card)} 
                  style={{ 
                    border: 'none', 
                    background: '#ffffffeb', 
                    cursor: 'pointer', 
                    padding: '4px', 
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Editar Card"
                >
                  <Settings size={11} className="text-muted" />
                </button>
                <button 
                  onClick={() => handleRemoveCard(card.id)} 
                  style={{ 
                    border: 'none', 
                    background: '#ffffffeb', 
                    cursor: 'pointer', 
                    padding: '4px', 
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remover Card"
                >
                  <X size={11} className="text-danger" />
                </button>
              </div>

              {isCompactMode ? (
                <div className="metrics-compact-layout">
                  <div className="metrics-compact-info">
                    <div className="metrics-compact-header">
                      <div className="metrics-compact-icon-wrapper" style={{ backgroundColor: cardColor + '15' }}>
                        <CardIcon size={13} style={{ color: cardColor }} />
                      </div>
                      <span className="metrics-compact-value">{value}</span>
                    </div>
                    <div className="metrics-compact-meta">
                      <p className="metrics-compact-label" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {card.title}
                      </p>
                      {card.dataType === 'total' && (
                        <select 
                          style={cardSelectStyle} 
                          value={card.dataFilter} 
                          onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                        >
                          <option value="data">Por Data</option>
                          <option value="nome">Por Professor</option>
                          <option value="serie">Por Série</option>
                        </select>
                      )}
                      {card.dataType === 'period' && (
                        <select 
                          style={cardSelectStyle} 
                          value={card.dataFilter} 
                          onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                        >
                          <option value="semana">Semana</option>
                          <option value="mes">Mês</option>
                          <option value="bimestre">Bimestre</option>
                          <option value="ano">Ano</option>
                        </select>
                      )}
                      {card.dataType === 'status' && (
                        <select 
                          style={cardSelectStyle} 
                          value={card.dataFilter} 
                          onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                        >
                          <option value="Atende plenamente">Plenamente</option>
                          <option value="Atende parcialmente">Parcialmente</option>
                          <option value="Não atende">Não Atende</option>
                          <option value="Não observado">Não Obs.</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="metrics-compact-chart-container">
                    {renderCardChart(card, data, cardColor)}
                  </div>
                </div>
              ) : (
                <div className="metrics-expanded-layout">
                  <div className="metrics-expanded-header">
                    <div className="metrics-expanded-title-block" style={{ paddingRight: '40px' }}>
                      <div className="metrics-expanded-icon-wrapper" style={{ backgroundColor: cardColor + '15' }}>
                        <CardIcon size={14} style={{ color: cardColor }} />
                      </div>
                      <span className="metrics-expanded-label">{card.title}:</span>
                      <span className="metrics-expanded-value" style={{ color: cardColor }}>{value}</span>
                    </div>
                    {card.dataType === 'total' && (
                      <select 
                        style={cardSelectStyle} 
                        value={card.dataFilter} 
                        onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                      >
                        <option value="data">Por Data</option>
                        <option value="nome">Por Professor</option>
                        <option value="serie">Por Série</option>
                      </select>
                    )}
                    {card.dataType === 'period' && (
                      <select 
                        style={cardSelectStyle} 
                        value={card.dataFilter} 
                        onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                      >
                        <option value="semana">Nesta Semana</option>
                        <option value="mes">Neste Mês</option>
                        <option value="bimestre">Neste Bimestre</option>
                        <option value="ano">Neste Ano</option>
                      </select>
                    )}
                    {card.dataType === 'status' && (
                      <select 
                        style={cardSelectStyle} 
                        value={card.dataFilter} 
                        onChange={(e) => handleCardFilterChange(card.id, e.target.value)}
                      >
                        <option value="Atende plenamente">Plenamente</option>
                        <option value="Atende parcialmente">Parcialmente</option>
                        <option value="Não atende">Não Atende</option>
                        <option value="Não observado">Não Obs.</option>
                      </select>
                    )}
                  </div>
                  <div className="metrics-expanded-chart-container" style={{ minHeight: '92px' }}>
                    {renderCardChart(card, data, cardColor)}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* Dynamic Add Card Slot */}
        {customCards.length < 4 && (
          <Card 
            className={`card-compact metrics-card flex flex-col items-center justify-center cursor-pointer transition-all duration-200`}
            onClick={handleAddNewCard}
            style={{ 
              border: '2px dashed var(--border)', 
              minHeight: isCompactMode ? '68px' : '154px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#fafafa',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer'
            }}
          >
            <div className="flex flex-col items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Plus size={isCompactMode ? 16 : 24} />
              {!isCompactMode && <span style={{ fontSize: '11px', fontWeight: '600' }}>Adicionar Gráfico</span>}
            </div>
          </Card>
        )}
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

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={editingCard?.isNew ? "Adicionar Novo Gráfico" : "Personalizar Gráfico"}
      >
        {editingCard && (() => {
          const previewCard = { ...editingCard };
          const { data: previewData, value: previewValue } = getDynamicChartData(previewCard);
          const previewColor = previewCard.color || '#4f46e5';

          let PreviewIcon = Calendar;
          if (previewCard.dataType === 'period') PreviewIcon = TrendingUp;
          else if (previewCard.dataType === 'status') PreviewIcon = Filter;

          const handleSave = async () => {
            setSavingCard(true);
            try {
              let updatedCards = [];
              if (editingCard.isNew) {
                const { isNew, ...cardToSave } = editingCard;
                updatedCards = [...customCards, cardToSave];
              } else {
                updatedCards = customCards.map(c => c.id === editingCard.id ? editingCard : c);
              }
              setCustomCards(updatedCards);
              await saveCardsToCloud(updatedCards);
              setIsEditModalOpen(false);
              setToast({ message: editingCard.isNew ? 'Gráfico adicionado com sucesso!' : 'Gráfico atualizado com sucesso!' });
            } catch (err) {
              console.error(err);
              setToast({ message: 'Erro ao salvar gráfico', type: 'error' });
            } finally {
              setSavingCard(false);
            }
          };

          return (
            <div className="flex flex-col gap-6" style={{ minWidth: '320px', maxWidth: '500px' }}>
              
              {/* LIVE PREVIEW CONTAINER */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">Visualização em Tempo Real</span>
                <div 
                  className="metrics-card card-compact mode-normal" 
                  style={{ 
                    borderLeft: `4px solid ${previewColor}`,
                    background: 'var(--surface-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: '1px solid var(--border)',
                    position: 'relative'
                  }}
                >
                  <div className="metrics-expanded-layout">
                    <div className="metrics-expanded-header">
                      <div className="metrics-expanded-title-block">
                        <div className="metrics-expanded-icon-wrapper" style={{ backgroundColor: previewColor + '15' }}>
                          <PreviewIcon size={14} style={{ color: previewColor }} />
                        </div>
                        <span className="metrics-expanded-label" style={{ fontWeight: '700', fontSize: '10px' }}>
                          {previewCard.title || 'TÍTULO DO GRÁFICO'}:
                        </span>
                        <span className="metrics-expanded-value" style={{ color: previewColor, fontWeight: '700' }}>
                          {previewValue}
                        </span>
                      </div>
                      <span className="text-xs text-muted" style={{ fontWeight: '600' }}>
                        {previewCard.dataType === 'total' && (previewCard.dataFilter === 'data' ? 'Por Data' : previewCard.dataFilter === 'nome' ? 'Por Professor' : 'Por Série')}
                        {previewCard.dataType === 'period' && `Neste ${previewCard.dataFilter === 'mes' ? 'Mês' : previewCard.dataFilter === 'semana' ? 'Semana' : previewCard.dataFilter === 'bimestre' ? 'Bimestre' : 'Ano'}`}
                        {previewCard.dataType === 'status' && previewCard.dataFilter}
                      </span>
                    </div>
                    <div className="metrics-expanded-chart-container" style={{ minHeight: '92px', marginTop: 'var(--space-2)' }}>
                      {renderCardChart(previewCard, previewData, previewColor)}
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM FIELDS */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted uppercase">Título do Card</label>
                  <input 
                    type="text" 
                    value={editingCard.title} 
                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value.toUpperCase() })} 
                    placeholder="DIGITE O TÍTULO..."
                    className="input text-xs font-medium"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted uppercase">Métrica Principal</label>
                    <select 
                      value={editingCard.dataType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        let defaultFilter = 'data';
                        if (newType === 'period') defaultFilter = 'mes';
                        else if (newType === 'status') defaultFilter = 'Atende plenamente';
                        setEditingCard({ ...editingCard, dataType: newType, dataFilter: defaultFilter });
                      }}
                      className="select text-xs font-medium"
                    >
                      <option value="total">Total de Observações</option>
                      <option value="period">Tendência do Período</option>
                      <option value="status">Frequência do Status</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted uppercase">Métrica Detalhada</label>
                    {editingCard.dataType === 'total' && (
                      <select 
                        value={editingCard.dataFilter}
                        onChange={(e) => setEditingCard({ ...editingCard, dataFilter: e.target.value })}
                        className="select text-xs font-medium"
                      >
                        <option value="data">Agrupado por Data</option>
                        <option value="nome">Por Professor (Top 5)</option>
                        <option value="serie">Por Série/Turma (Top 5)</option>
                      </select>
                    )}
                    {editingCard.dataType === 'period' && (
                      <select 
                        value={editingCard.dataFilter}
                        onChange={(e) => setEditingCard({ ...editingCard, dataFilter: e.target.value })}
                        className="select text-xs font-medium"
                      >
                        <option value="semana">Nesta Semana</option>
                        <option value="mes">Neste Mês</option>
                        <option value="bimestre">Neste Bimestre</option>
                        <option value="ano">Neste Ano</option>
                      </select>
                    )}
                    {editingCard.dataType === 'status' && (
                      <select 
                        value={editingCard.dataFilter}
                        onChange={(e) => setEditingCard({ ...editingCard, dataFilter: e.target.value })}
                        className="select text-xs font-medium"
                      >
                        <option value="Atende plenamente">Plenamente</option>
                        <option value="Atende parcialmente">Parcialmente</option>
                        <option value="Não atende">Não Atende</option>
                        <option value="Não observado">Não Observado</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-muted uppercase">Tipo de Gráfico</label>
                    <select 
                      value={editingCard.chartType}
                      onChange={(e) => setEditingCard({ ...editingCard, chartType: e.target.value })}
                      className="select text-xs font-medium"
                    >
                      <option value="bar">📊 Gráfico de Barras</option>
                      <option value="line">📈 Gráfico de Linha</option>
                      <option value="area">📉 Gráfico de Área</option>
                      <option value="pie">🍕 Gráfico de Pizza</option>
                      <option value="radar">🕸️ Gráfico de Radar</option>
                    </select>
                  </div>

                  {['bar', 'line', 'area'].includes(editingCard.chartType) && (
                    <div className="flex flex-col justify-end gap-1.5 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted">
                        <input 
                          type="checkbox" 
                          checked={editingCard.showLabels} 
                          onChange={(e) => setEditingCard({ ...editingCard, showLabels: e.target.checked })} 
                          style={{ accentColor: previewColor }}
                        />
                        Exibir Rótulos no Gráfico
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                    <Palette size={13} /> Selecione a Cor Premium
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {premiumColors.map((colorItem) => {
                      const isSelected = editingCard.color === colorItem.value;
                      return (
                        <button
                          key={colorItem.name}
                          type="button"
                          onClick={() => setEditingCard({ ...editingCard, color: colorItem.value })}
                          style={{
                            backgroundColor: colorItem.value,
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: isSelected ? '2.5px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)',
                            boxShadow: isSelected ? '0 0 0 2px #ffffff, 0 4px 8px rgba(0,0,0,0.15)' : 'none',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease'
                          }}
                          title={colorItem.name}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SAVE / CANCEL BUTTONS */}
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingCard}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={savingCard}
                  style={{ backgroundColor: previewColor }}
                >
                  {savingCard ? 'Salvando...' : 'Confirmar e Salvar'}
                </Button>
              </div>

            </div>
          );
        })()}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
