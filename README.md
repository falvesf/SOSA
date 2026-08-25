# SOSA - Sistema de Observação em Sala de Aula 🚀

O **SOSA** é uma plataforma moderna e premium desenvolvida para a gestão, acompanhamento e análise de observações pedagógicas em sala de aula. Projetado para oferecer uma experiência fluida, o sistema conta com suporte offline, sincronização inteligente e um painel de métricas totalmente customizável em tempo real.

---

## ✨ Funcionalidades Principais

### 📊 Dashboard Interativo & Métricas Customizáveis (v1.0.3)
- **Painel Altamente Personalizável**: Os usuários podem configurar até 4 cards de gráficos ativos simultaneamente no dashboard.
- **Layout Inteligente e Responsivo**: Grade autoajustável com base na quantidade de gráficos ativos:
  - **1 gráfico**: Ocupa 100% da largura horizontal da tela.
  - **2 ou 3 gráficos**: Distribuídos igualmente em uma única linha.
  - **4 gráficos**: Distribuídos em 2 linhas simétricas (2 por linha).
- **Galeria Expandida com 8 Gráficos**: Suporte a Barras Verticais, Barras Horizontais, Linhas, Área, Pizza (com rótulos internos de alto contraste), Rosca (com legendas explicativas), Radar e Pontos (Scatter).
- **Métricas Avançadas**: Filtragem por Data, Nome do Professor, Série, Disciplina, Segmento Escolar, Bimestre e avaliação por Dimensão Pedagógica.
- **Redefinição Instantânea (`🔄`)**: Botão discreto no cabeçalho para restaurar instantaneamente as métricas iniciais recomendadas.
- **Fixação Dinâmica (Sticky)**: Opção de fixar o grid de métricas no topo da tela enquanto rola os registros.

### 🌐 Sincronização e Funcionamento Offline
- **Modo Offline Resiliente**: Registro e deleção de observações mesmo sem conexão de rede ativa.
- **Fila de Sincronização Automatizada**: As ações offline são armazenadas localmente no IndexedDB e enviadas ao Supabase de forma transparente assim que a conexão é restabelecida.

### 🔒 Autenticação Google Workspace (OAuth)
- Login seguro e automático adaptado ao ambiente de execução (local ou nuvem).

---

## 🛠️ Stack Tecnológica

- **Core**: React 19 + Vite 8
- **Estilização**: Vanilla CSS com variáveis dinâmicas (sem TailwindCSS para controle total dos tokens de design)
- **Banco de Dados & Auth**: Supabase (PostgreSQL)
- **Biblioteca de Gráficos**: Recharts
- **Ícones**: Lucide React
- **Armazenamento Local**: IndexedDB

---

## 🚀 Instalação e Execução Local

1. **Clonar o Repositório**:
   ```bash
   git clone <url-do-repositorio>
   cd SOSA-main
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configuração de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com as chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

4. **Executar em Modo de Desenvolvimento**:
   ```bash
   npm run dev
   ```

5. **Compilar para Produção**:
   ```bash
   npm run build
   ```

---

## 📜 Histórico de Versões (Changelog)

### [1.0.4] - 2026-08-19 (Versão Atual)
- **Corrigido**: Autoria offline — o `user_id` do coordenador logado agora é atribuído corretamente mesmo quando o registro é salvo sem conexão, usando fallback do `userProfile` (SchoolContext) e cache localStorage.
- **Adicionado**: Camada de backup síncrono no `localStorage` para a fila offline, garantindo que dados não sejam perdidos caso o navegador seja fechado antes da escrita no IndexedDB completar.
- **Adicionado**: Reconciliação automática da fila offline no startup — itens do backup localStorage são restaurados para o IndexedDB se não existirem.
- **Adicionado**: Proteção `beforeunload` que avisa o coordenador antes de fechar a aba se houver registros pendentes de sincronização.

### [1.0.3] - 2026-08-19
- **Atualização dos Modelos de IA**: Substituição dos modelos descontinuados do Groq e Gemini pelos novos modelos disponíveis (GPT-OSS 120B, GPT-OSS 20B, Qwen 3.6 27B, Gemini 2.5 Flash).
- **Documentação Atualizada**: Central de Ajuda interna refletindo os novos modelos disponíveis.

### [1.0.2] - 2026-05-29

### [1.0.1] - 2026-05-28
- **Adicionado**: Suporte offline e sincronização em background.
- **Adicionado**: Sistema multi-escola (multi-tenant) robusto.

---

## ⚠️ Diretrizes de Desenvolvimento
- **Sem TailwindCSS**: Qualquer novo estilo deve ser adicionado ao `src/index.css` respeitando o sistema de tokens em variáveis CSS.
- **Controle de Tenant**: Certifique-se de vincular todas as operações e consultas de banco de dados ao `SchoolContext` do usuário logado.