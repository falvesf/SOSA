import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Toast } from '../components/ui';
import { Check, X, RotateCcw, Users, Clock, CloudOff } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useSync } from '../contexts/SyncContext';

export default function UserRequests() {
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const { userRole, userScopes, reloadSchools } = useSchool();
  const { isOnline } = useSync();

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!isOnline) return;

      // Fetch requests scoped to allowed schools for local administrators
      let query = supabase
        .from('user_school_requests')
        .select('*, schools(name, code)')
        .order('created_at', { ascending: false });

      if (userRole === 'school_admin') {
        query = query.in('school_id', userScopes);
      }

      const { data: reqData, error: reqError } = await query;
      if (reqError) throw reqError;

      // Fetch profiles to match user emails
      const { data: profData, error: profError } = await supabase
        .from('user_profiles')
        .select('*');
      if (profError) throw profError;

      const profMap = {};
      profData.forEach(p => {
        profMap[p.id] = p;
      });

      setProfiles(profMap);
      setRequests(reqData || []);
    } catch (err) {
      console.error('Error fetching requests data:', err);
      setToast({ message: 'Erro ao carregar solicitações.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, userScopes]);

  const handleApprove = async (req) => {
    if (!isOnline) return;
    try {
      // 1. Update request status to approved
      const { error: updateError } = await supabase
        .from('user_school_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', req.id);
      if (updateError) throw updateError;

      // 2. Add school scope to the user in user_school_scopes
      const { data: existingScope } = await supabase
        .from('user_school_scopes')
        .select('*')
        .eq('user_id', req.user_id)
        .eq('school_id', req.school_id)
        .maybeSingle();

      if (!existingScope) {
        const { error: insertError } = await supabase
          .from('user_school_scopes')
          .insert([{ user_id: req.user_id, school_id: req.school_id }]);
        if (insertError) throw insertError;
      }

      setToast({ message: 'Solicitação aprovada com sucesso! Acesso liberado.' });
      await fetchData();
      await reloadSchools(); // Live update sidebar scopes!
    } catch (err) {
      console.error('Error approving request:', err);
      setToast({ message: 'Erro ao aprovar solicitação.', type: 'error' });
    }
  };

  const handleReject = async (req) => {
    if (!isOnline) return;
    try {
      // 1. Update request status to rejected
      const { error: updateError } = await supabase
        .from('user_school_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', req.id);
      if (updateError) throw updateError;

      // 2. Remove scope if it exists
      await supabase
        .from('user_school_scopes')
        .delete()
        .eq('user_id', req.user_id)
        .eq('school_id', req.school_id);

      setToast({ message: 'Solicitação rejeitada com sucesso.' });
      await fetchData();
      await reloadSchools(); // Live update sidebar scopes!
    } catch (err) {
      console.error('Error rejecting request:', err);
      setToast({ message: 'Erro ao rejeitar solicitação.', type: 'error' });
    }
  };

  const handleMoveToPending = async (req) => {
    if (!isOnline) return;
    try {
      // 1. Update request status to pending
      const { error: updateError } = await supabase
        .from('user_school_requests')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', req.id);
      if (updateError) throw updateError;

      // 2. Clean scope
      await supabase
        .from('user_school_scopes')
        .delete()
        .eq('user_id', req.user_id)
        .eq('school_id', req.school_id);

      setToast({ message: 'Solicitação movida de volta para pendente com sucesso.' });
      await fetchData();
      await reloadSchools(); // Live update sidebar scopes!
    } catch (err) {
      console.error('Error restoring request:', err);
      setToast({ message: 'Erro ao mover solicitação para pendente.', type: 'error' });
    }
  };

  // Filter requests locally based on the active tab
  const filteredRequests = requests.filter(r => r.status === activeTab);

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: 'var(--background)', 
        zIndex: 10, 
        paddingTop: 'var(--space-6)', 
        paddingBottom: 'var(--space-4)', 
        margin: 'calc(-1 * var(--space-6)) 0 var(--space-6) 0', 
        borderBottom: '1px solid var(--border)' 
      }}>
        <h1 className="h1" style={{ marginBottom: 'var(--space-4)' }}>Solicitações de Vínculo</h1>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant={activeTab === 'pending' ? 'primary' : 'secondary'} onClick={() => setActiveTab('pending')}>
            Pendentes ({requests.filter(r => r.status === 'pending').length})
          </Button>
          <Button variant={activeTab === 'approved' ? 'primary' : 'secondary'} onClick={() => setActiveTab('approved')}>
            Aprovadas ({requests.filter(r => r.status === 'approved').length})
          </Button>
          <Button variant={activeTab === 'rejected' ? 'primary' : 'secondary'} onClick={() => setActiveTab('rejected')}>
            Rejeitadas ({requests.filter(r => r.status === 'rejected').length})
          </Button>
        </div>
      </div>

      {!isOnline && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#991b1b',
          fontSize: '13px'
        }}>
          <CloudOff size={18} className="text-danger animate-pulse" />
          <div>
            <strong>Modo Offline Ativo:</strong> A administração de permissões e solicitações de vínculo de usuários exige conexão com o banco de dados online.
          </div>
        </div>
      )}

      <Card className="animate-fade-in" style={{ padding: 'var(--space-4)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Carregando dados das solicitações...</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
            Nenhuma solicitação encontrada nesta aba.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Unidade Escolar</th>
                  <th>Data da Solicitação</th>
                  <th>Status</th>
                  {isOnline && activeTab !== 'approved' && <th className="text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => {
                  const prof = profiles[req.user_id] || {};
                  return (
                    <tr key={req.id}>
                      <td style={{ fontWeight: '500' }}>
                        <div>{prof.email || 'Usuário Desconhecido'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {req.user_id.slice(0, 8)}...</div>
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {req.schools?.code ? `${req.schools.code} - ${req.schools.name}` : req.schools?.name || 'Escola Desconhecida'}
                      </td>
                      <td className="text-xs text-muted">
                        {new Date(req.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        {req.status === 'pending' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            textTransform: 'uppercase'
                          }}>
                            <Clock size={10} /> Pendente
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            textTransform: 'uppercase'
                          }}>
                            Aprovada
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            textTransform: 'uppercase'
                          }}>
                            Rejeitada
                          </span>
                        )}
                      </td>
                      {isOnline && activeTab !== 'approved' && (
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleApprove(req)}
                                  title="Aprovar Solicitação"
                                  style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                >
                                  <Check size={14} /> Aprovar
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleReject(req)}
                                  title="Rejeitar Solicitação"
                                  style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: '#dc2626', borderColor: '#fee2e2', backgroundColor: '#fee2e2' }}
                                >
                                  <X size={14} /> Rejeitar
                                </button>
                              </>
                            )}
                            {activeTab === 'rejected' && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleApprove(req)}
                                  title="Aprovar diretamente"
                                  style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                >
                                  <Check size={14} /> Aprovar
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleMoveToPending(req)}
                                  title="Mover para Pendente"
                                  style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', color: '#d97706', borderColor: '#fef3c7', backgroundColor: '#fef3c7' }}
                                >
                                  <RotateCcw size={14} /> Mover para Pendente
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
