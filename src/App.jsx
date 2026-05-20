import { useLocation, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ClipboardList, Users, BookOpen, LogOut, Info } from 'lucide-react'
import Registries from './pages/Registries'
import Instructions from './pages/Instructions'
import ObservationForm from './pages/ObservationForm'
import { SchoolProvider, useSchool } from './contexts/SchoolContext'
import Dashboard from './pages/Dashboard'
import { SyncProvider, useSync } from './contexts/SyncContext'

import { Menu, X as CloseIcon } from 'lucide-react'

function Layout({ children, onLogout }) {
  const { schools, selectedSchoolId, setSelectedSchoolId, selectedBimestre, updateBimestre, loading, userRole } = useSchool()
  const { isOnline } = useSync()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || '')
      }
    })
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    
    // Orientation Lock logic
    const lockOrientation = async () => {
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        try {
          // This usually requires PWA standalone mode or fullscreen
          await window.screen.orientation.lock('portrait');
        } catch (e) {
          // Silent fail - browsers restricted
        }
      }
    };
    lockOrientation();

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const sidebarWidth = '260px'

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      
      {/* Mobile Header - More compact */}
      {isMobile && (
        <header style={{ 
          display: 'flex', alignItems: 'center', padding: '8px 16px', 
          backgroundColor: 'white', borderBottom: '1px solid var(--border)', zIndex: 100,
          width: '100%', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="h3" style={{ color: 'var(--primary)', margin: 0, fontSize: '1.25rem' }}>SOSA</h2>
            {!isOnline && (
              <div className="offline-badge-container">
                <span className="offline-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  Sem conexão {"->"} registro local
                  <span className="offline-tooltip">
                    No modo offline o sistema gravará as observações em um arquivo local seguro. Assim que uma conexão de internet for estabelecida, os dados serão sincronizados automaticamente com o banco de dados.
                  </span>
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            {isSidebarOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
          </button>
        </header>
      )}

      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 110 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{ 
          width: sidebarWidth, 
          backgroundColor: 'var(--surface)', 
          borderRight: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 120,
          transform: isMobile ? (isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="h3" style={{ color: 'var(--primary)', margin: 0 }}>SOSA</h2>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none' }}>
                <CloseIcon size={20} />
              </button>
            )}
          </div>
          <span className="text-xs text-muted" style={{ display: 'block', marginBottom: '4px', marginTop: '2px' }}>Observação em Sala</span>
          
          {userRole && (
            <div style={{ 
              marginTop: 'var(--space-3)', 
              marginBottom: 'var(--space-3)', 
              padding: '8px 10px', 
              backgroundColor: 'var(--background)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {userName && (
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {userName}
                </span>
              )}
              <div>
                <span style={{ 
                  display: 'inline-block',
                  backgroundColor: userRole === 'superadmin' ? '#dc2626' : userRole === 'school_admin' ? '#15803d' : '#1e3a8a', 
                  color: 'white', 
                  fontSize: '9px', 
                  fontWeight: 'bold', 
                  padding: '2px 8px', 
                  borderRadius: 'var(--radius-full)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {userRole === 'superadmin' ? 'Superadmin' : userRole === 'school_admin' ? 'Administrador(a)' : 'Coordenador(a)'}
                </span>
              </div>
            </div>
          )}
          
          {!isOnline && (
            <div className="offline-badge-container" style={{ margin: '4px 0 8px 0' }}>
              <span className="offline-badge">
                Sem conexão {"->"} registro local
                <span className="offline-tooltip">
                  No modo offline o sistema gravará as observações em um arquivo local seguro. Assim que uma conexão de internet for estabelecida, os dados serão sincronizados automaticamente com o banco de dados.
                </span>
              </span>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {!loading && schools.length > 0 && (
              schools.length > 1 ? (
                <div className="flex flex-col gap-0" style={{ backgroundColor: 'var(--surface-hover)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
                  <label className="text-xs font-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Unidade Escolar</label>
                  <select 
                    style={{ 
                      padding: 0, 
                      margin: 0,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      fontSize: '11px'
                    }}
                    className="font-medium text-muted"
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.code ? `${s.code} - ${s.name}` : s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-0" style={{ backgroundColor: 'var(--surface-hover)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
                  <label className="text-xs font-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Unidade Escolar</label>
                  <span className="font-medium text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {schools[0].code ? `${schools[0].code} - ${schools[0].name}` : schools[0].name}
                  </span>
                </div>
              )
            )}

            <div className="flex flex-col gap-0" style={{ backgroundColor: 'var(--surface-hover)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
              <label className="text-xs font-semibold text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>Bimestre Ativo</label>
              <select 
                style={{ 
                  padding: 0, 
                  margin: 0,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '11px',
                  color: 'var(--primary)'
                }}
                className="font-bold"
                value={selectedBimestre}
                onChange={(e) => updateBimestre(e.target.value)}
              >
                <option value="1º Bimestre">1º Bimestre</option>
                <option value="2º Bimestre">2º Bimestre</option>
                <option value="3º Bimestre">3º Bimestre</option>
                <option value="4º Bimestre">4º Bimestre</option>
              </select>
            </div>
          </div>
        </div>
        <nav style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <Link to="/" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: '13px' }}>
            <BookOpen size={16} /> Dashboard
          </Link>
          <Link to="/observacao" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: '13px' }}>
            <ClipboardList size={16} /> Nova Observação
          </Link>
          {userRole !== 'coordinator' && (
            <Link to="/cadastros" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: '13px' }}>
              <Users size={16} /> Cadastros
            </Link>
          )}
          <Link to="/instrucoes" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: '13px' }}>
            <Info size={16} /> Instruções e Rubrica
          </Link>
        </nav>
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <button onClick={onLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: 'var(--error)', padding: '8px 12px', fontSize: '13px' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, backgroundColor: 'var(--background)', overflowY: 'auto', padding: isMobile ? 'var(--space-4)' : '0' }}>
        {children}
      </main>
    </div>
  )
}

function ScopedRoutes() {
  const { userRole, hasNoSchools } = useSchool();

  if (hasNoSchools) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ maxWidth: '500px', backgroundColor: 'white', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 className="h2" style={{ color: 'var(--primary)', marginBottom: 'var(--space-3)' }}>Acesso Restrito</h2>
          <p className="text-muted" style={{ marginBottom: 'var(--space-6)', fontSize: '14px' }}>
            Seu usuário foi autenticado com sucesso, mas você ainda não está associado a nenhuma **Unidade Escolar**.
          </p>
          <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-6)', lineHeight: '1.4' }}>
            Por favor, entre em contato com o **Superadmin** ou o administrador do SOSA para liberar seu acesso à sua respectiva escola.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/observacao" element={<ObservationForm />} />
      <Route path="/observacao/editar/:id" element={<ObservationForm />} />
      {userRole !== 'coordinator' && <Route path="/cadastros" element={<Registries />} />}
      <Route path="/instrucoes" element={<Instructions />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'E-mail ou senha incorretos.';
      if (errMsg === 'Email not confirmed') {
        errMsg = 'E-mail não verificado! Por favor, marque "Confirm Email" ou desmarque "Send email confirmation" no Supabase.';
      } else if (errMsg === 'Invalid login credentials') {
        errMsg = 'E-mail ou senha incorretos.';
      }
      setAdminError(errMsg);
    } finally {
      setAdminLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando...</div>
  }

  if (!session) {
    return (
      <div className="login-container">
        {/* Animated Background Orbs */}
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        
        <div className="login-card">
          {/* Logo Brand Header */}
          <div className="login-brand">
            <div className="login-logo-wrapper">
              <ClipboardList size={32} className="login-logo-icon" />
            </div>
            <h1 className="login-title">SOSA</h1>
            <p className="login-subtitle">Observação em Sala de Aula</p>
          </div>
          
          <hr className="login-divider" />
          
          <div className="login-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 className="login-welcome-title">Acesso Restrito</h2>
            
            {!showAdminLogin ? (
              <>
                <p className="login-welcome-desc">
                  Utilize sua conta institucional do Google Workspace para realizar o acesso ao sistema.
                </p>
                
                <button 
                  className="google-signin-btn" 
                  onClick={() => supabase.auth.signInWithOAuth({ 
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin + window.location.pathname
                    }
                  })}
                >
                  <span className="google-icon-wrapper">
                    <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                  </span>
                  <span className="google-signin-btn-text">Entrar com Google</span>
                </button>
                
                <button 
                  onClick={() => setShowAdminLogin(true)} 
                  style={{ 
                    marginTop: '20px', background: 'none', border: 'none', 
                    color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', 
                    fontWeight: '600', textDecoration: 'underline' 
                  }}
                >
                  Acesso Administrativo (E-mail/Senha)
                </button>
              </>
            ) : (
              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4" style={{ width: '100%' }}>
                {adminError && (
                  <div style={{ 
                    color: 'var(--error)', 
                    fontSize: '12px', 
                    textAlign: 'center', 
                    backgroundColor: '#fee2e2', 
                    padding: '8px', 
                    borderRadius: 'var(--radius-md)' 
                  }}>
                    {adminError}
                  </div>
                )}
                
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>E-mail</label>
                  <input 
                    type="email" 
                    placeholder="admin@sosa.com" 
                    value={adminEmail} 
                    onChange={e => setAdminEmail(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px' }} 
                  />
                </div>
                
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px' }} 
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700', fontSize: '14px', marginTop: '8px' }} disabled={adminLoading}>
                  {adminLoading ? 'Autenticando...' : 'Entrar'}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => { setShowAdminLogin(false); setAdminError(''); }} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', marginTop: '6px', alignSelf: 'center' }}
                >
                  Voltar para Acesso Google
                </button>
              </form>
            )}
          </div>
          
          <div className="login-footer">
            <span>Desenvolvido com tecnologia de ponta para gestão escolar.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SyncProvider>
      <SchoolProvider>
        <Layout onLogout={() => supabase.auth.signOut()}>
          <ScopedRoutes />
        </Layout>
      </SchoolProvider>
    </SyncProvider>
  )
}

export default App
