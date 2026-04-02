import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { tentativasService } from '../../services/tentativas.service'
import { exerciciosService, type ExercicioDetalhe, type Questao } from '../../services/exercicios.service'
import { alunosService } from '../../services/alunos.service'

// ─── RespostaInput ────────────────────────────────────────────────────────────

interface RespostaInput {
  questaoId: string
  alternativaId?: string
  valorNumerico?: string
  textoResposta?: string
}

// ─── Componente de questão ────────────────────────────────────────────────────

interface QuestaoViewProps {
  questao: Questao
  index: number
  total: number
  resposta: RespostaInput
  onChange: (r: RespostaInput) => void
  onNext: () => void
  onPrev: () => void
  isLast: boolean
}

function QuestaoView({ questao, index, total, resposta, onChange, onNext, onPrev, isLast }: QuestaoViewProps) {
  return (
    <div className="space-y-6">
      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Questão {index + 1} de {total}</span>
          <Badge variant="outline">{questao.pontos}pt</Badge>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Enunciado */}
      <div className="rounded-xl bg-muted/30 px-5 py-4">
        <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
          {questao.enunciado}
        </p>
      </div>

      {/* Resposta */}
      <div className="space-y-3">
        {questao.tipo === 'objetiva' && (
          <div className="space-y-2">
            {questao.alternativas.map((alt) => {
              const selected = resposta.alternativaId === alt.id
              return (
                <button
                  key={alt.id}
                  onClick={() => onChange({ ...resposta, alternativaId: alt.id })}
                  className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    selected ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground'
                  }`}>
                    {alt.letra}
                  </span>
                  <span>{alt.texto}</span>
                </button>
              )
            })}
          </div>
        )}

        {questao.tipo === 'numerica' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Digite o valor numérico:</p>
            <Input
              type="number"
              step="any"
              value={resposta.valorNumerico ?? ''}
              onChange={(e) => onChange({ ...resposta, valorNumerico: e.target.value })}
              placeholder="0"
              className="text-lg font-medium text-center"
              autoFocus
            />
          </div>
        )}

        {questao.tipo === 'discursiva' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Escreva sua resposta:</p>
            <textarea
              value={resposta.textoResposta ?? ''}
              onChange={(e) => onChange({ ...resposta, textoResposta: e.target.value })}
              placeholder="Digite sua resposta aqui..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={index === 0}
          className="flex-1"
        >
          <ChevronLeft size={15} /> Anterior
        </Button>
        <Button
          onClick={onNext}
          className="flex-1"
        >
          {isLast ? (
            <><CheckCircle2 size={15} /> Finalizar</>
          ) : (
            <>Próxima <ChevronRight size={15} /></>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ExercicioExecucaoPage() {
  const { exercicioId, alunoId } = useParams<{ exercicioId: string; alunoId: string }>()
  const navigate = useNavigate()

  const [exercicio, setExercicio] = useState<ExercicioDetalhe | null>(null)
  const [aluno, setAluno] = useState<any>(null)
  const [tentativaId, setTentativaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, RespostaInput>>({})

  useEffect(() => {
    async function init() {
      if (!exercicioId || !alunoId) return
      setLoading(true)
      try {
        const [exRes, alunoRes, tentativaRes] = await Promise.all([
          exerciciosService.buscarPorId(exercicioId),
          alunosService.buscarPorId(alunoId),
          tentativasService.iniciar({ alunoId, exercicioId }),
        ])
        setExercicio(exRes.data?.data ?? null)
        setAluno(alunoRes.data?.data ?? null)
        setTentativaId(tentativaRes.data?.data?.id ?? null)

        // Inicializar respostas vazias
        const q = exRes.data?.data?.questoes ?? []
        const init: Record<string, RespostaInput> = {}
        q.forEach((quest: Questao) => { init[quest.id] = { questaoId: quest.id } })
        setRespostas(init)
      } catch (err: any) {
        setError(err?.response?.data?.error ?? 'Erro ao iniciar exercício')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [exercicioId, alunoId])

  async function handleSubmit() {
    if (!tentativaId || !exercicio) return
    setSubmitting(true)
    setError(null)
    try {
      const respostasArray = Object.values(respostas).map((r) => ({
        questaoId: r.questaoId,
        alternativaId: r.alternativaId,
        valorNumerico: r.valorNumerico != null && r.valorNumerico !== '' ? parseFloat(r.valorNumerico) : undefined,
        textoResposta: r.textoResposta,
      }))
      await tentativasService.submeter(tentativaId, respostasArray)
      navigate(`/tentativas/${tentativaId}`)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao submeter respostas')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Preparando exercício...</p>
      </div>
    )
  }

  if (error || !exercicio || !tentativaId) {
    return (
      <div className="max-w-lg mx-auto space-y-4 mt-10">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Voltar</Button>
        <Alert variant="destructive"><AlertDescription>{error ?? 'Exercício não disponível'}</AlertDescription></Alert>
      </div>
    )
  }

  const questoes = exercicio.questoes
  const questaoAtual = questoes[currentIdx]
  const questaoAtualId = questaoAtual?.id ?? ''
  const respostaAtual = respostas[questaoAtualId] ?? { questaoId: questaoAtualId }

  function handleNext() {
    if (currentIdx < questoes.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      handleSubmit()
    }
  }

  function handlePrev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => {
          if (confirm('Sair do exercício? O progresso será perdido.')) navigate(-1)
        }}>
          <ArrowLeft size={15} /> Sair
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{aluno?.nome ?? 'Aluno'}</p>
          <p className="font-semibold text-sm text-foreground">{exercicio.titulo}</p>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Questão */}
      {questaoAtual && (
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <QuestaoView
            questao={questaoAtual}
            index={currentIdx}
            total={questoes.length}
            resposta={respostaAtual}
            onChange={(r) => setRespostas((prev) => ({ ...prev, [questaoAtual.id]: r }))}
            onNext={handleNext}
            onPrev={handlePrev}
            isLast={currentIdx === questoes.length - 1}
          />
          {submitting && (
            <div className="mt-4 flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 rounded-full border-2 border-primary border-t-transparent" />
              Corrigindo...
            </div>
          )}
        </div>
      )}

      {/* Mapa de questões */}
      <div className="flex flex-wrap gap-2">
        {questoes.map((q, idx) => {
          const r = respostas[q.id]
          const respondida = !!(r?.alternativaId || r?.valorNumerico || r?.textoResposta)
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                idx === currentIdx
                  ? 'bg-primary text-white'
                  : respondida
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
