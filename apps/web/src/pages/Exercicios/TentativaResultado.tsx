import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Trophy, AlertTriangle, Target } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { tentativasService, type Tentativa, type RespostaAluno } from '../../services/tentativas.service'

const TIPO_LABELS: Record<string, string> = {
  objetiva: 'Objetiva',
  numerica: 'Numérica',
  discursiva: 'Discursiva',
}

function ScoreCircle({ pontuacao, totalPontos }: { pontuacao: number; totalPontos: number }) {
  const pct = totalPontos > 0 ? Math.round((pontuacao / totalPontos) * 100) : 0
  const cor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
  const bgCor = pct >= 70 ? 'bg-green-50' : pct >= 50 ? 'bg-yellow-50' : 'bg-red-50'

  return (
    <div className={`flex flex-col items-center justify-center rounded-full ${bgCor} h-32 w-32 mx-auto`}>
      <span className={`text-4xl font-bold ${cor}`}>{pct}%</span>
      <span className="text-xs text-muted-foreground mt-1">{pontuacao}/{totalPontos} pts</span>
    </div>
  )
}

export default function TentativaResultadoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tentativa, setTentativa] = useState<Tentativa | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      if (!id) return
      try {
        const res = await tentativasService.buscarPorId(id)
        setTentativa(res.data?.data ?? null)
      } catch {
        setError('Resultado não encontrado')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !tentativa) {
    return (
      <div className="max-w-lg mx-auto space-y-4 mt-10">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Voltar</Button>
        <Alert variant="destructive"><AlertDescription>{error ?? 'Não encontrado'}</AlertDescription></Alert>
      </div>
    )
  }

  const pontuacao = parseFloat(tentativa.pontuacao?.toString() ?? '0')
  const totalPontos = parseFloat(tentativa.totalPontos?.toString() ?? '0')
  const pct = totalPontos > 0 ? Math.round((pontuacao / totalPontos) * 100) : 0
  const acertos = tentativa.respostasAluno?.filter((r) => r.correta).length ?? 0
  const erros = tentativa.respostasAluno?.filter((r) => r.correta === false).length ?? 0

  const duracao = tentativa.finalizadaEm && tentativa.iniciadaEm
    ? Math.round((new Date(tentativa.finalizadaEm).getTime() - new Date(tentativa.iniciadaEm).getTime()) / 60000)
    : null

  const feedbackTexto = pct >= 90
    ? 'Excelente! Desempenho acima da média.'
    : pct >= 70
    ? 'Bom desempenho! Continue praticando.'
    : pct >= 50
    ? 'Desempenho regular. Atenção aos erros.'
    : 'Precisa de reforço. Revise o conteúdo.'

  const feedbackVariant: any = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'destructive'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/alunos/${tentativa.alunoId}`)}>
          <ArrowLeft size={15} /> Voltar ao aluno
        </Button>
      </div>

      {/* Score principal */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{tentativa.aluno?.nome}</p>
              <h2 className="text-lg font-bold text-foreground">{tentativa.exercicio?.titulo}</h2>
              {tentativa.exercicio?.materia && (
                <Badge variant="secondary" className="mt-1">{tentativa.exercicio.materia.nome}</Badge>
              )}
            </div>

            <ScoreCircle pontuacao={pontuacao} totalPontos={totalPontos} />

            <p className="text-sm text-muted-foreground">{feedbackTexto}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <CheckCircle2 size={16} />
                  <span className="text-xl font-bold">{acertos}</span>
                </div>
                <p className="text-xs text-muted-foreground">Acertos</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <XCircle size={16} />
                  <span className="text-xl font-bold">{erros}</span>
                </div>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Target size={16} />
                  <span className="text-xl font-bold">{duracao ?? '—'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Minutos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gabarito */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gabarito Detalhado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tentativa.respostasAluno ?? []).map((r, idx) => (
            <QuestaoResultado key={r.id} resposta={r} index={idx} />
          ))}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/exercicios/${tentativa.exercicioId}/executar/${tentativa.alunoId}`)}
        >
          Refazer Exercício
        </Button>
        <Button
          className="flex-1"
          onClick={() => navigate(`/alunos/${tentativa.alunoId}`)}
        >
          Ver Perfil do Aluno
        </Button>
      </div>
    </div>
  )
}

function QuestaoResultado({ resposta, index }: { resposta: RespostaAluno; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const correta = resposta.correta === true
  const semResposta = resposta.correta === null || resposta.correta === undefined

  return (
    <div
      className={`rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
        correta
          ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
          : 'border-red-200 bg-red-50/50 hover:bg-red-50'
      }`}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-3">
        {correta ? (
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
        ) : (
          <XCircle size={16} className="text-red-500 shrink-0" />
        )}
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {index + 1}. {resposta.questao?.enunciado}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {resposta.pontosObtidos ?? 0}/{resposta.questao?.pontos ?? 0}pt
        </span>
        <Badge variant="outline" className="text-[10px] py-0 shrink-0">
          {TIPO_LABELS[resposta.questao?.tipo] ?? resposta.questao?.tipo}
        </Badge>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5 text-sm">
          <div>
            <span className="text-muted-foreground">Sua resposta: </span>
            <span className={correta ? 'text-green-700 font-medium' : 'text-red-600'}>
              {resposta.alternativa
                ? `${resposta.alternativa.letra}) ${resposta.alternativa.texto}`
                : resposta.valorNumerico != null
                ? String(resposta.valorNumerico)
                : resposta.textoResposta ?? '(sem resposta)'}
            </span>
          </div>
          {!correta && !semResposta && (
            <p className="text-xs text-muted-foreground italic">
              Revise o conteúdo relacionado a esta questão.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
