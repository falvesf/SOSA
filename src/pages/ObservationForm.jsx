import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, Toast } from '../components/ui';
import { Save, CheckCircle, AlertCircle, Edit3, Trash2, X, PlusCircle, User, Target, ClipboardList, Zap, ArrowLeft, Award, Heart, Settings, Sparkles, Undo, Eye, EyeOff } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui';
import { useSync } from '../contexts/SyncContext';
import { cacheMetadata, getCachedMetadata, getQueue, withTimeout, findCachedObservation } from '../lib/offlineStore';

const evaluationOptions = [
  { value: 'Atende plenamente', label: 'Atende plenamente' },
  { value: 'Atende parcialmente', label: 'Atende parcialmente' },
  { value: 'Não atende', label: 'Não atende' },
  { value: 'Não observado', label: 'Não observado' }
];

const scores = [4, 3, 2, 1];

const scoreLabels = {
  1: "Necessita de Acompanhamento",
  2: "Em Desenvolvimento",
  3: "Adequado",
  4: "Excelente"
};

const rubrics = {
  planejamento: {
    4: "4 – Excelente: Aula claramente alinhada às habilidades da BNCC, aos referenciais da rede e à progressão das aprendizagens.",
    3: "3 – Adequado: Aula alinhada à BNCC e aos referenciais da rede, com objetivos claros, ainda que pouco contextualizados.",
    2: "2 – Em Desenvolvimento: Alinhamento parcial à BNCC e referenciais ou objetivos pouco claros.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de alinhamento ao planejamento, referenciais ou à BNCC."
  },
  metodologia: {
    4: "4 – Excelente: Metodologias diversificadas, ativas e adequadas à faixa etária, promovendo protagonismo e engajamento. Recursos utilizados de forma intencional.",
    3: "3 – Adequado: Estratégias adequadas, com participação dos alunos, ainda que pouco diversificadas.",
    2: "2 – Em Desenvolvimento: Metodologias pouco variadas ou centradas no professor. Uso pouco intencional de recursos.",
    1: "1 – Necessita de Acompanhamento: Estratégias inadequadas ou inexistentes. Não utiliza recursos ou utiliza de forma inadequada."
  },
  avaliacao: {
    4: "4 – Excelente: Avaliação formativa presente, com feedbacks claros e critérios alinhados aos objetivos.",
    3: "3 – Adequado: Avaliação coerente, com feedbacks pontuais.",
    2: "2 – Em Desenvolvimento: Avaliação pouco clara ou desalinhada aos objetivos.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de avaliação durante a aula."
  },
  gestao: {
    4: "4 – Excelente: Excelente organização do tempo, espaço e condução da turma, com clima positivo de aprendizagem. Relação respeitosa e acolhedora.",
    3: "3 – Adequado: Boa organização e condução da turma. Relação respeitosa.",
    2: "2 – Em Desenvolvimento: Dificuldades pontuais na gestão da sala. Relação pouco acolhedora.",
    1: "1 – Necessita de Acompanhamento: Gestão inadequada do tempo ou da turma. Relação inadequada ou desrespeitosa."
  },
  identidade: {
    4: "4 – Excelente: Valores cristãos integrados de forma natural, ética e coerente com a proposta adventista.",
    3: "3 – Adequado: Valores presentes de forma pontual e adequada.",
    2: "2 – Em Desenvolvimento: Valores pouco evidenciados na prática pedagógica.",
    1: "1 – Necessita de Acompanhamento: Não há evidências de integração dos valores institucionais."
  }
};

