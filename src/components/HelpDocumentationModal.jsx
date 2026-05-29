import React, { useState, useEffect } from 'react';
import { X, BookOpen, Database, Cpu, Layers, Wifi, ChevronRight, HelpCircle, Code, Server, Info, Shield, Users } from 'lucide-react';

export default function HelpDocumentationModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close modal on Escape press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: <Info size={16} /> },
    { id: 'screens', label: 'Telas & Recursos', icon: <BookOpen size={16} /> },
    { id: 'database', label: 'Banco de Dados', icon: <Database size={16} /> },
    { id: 'ai', label: 'Engine de IA', icon: <Cpu size={16} /> },
    { id: 'offline', label: 'Modo Offline', icon: <Layers size={16} /> }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(16px)',
      padding: isMobile ? '12px' : '24px',
      animation: 'sosaFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}
      onClick={onClose}
    >
      <style>{`
        @keyframes sosaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sosaScaleUp {
          from { transform: scale(0.96) translateY(12px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .help-doc-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .help-doc-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .help-doc-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        .help-doc-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .help-tab-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .help-tab-btn:hover {
          background-color: var(--background) !important;
          color: var(--primary) !important;
        }
        .db-table-row:hover {
          background-color: var(--background) !important;
        }
        .code-block {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 10px 14px;
          border-radius: 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          line-height: 1.5;
          overflow-x: auto;
          margin: 6px 0;
          border: 1px solid #1e293b;
        }
      `}</style>

      <div style={{
        width: '1000px',
        maxWidth: '100%',
        height: isMobile ? '92vh' : '82vh',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'sosaScaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        position: 'relative'
      }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Documentação Técnica SOSA</h2>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Central de Ajuda Interna e Especificações do Sistema • v1.02</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'var(--background)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
          >
            <X size={16} />
          </button>
        </header>

        {/* Outer Split Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden'
        }}>
          
          {/* Mobile Horizontal Tabs Selector */}
          {isMobile ? (
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              overflowX: 'auto',
              backgroundColor: 'var(--surface-hover)',
              whiteSpace: 'nowrap'
            }}
              className="help-doc-scrollbar"
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: activeTab === tab.id ? '700' : '500',
                    border: 'none',
                    backgroundColor: activeTab === tab.id ? '#eef2ff' : 'transparent',
                    color: activeTab === tab.id ? '#4f46e5' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            /* Desktop Sidebar Tabs */
            <aside style={{
              width: '210px',
              borderRight: '1px solid var(--border)',
              backgroundColor: 'var(--surface-hover)',
              padding: '16px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="help-tab-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: activeTab === tab.id ? '700' : '500',
                    border: 'none',
                    backgroundColor: activeTab === tab.id ? 'var(--background)' : 'transparent',
                    color: activeTab === tab.id ? '#4f46e5' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <span style={{ color: activeTab === tab.id ? '#4f46e5' : 'var(--text-muted)' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </aside>
          )}

          {/* Main Documentation Viewer Panel */}
          <main 
            className="help-doc-scrollbar"
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              backgroundColor: 'var(--background)'
            }}
          >
            {/* TAB 1: VISÃO GERAL */}
            {activeTab === 'overview' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} style={{ color: '#4f46e5' }} /> Arquitetura do Sistema SOSA
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  O <strong>SOSA (Sistema de Observação em Sala de Aula)</strong> é uma plataforma pedagógica de ponta construída especificamente para a Rede Adventista de Ensino. Seu objetivo principal é fornecer aos coordenadores e administradores escolares ferramentas de análise pedagógica rápidas, consistentes e baseadas em evidências coletadas em visitas a salas de aula, incorporando o aprimoramento inteligente de observações por meio de Inteligência Artificial e a capacidade de funcionamento 100% offline.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code size={14} style={{ color: '#6366f1' }} /> Tecnologia Base
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <li><strong>Front-End:</strong> React 18 com Vite, fornecendo renderização ágil e bundler modular.</li>
                      <li><strong>Banco de Dados & Auth:</strong> Supabase (PostgreSQL) com segurança integrada de linhas (RLS).</li>
                      <li><strong>Iconografia:</strong> Lucide React para indicadores visuais consistentes.</li>
                    </ul>
                  </div>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wifi size={14} style={{ color: '#10b981' }} /> Estrutura Offline-First
                    </h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Projetado para ambientes com conectividade instável de internet (comum dentro de salas de aula). Permite cadastrar visitas no modo offline salvando os rascunhos com segurança no <strong>IndexedDB</strong> local e realizando o envio automático assim que a rede é reestabelecida.
                    </p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Fluxo Geral de Dados do SOSA</h4>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#eef2ff', color: '#4f46e5', borderRadius: '6px', fontWeight: '600' }}>1. Coleta Pedagógica</div>
                    <ChevronRight size={14} style={{ transform: isMobile ? 'rotate(90deg)' : 'none', alignSelf: 'center' }} />
                    <div style={{ padding: '8px 12px', backgroundColor: '#faf5ff', color: '#7c3aed', borderRadius: '6px', fontWeight: '600' }}>2. Aprimoramento IA (Opcional)</div>
                    <ChevronRight size={14} style={{ transform: isMobile ? 'rotate(90deg)' : 'none', alignSelf: 'center' }} />
                    <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '6px', fontWeight: '600' }}>3. Fila Local (IndexedDB / Online)</div>
                    <ChevronRight size={14} style={{ transform: isMobile ? 'rotate(90deg)' : 'none', alignSelf: 'center' }} />
                    <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '6px', fontWeight: '600' }}>4. Supabase DB Cloud</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TELAS & RECURSOS */}
            {activeTab === 'screens' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Especificações das Telas e Fluxos</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Entenda a lógica de negócio por trás de cada tela do aplicativo.</span>
                </div>

                {/* Dashboard */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px 0' }}>1. Painel Principal (Dashboard)</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Central de monitoramento de visitas da escola ativa selecionada.
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>Métricas Gerais:</strong> Total de Visitas, Total de Observações Cadastradas e Tendência de Desempenho Pedagógico da escola.</li>
                    <li><strong>Modos de Exibição:</strong> Modo Compacto (sparklines otimizadas lado a lado para celulares) e Modo Expandido (Gráficos de Linha e Barra ocupando a largura total de 100% com legendas de eixos completas).</li>
                    <li><strong>Rol de Observações Recentes:</strong> Listagem cronológica dos últimos formulários enviados, permitindo visualizar detalhes rápidos ou excluir registros caso o perfil do usuário seja Superadmin ou Administrador de Escola.</li>
                  </ul>
                </div>

                {/* Nova Observação */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px 0' }}>2. Nova Observação (Formulário)</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    O coração da captação pedagógica em sala de aula, organizado em abas com guardas de integridade tátil.
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>Aba 1: Identificação:</strong> Captura do professor, série correspondente, disciplinas e data da visita.</li>
                    <li><strong>Abas 2 a 6: Eixos Pedagógicos:</strong> Avaliação conceitual das práticas pedagógicas (Planejamento, Metodologia, Avaliação, Gestão de Sala e Identidade Confessional) com atribuição de notas de 1 a 4.</li>
                    <li><strong>Aba Devolutiva:</strong> Registro descritivo de pontos fortes, pontos a aprimorar, síntese, orientações e combinados. A IA pode ser ativada de forma granular por campo para redigir ou aprimorar os parágrafos.</li>
                    <li><strong>Fluxo de Revisitas:</strong> Suporta o registro de até 3 visitas (1ª Visita, 2ª Visita e 3ª Visita) no mesmo documento de observação, criando um histórico de evolução pedagógica com as notas, datas e pareceres integrados.</li>
                  </ul>
                </div>

                {/* Cadastros */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px 0' }}>3. Gerenciador de Cadastros (Registries)</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Painel administrativo dividido em subcategorias para modelagem da escola ativa.
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>Gerenciar Escolas (Superadmin apenas):</strong> Cadastro e exclusão de unidades escolares com códigos de identificação.</li>
                    <li><strong>Segmentos e Séries:</strong> Definição de segmentos de ensino (Ex: Ensino Fundamental II) e séries (Ex: 6º Ano).</li>
                    <li><strong>Disciplinas:</strong> Listagem de matérias, com vínculo associativo granular aos eixos curriculares/segmentos de ensino.</li>
                    <li><strong>Professores:</strong> Cadastro contendo gênero (para adequação de IA), tipo de docente e associação múltipla de séries/disciplinas que leciona.</li>
                    <li><strong>Usuários (Controle de Escopos):</strong> Atribuição de permissões (Superadmin, Administrador ou Coordenador) a contas do SOSA, com gerenciamento dinâmico de escolas autorizadas e solicitações de vínculo pendentes em amarelo.</li>
                  </ul>
                </div>

                {/* Solicitações de Acesso */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: '0 0 6px 0' }}>4. Solicitações de Vínculo (UserRequests)</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Fila de moderação de acessos. Se um Administrador Local ou Coordenador tentar atribuir acesso a uma escola que não gerencia diretamente no menu de usuários, o SOSA cria uma solicitação pendente. O administrador responsável por aquela unidade pode aprovar ou rejeitar o vínculo manualmente por este painel.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: BANCO DE DADOS */}
            {activeTab === 'database' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Dicionário de Banco de Dados</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visão de tabelas e mapeamento físico das colunas no Supabase.</span>
                </div>

                {/* observations table */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#a855f7', margin: '0 0 8px 0', fontFamily: 'monospace' }}>Tabela Principal: observations</h4>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Armazena todo o histórico e pareceres de captações de visitas à sala.</span>
                  
                  <div style={{ overflowX: 'auto' }} className="help-doc-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                          <th style={{ padding: '6px' }}>Coluna</th>
                          <th style={{ padding: '6px' }}>Tipo SQL</th>
                          <th style={{ padding: '6px' }}>Descrição / Relacionamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>id</td><td style={{ padding: '6px', color: '#c026d3' }}>uuid (PK)</td><td style={{ padding: '6px' }}>Identificador exclusivo da observação.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>teacher_id</td><td style={{ padding: '6px', color: '#c026d3' }}>uuid (FK)</td><td style={{ padding: '6px' }}>Vínculo com <code style={{ fontSize: '10px' }}>teachers.id</code>.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>series_id</td><td style={{ padding: '6px', color: '#c026d3' }}>uuid (FK)</td><td style={{ padding: '6px' }}>Vínculo com <code style={{ fontSize: '10px' }}>series.id</code>.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>school_id</td><td style={{ padding: '6px', color: '#c026d3' }}>uuid (FK)</td><td style={{ padding: '6px' }}>Vínculo com <code style={{ fontSize: '10px' }}>schools.id</code>.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>subject_ids</td><td style={{ padding: '6px', color: '#c026d3' }}>uuid[] (Array)</td><td style={{ padding: '6px' }}>Lista de disciplinas observadas no momento.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>visit_date</td><td style={{ padding: '6px', color: '#c026d3' }}>date</td><td style={{ padding: '6px' }}>Data da 1ª visita à sala de aula.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>bimestre</td><td style={{ padding: '6px', color: '#c026d3' }}>varchar</td><td style={{ padding: '6px' }}>Bimestre letivo ativo (Ex: '1º Bimestre').</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>plan_alignment_score</td><td style={{ padding: '6px', color: '#c026d3' }}>int4 (1-4)</td><td style={{ padding: '6px' }}>Nota atribuída ao alinhamento de planejamento.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>meth_strategies_score</td><td style={{ padding: '6px', color: '#c026d3' }}>int4 (1-4)</td><td style={{ padding: '6px' }}>Nota para as estratégias metodológicas de aula.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>strong_points</td><td style={{ padding: '6px', color: '#c026d3' }}>text</td><td style={{ padding: '6px' }}>Parecer descritivo dos pontos fortes observados.</td></tr>
                        <tr className="db-table-row" style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>scores_v2 / scores_v3</td><td style={{ padding: '6px', color: '#c026d3' }}>jsonb</td><td style={{ padding: '6px' }}>Histórico com as notas completas da 2ª e 3ª visitas.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modelagem do Escopo de Cadastros */}
                <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#6366f1', margin: '0 0 8px 0' }}>Tabelas Secundárias e Relacionamentos</h4>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>schools:</strong> Unidades escolares do sistema (<code style={{ fontSize: '10px' }}>id</code>, <code style={{ fontSize: '10px' }}>code</code>, <code style={{ fontSize: '10px' }}>name</code>).</li>
                    <li><strong>teachers:</strong> Informações do professor (<code style={{ fontSize: '10px' }}>id</code>, <code style={{ fontSize: '10px' }}>name</code>, <code style={{ fontSize: '10px' }}>email</code>, <code style={{ fontSize: '10px' }}>gender</code> [M/F], <code style={{ fontSize: '10px' }}>teacher_type</code>, <code style={{ fontSize: '10px' }}>school_id</code>).</li>
                    <li><strong>user_profiles:</strong> Perfis das contas de login (<code style={{ fontSize: '10px' }}>id</code> [UUID correspondente ao Supabase Auth], <code style={{ fontSize: '10px' }}>email</code>, <code style={{ fontSize: '10px' }}>role</code> ['superadmin', 'school_admin', 'coordinator']).</li>
                    <li><strong>user_school_scopes:</strong> Permissão de acesso física de Administradores/Coordenadores às escolas (<code style={{ fontSize: '10px' }}>user_id</code>, <code style={{ fontSize: '10px' }}>school_id</code>).</li>
                    <li><strong>user_school_requests:</strong> Solicitações pendentes de permissão para nova escola (<code style={{ fontSize: '10px' }}>id</code>, <code style={{ fontSize: '10px' }}>user_email</code>, <code style={{ fontSize: '10px' }}>school_id</code>, <code style={{ fontSize: '10px' }}>status</code> ['pending', 'approved', 'rejected']).</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: ENGINE DE IA */}
            {activeTab === 'ai' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} style={{ color: '#a855f7' }} /> Processamento Inteligente Pedagógico (IA)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  O SOSA incorpora uma engine altamente refinada de processamento de linguagem natural compatível com APIs do <strong>Google Gemini (família gemini-2.0-flash e 1.5)</strong> e <strong>Groq (Llama 3.3 70b, Llama 3.1 8b)</strong> para aprimorar as redações pedagógicas de forma humana e formal.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Modos de Autonomia</h4>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <li><strong>Autonomia da Coordenação:</strong> A IA age como revisor estrito. Ela respeita o rascunho de texto digitado no campo, corrigindo apenas gramática, coesão e jargões pedagógicos, <strong>sem ler pontuações de notas</strong> ou adicionar ideias externas.</li>
                      <li><strong>Autonomia da IA:</strong> A IA assume papel proativo. Ela lê as notas de 1 a 4 marcadas nos eixos correspondentes daquela aba e o contexto do professor, gerando uma sugestão pedagógica inteiramente do zero, adequada para validar as forças (notas 3 e 4) ou orientar formas construtivas e práticas de superar fragilidades (notas 1 e 2).</li>
                    </ul>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Diretrizes Rigorosas de Estilo nos Prompts</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Nossos prompts instruem as LLMs a banirem clichês robóticos artificiais (como <em>"Ademais", "Outrossim", "Em suma", "Sob essa ótica", "É imperioso destacar"</em>) para produzir redações que pareçam 100% redigidas por um coordenador humano especializado. Além disso, a IA respeita rigidamente o gênero do professor observado cadastrado no banco de dados, utilizando pronomes perfeitamente adequados (Ex: "o docente", "a professora") e ocultando qualquer menção a pontuações numéricas diretas, substituindo-as por avaliações qualitativas elegantes.
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Diretrizes Customizadas por Usuário (Sincronizadas na Nuvem)</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>
                      Cada coordenador pode personalizar o estilo de escrita da IA clicando na engrenagem de configurações no rodapé de qualquer caixa de texto e selecionando <strong>"Personalizar Diretrizes IA"</strong>.
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <li><strong>Injeção Direta no Prompt:</strong> Suas regras personalizadas (Ex: <em>"Enfatize metodologias ativas", "Escreva em tom empático"</em>) são acopladas no topo do prompt de execução, moldando a resposta do modelo para o seu estilo pessoal.</li>
                      <li><strong>Sincronização em Tempo Real na Tela:</strong> A edição de suas regras a partir de qualquer caixa de texto propaga as alterações instantaneamente para todos os outros campos na tela ativa.</li>
                      <li><strong>Nuvem & Multi-Dispositivo:</strong> Suas diretrizes são gravadas diretamente no <code style={{ fontSize: '10px' }}>user_metadata</code> da sua conta de autenticação no Supabase, sincronizando e aplicando-se automaticamente em qualquer computador ou navegador onde você realizar o login.</li>
                    </ul>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Modelo de prompt interno (Exemplo Simplificado)</h4>
                  <div className="code-block">
                    {`Você é um assistente pedagógico da Rede Adventista. 
Sua tarefa é aprimorar o rascunho pedagógico de observação respeitando o gênero do professor ({teacherGender}).
Regras Críticas:
- NUNCA use termos de IA como "Ademais", "Outrossim" ou "Urge salientar".
- NUNCA mencione notas numéricas como "Nota 2" ou "Nota 4". Aborde qualitativamente.
- Preserve a sensibilidade humana original do coordenador.`}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MODO OFFLINE */}
            {activeTab === 'offline' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} style={{ color: '#10b981' }} /> Estrutura e Mecanismo Offline-First
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                  O SOSA foi desenvolvido sob o princípio de resiliência total de conectividade. A coleta de observações pedagógicas pode ocorrer inteiramente sem internet, sem qualquer interrupção de fluxo.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Database size={14} style={{ color: '#10b981' }} /> IndexedDB Fila Local
                    </h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Quando o sistema detecta que o sinal de internet está ausente (`isOnline === false`), o SOSA redireciona o payload de salvamento de observações para a fila local protegida do navegador do usuário no banco local <strong>IndexedDB</strong> (`sosa_offline_store`).
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wifi size={14} style={{ color: '#4f46e5' }} /> Reestabelecimento Automático
                    </h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      A aplicação monitora constantemente as conexões nativas do navegador via eventos globais de `online`. Ao restabelecer a conectividade com a nuvem, o SOSA dispara silenciosamente o envio da fila local de forma ordenada e higieniza o IndexedDB.
                    </p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Cache dos Metadados</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Para que o formulário possa ser aberto offline, o SOSA baixa e atualiza em cache local estruturado no `localStorage` a lista de Escolas, Professores, Séries e Disciplinas cadastrados no banco de dados ativo sempre que o usuário faz login online. Desta forma, todas as listas de seleção funcionam perfeitamente mesmo sem conexão!
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <footer style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-hover)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <span>SOSA • Rede Adventista de Ensino</span>
          <span style={{ fontWeight: 'bold' }}>Revisão Técnica v1.02</span>
        </footer>
      </div>
    </div>
  );
}
