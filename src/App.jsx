import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { ClipboardList, Users, BookOpen, LogOut, Info } from 'lucide-react'
import Registries from './pages/Registries'
import Instructions from './pages/Instructions'
import ObservationForm from './pages/ObservationForm'

// Placeholder Pages
const Dashboard = () => <div className="p-8"><h1>Dashboard</h1><p>Bem-vindo ao Sistema de Observação em Sala.</p></div>

function Layout({ children, onLogout }) {
  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="h3" style={{ color: 'var(--primary)' }}>SOSA</h2>
          <span className="text-xs text-muted">Observação em Sala</span>
        </div>
        <nav style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Link to="/" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            <BookOpen size={18} /> Dashboard
          </Link>
          <Link to="/observacao" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            <ClipboardList size={18} /> Nova Observação
          </Link>
          <Link to="/cadastros" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            <Users size={18} /> Cadastros
          </Link>
          <Link to="/instrucoes" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            <Info size={18} /> Instruções e Rubrica
          </Link>
        </nav>
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <button onClick={onLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: 'var(--error)' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, backgroundColor: 'var(--background)', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="flex items-center justify-center" style={{ height: '100vh' }}>Carregando...</div>
  }

  // Se não estiver logado, por enquanto vamos renderizar um botão de login simples para simular.
  // Em produção, isso redirecionará ou mostrará a tela de login.
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50" style={{ height: '100vh', backgroundColor: 'var(--background)' }}>
        <div className="card text-center" style={{ maxWidth: '400px', width: '100%' }}>
          <h1 className="h2" style={{ marginBottom: 'var(--space-2)' }}>Acesso Restrito</h1>
          <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>Faça login com sua conta do Google Workspace para continuar.</p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          >
            Entrar com Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout onLogout={() => supabase.auth.signOut()}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/observacao" element={<ObservationForm />} />
        <Route path="/cadastros" element={<Registries />} />
        <Route path="/instrucoes" element={<Instructions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
