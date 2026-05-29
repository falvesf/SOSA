# SOSA - Contexto de Desenvolvimento (AI Handoff)

Este documento serve para orientar o agente de IA sobre o estado atual do projeto SOSA (Sistema de Observação em Sala de Aula).

## 🚀 Estado Atual (v1.0.2)
O projeto está 100% estabilizado, com autenticação Google Workspace ativa, sincronização offline resiliente via IndexedDB, e um **Dashboard de Métricas Premium Interativo e Altamente Personalizável**.

### 🛠 Stack Tecnológica
- **Frontend**: React 19 + Vite 8
- **Estilização**: Vanilla CSS (tokens baseados em variáveis CSS definidos em `src/index.css`) com componentes customizados em `src/components/ui.jsx`.
- **Biblioteca de Gráficos**: Recharts 3
- **Backend/Auth**: Supabase
- **Icons**: Lucide React
- **Armazenamento Local/Offline**: IndexedDB + localStorage

### 📊 Sistema de Métricas Customizáveis (v1.0.2)
- **Persistência de Configuração**: As configurações de cards de gráficos customizados de cada usuário são salvas automaticamente no `localStorage` sob a chave `sosa_custom_dashboard_cards` e sincronizadas na nuvem no Supabase (`session.user.user_metadata.dashboard_config`).
- **Layout de Grade Dinâmica**: Controlado dinamicamente no JSX do Dashboard via propriedade `--grid-cols` aplicada inline, correspondente ao número total de cards ativos.
- **Gráficos Circulares Otimizados**: Os gráficos de Pizza (`pie`) e Rosca (`donut`) utilizam renderização de rótulo personalizada dentro das fatias/anéis para garantir contraste absoluto e impedir clipping de eixos SVG.
- **Redefinição de Estado**: A função `handleResetToDefaultCards` limpa as modificações de layout e restaura o design inicial recomendado de 3 cards instantaneamente.

### 🔑 Autenticação (Google OAuth)
- O login é adaptável ao ambiente. A URL de redirecionamento (`redirectTo`) é calculada em tempo de execução usando `window.location.origin + window.location.pathname`.

### 💾 Armazenamento Offline
- Fila offline no IndexedDB processa criações e deleções locais. O componente escuta o evento `sosa_sync_completed` para atualizar os dados de observação e recarregar os gráficos em tempo real.

## 📋 Próximos Passos Sugeridos
- [ ] **Edição de Registros**: Permitir editar uma observação já salva online ou em fila offline.
- [ ] **Relatórios/PDF**: Funcionalidade para exportar a observação preenchida em formato de relatório impresso ou PDF profissional.

## ⚠️ Atenção ao Desenvolver
- **Não utilize TailwindCSS** a menos que expressamente solicitado. Continue mantendo e estendendo os tokens semânticos e classes utilitárias declarados em `src/index.css`.
- **Sempre respeite a Unidade Escolar ativa**: Apenas filtre dados ou efetue salvamentos com base na escola selecionada no `SchoolContext`.
