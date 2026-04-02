import { useState, useEffect } from 'react'
import { Grid3X3, Users } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { presencaService } from '../../services/presenca.service'

const DIA_LABELS: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

const DIA_CORES: Record<string, string> = {
  segunda: 'bg-blue-50 border-blue-200',
  terca: 'bg-violet-50 border-violet-200',
  quarta: 'bg-emerald-50 border-emerald-200',
  quinta: 'bg-amber-50 border-amber-200',
  sexta: 'bg-rose-50 border-rose-200',
  sabado: 'bg-slate-50 border-slate-200',
}

interface TurmaQuadro {
  id: string
  horarioInicio: string
  horarioFim: string
  capacidade: number
  alunosAtivos: number
  alunos: Array<{ aluno: { id: string; nome: string; foto?: string; ativo: boolean } }>
}

interface DiaQuadro {
  dia: string
  turmas: TurmaQuadro[]
}

function SkeletonDia() {
  return (
    <div className="animate-pulse rounded-xl border p-4 space-y-3">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-20 rounded bg-muted" />
        <div className="h-20 rounded bg-muted" />
      </div>
    </div>
  )
}

export default function QuadroHorariosPage() {
  const [quadro, setQuadro] = useState<DiaQuadro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await presencaService.quadroHorarios()
        const data = (res.data as any)?.data ?? res.data
        setQuadro(Array.isArray(data) ? data : [])
      } catch {
        setError('Erro ao carregar quadro de horários.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  const diasComTurmas = quadro.filter((d) => d.turmas.length > 0)
  const totalAlunos = quadro.reduce((a, d) => a + d.turmas.reduce((b, t) => b + t.alunosAtivos, 0), 0)
  const totalTurmas = quadro.reduce((a, d) => a + d.turmas.length, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quadro de Horários"
        subtitle="Visualização semanal das turmas e alunos"
      />

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Resumo */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalTurmas}</p>
            <p className="text-sm text-muted-foreground">Turmas ativas</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{diasComTurmas.length}</p>
            <p className="text-sm text-muted-foreground">Dias de aula</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalAlunos}</p>
            <p className="text-sm text-muted-foreground">Alunos distribuídos</p>
          </div>
        </div>
      )}

      {/* Grid semanal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonDia key={i} />)
        ) : diasComTurmas.length === 0 ? (
          <div className="col-span-3 py-12">
            <EmptyState
              icon={<Grid3X3 className="h-10 w-10" />}
              title="Nenhuma turma cadastrada"
              description="Crie turmas na página de Turmas para ver o quadro de horários."
            />
          </div>
        ) : (
          quadro.map((dia) => {
            if (dia.turmas.length === 0) return null
            const expandido = diaExpandido === dia.dia

            return (
              <div key={dia.dia} className={`rounded-xl border p-4 ${DIA_CORES[dia.dia] ?? 'bg-card border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{DIA_LABELS[dia.dia]}</h3>
                  <span className="text-xs text-muted-foreground">{dia.turmas.length} turma{dia.turmas.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {dia.turmas.map((turma) => {
                    const ocupacao = Math.round((turma.alunosAtivos / turma.capacidade) * 100)
                    const corOcupacao = ocupacao >= 90 ? 'text-red-600' : ocupacao >= 70 ? 'text-amber-600' : 'text-emerald-600'

                    return (
                      <div key={turma.id} className="rounded-lg bg-white/60 border border-white/80 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">
                            {turma.horarioInicio} – {turma.horarioFim}
                          </span>
                          <span className={`text-xs font-medium ${corOcupacao}`}>
                            {turma.alunosAtivos}/{turma.capacidade}
                          </span>
                        </div>

                        {/* Barra de ocupação */}
                        <div className="h-1.5 rounded-full bg-gray-200 mb-2">
                          <div
                            className={`h-1.5 rounded-full transition-all ${ocupacao >= 90 ? 'bg-red-500' : ocupacao >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(ocupacao, 100)}%` }}
                          />
                        </div>

                        {turma.alunosAtivos > 0 && (
                          <button
                            onClick={() => setDiaExpandido(expandido && diaExpandido === dia.dia ? null : dia.dia)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Users size={11} />
                            <span>Ver alunos</span>
                          </button>
                        )}

                        {expandido && (
                          <div className="mt-2 space-y-1.5 border-t pt-2">
                            {turma.alunos.map((ta) => (
                              <div key={ta.aluno.id} className="flex items-center gap-2">
                                <AlunoAvatar nome={ta.aluno.nome} foto={ta.aluno.foto} size="xs" />
                                <span className="text-xs">{ta.aluno.nome}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
