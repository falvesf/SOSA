import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal } from '../components/ui';
import { useSchool } from '../contexts/SchoolContext';
import { Eye, Trash2, Calendar, User, BookOpen, GraduationCap, Edit } from 'lucide-react';
import ObservationDetails from './ObservationDetails';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedSchoolId } = useSchool();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchObservations = async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('observations')
        .select(`
          *,
          teachers:teachers!fk_observations_teacher(name),
          series:series!fk_observations_series(name, segments:segments!segment_id(name)),
          subjects:subjects!fk_observations_subject(name)
        `)
        .eq('school_id', selectedSchoolId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setObservations(data || []);
      
      // Calculate stats
      const now = new Date();
      const thisMonth = data?.filter(obs => {
        const obsDate = new Date(obs.visit_date);
        return obsDate.getMonth() === now.getMonth() && obsDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      setStats({
        total: data?.length || 0,
        thisMonth
      });
    } catch (error) {
      console.error('Error fetching observations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservations();
  }, [selectedSchoolId]);

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

  const handleView = (observation) => {
    setSelectedObservation(observation);
    setIsModalOpen(true);
  };

  if (!selectedSchoolId) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) 0' }}>
        <Card className="text-center p-12">
          <h2 className="h2" style={{ marginBottom: 'var(--space-2)' }}>Bem-vindo ao SOSA</h2>
          <p className="text-muted">Por favor, selecione uma Unidade Escolar no menu lateral para visualizar o Dashboard.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>Dashboard</h1>

      {/* Stats Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-8)'
        }}
      >
        <Card className="flex items-center gap-4" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase">Total de Observações</p>
            <p className="h2" style={{ margin: 0 }}>{stats.total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p className="text-xs text-muted font-semibold uppercase">Realizadas este Mês</p>
            <p className="h2" style={{ margin: 0 }}>{stats.thisMonth}</p>
          </div>
        </Card>
      </div>

      {/* Recent Observations */}
      <Card>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="h2">Observações Recentes</h2>
          <Button variant="secondary" onClick={fetchObservations} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Atualizar</Button>
        </div>

        {loading ? (
          <div className="text-center p-8 text-muted">Carregando registros...</div>
        ) : observations.length === 0 ? (
          <div className="text-center p-8 text-muted">Nenhuma observação encontrada para esta unidade.</div>
        ) : (
          <div className="table-container">
            <table className="table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: 'var(--surface-hover)' }}>Data</th>
                  <th style={{ backgroundColor: 'var(--surface-hover)' }}>Professor</th>
                  <th style={{ backgroundColor: 'var(--surface-hover)' }}>Série / Turma</th>
                  <th style={{ backgroundColor: 'var(--surface-hover)' }}>Disciplina</th>
                  <th style={{ 
                    width: '120px', 
                    position: 'sticky', 
                    right: 0, 
                    backgroundColor: 'var(--surface-hover)', 
                    zIndex: 20,
                    textAlign: 'right',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.05)'
                  }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {observations.map(obs => (
                  <tr key={obs.id}>
                    <td className="text-sm font-medium">
                      {obs.visit_date ? obs.visit_date.split('-').reverse().join('/') : 'N/A'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted" />
                        <span className="text-sm">{obs.teachers?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <GraduationCap size={14} className="text-muted" />
                        <span className="text-sm">
                          {obs.series?.segments?.name || obs.series?.name || 'N/A'} {obs.series?.name ? `- ${obs.series.name}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-muted" />
                        <span className="text-sm">{obs.subjects?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ 
                      position: 'sticky', 
                      right: 0, 
                      backgroundColor: 'white', 
                      zIndex: 10,
                      boxShadow: '-4px 0 8px rgba(0,0,0,0.05)'
                    }}>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" style={{ padding: '4px 8px' }} title="Visualizar" onClick={() => handleView(obs)}>
                          <Eye size={16} />
                        </Button>
                        <Button variant="secondary" style={{ padding: '4px 8px' }} title="Editar" onClick={() => navigate(`/observacao/editar/${obs.id}`)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(obs.id)}>
                          <Trash2 size={16} />
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Detalhes da Observação"
      >
        <ObservationDetails observation={selectedObservation} />
        <div className="flex justify-end mt-6">
          <Button onClick={() => setIsModalOpen(false)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  );
}