const initialFormState = {
  visit_date: '',
  teacher_id: '',
  subject_id: '',
  subject_ids: [],
  series_id: '',
  visit_type: '',
  visit_type_other: '',
  visit_objectives: [],
  visit_objectives_other: '',
  
  planning_evaluation: '', plan_alignment_score: null, plan_content_score: null, plan_objectives_score: null, plan_references_score: null, planning_observations: '',
  methodology_evaluation: '', meth_adequate_score: null, meth_strategies_score: null, meth_resources_score: null, meth_clarity_score: null, methodology_observations: '',
  learning_evaluation: '', learn_instruments_score: null, learn_formative_score: null, learn_feedback_score: null, learn_criteria_score: null, learning_observations: '',
  management_evaluation: '', man_space_score: null, man_respect_score: null, man_conflict_score: null, man_environment_score: null, man_material_score: null, man_content_score: null, man_activities_score: null, man_monitoring_score: null, management_observations: '',
  identity_evaluation: '', ident_values_score: null, ident_posture_score: null, ident_language_score: null, identity_observations: '',
  
  strong_points: '', improvement_opportunities: '', observation_synthesis: '', pedagogical_guidelines: '', forwarding: '', teacher_aware: false,
  
  revisit_date_1: '',
  revisit_date_2: '',
  scores_v2: {},
  scores_v3: {},
  evaluations_v2: {},
  evaluations_v3: {},
  comments_v2: {},
  comments_v3: {}
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const sanitizeApiKey = (rawKey) => {
  if (!rawKey) return '';
  let key = rawKey.trim();

  try {
    if (key.includes('key=')) {
      const urlParams = new URLSearchParams(key.substring(key.indexOf('?')));
      const extractedKey = urlParams.get('key');
      if (extractedKey) {
        key = extractedKey;
      }
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }

  if (key.includes('&')) {
    key = key.split('&')[0];
  }
  if (key.includes('?')) {
    key = key.split('?')[0];
  }

  key = key.replace(/["']/g, '').trim();

  const match = key.match(/^[A-Za-z0-9_-]+/);
  if (match) {
    return match[0];
  }

  return key;
};

const DETAIL_LEVELS = [
  { id: 1, label: 'Direto', labelShort: '—', title: 'Direto: resposta curta e direta ao ponto (2-3 frases)' },
  { id: 2, label: 'Detalhado', labelShort: '≡', title: 'Detalhado: resposta equilibrada com parágrafo completo (padrão)' },
  { id: 3, label: 'Profundo', labelShort: '≡+', title: 'Profundo: análise abrangente e detalhada, pode ser mais longa' },
];

const getVerbosityInstruction = (level) => {
  if (level === 1) return '\n\nINSTRUÇÃO DE EXTENSÃO: Seja EXTREMAMENTE conciso e direto. O texto final deve ter NO MÁXIMO 2 a 3 frases curtas. Vá direto ao ponto, sem introduções, contextualizações ou frases de transição desnecessárias.';
  if (level === 3) return '\n\nINSTRUÇÃO DE EXTENSÃO: Seja ABRANGENTE e aprofundado. Explore todos os aspectos relevantes com riqueza de detalhes pedagógicos. Pode usar múltiplos parágrafos ou um parágrafo longo se necessário para cobrir bem o tema.';
  return ''; // Nível 2 (Detalhado) é o padrão dos prompts existentes
};

const AI_MODELS = [
  // Groq models
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — Melhor qualidade', provider: 'groq' },
  { value: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B — Mais rápido',      provider: 'groq' },
  { value: 'gemma2-9b-it',            label: 'Gemma 2 9B — Google via Groq',    provider: 'groq' },
  // Gemini models
  { value: 'gemini-2.0-flash',        label: 'Gemini 2.0 Flash — Padrão',       provider: 'gemini' },
  { value: 'gemini-1.5-flash',        label: 'Gemini 1.5 Flash — Estável',      provider: 'gemini' },
];

const AiTextarea = ({ value, onChange, placeholder = "", rows = "3", fieldName, activeThemeColor = "var(--primary)", onSaveKey, aiContext }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalValue, setOriginalValue] = useState(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showKeyPlain, setShowKeyPlain] = useState(false);
  const [detailLevel, setDetailLevel] = useState(2);
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('sosa_ai_model') || 'llama-3.3-70b-versatile');

  // Hydrate AI configurations from Supabase User Metadata (recurrence per user)
  useEffect(() => {
    async function loadUserAiConfig() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata) {
          const cloudKey = session.user.user_metadata.custom_ai_key;
          const cloudModel = session.user.user_metadata.custom_ai_model;
          
          if (cloudKey) {
            localStorage.setItem('sosa_gemini_api_key', cloudKey);
          }
          if (cloudModel) {
            localStorage.setItem('sosa_ai_model', cloudModel);
            setAiModel(cloudModel);
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar chaves de IA com a nuvem do Supabase:', err);
      }
    }
    loadUserAiConfig();
  }, []);

  const handleEnhance = async () => {
    let rawKey = localStorage.getItem('sosa_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    const rawKeys = rawKey.split(/[,;]/).map(k => k.trim()).filter(Boolean);
    const sanitizedKeys = rawKeys.map(k => sanitizeApiKey(k)).filter(Boolean);

    if (sanitizedKeys.length === 0) {
      const currentKey = localStorage.getItem('sosa_gemini_api_key') || '';
      setInputKey(currentKey);
      setShowKeyInput(true);
      return;
    }

    setIsEnhancing(true);
    setErrorMsg('');

    try {
      let promptText = "";
      if (value && value.trim()) {
        const teacher = aiContext?.teacherName || "o(a) professor(a)";
        const series = aiContext?.seriesName || "a série";
        const subjects = aiContext?.subjectNames || "a disciplina";
        const section = aiContext?.sectionTitle || "Observação";
        
        let contextSectionText = "";
        if (!["Pontos Fortes da Aula", "Oportunidades de Aprimoramento", "Síntese da Observação", "Orientações Pedagógicas", "Combinados e Encaminhamentos"].includes(section)) {
          const indicators = aiContext?.indicators || [];
          const indicatorsText = indicators.map(ind => `- ${ind.label}: ${ind.score ? `Nota ${ind.score}/4` : 'Não avaliado'}`).join('\n');
          contextSectionText = `Esta observação refere-se especificamente ao eixo "${section}" da aula do(a) professor(a) "${teacher}" da série "${series}" na(s) disciplina(s) "${subjects}".
Abaixo estão as pontuações registradas para este eixo (escala de 1 a 4):
${indicatorsText}`;
        } else {
          const allScores = aiContext?.allScores || [];
          const allScoresText = allScores.map(s => `- ${s.label}: Nota ${s.score}/4`).join('\n');
          contextSectionText = `Esta observação refere-se ao campo "${section}" da Devolutiva da aula do(a) professor(a) "${teacher}" da série "${series}" na(s) disciplina(s) "${subjects}".
Abaixo estão as notas gerais registradas em toda a visita de sala (escala de 1 a 4):
${allScoresText}`;
        }

        promptText = `Você é um assistente pedagógico especializado na Rede Adventista de Ensino. Sua tarefa é aprimorar o rascunho de observação pedagógica escrito pelo coordenador pedagógico, tornando-o altamente profissional, de escrita fluida, formal, clara e pedagogicamente fundamentada.

IMPORTANTE: Você deve refinar o rascunho garantindo total alinhamento e consistência com o contexto da aula e com as notas avaliadas listadas abaixo:
- Preserve a essência e os fatos descritos pelo coordenador no rascunho.
- Enriqueça o texto incorporando as avaliações reais das notas: se houver indicadores avaliados com notas baixas (1 ou 2), certifique-se de que o texto final apresente propostas e caminhos práticos e claros para superar essas fragilidades, sem qualquer timidez ou rodeios. Se houver notas altas (3 ou 4), reforce a validação positiva dessas boas práticas.
- O resultado deve parecer um único parágrafo fluido, coeso e extremamente profissional de 3 a 6 linhas.

REGRAS CRÍTICAS DE ESTILO E FORMATAÇÃO:
- NUNCA escreva ou mencione explicitamente notas ou pontuações numéricas no texto final (ex: NÃO use termos como "nota 3", "nota 2/4", "pontuação 4", etc.). Refira-se ao desempenho de forma puramente qualitativa e pedagógica (ex: "excelente", "adequado", "em desenvolvimento", "requer acompanhamento") de forma sutil e natural, sem citar números.
- NUNCA use saudações, vocativos ou cabeçalhos de carta (ex: NÃO comece com "Prezado(a) professor(a)", "Prezada professora ${teacher}", "Olá"). O texto deve ser redigido como um registro formal de acompanhamento do coordenador.
- EVITE iniciar o texto diretamente com o nome do(a) professor(a). Comece descrevendo as ações didáticas, a aula ou o cenário pedagógico de forma técnica e formal (ex: "A aula observada demonstrou...", "Durante a regência de classe...").
- Refira-se ao professor de maneira elegante e seletiva (ex: "o(a) docente", "o(a) professor(a)"), citando o nome próprio dele(a) de forma sutil e natural no meio das frases apenas se for estritamente necessário.

Contexto pedagógico da aula e pontuações:
${contextSectionText}

Rascunho original escrito pelo coordenador:
"${value}"

Retorne APENAS o texto aprimorado final, sem introduções, aspas extras, explicações ou comentários adicionais.${getVerbosityInstruction(detailLevel)}`;
      } else {
        const teacher = aiContext?.teacherName || "o(a) professor(a)";
        const series = aiContext?.seriesName || "a série";
        const subjects = aiContext?.subjectNames || "a disciplina";
        const section = aiContext?.sectionTitle || "Observação";
        
        if (section === "Pontos Fortes da Aula") {
          const highScores = (aiContext?.allScores || []).filter(s => s.score >= 3);
          const highScoresText = highScores.length > 0 
            ? highScores.map(s => `- ${s.label}: Nota ${s.score}/4`).join('\n')
            : "Práticas positivas de engajamento dos alunos e gestão de sala.";
            
          promptText = `Você é um assistente pedagógico especializado na Rede Adventista de Ensino. Sua tarefa é sugerir uma redação formal e profissional de Pontos Fortes da Aula observados para a aula da série "${series}" na(s) disciplina(s) "${subjects}".

Aqui estão indicadores da aula que foram bem avaliados (notas 3 e 4) durante a observação:
${highScoresText}

Redija um texto descritivo e muito positivo (1 parágrafo com 3 a 5 linhas), extremamente profissional e pedagógico, destacando essas boas práticas observadas em sala.

REGRAS CRÍTICAS DE ESTILO E FORMATAÇÃO:
- NUNCA mencione notas numéricas ou pontuações no texto final (ex: NÃO use "nota 4", "escala 3"). Fale sobre as práticas excelentes ou adequadas de forma puramente qualitativa e descritiva.
- NUNCA comece com saudações ou vocativos (ex: NÃO use "Prezado(a) professor(a)", "Olá", "Prezada professora").
- NÃO inicie o parágrafo com o nome do(a) professor(a) "${teacher}". Comece diretamente descrevendo as boas práticas didáticas ou a dinâmica da aula de forma técnica.
- Refira-se ao professor de maneira elegante e seletiva (ex: "o(a) docente", "o(a) professor(a)"), usando o nome próprio dele(a) de forma discreta no meio del texto apenas se agregar valor.
- Retorne APENAS o texto sugerido final, sem introduções, aspas extras ou comentários.${getVerbosityInstruction(detailLevel)}`;
        } else if (section === "Oportunidades de Aprimoramento") {
          const lowScores = (aiContext?.allScores || []).filter(s => s.score <= 2);
          const lowScoresText = lowScores.length > 0
            ? lowScores.map(s => `- ${s.label}: Nota ${s.score}/4`).join('\n')
            : "Pontos gerais de desenvolvimento e aperfeiçoamento contínuo.";

          promptText = `Você é um assistente pedagógico especializado na Rede Adventista de Ensino. Sua tarefa é sugerir orientações formativas diretas, claras e construtivas para o campo Oportunidades de Aprimoramento da aula da série "${series}" na(s) disciplina(s) "${subjects}".

Aqui estão os indicadores da aula que foram identificados com oportunidade de desenvolvimento (notas 1 e 2):
${lowScoresText}

Redija um texto formal (1 parágrafo com 3 a 5 linhas). 

REGRAS CRÍTICAS DE REDAÇÃO PEDAGÓGICA:
- NUNCA mencione notas numéricas ou pontuações no texto final (ex: NÃO use "nota 1", "escala 2"). Aborde os pontos a desenvolver usando descrições pedagógicas qualitativas (ex: "em desenvolvimento", "demandam maior acompanhamento") de forma sutil e construtiva.
- Seja extremamente propositivo, oferecendo recomendações formativas claras e caminhos práticos de superação para as fragilidades identificadas.
- NÃO hesite ou seja vago ao sugerir as melhorias específicas; descreva-as de forma direta, clara, profissional e respeitosa.
- NUNCA comece com saudações ou vocativos (ex: NÃO use "Prezado(a) professor(a)", "Olá").
- NÃO inicie o parágrafo com o nome do(a) professor(a) "${teacher}". Comece diretamente com as propostas de aperfeiçoamento didático.
- Refira-se ao professor de forma técnica e indireta (ex: "o(a) docente", "o(a) professor(a)"), de forma muito discreta.
- Retorne APENAS o texto sugerido final, sem introduções, aspas extras ou comentários.${getVerbosityInstruction(detailLevel)}`;
        } else if (["Síntese da Observação", "Orientações Pedagógicas", "Combinados e Encaminhamentos"].includes(section)) {
          const allScoresText = (aiContext?.allScores || []).length > 0
            ? (aiContext?.allScores || []).map(s => `- ${s.label}: Nota ${s.score}/4`).join('\n')
            : "Indicadores gerais de regência e gestão de sala.";

          promptText = `Você é um assistente pedagógico especializado na Rede Adventista de Ensino. Sua tarefa é sugerir um texto inicial para o campo "${section}" da Devolutiva Pedagógica da aula da série "${series}" na(s) disciplina(s) "${subjects}".

Abaixo está o resumo dos indicadores e notas avaliadas durante a visita de sala de aula:
${allScoresText}

Com base nisso, redija uma redação de 1 parágrafo formal, coerente e tecnicamente primorosa apropriada para o campo "${section}":
- Se for Síntese da Observação: faça um resumo equilibrado da aula observada.
- Se for Orientações Pedagógicas: ofereça orientações de aperfeiçoamento didático coerentes com a aula.
- Se for Combinados e Encaminhamentos: proponha ações práticas conjuntas para as próximas semanas.

REGRAS CRÍTICAS DE ESTILO E FORMATAÇÃO:
- NUNCA mencione notas numéricas ou pontuações no texto final (ex: NÃO use "nota 3", "escala 2"). Refira-se ao desempenho ou às ações de forma qualitativa e técnica.
- NUNCA use saudações, vocativos ou formato de carta (ex: NÃO comece com "Prezado(a) professor(a)", "Prezada professora ${teacher}", "Olá"). O texto deve ser redigido como um registro formal de acompanhamento do coordenador.
- EVITE iniciar o texto com o nome do(a) professor(a) "${teacher}". Dê preferência por iniciar abordando a regência, as orientações didáticas ou os encaminhamentos pedagógicos estabelecidos.
- Refira-se ao professor de forma técnica e natural (ex: "o(a) docente", "o(a) professor(a)"), usando o nome próprio apenas de forma pontual e integrada ao fluxo do texto.
- Retorne APENAS o texto sugerido final, sem introduções, aspas extras ou comentários.${getVerbosityInstruction(detailLevel)}`;
        } else {
          // Standard Rubric Section (Planning, Methodology, Learning, Management, Confessional Identity)
          const localIndicatorsText = (aiContext?.indicators || []).length > 0
            ? (aiContext?.indicators || []).map(ind => `- ${ind.label}: ${ind.score ? `Nota ${ind.score}/4` : 'Não avaliado'}`).join('\n')
            : "Práticas gerais deste eixo pedagógico.";

          promptText = `Você é um assistente pedagógico especializado na Rede Adventista de Ensino. Sua tarefa é sugerir um texto inicial de observação pedagógica técnica, formal, direto e construtivo para a seção "${section}" referente à visita da aula da série "${series}" na(s) disciplina(s) "${subjects}".

Abaixo estão os indicadores específicos desta seção e suas respectivas avaliações (escala de 1 a 4, onde 1 é Necessita de Acompanhamento, 2 é Em Desenvolvimento, 3 é Adequado e 4 é Excelente):
${localIndicatorsText}

Escreva uma observação técnica de 1 parágrafo (3 a 5 linhas). 

REGRAS CRÍTICAS DE REDAÇÃO PEDAGÓGICA:
- NUNCA escreva nem mencione explicitamente as notas ou pontuações numéricas no texto final (ex: NÃO use termos como "nota 1", "nota 2/4", "pontuação 3", etc.). Faça referências qualitativas sutis ao nível pedagógico (ex: "excelente", "adequado", "em desenvolvimento", "precisa de acompanhamento/apoio") ou apenas descreva as fragilidades e potencialidades de forma natural sem revelar números.
- Seja extremamente claro, direto e assertivo ao apontar pontos de atenção. 
- Se algum indicador obteve nota 1 ou 2, NÃO seja tímido ou superficial: descreva a fragilidade de forma respeitosa, mas declare explicitamente o que precisa de melhoria e proponha IMEDIATAMENTE uma ação ou recomendação didática prática e clara para que o(a) docente se desenvolva (por exemplo, aponte a falta de evidências observadas em instrumentos de avaliação e recomende a introdução de critérios claros ou avaliações formativas pontuais, sem mencionar termos numéricos).
- Se houver indicadores com notas 3 ou 4, valide o bom desempenho correspondente de forma elogiosa, destacando o impacto positivo na aula.
- O texto final deve mesclar de forma muito fluida e profissional tanto as validações (notas 3 e 4) quanto as propostas concretas de melhoria para os itens com desenvolvimento pendente.
- NUNCA use saudações ou vocativos (ex: NÃO use "Prezado(a) professor(a)", "Olá").
- NÃO comece o parágrafo diretamente com o nome do(a) professor(a) "${teacher}". Prefira introduzir a observação focando nos aspectos didáticos e pedagógicos da aula.
- Refira-se ao professor de forma formal e fluida (ex: "o(a) docente", "o(a) professor(a)"), usando o nome próprio apenas de forma esporádica e natural no meio das frases se necessário.
- Retorne APENAS o texto sugerido final, sem introduções, aspas extras ou comentários.${getVerbosityInstruction(detailLevel)}`;
        }
      }

      let success = false;
      let lastError = null;
      let enhancedText = '';

      for (let i = 0; i < sanitizedKeys.length; i++) {
        const apiKey = sanitizedKeys[i];
        try {
          console.log(`Tentando chamada da IA com a chave ${i + 1}/${sanitizedKeys.length}...`);
          
          let response;
          
          // Auto-detect provider: Groq keys start with 'gsk_', Gemini keys start with 'AIza'
          const isGroqKey = apiKey.startsWith('gsk_');

          if (isGroqKey) {
            // ── GROQ API ──────────────────────────────────────────────────
            const groqModel = AI_MODELS.find(m => m.value === aiModel && m.provider === 'groq')?.value || 'llama-3.3-70b-versatile';
            response = await fetch(
              'https://api.groq.com/openai/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: groqModel,
                  messages: [
                    { role: 'user', content: promptText }
                  ],
                  max_tokens: 1024,
                  temperature: 0.4
                })
              }
            );
          } else {
            // ── GEMINI API ──────────────────────────────────────────────
            const geminiModel = AI_MODELS.find(m => m.value === aiModel && m.provider === 'gemini')?.value || 'gemini-2.0-flash';
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: promptText
                        }
                      ]
                    }
                  ],
                  generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1024
                  }
                })
              }
            );
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `Erro HTTP ${response.status}`);
          }

          const resData = await response.json();
          
          // Handle both Groq (OpenAI-compatible) and Gemini response formats
          const isGroqResponse = apiKey.startsWith('gsk_');
          if (isGroqResponse) {
            enhancedText = resData?.choices?.[0]?.message?.content || '';
          } else {
            const parts = resData?.candidates?.[0]?.content?.parts || [];
            const nonThoughtParts = parts.filter(p => !p.thought);
            if (nonThoughtParts.length > 0) {
              enhancedText = nonThoughtParts.map(p => p.text).filter(Boolean).join('');
            } else if (parts.length > 0) {
              enhancedText = parts[0]?.text || '';
            }
          }

          if (!enhancedText) {
            throw new Error('Não foi possível obter uma resposta válida do Gemini.');
          }

          enhancedText = enhancedText.trim().replace(/^"|"$/g, '').trim();
          
          success = true;
          break; // Sai do loop se der certo!

        } catch (err) {
          console.error(`Erro com a chave ${i + 1}/${sanitizedKeys.length}:`, err);
          lastError = err;
          // Continua o loop para a próxima chave de API
        }
      }

      if (!success) {
        throw lastError || new Error('Nenhuma chave de API válida funcionou.');
      }

      setOriginalValue(value);
      onChange({ target: { value: enhancedText } });
    } catch (err) {
      console.error('Erro no aprimoramento por IA:', err);
      let friendlyMsg = err.message || 'Erro ao conectar à IA.';
      const lowerMsg = friendlyMsg.toLowerCase();
      if (lowerMsg.includes('quota') || lowerMsg.includes('limit') || lowerMsg.includes('rate') || lowerMsg.includes('429')) {
        friendlyMsg = 'Limite de cliques rápidos por minuto excedido em todas as suas chaves gratuitas do Gemini. Por favor, aguarde alguns segundos e clique no botão IA novamente!';
      }
      setErrorMsg(friendlyMsg);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUndo = () => {
    if (originalValue !== null) {
      onChange({ target: { value: originalValue } });
      setOriginalValue(null);
    }
  };

  const handleSaveKey = async () => {
    if (inputKey.trim()) {
      const parts = inputKey.split(/[,;]/).map(k => k.trim()).filter(Boolean);
      const sanitizedParts = parts.map(p => sanitizeApiKey(p)).filter(Boolean);
      const sanitized = sanitizedParts.join(', ');

      // 1. Save to Local Cache
      localStorage.setItem('sosa_gemini_api_key', sanitized);
      localStorage.setItem('sosa_ai_model', aiModel);

      // 2. Synchronize to Supabase User Metadata (User Persistence)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.updateUser({
            data: { 
              custom_ai_key: sanitized,
              custom_ai_model: aiModel
            }
          });
          console.log('Chaves e configurações de IA sincronizadas no Supabase.');
        }
      } catch (err) {
        console.warn('Erro ao sincronizar com nuvem (salvo apenas localmente):', err);
      }

      if (onSaveKey) {
        onSaveKey(sanitized);
      }
      setShowKeyInput(false);
      setInputKey('');
      // Delay slightly and enhance
      setTimeout(() => {
        handleEnhance();
      }, 50);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        className="form-input"
        rows={rows}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        style={{
          width: '100%',
          paddingRight: originalValue ? '160px' : '84px',
          resize: 'vertical',
          paddingBottom: '28px'
        }}
      />

      {/* AI Detail Level Toggle — discrete, right-aligned below the textarea */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          zIndex: 10,
          opacity: 0.55,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.55'}
      >
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginRight: '3px', userSelect: 'none', whiteSpace: 'nowrap' }}>IA:</span>
        {DETAIL_LEVELS.map(level => (
          <button
            key={level.id}
            type="button"
            title={level.title}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setDetailLevel(level.id)}
            style={{
              padding: '1px 6px',
              fontSize: '9px',
              fontWeight: detailLevel === level.id ? '700' : '400',
              border: detailLevel === level.id ? '1px solid #a855f7' : '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: detailLevel === level.id ? '#faf5ff' : 'transparent',
              color: detailLevel === level.id ? '#7c3aed' : 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: '1.6',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="detail-level-label-full">{level.label}</span>
            <span className="detail-level-label-short" style={{ display: 'none' }}>{level.id === 1 ? '—' : level.id === 2 ? '≡' : '⊞'}</span>
          </button>
        ))}
      </div>
      
      {/* Action Container */}
      <div 
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          zIndex: 10,
          alignItems: 'center'
        }}
      >
        {/* Undo Button */}
        {originalValue !== null && (
          <button
            type="button"
            onClick={handleUndo}
            title="Desfazer aprimoramento IA"
            style={{
              padding: '4px 8px',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Undo size={12} />
            <span style={{ fontSize: '10px', marginLeft: '3px', fontWeight: 'bold' }}>Desfazer</span>
          </button>
        )}

        {/* Enhance/Suggest Button */}
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isEnhancing}
          title={value && value.trim() 
            ? (isEnhancing ? 'Aprimorando...' : 'Aprimorar texto com IA') 
            : (isEnhancing ? 'Sugerindo...' : 'Sugerir observação com IA baseada na aula')
          }
          style={{
            padding: '4px 8px',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', 
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(139, 92, 246, 0.2)',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Sparkles 
            size={12} 
            className={isEnhancing ? 'animate-spin' : ''} 
            style={{ 
              color: 'white',
              animationDuration: '2s'
            }} 
          />
          <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: 'bold' }}>
            {isEnhancing 
              ? (value && value.trim() ? 'Aprimorando...' : 'Sugerindo...') 
              : 'IA'
            }
          </span>
        </button>

        {/* Edit Key Gear Button — Always visible so the user can switch models or update custom keys */}
        <button
          type="button"
          onClick={() => {
            const currentKey = localStorage.getItem('sosa_gemini_api_key') || '';
            setInputKey(currentKey);
            setShowKeyInput(!showKeyInput);
            setErrorMsg('');
          }}
          title="Configurar Chave da IA"
          style={{
            padding: '4px 6px',
            backgroundColor: '#f1f5f9',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Settings size={12} />
        </button>
      </div>

      {/* Popover setup Chave Gemini */}
      {showKeyInput && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '42px',
            right: '8px',
            backgroundColor: 'white',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 100,
            width: '290px',
            textAlign: 'left'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Configurar Chave de IA
          </h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
            Cole uma chave do <strong>Groq</strong> (começa com <code>gsk_</code>) ou do <strong>Gemini</strong> (começa com <code>AIza</code>).
          </p>

          {/* Collapsible Key Instructions */}
          <details style={{ marginBottom: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px', backgroundColor: '#f8fafc' }}>
            <summary style={{ fontSize: '10px', fontWeight: '600', color: '#4f46e5', cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
              🔑 Como obter sua chave grátis?
            </summary>
            <div style={{ marginTop: '4px', fontSize: '9px', lineHeight: '1.3', color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#7c3aed' }}>🟣 Opção 1: Groq (100% Grátis)</strong>
                <ol style={{ margin: '2px 0 0 12px', padding: 0 }}>
                  <li>Acesse <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>console.groq.com</a></li>
                  <li>Faça login ou crie sua conta (sem cartão)</li>
                  <li>Vá em <strong>API Keys</strong> → <strong>Create API Key</strong></li>
                  <li>Copie o código gerado (começa com <code>gsk_</code>)</li>
                </ol>
              </div>
              <div>
                <strong style={{ color: '#2563eb' }}>🔵 Opção 2: Gemini (Google)</strong>
                <ol style={{ margin: '2px 0 0 12px', padding: 0 }}>
                  <li>Acesse <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>aistudio.google.com</a></li>
                  <li>Faça login com seu Gmail comum</li>
                  <li>Clique em <strong>Get API Key</strong> → <strong>Create API Key</strong></li>
                  <li>Copie o código gerado (começa com <code>AIza</code>)</li>
                </ol>
              </div>
            </div>
          </details>

          {/* Model Selector */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Modelo de IA
            </label>
            <select
              value={aiModel}
              onChange={(e) => {
                setAiModel(e.target.value);
                localStorage.setItem('sosa_ai_model', e.target.value);
              }}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '5px 8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <optgroup label="🟣 Groq (grátis, sem cartão)">
                {AI_MODELS.filter(m => m.provider === 'groq').map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="🔵 Gemini (Google)">
                {AI_MODELS.filter(m => m.provider === 'gemini').map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showKeyPlain ? "text" : "password"}
                placeholder="Cole sua(s) API Key(s) separadas por vírgula..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                style={{
                  flex: 1,
                  fontSize: '11px',
                  padding: '6px 28px 6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  outline: 'none',
                  width: '100%'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeyPlain(!showKeyPlain)}
                style={{
                  position: 'absolute',
                  right: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showKeyPlain ? "Ocultar Chaves" : "Mostrar Chaves"}
              >
                {showKeyPlain ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button"
                onClick={handleSaveKey}
                style={{
                  flex: 1,
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle size={12} /> Salvar Chaves
              </button>
              <button 
                type="button"
                onClick={() => { setShowKeyInput(false); setInputKey(''); }}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Error Message */}
      {errorMsg && (
        <div 
          style={{
            position: 'absolute',
            bottom: '42px',
            right: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#ef4444',
            fontSize: '10px',
            zIndex: 90,
            maxWidth: '240px',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span>{errorMsg}</span>
              <button 
                type="button"
                onClick={() => setErrorMsg('')}
                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            {(errorMsg.toLowerCase().includes('key') || errorMsg.toLowerCase().includes('chave') || errorMsg.toLowerCase().includes('valid')) && (
              <button
                type="button"
                onClick={() => {
                  const currentKey = localStorage.getItem('sosa_gemini_api_key') || '';
                  setInputKey(currentKey);
                  setShowKeyInput(true);
                  setErrorMsg('');
                }}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Alterar Chave
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ObservationForm() {
  const { selectedSchoolId, selectedBimestre } = useSchool();
  const { isOnline, addToOfflineQueue } = useSync();
  const { id } = useParams();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // States for Tabs and Visits
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState(1);
  const [dbVisitCount, setDbVisitCount] = useState(1);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [lastId, setLastId] = useState(id);
  const [toast, setToast] = useState(null);
  const [draftRecovered, setDraftRecovered] = useState(false);

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const subjectDropdownRef = useRef(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('sosa_gemini_api_key') || '');

  useEffect(() => {
    function handleClickOutside(event) {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setIsSubjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to top on mount or id change
  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [id]);

  // Navigation Guard & Form Reset
  useEffect(() => {
    if (!id) {
      const cachedDraft = localStorage.getItem('sosa_draft_new');
      if (cachedDraft) {
        try {
          const parsed = JSON.parse(cachedDraft);
          // Remove internal-only fields that must never reach the database
          delete parsed.is_new_offline;
          // Normalize subject_ids: handle old drafts that only had a single subject_id field
          setFormData({
            ...parsed,
            subject_ids: parsed.subject_ids?.length > 0
              ? parsed.subject_ids
              : (parsed.subject_id ? [parsed.subject_id] : [])
          });
          setIsDirty(true);
          setDraftRecovered(true);
          setToast({ message: 'Rascunho recuperado automaticamente!', type: 'info' });
        } catch (e) {
          console.error('Failed to parse draft_new:', e);
        }
      } else {
        setFormData(initialFormState);
        setIsDirty(false);
        setDraftRecovered(false);
        setDbVisitCount(1);
        setActiveTab(1);
        setLastId(null);
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, visit_date: localDate }));
      }
    } else {
      setLastId(id);
    }
  }, [id]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isDirty && formData) {
      const key = id ? `sosa_draft_${id}` : 'sosa_draft_new';
      localStorage.setItem(key, JSON.stringify(formData));
      window.dispatchEvent(new Event('sosa_draft_change'));
    }
  }, [formData, isDirty, id]);

  const handleDiscardDraft = async () => {
    const key = id ? `sosa_draft_${id}` : 'sosa_draft_new';
    localStorage.removeItem(key);
    window.dispatchEvent(new Event('sosa_draft_change'));
    setDraftRecovered(false);
    setIsDirty(false);
    
    if (!id) {
      setFormData(initialFormState);
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, visit_date: localDate }));
      setToast({ message: 'Rascunho descartado.' });
    } else {
      setFetching(true);
      const queue = await getQueue();
      const item = queue.find(q => q.id === id || (q.payload && q.payload.id === id));
      
      let originalData = null;
      if (item) {
        originalData = item.payload;
      } else {
        const cachedItem = await findCachedObservation(id);
        if (cachedItem) {
          originalData = cachedItem;
        } else {
          try {
            const { data } = await supabase.from('observations').select('*').eq('id', id).single();
            if (data) originalData = data;
          } catch (e) {
            console.error(e);
          }
        }
      }
      
      if (originalData) {
        setFormData({
          ...originalData,
          visit_date: originalData.visit_date ? String(originalData.visit_date).substring(0, 10) : '',
          revisit_date_1: originalData.revisit_date_1 ? String(originalData.revisit_date_1).substring(0, 10) : '',
          revisit_date_2: originalData.revisit_date_2 ? String(originalData.revisit_date_2).substring(0, 10) : '',
          visit_objectives: originalData.visit_objectives || [],
          subject_ids: originalData.subject_ids || (originalData.subject_id ? [originalData.subject_id] : []),
          scores_v2: originalData.scores_v2 || {},
          scores_v3: originalData.scores_v3 || {},
          evaluations_v2: originalData.evaluations_v2 || {},
          evaluations_v3: originalData.evaluations_v3 || {},
          comments_v2: originalData.comments_v2 || {},
          comments_v3: originalData.comments_v3 || {}
        });
        if (originalData.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
        else if (originalData.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
        else { setDbVisitCount(1); setActiveTab(1); }
      }
      setFetching(false);
      setToast({ message: 'Rascunho descartado. Dados originais carregados.' });
    }
  };

  const confirmExit = () => {
    setIsDirty(false);
    setShowExitModal(false);
    navigate('/');
  };

  const cancelExit = () => setShowExitModal(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load Metadata
  useEffect(() => {
    if (!selectedSchoolId) return;
    async function loadData() {
      let tList = [];
      let sList = [];
      let subList = [];
      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        const [tRes, sRes, subRes] = await withTimeout(Promise.all([
          supabase.from('teachers').select('*, teacher_series(series_id), teacher_subjects(subject_id)').eq('school_id', selectedSchoolId).order('name'),
          supabase.from('series').select('id, name, segment_id, segments!inner(name)').eq('school_id', selectedSchoolId).order('name'),
          supabase.from('subjects').select('id, name, segment_subjects(segment_id)').eq('school_id', selectedSchoolId).order('name')
        ]), 2000);

        if (tRes.error || sRes.error || subRes.error) {
          throw new Error('Supabase metadata fetch error');
        }

        tList = tRes.data || [];
        sList = sRes.data || [];
        subList = subRes.data || [];

        // Cache the metadata for this school ID
        await cacheMetadata(`teachers_${selectedSchoolId}`, tList);
        await cacheMetadata(`series_${selectedSchoolId}`, sList);
        await cacheMetadata(`subjects_${selectedSchoolId}`, subList);
      } catch (fetchError) {
        console.warn('Failed to fetch observation form metadata from Supabase, loading from cache:', fetchError);
        const cachedT = await getCachedMetadata(`teachers_${selectedSchoolId}`);
        const cachedS = await getCachedMetadata(`series_${selectedSchoolId}`);
        const cachedSub = await getCachedMetadata(`subjects_${selectedSchoolId}`);

        if (cachedT) tList = cachedT;
        if (cachedS) sList = cachedS;
        if (cachedSub) subList = cachedSub;
      }
      setTeachers(tList);
      setSeriesList(sList);
      setSubjects(subList);
    }
    loadData();
  }, [selectedSchoolId]);

  // Fetch Observation
  useEffect(() => {
    if (!id) return;
    async function fetchObservation() {
      setFetching(true);
      
      const key = `sosa_draft_${id}`;
      const cachedDraft = localStorage.getItem(key);
      if (cachedDraft) {
        try {
          const parsed = JSON.parse(cachedDraft);
          // Remove internal-only fields that must never reach the database
          delete parsed.is_new_offline;
          setFormData(parsed);
          setIsDirty(true);
          setDraftRecovered(true);
          setToast({ message: 'Rascunho recuperado automaticamente!', type: 'info' });
          if (parsed.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
          else if (parsed.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
          else { setDbVisitCount(1); setActiveTab(1); }
          setFetching(false);
          return;
        } catch (e) {
          console.error('Failed to parse draft_id:', e);
        }
      }
      
      // Always look in the local offline queue first (handles both UUIDs and offline_ prefixed IDs)
      const queue = await getQueue();
      const item = queue.find(q => q.id === id || (q.payload && q.payload.id === id));
      
      if (item) {
        const data = item.payload;
        setFormData({
          ...data,
          visit_date: data.visit_date ? String(data.visit_date).substring(0, 10) : '',
          revisit_date_1: data.revisit_date_1 ? String(data.revisit_date_1).substring(0, 10) : '',
          revisit_date_2: data.revisit_date_2 ? String(data.revisit_date_2).substring(0, 10) : '',
          visit_objectives: data.visit_objectives || [],
          subject_ids: data.subject_ids || (data.subject_id ? [data.subject_id] : []),
          scores_v2: data.scores_v2 || {},
          scores_v3: data.scores_v3 || {},
          evaluations_v2: data.evaluations_v2 || {},
          evaluations_v3: data.evaluations_v3 || {},
          comments_v2: data.comments_v2 || {},
          comments_v3: data.comments_v3 || {}
        });
        if (data.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
        else if (data.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
        else { setDbVisitCount(1); setActiveTab(1); }
      } else {
        // If not found locally in the offline queue, check if it's cached in IndexedDB metadata observations
        const cachedItem = await findCachedObservation(id);
        if (cachedItem) {
          setFormData({
            ...cachedItem,
            visit_date: cachedItem.visit_date ? String(cachedItem.visit_date).substring(0, 10) : '',
            revisit_date_1: cachedItem.revisit_date_1 ? String(cachedItem.revisit_date_1).substring(0, 10) : '',
            revisit_date_2: cachedItem.revisit_date_2 ? String(cachedItem.revisit_date_2).substring(0, 10) : '',
            visit_objectives: cachedItem.visit_objectives || [],
            subject_ids: cachedItem.subject_ids || (cachedItem.subject_id ? [cachedItem.subject_id] : []),
            scores_v2: cachedItem.scores_v2 || {},
            scores_v3: cachedItem.scores_v3 || {},
            evaluations_v2: cachedItem.evaluations_v2 || {},
            evaluations_v3: cachedItem.evaluations_v3 || {},
            comments_v2: cachedItem.comments_v2 || {},
            comments_v3: cachedItem.comments_v3 || {}
          });
          if (cachedItem.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
          else if (cachedItem.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
          else { setDbVisitCount(1); setActiveTab(1); }
        } else {
          // If not found in cache and we are online, query Supabase
          try {
            const { data, error } = await supabase.from('observations').select('*').eq('id', id).single();
            if (data && !error) {
              setFormData({
                ...data,
                visit_date: data.visit_date ? String(data.visit_date).substring(0, 10) : '',
                revisit_date_1: data.revisit_date_1 ? String(data.revisit_date_1).substring(0, 10) : '',
                revisit_date_2: data.revisit_date_2 ? String(data.revisit_date_2).substring(0, 10) : '',
                visit_objectives: data.visit_objectives || [],
                subject_ids: data.subject_ids || (data.subject_id ? [data.subject_id] : []),
                scores_v2: data.scores_v2 || {},
                scores_v3: data.scores_v3 || {},
                evaluations_v2: data.evaluations_v2 || {},
                evaluations_v3: data.evaluations_v3 || {},
                comments_v2: data.comments_v2 || {},
                comments_v3: data.comments_v3 || {}
              });
              if (data.revisit_date_2) { setDbVisitCount(3); setActiveTab(3); }
              else if (data.revisit_date_1) { setDbVisitCount(2); setActiveTab(2); }
              else { setDbVisitCount(1); setActiveTab(1); }
            }
          } catch (err) {
            console.error('Failed to fetch from Supabase:', err);
          }
        }
      }
      setFetching(false);
    }
    fetchObservation();
  }, [id]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sidebarWidth = '260px';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persistent Settings (User Metadata)
  const [thresholds, setThresholds] = useState({ full: 80, partial: 60 });
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    async function loadUserSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          if (user.user_metadata.sosa_thresholds) {
            setThresholds(user.user_metadata.sosa_thresholds);
          }
          if (user.user_metadata.sosa_gemini_api_key) {
            setGeminiApiKey(user.user_metadata.sosa_gemini_api_key);
            localStorage.setItem('sosa_gemini_api_key', user.user_metadata.sosa_gemini_api_key);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do Supabase:', err);
      }
    }
    loadUserSettings();
  }, []);

  const updateThresholds = async (newThresholds) => {
    setThresholds(newThresholds);
    await supabase.auth.updateUser({
      data: { sosa_thresholds: newThresholds }
    });
  };

  const updateGeminiApiKey = async (keyVal) => {
    const trimmed = keyVal.trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('sosa_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('sosa_gemini_api_key');
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: { sosa_gemini_api_key: trimmed || null }
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar chave da API no Supabase:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStartRevisit = (num) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (num === 2) {
        newData.revisit_date_1 = new Date().toISOString().split('T')[0];
        
        // Map original fields to v2 objects
        newData.scores_v2 = {
          plan_alignment_score: prev.plan_alignment_score,
          plan_content_score: prev.plan_content_score,
          plan_objectives_score: prev.plan_objectives_score,
          plan_references_score: prev.plan_references_score,
          meth_adequate_score: prev.meth_adequate_score,
          meth_strategies_score: prev.meth_strategies_score,
          meth_resources_score: prev.meth_resources_score,
          meth_clarity_score: prev.meth_clarity_score,
          learn_instruments_score: prev.learn_instruments_score,
          learn_formative_score: prev.learn_formative_score,
          learn_feedback_score: prev.learn_feedback_score,
          learn_criteria_score: prev.learn_criteria_score,
          man_space_score: prev.man_space_score,
          man_respect_score: prev.man_respect_score,
          man_conflict_score: prev.man_conflict_score,
          man_environment_score: prev.man_environment_score,
          man_material_score: prev.man_material_score,
          man_content_score: prev.man_content_score,
          man_activities_score: prev.man_activities_score,
          man_monitoring_score: prev.man_monitoring_score,
          ident_values_score: prev.ident_values_score,
          ident_posture_score: prev.ident_posture_score,
          ident_language_score: prev.ident_language_score
        };

        newData.evaluations_v2 = {
          planning_evaluation: prev.planning_evaluation,
          methodology_evaluation: prev.methodology_evaluation,
          learning_evaluation: prev.learning_evaluation,
          management_evaluation: prev.management_evaluation,
          identity_evaluation: prev.identity_evaluation,
          visit_type: prev.visit_type,
          visit_type_other: prev.visit_type_other,
          visit_objectives: [...(prev.visit_objectives || [])],
          visit_objectives_other: prev.visit_objectives_other
        };

        newData.comments_v2 = {
          planning_observations: prev.planning_observations,
          methodology_observations: prev.methodology_observations,
          learning_observations: prev.learning_observations,
          management_observations: prev.management_observations,
          identity_observations: prev.identity_observations
        };

      } else if (num === 3) {
        newData.revisit_date_2 = new Date().toISOString().split('T')[0];
        newData.scores_v3 = { ...prev.scores_v2 };
        newData.evaluations_v3 = { ...prev.evaluations_v2 };
        newData.comments_v3 = { ...prev.comments_v2 };
      }
      return newData;
    });
    setDbVisitCount(num);
    setActiveTab(num);
  };

  const handleObjectiveChange = (objective) => {
    setIsDirty(true);
    setFormData(prev => {
      const objectives = [...prev.visit_objectives];
      return { ...prev, visit_objectives: objectives.includes(objective) ? objectives.filter(o => o !== objective) : [...objectives, objective] };
    });
  };

  // Revisit Logic
  const startRevisit = (num) => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFormData(prev => {
      if (num === 2) {
        const comments = { strong_points: prev.strong_points, improvement_opportunities: prev.improvement_opportunities, observation_synthesis: prev.observation_synthesis, pedagogical_guidelines: prev.pedagogical_guidelines, forwarding: prev.forwarding };
        const evaluations = { planning_evaluation: prev.planning_evaluation, methodology_evaluation: prev.methodology_evaluation, learning_evaluation: prev.learning_evaluation, management_evaluation: prev.management_evaluation, identity_evaluation: prev.identity_evaluation };
        const scores = {};
        Object.keys(prev).forEach(key => { if(key.endsWith('_score')) scores[key] = prev[key]; });
        return { ...prev, revisit_date_1: localDate, comments_v2: comments, evaluations_v2: evaluations, scores_v2: scores };
      } else if (num === 3) {
        return { ...prev, revisit_date_2: localDate, comments_v3: { ...prev.comments_v2 }, evaluations_v3: { ...prev.evaluations_v2 }, scores_v3: { ...prev.scores_v2 } };
      }
      return prev;
    });
    setActiveTab(num);
  };



  const openDeleteModal = (visitNum) => {
    setVisitToDelete(visitNum);
    setShowDeleteModal(true);
  };

  const confirmDeleteRevisit = async () => {
    if (!visitToDelete) return;
    setLoading(true);
    try {
      let updateData = {};
      if (visitToDelete === 2) {
        updateData = { 
          revisit_date_1: null, revisit_date_2: null,
          scores_v2: {}, evaluations_v2: {}, comments_v2: {},
          scores_v3: {}, evaluations_v3: {}, comments_v3: {}
        };
      } else if (visitToDelete === 3) {
        updateData = { 
          revisit_date_2: null,
          scores_v3: {}, evaluations_v3: {}, comments_v3: {}
        };
      }
      const { error } = await supabase.from('observations').update(updateData).eq('id', id);
      if (error) throw error;
      setFormData(prev => ({ ...prev, ...updateData }));
      setDbVisitCount(visitToDelete - 1);
      setActiveTab(visitToDelete - 1);
      setToast({ message: 'Revisita excluída com sucesso!' });
    } catch (error) {
      console.error('Error deleting revisit:', error);
      setToast({ message: 'Erro ao excluir revisita.', type: 'error' });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setVisitToDelete(null);
    }
  };

  // Tab-Aware Helpers
  const getScore = (field) => {
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];
    const v3 = formData.scores_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return v2 !== undefined ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined) return v3;
      if (v2 !== undefined) return v2;
      return v1;
    }
    return null;
  };

  const getAllFormScores = () => {
    const scores = [];
    const scoreFields = [
      { field: 'plan_alignment_score', label: 'Alinhamento às habilidades BNCC' },
      { field: 'plan_content_score', label: 'Conteúdo conforme Sequência Didática' },
      { field: 'plan_objectives_score', label: 'Objetivos claros e coerentes' },
      { field: 'plan_references_score', label: 'Conexão com referenciais institucionais' },
      { field: 'meth_adequate_score', label: 'Metodologias adequadas à faixa etária' },
      { field: 'meth_strategies_score', label: 'Estratégias que favorecem o aprendizado' },
      { field: 'meth_resources_score', label: 'Uso intencional de recursos' },
      { field: 'meth_clarity_score', label: 'Clareza na condução da aula' },
      { field: 'learn_instruments_score', label: 'Instrumentos coerentes com objetivos' },
      { field: 'learn_formative_score', label: 'Avaliação formativa presente' },
      { field: 'learn_feedback_score', label: 'Devolutivas claras aos estudantes' },
      { field: 'learn_criteria_score', label: 'Critérios de avaliação compreensíveis' },
      { field: 'man_space_score', label: 'Organização do espaço e do tempo pedagógico' },
      { field: 'man_respect_score', label: 'Relação respeitosa entre professor e estudantes' },
      { field: 'man_conflict_score', label: 'Estratégias de mediação de conflitos' },
      { field: 'man_environment_score', label: 'Ambiente favorável à aprendizagem' },
      { field: 'man_material_score', label: 'Uso adequado do material didático' },
      { field: 'man_content_score', label: 'Registro do conteúdo no caderno dos alunos' },
      { field: 'man_activities_score', label: 'As atividades são bem orientadas' },
      { field: 'man_monitoring_score', label: 'O professor acompanha sua realização circulando pela sala' },
      { field: 'ident_values_score', label: 'Integração de valores naturais e éticos' },
      { field: 'ident_posture_score', label: 'Postura coerente com princípios EA' },
      { field: 'ident_language_score', label: 'Linguagem, atitudes e exemplos alinhados' }
    ];
    scoreFields.forEach(f => {
      const val = getScore(f.field);
      if (val !== null && val !== undefined && val !== '') {
        scores.push({ label: f.label, score: Number(val) });
      }
    });
    return scores;
  };

  const getAiContext = (sectionTitle, localScores = []) => {
    const teacherName = teachers.find(t => t.id === formData.teacher_id)?.name || '';
    const seriesName = seriesList.find(s => s.id === formData.series_id)?.name || '';
    const subjectNames = (formData.subject_ids || []).map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ');
    
    return {
      teacherName,
      seriesName,
      subjectNames,
      sectionTitle,
      indicators: localScores.map(f => ({ label: f.label, score: getScore(f.field) })),
      allScores: getAllFormScores()
    };
  };

  const getHistory = (field) => {
    const history = [];
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];
    const v3 = formData.scores_v3?.[field];

    if (v1 !== null && v1 !== undefined) history.push({ visit: 1, score: v1 });
    if (v2 !== null && v2 !== undefined) history.push({ visit: 2, score: v2 });
    if (v3 !== null && v3 !== undefined) history.push({ visit: 3, score: v3 });
    return history;
  };

  const setScore = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, scores_v2: { ...prev.scores_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, scores_v3: { ...prev.scores_v3, [field]: val } };
      return prev;
    });
  };

  const getEvaluation = (field) => {
    const v1 = formData[field];
    const v2 = formData.evaluations_v2?.[field];
    const v3 = formData.evaluations_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return (v2 !== undefined && v2 !== null) ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined && v3 !== null) return v3;
      if (v2 !== undefined && v2 !== null) return v2;
      return v1;
    }
    return '';
  };

  const setEvaluation = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, evaluations_v2: { ...prev.evaluations_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, evaluations_v3: { ...prev.evaluations_v3, [field]: val } };
      return prev;
    });
  };

  const getComment = (field) => {
    const v1 = formData[field];
    const v2 = formData.comments_v2?.[field];
    const v3 = formData.comments_v3?.[field];

    if (activeTab === 1) return v1;
    if (activeTab === 2) return (v2 !== undefined && v2 !== null) ? v2 : v1;
    if (activeTab === 3) {
      if (v3 !== undefined && v3 !== null) return v3;
      if (v2 !== undefined && v2 !== null) return v2;
      return v1;
    }
    return '';
  };
  const setComment = (field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      if (activeTab === 1) return { ...prev, [field]: val };
      if (activeTab === 2) return { ...prev, comments_v2: { ...prev.comments_v2, [field]: val } };
      if (activeTab === 3) return { ...prev, comments_v3: { ...prev.comments_v3, [field]: val } };
      return prev;
    });
  };

  // Smart Color Logic for Scores
  const getScoreColorClass = (visitIndex, scoreValue, field) => {
    const v1 = formData[field];
    const v2 = formData.scores_v2?.[field];

    if (visitIndex === 1) return 'v1';
    
    if (visitIndex === 2) {
      if (scoreValue === v1) return 'v1'; // Same as original, keep blue
      return 'v2'; // Changed in v2, use green
    }
    
    if (visitIndex === 3) {
      if (scoreValue === v2) {
        // If it's same as v2, use whatever color v2 had
        return (v2 === v1) ? 'v1' : 'v2';
      }
      return 'v3'; // Changed in v3, use orange
    }
    return 'v1';
  };

  // Score Selector Component
  const ScoreSelector = ({ field, rubricsKey, label }) => {
    const currentScore = getScore(field);
    const history = getHistory(field);
    const tooltips = rubrics[rubricsKey];

    return (
      <div 
        className="score-selector-row"
        style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 640 ? 'column' : 'row',
          alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) 0',
          borderBottom: '1px solid var(--border)',
          gap: 'var(--space-3)'
        }}
      >
        <div style={{ flex: 1 }}>
          <p className="text-sm font-medium text-gray-700 leading-tight mb-1">{label}</p>
          <p className="text-[10px] text-muted italic">
            {currentScore ? tooltips?.[currentScore] : 'Selecione uma pontuação...'}
          </p>
        </div>
        <div className="score-group" style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[4, 3, 2, 1].map(num => (
            <div key={num} className="relative">
              <input 
                type="radio" 
                id={`${field}-${num}`} 
                name={field} 
                className="score-radio"
                checked={currentScore === num}
                onChange={() => {}}
                onClick={() => {
                  if (currentScore === num) {
                    setScore(field, null);
                  } else {
                    setScore(field, num);
                  }
                }}
              />
              <label 
                htmlFor={`${field}-${num}`} 
                className={`score-label ${getScoreColorClass(activeTab, num, field)} ${currentScore !== num && history.some(h => h.score === num) ? `v${history.find(h => h.score === num)?.visit}-ghost` : ''}`}
                title={scoreLabels[num]}
              >
                {num}
                <div className="score-pips">
                  {history.map((h, i) => h.score === num && (
                    <div key={i} className={`score-pip pip-v${h.visit}`} />
                  ))}
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const calculateEvaluation = (scoreFields) => {
    const scoresList = scoreFields.map(f => getScore(f));
    const validScores = scoresList.filter(s => s !== null && s !== undefined);
    
    if (validScores.length === 0) return 'Não observado';
    
    const totalEarned = validScores.reduce((a, b) => a + Number(b), 0);
    const totalPossible = scoreFields.length * 4;
    const percentage = (totalEarned / totalPossible) * 100;

    if (percentage >= thresholds.full) return 'Atende plenamente';
    if (percentage >= thresholds.partial) return 'Atende parcialmente';
    return 'Não atende';
  };

  // Automation Effect: Update evaluations based on scores
  useEffect(() => {
    const sections = [
      { evalField: 'planning_evaluation', scoreFields: ['plan_alignment_score', 'plan_content_score', 'plan_objectives_score', 'plan_references_score'] },
      { evalField: 'methodology_evaluation', scoreFields: ['meth_adequate_score', 'meth_strategies_score', 'meth_resources_score', 'meth_clarity_score'] },
      { evalField: 'learning_evaluation', scoreFields: ['learn_instruments_score', 'learn_formative_score', 'learn_feedback_score', 'learn_criteria_score'] },
      { evalField: 'management_evaluation', scoreFields: ['man_space_score', 'man_respect_score', 'man_conflict_score', 'man_environment_score', 'man_material_score', 'man_content_score', 'man_activities_score', 'man_monitoring_score'] },
      { evalField: 'identity_evaluation', scoreFields: ['ident_values_score', 'ident_posture_score', 'ident_language_score'] }
    ];

    let hasChanges = false;
    const updates = {};

    sections.forEach(section => {
      const newValue = calculateEvaluation(section.scoreFields);
      const currentValue = getEvaluation(section.evalField);
      
      if (newValue !== currentValue) {
        updates[section.evalField] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFormData(prev => {
        const newData = { ...prev };
        if (activeTab === 1) {
          Object.assign(newData, updates);
        } else if (activeTab === 2) {
          newData.evaluations_v2 = { ...(prev.evaluations_v2 || {}), ...updates };
        } else if (activeTab === 3) {
          newData.evaluations_v3 = { ...(prev.evaluations_v3 || {}), ...updates };
        }
        return newData;
      });
    }
  }, [
    formData.plan_alignment_score, formData.plan_content_score, formData.plan_objectives_score, formData.plan_references_score,
    formData.meth_adequate_score, formData.meth_strategies_score, formData.meth_resources_score, formData.meth_clarity_score,
    formData.learn_instruments_score, formData.learn_formative_score, formData.learn_feedback_score, formData.learn_criteria_score,
    formData.man_space_score, formData.man_respect_score, formData.man_conflict_score, formData.man_environment_score,
    formData.man_material_score, formData.man_content_score, formData.man_activities_score, formData.man_monitoring_score,
    formData.ident_values_score, formData.ident_posture_score, formData.ident_language_score,
    formData.scores_v2, formData.scores_v3, activeTab, thresholds
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let userId = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch (authErr) {
        console.warn('Failed to get session during offline submit:', authErr);
      }

      const selectedSeriesObj = seriesList.find(s => s.id === formData.series_id);
      const segment_id = selectedSeriesObj ? selectedSeriesObj.segment_id : null;
      const { id: _id, created_at, updated_at, is_new_offline: _offline_flag, teachers: _unused_t, subjects: _unused_s, series: _unused_ser, segments: _unused_seg, ...cleanData } = formData;
      const payload = { 
        ...cleanData, 
        school_id: selectedSchoolId, 
        segment_id, 
        user_id: userId, 
        visit_date: cleanData.visit_date || null, 
        revisit_date_1: cleanData.revisit_date_1 || null, 
        revisit_date_2: cleanData.revisit_date_2 || null, 
        bimestre: selectedBimestre 
      };

      if (id) {
        payload.id = id;
        delete payload.is_new_offline; // CRITICAL: Ensure it is never treated as a new offline insert!
      } else {
        payload.id = generateUUID();
        payload.is_new_offline = true;
      }

      if (!isOnline) {
        const teacherObj = teachers.find(t => t.id === formData.teacher_id);
        const selectedSubjects = subjects.filter(s => formData.subject_ids?.includes(s.id));
        const subjectName = selectedSubjects.length > 0 ? selectedSubjects.map(s => s.name).join(', ') : 'N/A';
        const seriesObj = seriesList.find(s => s.id === formData.series_id);

        await addToOfflineQueue(payload, {
          teacherName: teacherObj ? teacherObj.name : 'N/A',
          subjectName: subjectName,
          seriesName: seriesObj ? seriesObj.name : 'N/A'
        });

        const key = id ? `sosa_draft_${id}` : 'sosa_draft_new';
        localStorage.removeItem(key);
        window.dispatchEvent(new Event('sosa_draft_change'));
        setDraftRecovered(false);
        setIsDirty(false);
        setSuccess(true);
        window.scrollTo(0,0);
      } else {
        const dbPayload = { ...payload };
        // Remove internal-only fields that are NOT database columns
        delete dbPayload.is_new_offline;
        
        let saveError = null;
        try {
          const { error } = id 
            ? await supabase.from('observations').update(dbPayload).eq('id', id) 
            : await supabase.from('observations').insert([dbPayload]);
          if (error) throw error;
        } catch (dbError) {
          const errorMsg = dbError?.message || '';
          if (errorMsg.includes('subject_ids')) {
            console.warn('Database does not have subject_ids column yet. Retrying without it.');
            const fallbackPayload = { ...dbPayload };
            delete fallbackPayload.subject_ids;
            const { error: retryError } = id 
              ? await supabase.from('observations').update(fallbackPayload).eq('id', id) 
              : await supabase.from('observations').insert([fallbackPayload]);
            if (retryError) {
              saveError = retryError;
            }
          } else {
            saveError = dbError;
          }
        }
        
        if (saveError) {
          if (saveError.message && (saveError.message.includes('fetch') || saveError.message.includes('network'))) {
            console.warn('Network error during save, falling back to offline queue');
            const teacherObj = teachers.find(t => t.id === formData.teacher_id);
            const selectedSubjects = subjects.filter(s => formData.subject_ids?.includes(s.id));
            const subjectName = selectedSubjects.length > 0 ? selectedSubjects.map(s => s.name).join(', ') : 'N/A';
            const seriesObj = seriesList.find(s => s.id === formData.series_id);

            await addToOfflineQueue(payload, {
              teacherName: teacherObj ? teacherObj.name : 'N/A',
              subjectName: subjectName,
              seriesName: seriesObj ? seriesObj.name : 'N/A'
            });

            const key = id ? `sosa_draft_${id}` : 'sosa_draft_new';
            localStorage.removeItem(key);
            window.dispatchEvent(new Event('sosa_draft_change'));
            setDraftRecovered(false);
            setIsDirty(false);
            setSuccess(true);
            window.scrollTo(0,0);
          } else {
            throw saveError;
          }
        } else {
          const key = id ? `sosa_draft_${id}` : 'sosa_draft_new';
          localStorage.removeItem(key);
          window.dispatchEvent(new Event('sosa_draft_change'));
          setDraftRecovered(false);
          setIsDirty(false);
          setSuccess(true);
          window.scrollTo(0,0);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      setToast({ message: 'Erro ao salvar formulário.', type: 'error' });
    } finally { setLoading(false); }
  };

  // Agrupa professores duplicados pelo mesmo nome para exibir apenas uma vez no seletor
  const uniqueTeachers = useMemo(() => {
    const seen = new Set();
    const result = [];
    teachers.forEach(t => {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        result.push(t);
      }
    });
    return result;
  }, [teachers]);

  // Deriva o nome do professor selecionado a partir do teacher_id
  const selectedTeacherName = useMemo(() => {
    if (!formData.teacher_id) return '';
    const t = teachers.find(x => x.id === formData.teacher_id);
    return t ? t.name : '';
  }, [formData.teacher_id, teachers]);

  // Busca todos os registros correspondentes ao nome do professor selecionado (ex: caso seja cadastrado com mais de uma disciplina)
  const matchingTeacherRecords = useMemo(() => {
    if (!selectedTeacherName) return [];
    return teachers.filter(t => t.name === selectedTeacherName);
  }, [selectedTeacherName, teachers]);

  // Função auxiliar para determinar qual ID de cadastro do professor usar com base na série/disciplina selecionada
  const findBestTeacherRecord = (records, seriesId, subjectId) => {
    if (records.length <= 1) return records[0];
    
    // 1. Tenta achar o cadastro que atende à série E à disciplina (ou é regente)
    const bothMatch = records.find(t => 
      t.teacher_series?.some(ts => ts.series_id === seriesId) &&
      (t.teacher_subjects?.some(ts => ts.subject_id === subjectId) || t.teacher_type === 'regente')
    );
    if (bothMatch) return bothMatch;

    // 2. Tenta achar o cadastro que atende à disciplina
    if (subjectId) {
      const subjectMatch = records.find(t => 
        t.teacher_subjects?.some(ts => ts.subject_id === subjectId)
      );
      if (subjectMatch) return subjectMatch;
    }

    // 3. Tenta achar o cadastro que atende à série
    if (seriesId) {
      const seriesMatch = records.find(t => 
        t.teacher_series?.some(ts => ts.series_id === seriesId)
      );
      if (seriesMatch) return seriesMatch;
    }

    return records[0];
  };

  let availableSeries = seriesList;
  let availableSubjects = subjects;
  
  if (matchingTeacherRecords.length > 0) {
    // 1. Filtrar registros de séries com base na disciplina selecionada (se houver) para evitar mostrar todas as séries juntas
    let recordsForSeries = matchingTeacherRecords;
    if (formData.subject_id) {
      const subjectMatchedRecords = matchingTeacherRecords.filter(t => 
        t.teacher_subjects?.some(ts => ts.subject_id === formData.subject_id) || t.teacher_type === 'regente'
      );
      if (subjectMatchedRecords.length > 0) {
        recordsForSeries = subjectMatchedRecords;
      }
    }

    // Coleta a união de todas as séries permitidas a partir dos registros filtrados
    const allowedSeriesIds = new Set();
    recordsForSeries.forEach(t => {
      if (t.teacher_series?.length > 0) {
        t.teacher_series.forEach(ts => allowedSeriesIds.add(ts.series_id));
      }
    });

    if (allowedSeriesIds.size > 0) {
      availableSeries = seriesList.filter(s => allowedSeriesIds.has(s.id));
    }
    
    // 2. Filtrar registros de disciplinas com base na série selecionada (se houver)
    let recordsForSubjects = matchingTeacherRecords;
    if (formData.series_id) {
      const seriesMatchedRecords = matchingTeacherRecords.filter(t => 
        t.teacher_series?.some(ts => ts.series_id === formData.series_id)
      );
      if (seriesMatchedRecords.length > 0) {
        recordsForSubjects = seriesMatchedRecords;
      }
    }

    // Coleta a união de todas as disciplinas permitidas
    const allowedSubjectIds = new Set();
    let hasRegente = false;
    
    recordsForSubjects.forEach(t => {
      if (t.teacher_type === 'regente') {
        hasRegente = true;
      }
      if (t.teacher_subjects?.length > 0) {
        t.teacher_subjects.forEach(ts => allowedSubjectIds.add(ts.subject_id));
      }
    });

    if (hasRegente) {
      const allowedSegments = new Set();
      recordsForSubjects.forEach(t => {
        if (t.teacher_series?.length > 0) {
          t.teacher_series.forEach(ts => {
            const seriesObj = seriesList.find(s => s.id === ts.series_id);
            if (seriesObj?.segment_id) {
              allowedSegments.add(seriesObj.segment_id);
            }
          });
        }
      });
      availableSubjects = subjects.filter(sub => {
        if (!sub.segment_subjects || sub.segment_subjects.length === 0) {
          return true; // Safe fallback if mapping data is missing or not fetched yet
        }
        return sub.segment_subjects.some(ss => allowedSegments.has(ss.segment_id));
      });
    } else {
      availableSubjects = subjects.filter(s => allowedSubjectIds.has(s.id));
    }

    // Ultra-defensive fallback: if the filtered list is empty but we have subjects, show all of them
    // so that the user is never locked out of submitting the form due to a missing mapping.
    if (availableSubjects.length === 0 && subjects.length > 0) {
      availableSubjects = subjects;
    }
  }

  if (success) {
    return (
      <div className="container flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
        <h1 className="h1">Salvo com Sucesso!</h1>
        <Button onClick={() => id ? navigate('/') : window.location.reload()}>{id ? 'Voltar ao Dashboard' : 'Nova Observação'}</Button>
      </div>
    );
  }

  const activeThemeColor = activeTab === 1 ? 'var(--primary)' : (activeTab === 2 ? 'var(--success)' : 'var(--warning)');

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* STICKY HEADER: Title and Tabs */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 20, 
        backgroundColor: '#f8fafc', // Match system background
        paddingTop: 'var(--space-6)',
        paddingBottom: 'var(--space-2)',
        margin: '0 -1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
          <h1 className="h2 md:h1">Observação Pedagógica</h1>
          <button 
            type="button" 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ 
              backgroundColor: '#f1f5f9', // Light gray background
              border: '1px solid #e2e8f0',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            title="Configurações (Rigor & IA)"
          >
            <Settings size={20} />
          </button>
        </div>

        {showConfig && (
          <div className="mb-4 p-5 bg-white rounded-xl border border-gray-200 shadow-lg animate-fade-in" style={{ margin: 'var(--space-2) 0' }}>
            <div className="flex items-center gap-2 mb-5 text-sm font-bold text-gray-800">
              <Settings size={18} className="text-primary" /> 
              <span>Configurações do Sistema (Rigor & IA)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Atende plenamente (&ge;)</label>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{thresholds.full}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={thresholds.full} 
                  onChange={(e) => updateThresholds({ ...thresholds, full: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Atende parcialmente (&ge;)</label>
                  <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-bold">{thresholds.partial}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={thresholds.partial} 
                  onChange={(e) => updateThresholds({ ...thresholds, partial: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-success"
                />
              </div>
            </div>
            
            {/* Gemini API Key Section */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-850">
                <Sparkles size={14} style={{ color: '#a855f7' }} />
                <span>Integração com Inteligência Artificial (Gemini API)</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div style={{ flex: 1, width: '100%' }}>
                  <input 
                    type="password"
                    placeholder="Chave de API do Gemini (ex: AIzaSy...)"
                    className="form-input w-full"
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                    value={geminiApiKey}
                    onChange={(e) => updateGeminiApiKey(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted leading-relaxed" style={{ flex: 1, margin: 0 }}>
                  Insira sua chave de API para ativar o aprimoramento de observações por IA.
                  Obtenha uma chave <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontWeight: '650', textDecoration: 'underline' }}>gratuita aqui</a>.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-50 flex justify-between items-center">
              <p className="text-[10px] text-muted italic">
                * As configurações são salvas automaticamente na sua conta e aplicadas em tempo real.
              </p>
              <button type="button" onClick={() => setShowConfig(false)} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">Fechar</button>
            </div>
          </div>
        )}

        {/* Modern Tabs Structure */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '-1px', 
          position: 'relative', 
          zIndex: 1,
          paddingLeft: 'var(--space-2)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }} className="no-scrollbar">
          {/* Tab 1: Original */}
          <button 
            type="button" 
            onClick={() => setActiveTab(1)} 
            className="transition-all"
            style={{ 
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: activeTab === 1 ? 'white' : 'transparent',
              borderTop: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderLeft: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderRight: activeTab === 1 ? '1px solid var(--border)' : '1px solid transparent',
              borderBottom: activeTab === 1 ? '1px solid white' : '1px solid var(--border)',
              borderRadius: '8px 8px 0 0',
              color: activeTab === 1 ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              boxShadow: activeTab === 1 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            1ª Visita
          </button>
          
          {/* Tab 2: Revisita 1 */}
          {id && (formData.revisit_date_1 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(2)} 
              className="transition-all"
              style={{ 
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: activeTab === 2 ? 'white' : 'transparent',
                borderTop: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderLeft: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderRight: activeTab === 2 ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: activeTab === 2 ? '1px solid white' : '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: activeTab === 2 ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: activeTab === 2 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}
            >
              2ª Visita
              {!formData.revisit_date_2 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(2); }}
                  className="hover:bg-red-50 p-1 rounded-full transition-colors"
                  style={{ color: 'var(--error)', display: 'flex' }}
                >
                  <X size={14} />
                </span>
              )}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                const now = new Date().toISOString().split('T')[0];
                setFormData(prev => ({ ...prev, revisit_date_1: now }));
                setActiveTab(2);
                setIsDirty(true);
              }} 
              className="transition-all"
              style={{ 
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: '1px dashed var(--border)',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <PlusCircle size={14} /> Adicionar Revisita
            </button>
          ))}

          {/* Tab 3: Revisita 2 */}
          {id && formData.revisit_date_1 && (formData.revisit_date_2 ? (
            <button 
              type="button" 
              onClick={() => setActiveTab(3)} 
              className="transition-all"
              style={{ 
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: activeTab === 3 ? 'white' : 'transparent',
                borderTop: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderLeft: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderRight: activeTab === 3 ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: activeTab === 3 ? '1px solid white' : '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: activeTab === 3 ? 'var(--warning)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: activeTab === 3 ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}
            >
              3ª Visita
              <span 
                onClick={(e) => { e.stopPropagation(); openDeleteModal(3); }}
                className="hover:bg-red-50 p-1 rounded-full transition-colors"
                style={{ color: 'var(--error)', display: 'flex' }}
              >
                <X size={14} />
              </span>
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => {
                const d = new Date();
                const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setFormData(prev => ({ ...prev, revisit_date_2: localDate }));
                setActiveTab(3);
                setIsDirty(true);
              }} 
              className="transition-all"
              style={{ 
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: '1px dashed var(--border)',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}
            >
              <PlusCircle size={14} /> Adicionar Revisita
            </button>
          ))}
        </div>

        {draftRecovered && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginTop: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            fontSize: '13px',
            color: '#1e3a8a',
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
              <span>Rascunho recuperado com alterações não salvas.</span>
            </div>
            <button 
              type="button"
              onClick={handleDiscardDraft}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              Descartar Rascunho
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-in" style={{ marginTop: 'var(--space-6)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: 'var(--space-8)' }}>
          <Card>
            <h3 className="h3 mb-4 flex items-center gap-2"><User size={20} color={activeThemeColor} /> 1. Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Professor(a)</label>
                <select 
                  className="form-input"
                  value={selectedTeacherName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matches = teachers.filter(t => t.name === name);
                    if (matches.length > 0) {
                      // Define o cadastro inicial mas deixa série e disciplina vazias para permitir livre escolha
                      const defaultTeacher = matches[0];
                      setFormData(prev => ({ 
                        ...prev, 
                        teacher_id: defaultTeacher.id, 
                        series_id: '',
                        subject_id: '',
                        subject_ids: []
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        teacher_id: '', 
                        series_id: '',
                        subject_id: '',
                        subject_ids: []
                      }));
                    }
                  }}
                  required
                >
                  <option value="">Selecione o professor</option>
                  {uniqueTeachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data da Visita</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={activeTab === 1 ? (formData.visit_date || '') : (activeTab === 2 ? (formData.revisit_date_1 || '') : (formData.revisit_date_2 || ''))}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => {
                      if (activeTab === 1) return { ...prev, visit_date: val };
                      if (activeTab === 2) return { ...prev, revisit_date_1: val };
                      if (activeTab === 3) return { ...prev, revisit_date_2: val };
                      return prev;
                    });
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ano/Série</label>
                <select 
                  className="form-input"
                  value={formData.series_id || ''}
                  onChange={(e) => {
                    const sId = e.target.value;
                    let finalTeacherId = formData.teacher_id;
                    if (matchingTeacherRecords.length > 1) {
                      const bestTeacher = findBestTeacherRecord(matchingTeacherRecords, sId, formData.subject_id);
                      if (bestTeacher) finalTeacherId = bestTeacher.id;
                    }
                    
                    // Reseta a disciplina se ela não pertencer à nova série selecionada
                    let finalSubjectId = formData.subject_id;
                    let finalSubjectIds = formData.subject_ids || [];
                    const nextMatchedRecords = matchingTeacherRecords.filter(t => 
                      t.teacher_series?.some(ts => ts.series_id === sId)
                    );
                    const nextAllowedSubjectIds = new Set();
                    nextMatchedRecords.forEach(t => {
                      t.teacher_subjects?.forEach(ts => nextAllowedSubjectIds.add(ts.subject_id));
                    });
                    const isAnyRegente = nextMatchedRecords.some(t => t.teacher_type === 'regente');
                    if (!isAnyRegente) {
                      if (finalSubjectId && !nextAllowedSubjectIds.has(finalSubjectId)) {
                        finalSubjectId = '';
                      }
                      finalSubjectIds = finalSubjectIds.filter(id => nextAllowedSubjectIds.has(id));
                    }

                    setFormData(prev => ({ 
                      ...prev, 
                      series_id: sId,
                      teacher_id: finalTeacherId,
                      subject_id: finalSubjectId,
                      subject_ids: finalSubjectIds
                    }));
                  }}
                  required
                >
                  <option value="">Selecione a série</option>
                  {availableSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group" ref={subjectDropdownRef} style={{ position: 'relative' }}>
                <label className="form-label">Disciplinas</label>
                
                {/* Combobox Header */}
                <div 
                  onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="form-input flex justify-between items-center cursor-pointer select-none"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '38px',
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '14px',
                    color: (formData.subject_ids || []).length > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}
                >
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                    {(() => {
                      const ids = formData.subject_ids || [];
                      if (ids.length === 0) return 'Selecione as disciplinas';
                      const selected = subjects.filter(s => ids.includes(s.id));
                      if (selected.length === 0) return 'Selecione as disciplinas';
                      return selected.map(s => s.name).join(', ');
                    })()}
                  </span>
                  {/* Chevron Icon */}
                  <span style={{ 
                    transition: 'transform 0.2s', 
                    transform: isSubjectDropdownOpen ? 'rotate(180deg)' : 'none',
                    borderTop: '5px solid var(--text-secondary)',
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    display: 'inline-block',
                    width: 0,
                    height: 0
                  }} />
                </div>

                {/* Dropdown Menu */}
                {isSubjectDropdownOpen && (
                  <div 
                    className="animate-fade-in"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '4px',
                      boxShadow: 'var(--shadow-lg)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '6px 0'
                    }}
                  >
                    {availableSubjects.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nenhuma disciplina disponível
                      </div>
                    ) : (
                      availableSubjects.map(sub => {
                        const isChecked = (formData.subject_ids || []).includes(sub.id);
                        return (
                          <label 
                            key={sub.id}
                            className="flex items-center gap-2"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              transition: 'background-color 0.15s',
                              userSelect: 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const currentIds = formData.subject_ids || [];
                                let nextIds;
                                if (currentIds.includes(sub.id)) {
                                  nextIds = currentIds.filter(id => id !== sub.id);
                                } else {
                                  nextIds = [...currentIds, sub.id];
                                }
                                
                                // Reseta a série se ela não pertencer a nenhuma das novas disciplinas selecionadas
                                // (Apenas para professores especialistas/não-regentes)
                                let finalSeriesId = formData.series_id;
                                const isAnyRegente = matchingTeacherRecords.some(t => t.teacher_type === 'regente');
                                
                                if (!isAnyRegente && nextIds.length > 0) {
                                  const nextMatchedRecords = matchingTeacherRecords.filter(t => 
                                    t.teacher_subjects?.some(ts => nextIds.includes(ts.subject_id)) || t.teacher_type === 'regente'
                                  );
                                  const nextAllowedSeriesIds = new Set();
                                  nextMatchedRecords.forEach(t => {
                                    t.teacher_series?.forEach(ts => nextAllowedSeriesIds.add(ts.series_id));
                                  });
                                  if (finalSeriesId && !nextAllowedSeriesIds.has(finalSeriesId)) {
                                    finalSeriesId = '';
                                  }
                                }

                                setFormData(prev => ({
                                  ...prev,
                                  subject_ids: nextIds,
                                  subject_id: nextIds[0] || '', // Fallback to first selected subject
                                  series_id: finalSeriesId
                                }));
                                setIsDirty(true);
                              }}
                              style={{
                                width: '15px',
                                height: '15px',
                                cursor: 'pointer',
                                accentColor: 'var(--primary)'
                              }}
                            />
                            <span>{sub.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-group mt-4">
              <label className="form-label">Tipo de Visita</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {['Formativa', 'Acompanhamento', 'Devolutiva', 'Outro'].map(type => {
                  const currentValue = getEvaluation('visit_type') || '';
                  const selectedTypes = currentValue ? currentValue.split(', ').map(t => t.trim()) : [];
                  const isChecked = selectedTypes.includes(type);

                  return (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="visit_type" 
                        className="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          let nextTypes;
                          if (e.target.checked) {
                            nextTypes = [...selectedTypes, type];
                          } else {
                            nextTypes = selectedTypes.filter(t => t !== type);
                          }
                          setEvaluation('visit_type', nextTypes.join(', '));
                        }}
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  );
                })}
              </div>
              {(() => {
                const currentValue = getEvaluation('visit_type') || '';
                const selectedTypes = currentValue ? currentValue.split(', ').map(t => t.trim()) : [];
                const hasOutro = selectedTypes.includes('Outro');
                return hasOutro && (
                  <input 
                    type="text" 
                    className="form-input mt-2" 
                    placeholder="Especifique o tipo..."
                    value={getEvaluation('visit_type_other') || ''}
                    onChange={(e) => setEvaluation('visit_type_other', e.target.value)}
                  />
                );
              })()}
            </div>
          </Card>

          <Card>
            <h3 className="h3 mb-4 flex items-center gap-2"><Target size={20} color={activeThemeColor}/> 2. Objetivos</h3>
            <div className="flex flex-col gap-2">
              {[
                'Acompanhar a prática pedagógica',
                'Observar a aplicação da BNCC e dos referenciais institucionais',
                'Apoiar o desenvolvimento profissional docente',
                'Monitorar processos de ensino e aprendizagem'
              ].map(obj => (
                <label key={obj} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="checkbox" 
                    checked={(getEvaluation('visit_objectives') || []).includes(obj)}
                    onChange={(e) => {
                      const current = getEvaluation('visit_objectives') || [];
                      const next = e.target.checked ? [...current, obj] : current.filter(o => o !== obj);
                      setEvaluation('visit_objectives', next);
                    }}
                  />
                  <span className="text-sm">{obj}</span>
                </label>
              ))}
              <div className="flex items-center gap-3 p-2 mt-2">
                <input 
                  type="checkbox" 
                  className="checkbox" 
                  checked={(getEvaluation('visit_objectives') || []).includes('Outro')}
                  onChange={(e) => {
                    const current = getEvaluation('visit_objectives') || [];
                    const next = e.target.checked ? [...current, 'Outro'] : current.filter(o => o !== 'Outro');
                    setEvaluation('visit_objectives', next);
                  }}
                />
                <input 
                  type="text" 
                  className="form-input flex-1" 
                  placeholder="Outro objetivo..."
                  disabled={!(getEvaluation('visit_objectives') || []).includes('Outro')}
                  value={getEvaluation('visit_objectives_other') || ''}
                  onChange={(e) => setEvaluation('visit_objectives_other', e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><ClipboardList size={20} color={activeThemeColor}/> 3. Planejamento</h3>
            <Select value={getEvaluation('planning_evaluation')} onChange={(e) => setEvaluation('planning_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="plan_alignment_score" rubricsKey="planejamento" label="Alinhamento às habilidades BNCC" />
          <ScoreSelector field="plan_content_score" rubricsKey="planejamento" label="Conteúdo conforme Sequência Didática" />
          <ScoreSelector field="plan_objectives_score" rubricsKey="planejamento" label="Objetivos claros e coerentes" />
          <ScoreSelector field="plan_references_score" rubricsKey="planejamento" label="Conexão com referenciais institucionais" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('planning_observations')} 
              onChange={(e) => setComment('planning_observations', e.target.value)} 
              activeThemeColor={activeThemeColor} 
              fieldName="planning_observations" 
              onSaveKey={updateGeminiApiKey} 
              aiContext={getAiContext("Planejamento", [
                { field: 'plan_alignment_score', label: 'Alinhamento às habilidades BNCC' },
                { field: 'plan_content_score', label: 'Conteúdo conforme Sequência Didática' },
                { field: 'plan_objectives_score', label: 'Objetivos claros e coerentes' },
                { field: 'plan_references_score', label: 'Conexão com referenciais institucionais' }
              ])}
            />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Zap size={20} color={activeThemeColor}/> 4. Metodologia</h3>
            <Select value={getEvaluation('methodology_evaluation')} onChange={(e) => setEvaluation('methodology_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="meth_adequate_score" rubricsKey="metodologia" label="Metodologias adequadas à faixa etária" />
          <ScoreSelector field="meth_strategies_score" rubricsKey="metodologia" label="Estratégias que favorecem o aprendizado" />
          <ScoreSelector field="meth_resources_score" rubricsKey="metodologia" label="Uso intencional de recursos" />
          <ScoreSelector field="meth_clarity_score" rubricsKey="metodologia" label="Clareza na condução da aula" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('methodology_observations')} 
              onChange={(e) => setComment('methodology_observations', e.target.value)} 
              activeThemeColor={activeThemeColor} 
              fieldName="methodology_observations" 
              onSaveKey={updateGeminiApiKey} 
              aiContext={getAiContext("Metodologia", [
                { field: 'meth_adequate_score', label: 'Metodologias adequadas à faixa etária' },
                { field: 'meth_strategies_score', label: 'Estratégias que favorecem o aprendizado' },
                { field: 'meth_resources_score', label: 'Uso intencional de recursos' },
                { field: 'meth_clarity_score', label: 'Clareza na condução da aula' }
              ])}
            />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><CheckCircle size={20} color={activeThemeColor}/> 5. Avaliação</h3>
            <Select value={getEvaluation('learning_evaluation')} onChange={(e) => setEvaluation('learning_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="learn_instruments_score" rubricsKey="avaliacao" label="Instrumentos coerentes com objetivos" />
          <ScoreSelector field="learn_formative_score" rubricsKey="avaliacao" label="Avaliação formativa presente" />
          <ScoreSelector field="learn_feedback_score" rubricsKey="avaliacao" label="Devolutivas claras aos estudantes" />
          <ScoreSelector field="learn_criteria_score" rubricsKey="avaliacao" label="Critérios de avaliação compreensíveis" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('learning_observations')} 
              onChange={(e) => setComment('learning_observations', e.target.value)} 
              activeThemeColor={activeThemeColor} 
              fieldName="learning_observations" 
              onSaveKey={updateGeminiApiKey} 
              aiContext={getAiContext("Avaliação", [
                { field: 'learn_instruments_score', label: 'Instrumentos coerentes com objetivos' },
                { field: 'learn_formative_score', label: 'Avaliação formativa presente' },
                { field: 'learn_feedback_score', label: 'Devolutivas claras aos estudantes' },
                { field: 'learn_criteria_score', label: 'Critérios de avaliação compreensíveis' }
              ])}
            />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Settings size={20} color={activeThemeColor}/> 6. Gestão de Sala</h3>
            <Select value={getEvaluation('management_evaluation')} onChange={(e) => setEvaluation('management_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="man_space_score" rubricsKey="gestao" label="Organização do espaço e do tempo pedagógico" />
          <ScoreSelector field="man_respect_score" rubricsKey="gestao" label="Relação respeitosa entre professor e estudantes" />
          <ScoreSelector field="man_conflict_score" rubricsKey="gestao" label="Estratégias de mediação de conflitos, quando necessário" />
          <ScoreSelector field="man_environment_score" rubricsKey="gestao" label="Ambiente favorável à aprendizagem" />
          <ScoreSelector field="man_material_score" rubricsKey="gestao" label="Uso adequado do material didático" />
          <ScoreSelector field="man_content_score" rubricsKey="gestao" label="Registro do conteúdo no caderno dos alunos" />
          <ScoreSelector field="man_activities_score" rubricsKey="gestao" label="As atividades são bem orientadas" />
          <ScoreSelector field="man_monitoring_score" rubricsKey="gestao" label="O professor acompanha sua realização circulando pela sala" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('management_observations')} 
              onChange={(e) => setComment('management_observations', e.target.value)} 
              activeThemeColor={activeThemeColor} 
              fieldName="management_observations" 
              onSaveKey={updateGeminiApiKey} 
              aiContext={getAiContext("Gestão de Sala", [
                { field: 'man_space_score', label: 'Organização do espaço e do tempo pedagógico' },
                { field: 'man_respect_score', label: 'Relação respeitosa entre professor e estudantes' },
                { field: 'man_conflict_score', label: 'Estratégias de mediação de conflitos' },
                { field: 'man_environment_score', label: 'Ambiente favorável à aprendizagem' },
                { field: 'man_material_score', label: 'Uso adequado do material didático' },
                { field: 'man_content_score', label: 'Registro do conteúdo no caderno dos alunos' },
                { field: 'man_activities_score', label: 'As atividades são bem orientadas' },
                { field: 'man_monitoring_score', label: 'O professor acompanha sua realização circulando pela sala' }
              ])}
            />
          </div>
        </Card>

        <Card className="md:col-span-2" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="h3 flex items-center gap-2"><Heart size={20} color={activeThemeColor}/> 7. Identidade Confessional</h3>
            <Select value={getEvaluation('identity_evaluation')} onChange={(e) => setEvaluation('identity_evaluation', e.target.value)} options={evaluationOptions} />
          </div>
          <ScoreSelector field="ident_values_score" rubricsKey="identidade" label="Integração de valores naturais e éticos" />
          <ScoreSelector field="ident_posture_score" rubricsKey="identidade" label="Postura coerente com princípios EA" />
          <ScoreSelector field="ident_language_score" rubricsKey="identidade" label="Linguagem, atitudes e exemplos alinhados à proposta" />
          <div className="form-group mt-4">
            <label className="form-label">Observações:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('identity_observations')} 
              onChange={(e) => setComment('identity_observations', e.target.value)} 
              activeThemeColor={activeThemeColor} 
              fieldName="identity_observations" 
              onSaveKey={updateGeminiApiKey} 
              aiContext={getAiContext("Identidade Confessional", [
                { field: 'ident_values_score', label: 'Integração de valores naturais e éticos' },
                { field: 'ident_posture_score', label: 'Postura coerente com princípios EA' },
                { field: 'ident_language_score', label: 'Linguagem, atitudes e exemplos alinhados' }
              ])}
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Award size={20} color={activeThemeColor}/> 8. Pontos Fortes da Aula</h3>
          <div className="form-group">
            <AiTextarea 
              rows="3" 
              placeholder="Descreva os pontos positivos observados..."
              value={getComment('strong_points')} 
              onChange={(e) => setComment('strong_points', e.target.value)} 
              activeThemeColor={activeThemeColor}
              fieldName="strong_points"
              onSaveKey={updateGeminiApiKey}
              aiContext={getAiContext("Pontos Fortes da Aula")}
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Zap size={20} color={activeThemeColor}/> 9. Oportunidades de Aprimoramento</h3>
          <div className="form-group">
            <label className="text-xs text-muted mb-2">(Orientações formativas da coordenação pedagógica)</label>
            <AiTextarea 
              rows="3" 
              placeholder="Indique pontos a serem desenvolvidos..."
              value={getComment('improvement_opportunities')} 
              onChange={(e) => setComment('improvement_opportunities', e.target.value)} 
              activeThemeColor={activeThemeColor}
              fieldName="improvement_opportunities"
              onSaveKey={updateGeminiApiKey}
              aiContext={getAiContext("Oportunidades de Aprimoramento")}
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><ClipboardList size={20} color={activeThemeColor}/> 10. Devolutiva ao(à) Professor(a)</h3>
          
          <div className="form-group">
            <label className="form-label">Síntese da Observação:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('observation_synthesis')} 
              onChange={(e) => setComment('observation_synthesis', e.target.value)} 
              activeThemeColor={activeThemeColor}
              fieldName="observation_synthesis"
              onSaveKey={updateGeminiApiKey}
              aiContext={getAiContext("Síntese da Observação")}
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Orientações Pedagógicas:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('pedagogical_guidelines')} 
              onChange={(e) => setComment('pedagogical_guidelines', e.target.value)} 
              activeThemeColor={activeThemeColor}
              fieldName="pedagogical_guidelines"
              onSaveKey={updateGeminiApiKey}
              aiContext={getAiContext("Orientações Pedagógicas")}
            />
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Combinados e Encaminhamentos:</label>
            <AiTextarea 
              rows="3" 
              value={getComment('forwarding')} 
              onChange={(e) => setComment('forwarding', e.target.value)} 
              activeThemeColor={activeThemeColor}
              fieldName="forwarding"
              onSaveKey={updateGeminiApiKey}
              aiContext={getAiContext("Combinados e Encaminhamentos")}
            />
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <h3 className="h3 mb-4 flex items-center gap-2"><Heart size={20} color={activeThemeColor}/> 11. Registro Final</h3>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <input 
              type="checkbox" 
              id="teacher_aware" 
              className="checkbox"
              checked={formData.teacher_aware} 
              onChange={(e) => setFormData(prev => ({ ...prev, teacher_aware: e.target.checked }))} 
            />
            <label htmlFor="teacher_aware" className="text-sm font-semibold cursor-pointer">
              Professor(a) ciente da devolutiva?
            </label>
          </div>
        </Card>

        {/* STICKY FOOTER: Actions */}
        <div style={{ 
          position: 'sticky', 
          bottom: 0, 
          zIndex: 100, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(8px)',
          padding: 'var(--space-4)',
          margin: '0 -1rem -2rem -1rem', // Match container padding
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 15px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div className="container flex justify-between md:justify-end gap-3" style={{ padding: 0, maxWidth: '1200px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>Cancelar</Button>
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Finalizar Registro')}
              </Button>
            </div>
          </div>
        </div>

        {/* Padding for content below fixed footer */}
        <div style={{ height: '80px' }} />

        <Modal isOpen={showExitModal} onClose={cancelExit} title="Alterações não salvas">
          <div style={{ padding: 'var(--space-2)' }}>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>Você tem alterações não salvas. Se sair agora, perderá os dados digitados.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancelExit}>Continuar</Button>
              <Button type="button" variant="danger" onClick={confirmExit}>Sair</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Excluir Revisita">
          <div style={{ padding: 'var(--space-2)' }}>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              Deseja realmente excluir a <strong>{visitToDelete - 1}ª Revisita</strong>? Todos os dados preenchidos nesta aba serão perdidos.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)}>Não, Manter</Button>
              <Button type="button" variant="danger" onClick={confirmDeleteRevisit}>Sim, Excluir</Button>
            </div>
          </div>
        </Modal>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </form>
    </div>
  );
}
