# Changelog - SOSA (Sistema de Observação em Sala de Aula)

Todos os registros notáveis das mudanças, melhorias, correções e novas funcionalidades deste projeto estão detalhados aqui. Este projeto segue as diretrizes de versionamento semântico.

---

## [1.0.2] - 2026-05-29

### 🚀 Adicionado (Features)
- **Engine de Métricas 100% Personalizável**: Implementada a capacidade para coordenadores pedagógicos adicionarem, removerem, editarem e reorganizarem até 4 cards analíticos simultâneos no Dashboard.
- **Galeria de 8 Gráficos Dinâmicos**: Inclusão de suporte total a 8 tipos distintos de gráficos usando a biblioteca Recharts:
  - Barras Verticais (`bar`)
  - Barras Horizontais (`bar_horizontal`)
  - Linhas (`line`)
  - Área (`area`)
  - Pizza (`pie`) - com rótulos internos inteligentes de alto contraste
  - Rosca (`donut`) - com legendas organizadas
  - Radar (`radar`)
  - Dispersão/Pontos (`scatter`)
- **Isolamento de Dimensões Pedagógicas**: Capacidade de filtrar dados isolando pontuações de qualquer um dos 5 eixos conceituais (Planejamento, Metodologia, Avaliação, Gestão de Sala e Identidade Confessional).
- **Mapeamentos Avançados**: Filtros dinâmicos agregados por Bimestre, Segmento Escolar, Série, Disciplina, Professor e Data.
- **Botão de Redefinição Padrão (`🔄` / RotateCcw)**: Adicionado um atalho ágil que redefine os cards customizados instantaneamente para os 3 cards padrão iniciais recomendados pelo sistema, com aviso visual Toast.
- **Sincronização em Nuvem das Customizações**: Persistência de estado automática do perfil de métricas do usuário no banco Supabase em nuvem (`user_dashboard_configs`), com fallback robusto no `localStorage`.

### 📱 Responsividade & Usabilidade
- **Header Mobile Adaptativo (Zero Scroll Lateral)**: Detector de dispositivo ativo (`isMobile`) que oculta os rótulos de texto de ação no celular, exibindo apenas os ícones simétricos. Resolve em definitivo a rolagem horizontal indesejada em smartphones.
- **Ícones Universais e Intuitivos**:
  - **Atualizar**: Substituído o ícone antigo de calendário por **`RefreshCw`** (recarga padrão 🔄).
  - **Modo Compacto/Expandido**: Substituído por **`Maximize2`** e **`Minimize2`** para controle tátil de zoom de layout ⤢/⤡.
- **Cabeçalho de Título Único nos Cards (Compact Mode)**: Redesenho estrutural da grade compacta. Os títulos agora residem em uma linha horizontal de largura total no topo do card, eliminando truncamentos e liberando espaço imenso na base para o gráfico.
- **Alocação Inteligente de Área do Gráfico (Desktop)**: Diminuição da largura da coluna de seletores de `42%` para `120px` fixos, maximizando a área de desenho do Recharts.

### 🐛 Correções (Fixes) & Ajustes
- **Ajuste de Clipping em Gráficos Circulares**: Correção de colisão e corte de rótulos em fatias e anéis de gráficos de Pizza e Rosca com sombras de alta visibilidade e eixos precisos.
- **Abreviador Inteligente para Celulares (YAxis)**: Rótulos verticais extensos em gráficos horizontais no mobile são agora abreviados de forma tátil (ex: *"Parcialmente"*, *"Plenamente"*, *"Não Obs."*), mantendo a grade intacta e sem cortes. No desktop, os nomes são mantidos completos.

### 📝 Documentação
- **Overhaul da Central de Ajuda Interna**: Atualização completa das descrições, termos e fluxos da aba *"Telas & Recursos"* na modal de ajuda do SOSA (`HelpDocumentationModal.jsx`) para detalhar com exatidão as novas customizações analíticas da v1.0.2.
- **README.md e AI_CONTEXT.md**: Atualizações no manual corporativo e especificações de persistência.

---

## [1.0.1] - 2026-05-28

### 🚀 Adicionado (Features)
- **Persistência de Conectividade & Modo Offline**: Banco local seguro `IndexedDB` integrado com sincronização automática bidirecional resiliente ao recuperar o sinal de internet.
- **Padrão de Fila de Operações (Sync Queue)**: Enfileiramento de cadastros e exclusões com badges e popups de alerta ao usuário.
- **IA Granular na Devolutiva**: Suporte a preenchimento inteligente e refinamento textual de relatórios via modelo Google Gemini diretamente na caixa de devolutivas.

---

## [1.0.0] - 2026-05-20 (Lançamento Inicial)

### 🚀 Adicionado (Features)
- **Visita Pedagógica Completa**: Lógica de formulário em 7 abas com guardas de integridade tátil.
- **Banco Supabase integrado**: Tabelas relacionais estruturadas para professores, escolas, observações e relatórios.
- **Autenticação Segura**: Fluxo Google Sign-In corporativo.
