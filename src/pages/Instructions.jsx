import React from 'react';
import { Card } from '../components/ui';

export default function Instructions() {
  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-6) 0' }}>
      <h1 className="h1" style={{ marginBottom: 'var(--space-6)' }}>Instruções e Rubrica</h1>
      
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="h2" style={{ color: 'var(--primary)' }}>OBSERVAÇÃO EM SALA DE AULA</h2>
          <p className="text-muted">Coordenação Pedagógica – Rede Adventista de Educação</p>
        </div>
        
        <p style={{ marginBottom: 'var(--space-6)' }}>
          Rubrica institucional com caráter formativo, utilizada para acompanhamento, orientação e devolutiva ao professor, alinhada à BNCC, aos referenciais dos Anos Finais e ao Regimento Escolar.
        </p>

        <h3 className="h3" style={{ marginBottom: 'var(--space-2)' }}>DESEMPENHO DOCENTE EM SALA DE AULA</h3>
        <h4 className="text-muted" style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Escala de Desempenho</h4>
        
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <strong>4 – Excelente:</strong> Atende plenamente aos critérios institucionais, com intencionalidade pedagógica clara e impacto positivo na aprendizagem.
          </div>
          <div className="card" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <strong>3 – Adequado:</strong> Atende aos critérios esperados, com pequenas oportunidades de aprimoramento.
          </div>
          <div className="card" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <strong>2 – Em Desenvolvimento:</strong> Atende parcialmente aos critérios, necessitando de orientação e acompanhamento.
          </div>
          <div className="card" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <strong>1 – Necessita de Acompanhamento:</strong> Não atende aos critérios ou não foi possível observar.
          </div>
        </div>

        <h3 className="h3" style={{ marginBottom: 'var(--space-4)' }}>Dimensões Avaliadas</h3>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Dimensão</th>
                <th>4 – Excelente</th>
                <th>3 – Adequado</th>
                <th>2 – Em Desenvolvimento</th>
                <th>1 – Necessita de Acompanhamento</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Planejamento e Alinhamento Curricular</strong></td>
                <td>Aula claramente alinhada às habilidades da BNCC, aos referenciais da rede e à progressão das aprendizagens.</td>
                <td>Aula alinhada à BNCC e aos referenciais da rede, com objetivos claros, ainda que pouco contextualizados.</td>
                <td>Alinhamento parcial à BNCC e referenciais ou objetivos pouco claros.</td>
                <td>Não há evidências de alinhamento ao planejamento, referenciais ou à BNCC.</td>
              </tr>
              <tr>
                <td><strong>Metodologias e Estratégias de Ensino</strong></td>
                <td>Metodologias diversificadas, ativas e adequadas à faixa etária, promovendo protagonismo e engajamento.</td>
                <td>Estratégias adequadas, com participação dos alunos, ainda que pouco diversificadas.</td>
                <td>Metodologias pouco variadas ou centradas no professor.</td>
                <td>Estratégias inadequadas ou inexistentes.</td>
              </tr>
              <tr>
                <td><strong>Uso de Recursos Didáticos e Tecnológicos</strong></td>
                <td>Recursos utilizados de forma intencional, enriquecendo a aprendizagem.</td>
                <td>Recursos adequados, porém com uso limitado.</td>
                <td>Uso pouco intencional ou inadequado dos recursos.</td>
                <td>Não utiliza recursos ou utiliza de forma inadequada.</td>
              </tr>
              <tr>
                <td><strong>Avaliação da Aprendizagem</strong></td>
                <td>Avaliação formativa presente, com feedbacks claros e critérios alinhados aos objetivos.</td>
                <td>Avaliação coerente, com feedbacks pontuais.</td>
                <td>Avaliação pouco clara ou desalinhada aos objetivos.</td>
                <td>Não há evidências de avaliação durante a aula.</td>
              </tr>
              <tr>
                <td><strong>Gestão de Sala de Aula</strong></td>
                <td>Excelente organização do tempo, espaço e condução da turma, com clima positivo de aprendizagem.</td>
                <td>Boa organização e condução da turma.</td>
                <td>Dificuldades pontuais na gestão da sala.</td>
                <td>Gestão inadequada do tempo ou da turma.</td>
              </tr>
              <tr>
                <td><strong>Clima Escolar e Relações Interpessoais</strong></td>
                <td>Relação respeitosa, empática e acolhedora, favorecendo a participação dos alunos.</td>
                <td>Relação respeitosa, com pequenas oportunidades de melhoria.</td>
                <td>Relação pouco acolhedora ou distante.</td>
                <td>Relação inadequada ou desrespeitosa.</td>
              </tr>
              <tr>
                <td><strong>Identidade, Filosofia e Valores Adventistas</strong></td>
                <td>Valores cristãos integrados de forma natural, ética e coerente com a proposta adventista.</td>
                <td>Valores presentes de forma pontual e adequada.</td>
                <td>Valores pouco evidenciados na prática pedagógica.</td>
                <td>Não há evidências de integração dos valores institucionais.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
