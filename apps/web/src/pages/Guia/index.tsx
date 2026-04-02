import { Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export default function GuiaPage() {
  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          /* Remove restrições de altura do layout */
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          /* Esconde sidebar e header do AppLayout */
          aside,
          header,
          .no-print {
            display: none !important;
          }
          /* Libera o container principal do layout */
          .flex.h-screen,
          .flex.flex-1.flex-col.overflow-hidden,
          main {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          /* Tipografia */
          body { font-size: 12px; }
          h1 { font-size: 20px; }
          h2 { font-size: 15px; page-break-after: avoid; }
          h3 { font-size: 13px; page-break-after: avoid; }
          table { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold">Guia do Sistema</h1>
            <p className="text-sm text-muted-foreground mt-1">Avance Pro — Manual completo de funcionamento</p>
          </div>
          <Button onClick={() => window.print()} className="flex items-center gap-2 shrink-0">
            <Printer size={15} />
            Imprimir / Salvar PDF
          </Button>
        </div>

        {/* Conteúdo do guia */}
        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          {/* Capa de impressão */}
          <div className="hidden print:block text-center py-12 border-b">
            <h1 className="text-3xl font-bold">Avance Pro</h1>
            <p className="text-lg text-muted-foreground mt-2">Guia Completo do Sistema</p>
            <p className="text-sm text-muted-foreground mt-6">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>

          <Section title="Visão Geral">
            <p className="text-sm text-muted-foreground">
              O <strong>Avance Pro</strong> é um sistema completo de gestão para franquias de ensino. Controla alunos, responsáveis, turmas, sessões, financeiro, exercícios e configurações da unidade.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <InfoBox label="Franqueado" text="Acesso total — alunos, financeiro, usuários, configurações" />
              <InfoBox label="Assistente" text="Acesso operacional — presença, sessões, registro de pagamentos" />
            </div>
          </Section>

          <Section title="1. Dashboard">
            <p className="text-sm text-muted-foreground">Painel inicial com visão geral em tempo real:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Totais de alunos: ativos, em atenção, estagnados, evoluindo bem</li>
              <li>Alunos que precisam de atenção (ordenados por gravidade)</li>
              <li>Sessões do dia com resumo de presença</li>
              <li>Pagamentos em atraso (inadimplência)</li>
            </ul>
          </Section>

          <Section title="2. Alunos">
            <p className="text-sm text-muted-foreground">Lista com busca por nome e filtro ativo/inativo. O perfil de cada aluno inclui:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>KPIs: taxa de acerto, tempo médio por sessão, total de sessões, dias sem sessão</li>
              <li>Gráfico de evolução recente das sessões</li>
              <li>Histórico detalhado de sessões (material, acertos, erros, tempo)</li>
              <li>Matrículas ativas (matéria + nível atual)</li>
              <li>Responsáveis vinculados com parentesco</li>
              <li>Módulo de exercícios: tentativas, erros recorrentes, sugestões</li>
            </ul>
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Alertas automáticos gerados pelo sistema:</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-4 font-medium">Condição</th>
                    <th className="text-left py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-1.5 pr-4">Sem sessão há mais de 7 dias</td><td>Em risco</td></tr>
                  <tr className="border-b"><td className="py-1.5 pr-4">Sem sessão há mais de 14 dias</td><td>Estagnado</td></tr>
                  <tr className="border-b"><td className="py-1.5 pr-4">Sem sessão há mais de 30 dias</td><td>Crítico</td></tr>
                  <tr className="border-b"><td className="py-1.5 pr-4">Taxa de acerto abaixo de 70%</td><td>Em risco</td></tr>
                  <tr><td className="py-1.5 pr-4">Taxa de acerto abaixo de 50%</td><td>Crítico</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              No cadastro de aluno é possível criar o responsável diretamente no modal (inline), sem sair da tela.
            </p>
          </Section>

          <Section title="3. Responsáveis">
            <p className="text-sm text-muted-foreground">
              Cadastro de pais e responsáveis com: nome, CPF, e-mail, telefone e telefone alternativo. Cada responsável pode ser vinculado a um ou mais alunos com o tipo de parentesco e indicação de responsável principal.
            </p>
          </Section>

          <Section title="4. Turmas">
            <p className="text-sm text-muted-foreground">
              Gerenciamento das turmas fixas com dia da semana, horário de início/fim e capacidade máxima. Badge de ocupação indica: disponível, quase lotada ou lotada. Permite adicionar e remover alunos por turma.
            </p>
          </Section>

          <Section title="5. Disciplinas">
            <p className="text-sm text-muted-foreground">
              Catálogo fixo com 3 matérias: <strong>Matemática, Português e Inglês</strong>. Cada matéria possui níveis progressivos (Nível A, B, C...) com código, descrição e ordem. Tela apenas informativa.
            </p>
          </Section>

          <Section title="6. Sessões">
            <p className="text-sm text-muted-foreground">
              Registro de cada aula realizada. Por aluno: presença, folhas feitas, acertos, erros, tempo, material e status. Filtro por intervalo de datas.
            </p>
          </Section>

          <Section title="7. Quadro de Horários">
            <p className="text-sm text-muted-foreground">
              Visualização semanal de todas as turmas organizadas por dia da semana. Mostra barra de ocupação e lista de alunos por turma.
            </p>
          </Section>

          <Section title="8. Lista de Presença">
            <p className="text-sm text-muted-foreground">
              Interface simplificada para marcar presença ou ausência por sessão e data. Mostra contador: X presentes / Y ausentes.
            </p>
          </Section>

          <Section title="9. Pagamentos (Mensalidades)">
            <p className="text-sm text-muted-foreground">Gestão completa de mensalidades:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li><strong>Gerar Mensalidades</strong> — gera automaticamente para todos os alunos ativos em uma matéria/mês</li>
              <li><strong>Registrar Pagamento</strong> — marca como pago com data, forma (Pix, Cartão, Boleto, Dinheiro) e observação</li>
              <li>Filtros por status (pendente/pago/vencido) e mês de referência</li>
              <li>Visão de inadimplência disponível no Dashboard</li>
            </ul>
          </Section>

          <Section title="10. Cobranças (Asaas)">
            <p className="text-sm text-muted-foreground">
              Integração com o gateway <strong>Asaas</strong> para envio de cobranças digitais:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li><strong>PIX</strong> — gera QR Code para pagamento imediato</li>
              <li><strong>Boleto</strong> — gera link do boleto bancário</li>
              <li>Status: aguardando / enviada / paga / vencida / cancelada</li>
              <li>O botão "Enviar" aparece apenas quando o Asaas está configurado</li>
            </ul>
          </Section>

          <Section title="11. Movimentos Financeiros">
            <p className="text-sm text-muted-foreground">
              Livro-caixa com entradas e saídas. Origens disponíveis: mensalidade, matrícula, material, salário, aluguel, serviço e outros. Cards de resumo mostram total de entradas, saídas e saldo. Filtros por tipo, status e intervalo de datas.
            </p>
          </Section>

          <Section title="12. Recorrências">
            <p className="text-sm text-muted-foreground">
              Configuração de cobranças automáticas recorrentes. Periodicidade disponível: mensal, bimestral, trimestral, semestral ou anual. Cada configuração tem nome, valor e dia de vencimento.
            </p>
          </Section>

          <Section title="13. Notas Fiscais">
            <p className="text-sm text-muted-foreground">
              Gestão de Notas Fiscais com status: rascunho, emitida e cancelada. Vinculadas ao aluno e ao responsável. Campos: número, valor, competência e descrição.
            </p>
          </Section>

          <Section title="14. Relatórios">
            <p className="text-sm text-muted-foreground">Relatórios disponíveis:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Desempenho dos alunos</li>
              <li>Inadimplência</li>
              <li>Resumo financeiro</li>
              <li>Utilização de turmas</li>
            </ul>
          </Section>

          <Section title="15. Reuniões">
            <p className="text-sm text-muted-foreground">
              Registro de reuniões e atendimentos com alunos e responsáveis. Tipos: geral, desempenho, financeiro, comportamento ou outro. Cada registro inclui data, participantes e anotações detalhadas.
            </p>
          </Section>

          <Section title="16. Exercícios e Correção Inteligente">
            <p className="text-sm text-muted-foreground">Sistema completo de avaliação com três tipos de questão:</p>
            <div className="mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-4 font-medium">Tipo</th>
                    <th className="text-left py-1.5 font-medium">Como é corrigido</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-1.5 pr-4">Objetiva (múltipla escolha)</td><td>Automático — compara alternativa selecionada</td></tr>
                  <tr className="border-b"><td className="py-1.5 pr-4">Numérica</td><td>Automático — aceita valor dentro de uma tolerância</td></tr>
                  <tr><td className="py-1.5 pr-4">Discursiva</td><td>Automático — comparação de texto normalizado</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              <strong>Erros Recorrentes:</strong> a cada 3 erros na mesma questão, o sistema gera automaticamente uma <strong>Sugestão de Reforço</strong> para o aluno. O histórico de tentativas e sugestões fica visível no perfil do aluno.
            </p>
          </Section>

          <Section title="17. Importações">
            <p className="text-sm text-muted-foreground">
              Upload de arquivos CSV para importação em massa de alunos, responsáveis e pagamentos. Cada arquivo é validado linha por linha com relatório de erros detalhado antes de importar.
            </p>
          </Section>

          <Section title="18. Usuários">
            <p className="text-sm text-muted-foreground">
              <em>(Apenas Franqueado)</em> — Gerenciamento de acessos ao sistema: criar assistentes, alterar perfil, ativar ou desativar contas. Um usuário não pode desativar a própria conta.
            </p>
          </Section>

          <Section title="19. Configurações">
            <p className="text-sm font-medium">Minha Conta</p>
            <p className="text-sm text-muted-foreground mt-1">Nome, e-mail, perfil e data de cadastro. Permite alterar a senha com validação da senha atual.</p>

            <p className="text-sm font-medium mt-4">Configurações da Empresa <span className="font-normal text-muted-foreground">(Franqueado)</span></p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Nome da unidade e CNPJ com máscara automática</li>
              <li>Logo da unidade (upload PNG/JPG/WebP, máx 2 MB)</li>
              <li>Endereço completo com preenchimento automático via CEP (ViaCEP)</li>
            </ul>

            <p className="text-sm font-medium mt-4">Gateway de Pagamento — Asaas <span className="font-normal text-muted-foreground">(Franqueado)</span></p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Configurar API Key do Asaas</li>
              <li>Ambiente: Sandbox (testes) ou Produção</li>
              <li>Botão "Testar Conexão" antes de salvar</li>
            </ul>
          </Section>

          <Section title="Fluxo Típico de Operação">
            <ol className="mt-2 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Cadastrar Aluno → vincular Responsável → matricular em Matéria/Nível</li>
              <li>Criar Turma → adicionar Aluno à Turma</li>
              <li>Registrar Sessão → marcar Presença → lançar desempenho (folhas, acertos, erros, tempo)</li>
              <li>Gerar Mensalidades (todo mês) → Registrar Pagamentos recebidos</li>
              <li>Enviar Cobranças via Asaas (PIX/Boleto) para inadimplentes</li>
              <li>Monitorar Dashboard → atender alertas de alunos em risco</li>
              <li>Aplicar Exercícios → corrigir automaticamente → acompanhar evolução</li>
              <li>Registrar Reuniões com responsáveis quando necessário</li>
            </ol>
          </Section>

        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b pb-6 last:border-0">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function InfoBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  )
}
