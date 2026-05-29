import React, { useState, useEffect, useRef } from 'react';
import { supabase, handleAuthError } from '../lib/supabase';
import { Card, Button, Input, Select, Modal, ConfirmModal, Toast } from '../components/ui';
import { Trash2, Plus, Edit2, X, Book, CloudOff } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useSync } from '../contexts/SyncContext';
import { cacheMetadata, getCachedMetadata, withTimeout } from '../lib/offlineStore';

export default function Registries() {
  const [activeTab, setActiveTab] = useState('schools'); // schools, series, subjects, teachers, users
  const { selectedSchoolId, userRole } = useSchool();
  const { isOnline } = useSync();

  return (
    <div className="container" style={{ padding: 'var(--space-6) 0' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--background)', zIndex: 10, paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-4)', margin: 'calc(-1 * var(--space-6)) 0 var(--space-6) 0', borderBottom: '1px solid var(--border)' }}>
        <h1 className="h1" style={{ marginBottom: 'var(--space-4)' }}>Cadastros</h1>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant={activeTab === 'schools' ? 'primary' : 'secondary'} onClick={() => setActiveTab('schools')}>Unidades Escolares</Button>
          <Button variant={activeTab === 'series' ? 'primary' : 'secondary'} onClick={() => setActiveTab('series')}>Turmas e Séries</Button>
          <Button variant={activeTab === 'subjects' ? 'primary' : 'secondary'} onClick={() => setActiveTab('subjects')}>Disciplinas</Button>
          <Button variant={activeTab === 'teachers' ? 'primary' : 'secondary'} onClick={() => setActiveTab('teachers')}>Professores</Button>
          {(userRole === 'superadmin' || userRole === 'school_admin') && (
            <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} onClick={() => setActiveTab('users')}>Gerenciar Usuários</Button>
          )}
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
            <strong>Modo Offline Ativo:</strong> Você está visualizando dados salvos localmente. A criação e alteração de cadastros estão temporariamente desabilitadas até que a conexão seja restabelecida.
          </div>
        </div>
      )}

      <Card className="animate-fade-in">
        {activeTab === 'schools' && <SchoolsCrud />}
        {activeTab === 'users' && <UsersCrud />}
        {activeTab !== 'schools' && activeTab !== 'users' && !selectedSchoolId && (
          <div className="p-8 text-center text-muted">Por favor, selecione uma Unidade Escolar no menu lateral para visualizar ou adicionar cadastros.</div>
        )}
        {activeTab === 'series' && selectedSchoolId && <SeriesCrud schoolId={selectedSchoolId} />}
        {activeTab === 'subjects' && selectedSchoolId && <SubjectsCrud schoolId={selectedSchoolId} />}
        {activeTab === 'teachers' && selectedSchoolId && <TeachersCrud schoolId={selectedSchoolId} />}
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { isOnline } = useSync();
  const { reloadSchools, userRole, userScopes } = useSchool();

  const fetchSchools = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }
      const { data, error } = await withTimeout(supabase.from('schools').select('*').order('name'), 2000);
      if (error) throw error;
      setSchools(data || []);
      await cacheMetadata('schools', data || []);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.warn('Failed to fetch schools, loading from cache:', err);
      const cached = await getCachedMetadata('schools');
      if (cached) setSchools(cached);
    }
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleUploadBanner = async (schoolId, file) => {
    if (!file || !isOnline) return;
    const isEditable = userRole === 'superadmin' || (userRole === 'school_admin' && userScopes?.includes(schoolId));
    if (!isEditable) {
      setToast({ message: 'Você não tem permissão para alterar o banner desta unidade.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${schoolId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      let bucketName = 'school-banners';
      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
      if (uploadResult.error) {
        console.warn('Lowercase upload failed, trying uppercase fallback...');
        bucketName = 'SCHOOL-BANNERS';
        uploadResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: '3600', upsert: true });
      }
      
      if (uploadResult.error) throw uploadResult.error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      // Save to schools table
      const { error: updateError } = await supabase
        .from('schools')
        .update({ banner_url: publicUrl })
        .eq('id', schoolId);
        
      if (updateError) throw updateError;
      
      await fetchSchools();
      await reloadSchools();
      setToast({ message: 'Banner da Unidade atualizado com sucesso!' });
    } catch (err) {
      console.error('Error uploading banner:', err);
      const errMsg = err.message || err.error_description || err.error || 'Erro desconhecido.';
      setToast({ message: `Erro ao enviar banner: ${errMsg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBanner = async (schoolId) => {
    if (!isOnline) return;
    const isEditable = userRole === 'superadmin' || (userRole === 'school_admin' && userScopes?.includes(schoolId));
    if (!isEditable) {
      setToast({ message: 'Você não tem permissão para remover o banner desta unidade.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({ banner_url: null })
        .eq('id', schoolId);
        
      if (error) throw error;
      
      await fetchSchools();
      await reloadSchools();
      setToast({ message: 'Banner personalizado removido com sucesso.' });
    } catch (err) {
      console.error('Error removing banner:', err);
      setToast({ message: 'Erro ao remover banner.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { data, error } = await supabase.from('schools').insert([{ code, name }]).select();
    
    if (!error) {
      setCode('');
      setName('');
      await fetchSchools();
      setToast({ message: 'Unidade Escolar adicionada com sucesso!' });
      
      // Scroll to the new item
      if (data?.[0]?.id) {
        setTimeout(() => {
          const element = document.getElementById(`school-${data[0].id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.backgroundColor = 'var(--primary-light)';
            setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
          }
        }, 100);
      }
    } else {
      setToast({ message: 'Erro ao adicionar unidade.', type: 'error' });
    }
    setSaving(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim() || !editingItem.code.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { error } = await supabase.from('schools').update({ code: editingItem.code, name: editingItem.name }).eq('id', editingItem.id);
    
    if (!error) {
      setEditingItem(null);
      fetchSchools();
      setToast({ message: 'Unidade Escolar atualizada com sucesso!' });
    } else {
      setToast({ message: 'Erro ao atualizar unidade.', type: 'error' });
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isOnline) return;
    const { error } = await supabase.from('schools').delete().eq('id', deleteConfirm);
    if (!error) {
      fetchSchools();
      setToast({ message: 'Unidade Escolar excluída com sucesso!' });
    } else {
      setToast({ message: 'Erro ao excluir unidade.', type: 'error' });
    }
    setDeleteConfirm(null);
  };

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-4)' }}>Unidades Escolares</h2>
      {userRole === 'superadmin' && (
        <form onSubmit={handleAdd} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: 1 }}><Input placeholder="Código da Unidade (ex: 001)" value={code} onChange={e => setCode(e.target.value)} required disabled={saving || !isOnline} /></div>
          <div style={{ flex: 2 }}><Input placeholder="Nome da Unidade" value={name} onChange={e => setName(e.target.value)} required disabled={saving || !isOnline} /></div>
          <Button type="submit" variant="primary" disabled={saving || !isOnline}>
            {saving ? 'Adicionando...' : <><Plus size={18} /> Adicionar</>}
          </Button>
        </form>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome da Unidade</th>
              <th style={{ width: '220px' }}>Banner do Cabeçalho</th>
              {userRole === 'superadmin' && <th style={{ width: '100px', textAlign: 'right' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {schools.map(s => {
              const isEditable = userRole === 'superadmin' || (userRole === 'school_admin' && userScopes?.includes(s.id));
              return (
                <tr key={s.id} id={`school-${s.id}`} style={{ transition: 'all 0.5s', opacity: isEditable ? 1 : 0.65 }}>
                  <td style={{ verticalAlign: 'middle' }}>{s.code}</td>
                  <td style={{ verticalAlign: 'middle' }}>{s.name}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    {s.banner_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={s.banner_url} 
                          alt="Banner Unidade" 
                          style={{ height: '32px', maxWidth: '120px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} 
                        />
                        <Button variant="danger" style={{ padding: '2px 8px', fontSize: '10px', height: 'auto' }} onClick={() => handleRemoveBanner(s.id)} disabled={saving || !isOnline || !isEditable}>
                          Excluir
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block' }}>
                        <input 
                          id={`banner-input-${s.id}`}
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadBanner(s.id, e.target.files[0]);
                            }
                            e.target.value = ""; // Reseta o input para permitir selecionar o mesmo arquivo novamente
                          }} 
                          disabled={saving || !isOnline || !isEditable} 
                          style={{ display: 'none' }} 
                        />
                        <Button 
                          variant="secondary" 
                          style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }} 
                          disabled={saving || !isOnline || !isEditable}
                          onClick={() => document.getElementById(`banner-input-${s.id}`).click()}
                        >
                          Enviar Banner
                        </Button>
                      </div>
                    )}
                  </td>
                  {userRole === 'superadmin' && (
                    <td style={{ verticalAlign: 'middle' }}>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingItem({ ...s })} disabled={!isOnline}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm(s.id)} disabled={!isOnline}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {schools.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Nenhuma unidade cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Unidade Escolar">
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input label="Código da Unidade" value={editingItem.code} onChange={e => setEditingItem({...editingItem, code: e.target.value})} required disabled={saving} />
            <Input label="Nome da Unidade" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required disabled={saving} />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir esta unidade escolar? Esta ação não pode ser desfeita."
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Segments and Series Component
function SeriesCrud({ schoolId }) {
  const [segments, setSegments] = useState([]);
  const [series, setSeries] = useState([]);
  
  const [segmentName, setSegmentName] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [segmentId, setSegmentId] = useState('');

  const [editingSegment, setEditingSegment] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id }
  const { isOnline } = useSync();

  const fetchData = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }
      const [segRes, serRes] = await withTimeout(Promise.all([
        supabase.from('segments').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('series').select('*, segments(name)').eq('school_id', schoolId).order('name')
      ]), 2000);

      if (segRes.error || serRes.error) {
        throw (segRes.error || serRes.error);
      }

      const segData = segRes.data || [];
      const serData = serRes.data || [];

      setSegments(segData);
      setSeries(serData);

      await cacheMetadata(`segments_${schoolId}`, segData);
      await cacheMetadata(`series_${schoolId}`, serData);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.warn('Failed to fetch segments/series, loading from cache:', err);
      const cachedSeg = await getCachedMetadata(`segments_${schoolId}`);
      const cachedSer = await getCachedMetadata(`series_${schoolId}`);
      if (cachedSeg) setSegments(cachedSeg);
      if (cachedSer) setSeries(cachedSer);
    }
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleAddSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { data, error } = await supabase.from('segments').insert([{ name: segmentName, school_id: schoolId }]).select();
    
    if (!error) {
      setSegmentName('');
      await fetchData();
      setToast({ message: 'Turma (Segmento) adicionada com sucesso!' });
      
      if (data?.[0]?.id) {
        setTimeout(() => {
          const el = document.getElementById(`segment-${data[0].id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = 'var(--primary-light)';
            setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
          }
        }, 100);
      }
    } else {
      setToast({ message: 'Erro ao adicionar turma.', type: 'error' });
    }
    setSaving(false);
  };

  const handleEditSegmentSubmit = async (e) => {
    e.preventDefault();
    if (!editingSegment.name.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { error } = await supabase.from('segments').update({ name: editingSegment.name }).eq('id', editingSegment.id);
    if (!error) {
      setEditingSegment(null);
      fetchData();
      setToast({ message: 'Turma atualizada com sucesso!' });
    } else {
      setToast({ message: 'Erro ao atualizar turma.', type: 'error' });
    }
    setSaving(false);
  };

  const handleAddSeries = async (e) => {
    e.preventDefault();
    if (!seriesName.trim() || !segmentId || saving || !isOnline) return;
    
    setSaving(true);
    const { data, error } = await supabase.from('series').insert([{ name: seriesName, segment_id: segmentId, school_id: schoolId }]).select();
    
    if (!error) {
      setSeriesName('');
      setSegmentId('');
      await fetchData();
      setToast({ message: 'Série adicionada com sucesso!' });
      
      if (data?.[0]?.id) {
        setTimeout(() => {
          const el = document.getElementById(`series-${data[0].id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = 'var(--primary-light)';
            setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
          }
        }, 100);
      }
    } else {
      setToast({ message: 'Erro ao adicionar série.', type: 'error' });
    }
    setSaving(false);
  };

  const handleEditSeriesSubmit = async (e) => {
    e.preventDefault();
    if (!editingSeries.name.trim() || !editingSeries.segment_id || saving || !isOnline) return;
    
    setSaving(true);
    const { error } = await supabase.from('series').update({ name: editingSeries.name, segment_id: editingSeries.segment_id }).eq('id', editingSeries.id);
    if (!error) {
      setEditingSeries(null);
      fetchData();
      setToast({ message: 'Série atualizada com sucesso!' });
    } else {
      setToast({ message: 'Erro ao atualizar série.', type: 'error' });
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isOnline) return;
    const { type, id } = deleteConfirm;
    
    let error;
    if (type === 'segment') {
      const result = await supabase.from('segments').delete().eq('id', id);
      error = result.error;
    } else {
      const result = await supabase.from('series').delete().eq('id', id);
      error = result.error;
    }

    if (!error) {
      fetchData();
      setToast({ message: `${type === 'segment' ? 'Turma' : 'Série'} excluída com sucesso!` });
    } else {
      setToast({ message: 'Erro ao excluir item.', type: 'error' });
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Cadastro de Turmas / Segmentos */}
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h2 className="h3" style={{ marginBottom: 'var(--space-2)' }}>Gerenciar Turmas (Segmentos)</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>Crie categorias para agrupar suas séries (ex: Fundamental I, Educação Infantil).</p>
        
        <form onSubmit={handleAddSegment} className="flex gap-4 items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}><Input placeholder="Nome da nova turma/segmento..." value={segmentName} onChange={e => setSegmentName(e.target.value)} required disabled={saving || !isOnline} /></div>
          <Button type="submit" variant="primary" disabled={saving || !isOnline}>
            {saving ? 'Adicionando...' : 'Adicionar Turma'}
          </Button>
        </form>

        <div className="table-container">
          <table className="table text-sm">
            <thead>
              <tr><th>Nome da Turma</th><th style={{ width: '100px' }}>Ações</th></tr>
            </thead>
            <tbody>
              {segments.map(s => (
                <tr key={s.id} id={`segment-${s.id}`} style={{ transition: 'background-color 0.5s' }}>
                  <td>{s.name}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingSegment({ ...s })} disabled={!isOnline}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm({ type: 'segment', id: s.id })} disabled={!isOnline}>
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
            <Input placeholder="Nome da Série (ex: 1º Ano A)" value={seriesName} onChange={e => setSeriesName(e.target.value)} required disabled={saving || !isOnline} />
          </div>
          <div style={{ flex: 1 }}>
            <Select 
              value={segmentId} 
              onChange={e => setSegmentId(e.target.value)} 
              options={segments.map(s => ({ value: s.id, label: s.name }))}
              required
              disabled={saving || !isOnline}
            />
          </div>
          <Button type="submit" variant="primary" disabled={saving || !isOnline}>
            {saving ? 'Adicionando...' : 'Adicionar Série'}
          </Button>
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
                      <tr key={s.id} id={`series-${s.id}`} style={{ transition: 'background-color 0.5s' }}>
                        <td style={{ borderTop: 'none' }}>{s.name}</td>
                        <td style={{ width: '100px', borderTop: 'none', textAlign: 'right' }}>
                          <div className="flex gap-2 justify-end">
                            <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingSeries({ ...s })} disabled={!isOnline}>
                              <Edit2 size={16} />
                            </Button>
                            <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm({ type: 'series', id: s.id })} disabled={!isOnline}>
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
            <Input label="Nome da Turma" value={editingSegment.name} onChange={e => setEditingSegment({...editingSegment, name: e.target.value})} required disabled={saving} />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingSegment(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!editingSeries} onClose={() => setEditingSeries(null)} title="Editar Série">
        {editingSeries && (
          <form onSubmit={handleEditSeriesSubmit} className="flex flex-col gap-4">
            <Input label="Nome da Série" value={editingSeries.name} onChange={e => setEditingSeries({...editingSeries, name: e.target.value})} required disabled={saving} />
            <Select 
              label="Turma / Segmento"
              value={editingSeries.segment_id} 
              onChange={e => setEditingSeries({...editingSeries, segment_id: e.target.value})} 
              options={segments.map(s => ({ value: s.id, label: s.name }))}
              required
              disabled={saving}
            />
            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingSeries(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={confirmDelete}
        message={deleteConfirm?.type === 'segment' 
          ? "Atenção: Excluir a Turma (Segmento) excluirá TODAS as Séries atreladas a ela! Tem certeza?" 
          : "Tem certeza que deseja excluir esta série?"
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Subjects Component
function SubjectsCrud({ schoolId }) {
  const [subjects, setSubjects] = useState([]);
  const [segments, setSegments] = useState([]);
  
  // Quick Add Form
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  
  const [editingItem, setEditingItem] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, subjectId, segId }

  const { isOnline } = useSync();

  const fetchData = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }
      const [subRes, segRes] = await withTimeout(Promise.all([
        supabase.from('subjects').select(`
          *,
          segment_subjects ( segment_id, segments ( name ) )
        `).eq('school_id', schoolId).order('name'),
        supabase.from('segments').select('*').eq('school_id', schoolId).order('name')
      ]), 2000);

      if (subRes.error || segRes.error) {
        throw (subRes.error || segRes.error);
      }

      const subData = subRes.data || [];
      const segData = segRes.data || [];

      setSubjects(subData);
      setSegments(segData);

      await cacheMetadata(`subjects_crud_${schoolId}`, subData);
      await cacheMetadata(`segments_${schoolId}`, segData);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.warn('Failed to fetch subjects, loading from cache:', err);
      const cachedSub = await getCachedMetadata(`subjects_crud_${schoolId}`);
      const cachedSeg = await getCachedMetadata(`segments_${schoolId}`);
      if (cachedSub) setSubjects(cachedSub);
      if (cachedSeg) setSegments(cachedSeg);
    }
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !segmentId || saving || !isOnline) return;
    
    setSaving(true);
    // Check if subject exists (case-insensitive) in this school
    const { data: existing } = await supabase.from('subjects').select('*').eq('school_id', schoolId).ilike('name', name.trim()).maybeSingle();
    
    let subjectId;
    if (existing) {
      subjectId = existing.id;
    } else {
      const { data: newSubject, error } = await supabase.from('subjects').insert([{ name: name.trim(), school_id: schoolId }]).select().single();
      if (error) {
        setToast({ message: 'Erro ao adicionar disciplina.', type: 'error' });
        setSaving(false);
        return;
      }
      subjectId = newSubject.id;
    }

    // Insert mapping
    const { data: existingMap } = await supabase.from('segment_subjects').select('*').eq('segment_id', segmentId).eq('subject_id', subjectId).maybeSingle();
    
    if (!existingMap) {
      await supabase.from('segment_subjects').insert([{ subject_id: subjectId, segment_id: segmentId }]);
      setToast({ message: 'Disciplina vinculada com sucesso!' });
      
      // Scroll logic
      setTimeout(() => {
        const el = document.getElementById(`subject-${subjectId}-${segmentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.boxShadow = '0 0 0 3px var(--primary)';
          setTimeout(() => { el.style.boxShadow = ''; }, 2000);
        }
      }, 100);
    } else {
      setToast({ message: 'Esta disciplina já está vinculada a esta turma.', type: 'info' });
    }
    
    setName('');
    await fetchData();
    setSaving(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim() || saving || !isOnline) return;
    
    setSaving(true);
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
    await fetchData();
    setToast({ message: 'Disciplina atualizada com sucesso!' });
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isOnline) return;
    const { type, subjectId, segId } = deleteConfirm;
    
    if (type === 'mapping') {
      await supabase.from('segment_subjects').delete().eq('subject_id', subjectId).eq('segment_id', segId);
      setToast({ message: 'Vínculo removido com sucesso!' });
    } else {
      await supabase.from('subjects').delete().eq('id', subjectId);
      setToast({ message: 'Disciplina excluída permanentemente!' });
      setEditingItem(null);
    }
    
    fetchData();
    setDeleteConfirm(null);
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
              disabled={saving || !isOnline}
            />
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <Input label="Nome da disciplina" placeholder="Ex: Robótica" value={name} onChange={e => setName(e.target.value)} required disabled={saving || !isOnline} />
          </div>
          <Button type="submit" variant="primary" style={{ height: '42px', marginBottom: '1px' }} disabled={saving || !isOnline}>
            {saving ? 'Adicionando...' : '+ Adicionar'}
          </Button>
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
                  <div key={sub.id} id={`subject-${sub.id}-${seg.id}`} className="flex items-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '4px 12px', fontSize: '0.85rem', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'all 0.5s' }}>
                    <span 
                      style={{ cursor: isOnline ? 'pointer' : 'default', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                      onClick={() => isOnline && startEdit(sub)} 
                      title={isOnline ? "Editar Disciplina" : "Edição desativada offline"}
                    >
                      {sub.name}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setDeleteConfirm({ type: 'mapping', subjectId: sub.id, segId: seg.id })} 
                      style={{ background: 'none', border: 'none', cursor: isOnline ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '2px', color: isOnline ? '#94a3b8' : '#cbd5e1', borderRadius: '50%' }} 
                      disabled={!isOnline}
                      title={isOnline ? "Remover desta Turma" : "Exclusão desativada offline"}
                    >
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
                  <span 
                    style={{ cursor: isOnline ? 'pointer' : 'default', marginRight: '8px' }} 
                    onClick={() => isOnline && startEdit(sub)} 
                    title={isOnline ? "Editar Disciplina" : "Edição desativada offline"}
                  >
                    {sub.name}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setDeleteConfirm({ type: 'full', subjectId: sub.id })} 
                    style={{ background: 'none', border: 'none', cursor: isOnline ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '2px', color: isOnline ? '#ef4444' : '#cbd5e1' }} 
                    disabled={!isOnline}
                    title={isOnline ? "Excluir Permanentemente" : "Exclusão desativada offline"}
                  >
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
            <Input label="Nome da Disciplina" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required disabled={saving} />
            
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
              <Button type="button" variant="danger" onClick={() => setDeleteConfirm({ type: 'full', subjectId: editingItem.id })} title="Excluir Permanentemente de todo o sistema" disabled={saving}>Excluir Tudo</Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} disabled={saving}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={confirmDelete}
        message={deleteConfirm?.type === 'mapping' 
          ? "Remover esta disciplina desta turma?" 
          : "Atenção: Isso excluirá a disciplina de TODAS as turmas e professores! Tem certeza?"
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Teachers Component
function TeachersCrud({ schoolId }) {
  const [teachers, setTeachers] = useState([]);
  const [series, setSeries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teacherType, setTeacherType] = useState('regente');
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [gender, setGender] = useState('F');
  
  const [editingItem, setEditingItem] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { isOnline } = useSync();

  const fetchData = async () => {
    try {
      if (!navigator.onLine) {
        throw new Error('Device is offline');
      }
      const [tRes, serRes, subRes] = await withTimeout(Promise.all([
        supabase.from('teachers').select(`
          *,
          teacher_series ( series_id, series (name, segments(name)) ),
          teacher_subjects ( subject_id, subjects (name) )
        `).eq('school_id', schoolId).order('name'),
        supabase.from('series').select('*, segments(name)').eq('school_id', schoolId).order('name'),
        supabase.from('subjects').select('id, name, segment_subjects(segment_id)').eq('school_id', schoolId).order('name')
      ]), 2000);

      if (tRes.error || serRes.error || subRes.error) {
        throw (tRes.error || serRes.error || subRes.error);
      }

      const tData = tRes.data || [];
      const serData = serRes.data || [];
      const subData = subRes.data || [];

      setTeachers(tData);
      setSeries(serData);
      setSubjects(subData);

      await cacheMetadata(`teachers_crud_${schoolId}`, tData);
      await cacheMetadata(`series_${schoolId}`, serData);
      await cacheMetadata(`subjects_${schoolId}`, subData);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.warn('Failed to fetch teachers, loading from cache:', err);
      const cachedT = await getCachedMetadata(`teachers_crud_${schoolId}`);
      const cachedSer = await getCachedMetadata(`series_${schoolId}`);
      const cachedSub = await getCachedMetadata(`subjects_${schoolId}`);

      if (cachedT) setTeachers(cachedT);
      if (cachedSer) setSeries(cachedSer);
      if (cachedSub) setSubjects(cachedSub);
    }
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { data: newTeacher, error } = await supabase.from('teachers').insert([{ name, email: email || null, teacher_type: teacherType, school_id: schoolId, gender }]).select().single();
    
    if (error) {
      setToast({ message: `Erro ao adicionar professor: ${error.message}`, type: 'error' });
      setSaving(false);
      return;
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
      
      setToast({ message: 'Professor adicionado com sucesso!' });
      
      // Scroll logic
      setTimeout(() => {
        const el = document.getElementById(`teacher-${newTeacher.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.backgroundColor = 'var(--primary-light)';
          setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
        }
      }, 100);
    }

    setName('');
    setEmail('');
    setGender('F');
    setTeacherType('regente');
    setSelectedSeries([]);
    setSelectedSubjects([]);
    await fetchData();
    setSaving(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem.name.trim() || saving || !isOnline) return;
    
    setSaving(true);
    const { error } = await supabase.from('teachers').update({ 
      name: editingItem.name, 
      email: editingItem.email || null, 
      teacher_type: editingItem.teacher_type,
      gender: editingItem.gender
    }).eq('id', editingItem.id);

    if (error) {
      setToast({ message: `Erro ao atualizar professor: ${error.message}`, type: 'error' });
      setSaving(false);
      return;
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
    await fetchData();
    setToast({ message: 'Professor atualizado com sucesso!' });
    setSaving(false);
  };

  const startEdit = (t) => {
    setEditingItem({
      id: t.id,
      name: t.name,
      email: t.email || '',
      teacher_type: t.teacher_type || 'regente',
      gender: t.gender || 'F',
      selectedSeries: t.teacher_series?.map(ts => ts.series_id) || [],
      selectedSubjects: t.teacher_subjects?.map(ts => ts.subject_id) || []
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isOnline) return;
    const { error } = await supabase.from('teachers').delete().eq('id', deleteConfirm);
    if (!error) {
      fetchData();
      setToast({ message: 'Professor excluído com sucesso!' });
    } else {
      setToast({ message: 'Erro ao excluir professor.', type: 'error' });
    }
    setDeleteConfirm(null);
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
          <div style={{ flex: '1 1 200px' }}><Input placeholder="Nome do Professor" value={name} onChange={e => setName(e.target.value)} required disabled={saving || !isOnline} /></div>
          <div style={{ flex: '1 1 200px' }}><Input type="email" placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} disabled={saving || !isOnline} /></div>
          <div style={{ flex: '1 1 150px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <select 
                value={gender} 
                onChange={e => setGender(e.target.value)} 
                className="form-input"
                style={{ height: '42px' }}
                required
                disabled={saving || !isOnline}
              >
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-center flex-wrap" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <span className="text-sm font-medium">Tipo do Professor:</span>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="regente" checked={teacherType === 'regente'} onChange={(e) => { setTeacherType(e.target.value); setSelectedSubjects([]); }} disabled={saving || !isOnline} />
            Regente
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="teacherType" value="especialista" checked={teacherType === 'especialista'} onChange={(e) => setTeacherType(e.target.value)} disabled={saving || !isOnline} />
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
                    <button type="button" className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer" style={{ padding: 0 }} onClick={() => toggleSegment(seg.id)} disabled={saving || !isOnline}>
                      {segSeries.length > 0 && segSeries.every(s => selectedSeries.includes(s.id)) ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segSeries.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: selectedSeries.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: selectedSeries.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={selectedSeries.includes(s.id)} onChange={() => toggleSeries(s.id)} style={{ margin: 0 }} disabled={saving || !isOnline} />
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
                  <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={() => toggleSubject(s.id)} style={{ margin: 0 }} disabled={saving || !isOnline} />
                  <span style={{ color: selectedSubjects.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: selectedSubjects.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                </label>
              ))}
              {subjects.length === 0 && <span className="text-xs text-muted">Cadastre disciplinas primeiro.</span>}
            </div>
          </div>
        )}

        <div>
          <Button type="submit" variant="primary" disabled={saving || !isOnline}>
            {saving ? 'Adicionando...' : <><Plus size={18} /> Adicionar Professor</>}
          </Button>
        </div>
      </form>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Gênero</th><th>Tipo</th><th>Disciplinas</th><th>Séries</th><th style={{ width: '100px' }}>Ações</th></tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id} id={`teacher-${t.id}`} style={{ transition: 'background-color 0.5s' }}>
                <td>{t.name}<br/><span className="text-xs text-muted">{t.email}</span></td>
                <td>{t.gender === 'M' ? 'Masculino' : 'Feminino'}</td>
                <td style={{ textTransform: 'capitalize' }}>{t.teacher_type || 'N/A'}</td>
                <td className="text-xs text-muted">
                  {t.teacher_subjects?.map(ts => ts.subjects?.name).join(', ') || '-'}
                </td>
                <td className="text-xs text-muted">
                  {t.teacher_series?.map(ts => ts.series?.name).join(', ') || '-'}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" style={{ padding: '4px 8px' }} onClick={() => startEdit(t)} disabled={!isOnline}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm(t.id)} disabled={!isOnline}>
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
              <div style={{ flex: '1 1 200px' }}><Input label="Nome" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required disabled={saving} /></div>
              <div style={{ flex: '1 1 200px' }}><Input label="E-mail" type="email" value={editingItem.email} onChange={e => setEditingItem({...editingItem, email: e.target.value})} disabled={saving} /></div>
              <div style={{ flex: '1 1 150px' }}>
                <div className="form-group">
                  <label className="form-label">Gênero</label>
                  <select 
                    value={editingItem.gender || 'F'} 
                    onChange={e => setEditingItem({...editingItem, gender: e.target.value})} 
                    className="form-input"
                    required
                    disabled={saving}
                  >
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-6 items-center flex-wrap" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span className="text-sm font-medium">Tipo do Professor:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="editTeacherType" value="regente" checked={editingItem.teacher_type === 'regente'} onChange={(e) => setEditingItem({...editingItem, teacher_type: e.target.value, selectedSubjects: []})} disabled={saving} /> Regente
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="editTeacherType" value="especialista" checked={editingItem.teacher_type === 'especialista'} onChange={(e) => setEditingItem({...editingItem, teacher_type: e.target.value})} disabled={saving} /> Especialista
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
                        <button type="button" className="text-xs text-primary hover:underline bg-transparent border-none cursor-pointer" style={{ padding: 0 }} onClick={() => toggleEditSegment(seg.id)} disabled={saving}>
                          {segSeries.length > 0 && segSeries.every(s => editingItem.selectedSeries.includes(s.id)) ? 'Desmarcar todas' : 'Selecionar todas'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {segSeries.map(s => (
                          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ whiteSpace: 'nowrap', backgroundColor: editingItem.selectedSeries.includes(s.id) ? 'var(--primary-light)' : '#f8fafc', border: '1px solid', borderColor: editingItem.selectedSeries.includes(s.id) ? 'var(--primary)' : '#e2e8f0', borderRadius: '16px', padding: '4px 10px', transition: 'all 0.2s' }}>
                            <input type="checkbox" checked={editingItem.selectedSeries.includes(s.id)} onChange={() => toggleEditSeries(s.id)} style={{ margin: 0 }} disabled={saving} />
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
                      <input type="checkbox" checked={editingItem.selectedSubjects.includes(s.id)} onChange={() => toggleEditSubject(s.id)} style={{ margin: 0 }} disabled={saving} />
                      <span style={{ color: editingItem.selectedSubjects.includes(s.id) ? 'var(--primary-hover)' : 'var(--text-secondary)', fontWeight: editingItem.selectedSubjects.includes(s.id) ? '500' : 'normal' }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir este professor? Esta ação não pode ser desfeita."
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Custom Premium Multi-Select Combobox for School Units
function MultiSelectSchool({ userId, visibleSchools, uScopes, uRequests = [], handleToggleScope, saving }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { userRole, userScopes } = useSchool();
  const safeUserScopes = Array.isArray(userScopes) ? userScopes : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const assignedSchools = visibleSchools.filter(s => uScopes.includes(s.id));
  const assignedNames = assignedSchools.map(s => s.name).join('; ');

  const pendingSchools = visibleSchools.filter(s => uRequests.some(r => r.school_id === s.id && r.status === 'pending'));

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={saving}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '220px',
          padding: '6px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'white',
          fontSize: '13px',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Gerenciar Escolas...</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '220px',
          zIndex: 99,
          backgroundColor: 'white',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: '180px',
          overflowY: 'auto',
          padding: '4px',
          marginTop: '4px'
        }}>
          {visibleSchools.map(s => {
            const isAssigned = uScopes.includes(s.id);
            const pendingReq = uRequests.find(r => r.school_id === s.id && r.status === 'pending');
            const isPending = !!pendingReq;

            // A school admin cannot remove/deassign an active/approved scope unless they manage that school unit themselves
            const isReadOnlyScope = isAssigned && userRole === 'school_admin' && !safeUserScopes.includes(s.id);

            return (
              <label
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: isReadOnlyScope ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  color: isAssigned ? (isReadOnlyScope ? 'var(--text-muted)' : 'var(--primary)') : isPending ? '#b45309' : 'var(--text)',
                  backgroundColor: isAssigned ? (isReadOnlyScope ? '#f1f5f9' : 'var(--primary-light)') : isPending ? '#fef3c7' : 'transparent',
                  transition: 'background-color 0.15s',
                  userSelect: 'none'
                }}
                className={isReadOnlyScope ? '' : 'dropdown-item-hover'}
              >
                <input
                  type="checkbox"
                  checked={isAssigned || isPending}
                  onChange={() => handleToggleScope(userId, s.id, isAssigned)}
                  disabled={saving || isReadOnlyScope}
                  style={{ margin: 0 }}
                />
                <span style={{ fontWeight: isAssigned ? '500' : 'normal', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'space-between' }}>
                  <span>{s.name}</span>
                  {isReadOnlyScope && (
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: 'var(--text-muted)',
                      backgroundColor: '#e2e8f0',
                      border: '1px solid #cbd5e1',
                      padding: '1px 4px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}>
                      🔒 Ativo
                    </span>
                  )}
                  {isPending && (
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: '#d97706',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      padding: '1px 4px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      Pendente
                    </span>
                  )}
                </span>
              </label>
            );
          })}
          {visibleSchools.length === 0 && (
            <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Nenhuma escola disponível
            </div>
          )}
        </div>
      )}

      {assignedSchools.length > 0 && (
        <div style={{ 
          marginTop: '6px', 
          fontSize: '11px', 
          color: 'var(--text-secondary)',
          lineHeight: '1.4',
          wordBreak: 'break-word',
          fontStyle: 'italic'
        }}>
          {assignedNames}
        </div>
      )}

      {pendingSchools.length > 0 && (
        <div style={{ 
          marginTop: '6px', 
          fontSize: '11px', 
          color: '#d97706',
          lineHeight: '1.4',
          wordBreak: 'break-word',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontStyle: 'italic', fontWeight: '500' }}>Pendentes:</span>
            {pendingSchools.map(s => (
              <span key={s.id} style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Users and Permissions Component
function UsersCrud() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: null,
    schoolId: null,
    isAssigned: false,
    isPending: false,
    schoolName: '',
    userEmail: '',
    totalScopesCount: 0
  });
  const [deleteUserModal, setDeleteUserModal] = useState({
    isOpen: false,
    userId: null,
    userEmail: '',
    scopesCount: 0,
    hasMultipleSchools: false,
    deleteAll: false
  });
  
  const { isOnline } = useSync();
  const { reloadSchools, userRole, userScopes, selectedSchoolId } = useSchool();

  const triggerToggleScope = (userId, schoolId, isAssigned) => {
    const userObj = users.find(u => u.id === userId);
    const schoolObj = schools.find(s => s.id === schoolId);
    const userScopesCount = scopes.filter(sc => sc.user_id === userId).length;
    const isPending = userRequests.some(r => r.user_id === userId && r.school_id === schoolId && r.status === 'pending');
    
    setConfirmModal({
      isOpen: true,
      userId,
      schoolId,
      isAssigned,
      isPending,
      schoolName: schoolObj ? schoolObj.name : '',
      userEmail: userObj ? userObj.email : '',
      totalScopesCount: userScopesCount
    });
  };

  const fetchData = async () => {
    setLoadingUsers(true);
    try {
      if (!isOnline) return;
      const [uRes, sRes, scRes, rRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('email'),
        supabase.from('schools').select('*').order('name'),
        supabase.from('user_school_scopes').select('*'),
        supabase.from('user_school_requests').select('*')
      ]);

      if (uRes.error) throw uRes.error;
      if (sRes.error) throw sRes.error;
      if (scRes.error) throw scRes.error;
      if (rRes.error) throw rRes.error;

      setUsers(uRes.data || []);
      setSchools(sRes.data || []);
      setScopes(scRes.data || []);
      setUserRequests(rRes.data || []);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error('Error fetching users/scopes:', err);
      setToast({ message: 'Erro ao carregar dados de usuários.', type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (!isOnline || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // If changing to superadmin, clean up school scopes as they are redundant
      if (newRole === 'superadmin') {
        await supabase.from('user_school_scopes').delete().eq('user_id', userId);
      }

      await fetchData();
      await reloadSchools(); // Live reload schools scopes in Sidebar!
      setToast({ message: 'Tipo de acesso atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao atualizar tipo de acesso.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleScope = async (userId, schoolId, isAssigned) => {
    if (!isOnline || saving) return;

    const safeUserScopes = Array.isArray(userScopes) ? userScopes : [];
    // Safety check: local admins cannot remove active scopes for schools they do not manage
    if (isAssigned && userRole === 'school_admin' && !safeUserScopes.includes(schoolId)) {
      setToast({ message: 'Você não tem permissão para remover o acesso de uma unidade que não gerencia.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const existingReq = userRequests.find(r => r.user_id === userId && r.school_id === schoolId);

      if (isAssigned) {
        // Remove scope
        const { error } = await supabase
          .from('user_school_scopes')
          .delete()
          .eq('user_id', userId)
          .eq('school_id', schoolId);
        if (error) throw error;

        // Clean up requests too
        if (existingReq) {
          await supabase
            .from('user_school_requests')
            .delete()
            .eq('id', existingReq.id);
        }
        setToast({ message: 'Acesso removido com sucesso!' });
      } else {
        if (existingReq && existingReq.status === 'pending') {
          // Cancel pending request
          const { error } = await supabase
            .from('user_school_requests')
            .delete()
            .eq('id', existingReq.id);
          if (error) throw error;
          setToast({ message: 'Solicitação de vínculo cancelada com sucesso.' });
        } else {
          if (userRole === 'school_admin' && !userScopes.includes(schoolId)) {
            // Must request pending
            if (existingReq) {
              const { error } = await supabase
                .from('user_school_requests')
                .update({ status: 'pending', updated_at: new Date().toISOString() })
                .eq('id', existingReq.id);
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from('user_school_requests')
                .insert([{ user_id: userId, school_id: schoolId, status: 'pending' }]);
              if (error) throw error;
            }
            setToast({ message: 'Solicitação de vínculo enviada com sucesso! Aguardando aprovação.' });
          } else {
            // Direct scope add
            const { error } = await supabase
              .from('user_school_scopes')
              .insert([{ user_id: userId, school_id: schoolId }]);
            if (error) throw error;

            if (existingReq) {
              await supabase
                .from('user_school_requests')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .eq('id', existingReq.id);
            }
            setToast({ message: 'Acesso concedido com sucesso!' });
          }
        }
      }

      await fetchData();
      await reloadSchools(); // Live reload schools scopes in Sidebar!
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao atualizar escopo do usuário.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const triggerDeleteUser = (userObj) => {
    const userScopesCount = scopes.filter(sc => sc.user_id === userObj.id).length;
    setDeleteUserModal({
      isOpen: true,
      userId: userObj.id,
      userEmail: userObj.email,
      scopesCount: userScopesCount,
      hasMultipleSchools: userScopesCount > 1,
      deleteAll: false
    });
  };

  const confirmDeleteUser = async () => {
    if (!isOnline || saving) return;
    setSaving(true);
    try {
      const { userId, hasMultipleSchools, deleteAll } = deleteUserModal;
      const shouldDeleteComplete = !hasMultipleSchools || (userRole === 'superadmin' && deleteAll);

      if (shouldDeleteComplete) {
        await supabase
          .from('user_school_scopes')
          .delete()
          .eq('user_id', userId);

        await supabase
          .from('user_school_requests')
          .delete()
          .eq('user_id', userId);

        const { error } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId);

        if (error) throw error;
        setToast({ message: 'Usuário excluído permanentemente.' });
      } else {
        const targetSchoolId = selectedSchoolId || (scopes.find(s => s.user_id === userId)?.school_id);
        if (targetSchoolId) {
          const { error } = await supabase
            .from('user_school_scopes')
            .delete()
            .eq('user_id', userId)
            .eq('school_id', targetSchoolId);

          if (error) throw error;

          await supabase
            .from('user_school_requests')
            .delete()
            .eq('user_id', userId)
            .eq('school_id', targetSchoolId);

          setToast({ message: 'Acesso removido para esta unidade escolar.' });
        } else {
          throw new Error('Nenhuma unidade escolar selecionada para desvincular o usuário.');
        }
      }

      setDeleteUserModal(prev => ({ ...prev, isOpen: false }));
      await fetchData();
      await reloadSchools();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao excluir usuário.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Filter out superadmins from the user management list under any circumstances
  let displayedUsers = users.filter(u => u.role !== 'superadmin');

  // Filter users by the currently selected school unit from the sidebar (reactive filter)
  if (selectedSchoolId) {
    displayedUsers = displayedUsers.filter(u => {
      const userScopesList = scopes.filter(s => s.user_id === u.id).map(s => s.school_id);
      return userScopesList.includes(selectedSchoolId);
    });
  }

  // If the logged-in user is a school_admin, only show users who are approved (scoped) to at least one school they manage
  if (userRole === 'school_admin') {
    const safeUserScopes = Array.isArray(userScopes) ? userScopes : [];
    displayedUsers = displayedUsers.filter(u => {
      const userScopesList = scopes.filter(s => s.user_id === u.id).map(s => s.school_id);
      return userScopesList.some(schoolId => safeUserScopes.includes(schoolId));
    });
  }

  // For school admins, show all school units so they can see other units available
  const visibleSchools = schools;

  return (
    <div>
      <h2 className="h2" style={{ marginBottom: 'var(--space-2)' }}>Gerenciar Usuários e Permissões</h2>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>
        Configure quais escolas e níveis de privilégios cada coordenador ou administrador terá acesso no sistema.
      </p>

      {loadingUsers ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Carregando dados dos usuários...</div>
      ) : (
        <div className="table-container" style={{ overflow: 'visible' }}>
          <table className="table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th style={{ width: '220px' }}>Tipo de Acesso</th>
                <th>Unidades Escolares Acessíveis</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map(u => {
                const uScopes = scopes.filter(s => s.user_id === u.id).map(s => s.school_id);
                const uRequests = userRequests.filter(r => r.user_id === u.id);

                return (
                  <tr key={u.id}>
                    <td style={{ verticalAlign: 'middle', fontWeight: '500' }}>{u.email}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={saving}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'white',
                          fontSize: '13px'
                        }}
                      >
                        {userRole === 'superadmin' && <option value="superadmin">Superadmin</option>}
                        <option value="school_admin">Administrador Local</option>
                        <option value="coordinator">Coordenador</option>
                      </select>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {u.role === 'superadmin' ? (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: '#15803d', 
                          backgroundColor: '#dcfce7', 
                          padding: '4px 10px', 
                          borderRadius: '16px' 
                        }}>
                          Todas as Unidades (Acesso Irrestrito)
                        </span>
                      ) : (
                        <MultiSelectSchool
                          userId={u.id}
                          visibleSchools={visibleSchools}
                          uScopes={uScopes}
                          uRequests={uRequests}
                          handleToggleScope={triggerToggleScope}
                          saving={saving}
                        />
                      )}
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      <Button variant="danger" style={{ padding: '4px 8px' }} onClick={() => triggerDeleteUser(u)} disabled={saving}>
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {displayedUsers.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Nenhum perfil de usuário registrado no sistema.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ 
        marginTop: 'var(--space-6)', 
        padding: 'var(--space-4)', 
        backgroundColor: '#f8fafc', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--border)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.4'
      }}>
        <strong>Dica para cadastrar novos usuários:</strong> Oriente o novo coordenador ou administrador a realizar o **primeiro login** no sistema SOSA utilizando sua conta Google Workspace institucional. Ao fazer isso, o perfil dele será criado automaticamente no sistema como "Coordenador" e aparecerá nesta lista. A partir daí, você poderá elevá-lo a {userRole === 'superadmin' ? '"Administrador Local" ou "Superadmin"' : '"Administrador Local"'} e associá-lo às respectivas escolas dele.
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => handleToggleScope(confirmModal.userId, confirmModal.schoolId, confirmModal.isAssigned)}
        title={
          confirmModal.isAssigned && confirmModal.totalScopesCount === 1 
            ? "⚠️ ALERTA CRÍTICO: Perda de Acesso" 
            : confirmModal.isPending 
              ? "Cancelar Solicitação de Vínculo" 
              : !confirmModal.isAssigned && (userRole === 'school_admin' && !(Array.isArray(userScopes) ? userScopes : []).includes(confirmModal.schoolId))
                ? "Solicitar Vínculo de Unidade"
                : "Confirmar Alteração de Acesso"
        }
        message={
          confirmModal.isAssigned ? (
            confirmModal.totalScopesCount === 1 ? (
              <span style={{ display: 'block', lineHeight: '1.6' }}>
                O usuário <strong>{confirmModal.userEmail}</strong> está atualmente associado a apenas uma única unidade escolar (<strong>{confirmModal.schoolName}</strong>).
                <br /><br />
                <span style={{ color: 'var(--error)', fontWeight: '600' }}>
                  Atenção: Se você remover esta última associação, ele perderá acesso completo ao sistema e retornará ao fluxo de pendente, necessitando de uma nova aprovação manual dos administradores para poder voltar a acessá-lo.
                </span>
                <br /><br />
                Deseja realmente confirmar a remoção desta unidade escolar?
              </span>
            ) : (
              <span>
                Deseja realmente remover a permissão de acesso da unidade escolar <strong>{confirmModal.schoolName}</strong> para o usuário <strong>{confirmModal.userEmail}</strong>?
              </span>
            )
          ) : confirmModal.isPending ? (
            <span>
              Já existe uma solicitação de vínculo pendente para a unidade escolar <strong>{confirmModal.schoolName}</strong> para o usuário <strong>{confirmModal.userEmail}</strong>.
              <br /><br />
              Deseja realmente <strong>cancelar</strong> esta solicitação pendente?
            </span>
          ) : !confirmModal.isAssigned && (userRole === 'school_admin' && !(Array.isArray(userScopes) ? userScopes : []).includes(confirmModal.schoolId)) ? (
            <span>
              Deseja realmente solicitar permissão de acesso da unidade escolar <strong>{confirmModal.schoolName}</strong> para o usuário <strong>{confirmModal.userEmail}</strong>?
              <br /><br />
              Esta unidade escolar é diferente da sua. A solicitação entrará na fila de **Solicitações de Vínculo** como pendente para aprovação do Administrador Local da unidade de destino.
            </span>
          ) : (
            <span>
              Deseja realmente conceder permissão de acesso da unidade escolar <strong>{confirmModal.schoolName}</strong> para o usuário <strong>{confirmModal.userEmail}</strong>?
            </span>
          )
        }
        confirmText={
          confirmModal.isAssigned 
            ? (confirmModal.totalScopesCount === 1 ? "Sim, Remover e Bloquear" : "Sim, Remover") 
            : confirmModal.isPending
              ? "Sim, Cancelar Solicitação"
              : !confirmModal.isAssigned && (userRole === 'school_admin' && !(Array.isArray(userScopes) ? userScopes : []).includes(confirmModal.schoolId))
                ? "Sim, Solicitar Vínculo"
                : "Sim, Associar"
        }
        cancelText="Cancelar"
        variant={confirmModal.isAssigned || confirmModal.isPending ? "danger" : "primary"}
      />

      <Modal 
        isOpen={deleteUserModal.isOpen} 
        onClose={() => setDeleteUserModal(prev => ({ ...prev, isOpen: false }))} 
        title="Confirmar Exclusão de Usuário"
      >
        <div style={{ padding: 'var(--space-2)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: 'var(--space-3)', 
            backgroundColor: '#fee2e2', 
            border: '1px solid #fecaca', 
            borderRadius: 'var(--radius-md)',
            color: '#b91c1c',
            marginBottom: 'var(--space-4)'
          }}>
            <Trash2 size={24} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '600', margin: 0 }}>Atenção: Excluir {deleteUserModal.userEmail}</p>
              <p style={{ fontSize: '12px', margin: '2px 0 0 0', opacity: 0.9 }}>
                Esta ação gerencia o acesso do usuário no sistema.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-5)', lineHeight: '1.5', fontSize: '14px' }}>
            {deleteUserModal.hasMultipleSchools ? (
              <div>
                <p>
                  O usuário <strong>{deleteUserModal.userEmail}</strong> está vinculado a <strong>{deleteUserModal.scopesCount} unidades escolares</strong>.
                </p>
                
                {selectedSchoolId ? (
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Por padrão, esta ação removerá apenas o acesso deste usuário na unidade selecionada: <strong>{schools.find(s => s.id === selectedSchoolId)?.name}</strong>. Ele continuará ativo nas outras escolas.
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Para desvincular este usuário de apenas uma escola específica, selecione-a no painel lateral. Caso contrário, a exclusão total será aplicada.
                  </p>
                )}

                {userRole === 'superadmin' && selectedSchoolId && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)',
                    marginTop: '12px' 
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                      <input 
                        type="checkbox" 
                        checked={deleteUserModal.deleteAll} 
                        onChange={(e) => setDeleteUserModal(prev => ({ ...prev, deleteAll: e.target.checked }))}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <span style={{ fontWeight: '600', color: deleteUserModal.deleteAll ? '#b91c1c' : 'var(--text)' }}>
                          Excluir este usuário permanentemente do banco de dados (remover perfil de acesso)
                        </span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          {deleteUserModal.deleteAll 
                            ? "⚠️ Cuidado: Isso apagará completamente o perfil do usuário e todas as suas permissões em todas as escolas definitiva e irrevogavelmente."
                            : "Se mantiver desmarcado (padrão), o usuário será apenas desvinculado da escola selecionada no momento."}
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p>
                  O usuário <strong>{deleteUserModal.userEmail}</strong> está associado a apenas <strong>1 unidade escolar</strong>.
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  A confirmação desta ação irá <strong>excluí-lo permanentemente</strong> do banco de dados e remover seu perfil do sistema por completo.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteUserModal(prev => ({ ...prev, isOpen: false }))} disabled={saving}>
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={confirmDeleteUser} 
              disabled={saving}
            >
              {saving ? 'Processando...' : (deleteUserModal.hasMultipleSchools && !deleteUserModal.deleteAll ? 'Desvincular da Escola' : 'Excluir Usuário')}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
