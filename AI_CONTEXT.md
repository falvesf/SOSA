# SOSA - Contexto de Desenvolvimento (AI Handoff)

Este documento serve para orientar o agente de IA sobre o estado atual do projeto SOSA (Sistema de Observação em Sala de Aula).

## 🚀 Estado Atual
O projeto está estabilizado, com autenticação Google Workspace funcionando e o Dashboard operacional.

### 🛠 Stack Tecnológica
- **Frontend**: React + Vite
- **Estilização**: Vanilla CSS (definido em `src/index.css`) com componentes customizados em `src/components/ui.jsx`.
- **Backend/Auth**: Supabase
- **Icons**: Lucide React

### 🔑 Autenticação (Google OAuth)
- O login é "ambiente-consciente". Em `src/App.jsx`, a `redirectTo` é calculada dinamicamente usando `window.location.origin + window.location.pathname`.
- **Importante**: No Dashboard do Supabase, tanto `http://localhost:5173/SOSA/` quanto a URL do GitHub Pages devem estar na lista de "Allow Redirect URIs".

### 📊 Banco de Dados (Supabase)
- **Tabela `observations`**: Principal tabela do sistema.
- **Relacionamentos**: Foram corrigidos via SQL para usar chaves estrangeiras explícitas (`fk_observations_teacher`, `fk_observations_series`, etc.).
- **Queries**: Devido a ambiguidades no cache do Supabase, o Dashboard utiliza a sintaxe explícita: `teachers:teachers!fk_observations_teacher(name)`.

### ✨ Funcionalidades Implementadas Recentemente
1. **Dashboard**: Exibe estatísticas (Total e Mês) e uma tabela de "Observações Recentes" com nomes (não IDs).
2. **Formulário de Observação**: 
   - Campo dinâmico "Outro" aparece quando a opção "Outro" é selecionada nos Objetivos da Visita.
   - Salvamento multi-tenant baseado em `school_id`.
3. **Menu Lateral**: Seletor de Unidade Escolar que filtra o Dashboard e preenche o formulário.

## 📋 Próximos Passos Sugeridos
- [ ] **Visualização de Detalhes**: Implementar um modal ou página para ver a observação completa (atualmente o Dashboard só lista o resumo).
- [ ] **Edição de Registros**: Permitir editar uma observação já salva.
- [ ] **Relatórios/PDF**: Funcionalidade para exportar a observação em formato profissional.

## ⚠️ Atenção ao Desenvolver
- **Não use TailwindCSS** a menos que solicitado. O projeto usa um sistema de design baseado em variáveis CSS em `index.css`.
- **Preserve o Contexto**: Sempre verifique o `SchoolContext` para garantir que as operações estão vinculadas à Unidade Escolar selecionada.
