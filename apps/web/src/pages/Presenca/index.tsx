import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Check, X as XIcon } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import AlunoAvatar from '../../components/shared/AlunoAvatar'
import { presencaService } from '../../services/presenca.service'
import { turmasService } from '../../services/turmas.service'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function formatarData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded bg-muted" /></td>
      ))}
    </tr>
  )
}

export default function PresencaPage() {
  const [dataSelecionada, setDataSelecionada] = useState(hoje())
  const [turmaId, setTurmaId] = useState('')
  const [turmas, setTurmas] = useState<any[]>([])
  const [sessaoAlunos, setSessaoAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await turmasService.listar()
        const data = (res.data as any)?.data ?? res.data
        setTurmas(Array.isArray(data) ? data : [])
      } catch {
        // silencioso
      }
    }
    void init()
  }, [])

  const fetchPresenca = useCallback(async (data: string, tid: string) => {
    if (!data) return
    setLoading(true)
    setError(null)
    try {
      const res = await presencaService.listarPorData({ data, turmaId: tid || undefined })
      const list = (res.data as any)?.data ?? res.data
      setSessaoAlunos(Array.isArray(list) ? list : [])
    } catch {
      setError('Erro ao carregar lista de presença.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPresenca(dataSelecionada, turmaId)
  }, [dataSelecionada, turmaId, fetchPresenca])

  const handleMarcar = async (sessaoAlunoId: string, presente: boolean) => {
    setMarcando(sessaoAlunoId)
    try {
      await presencaService.marcarPresenca(sessaoAlunoId, presente)
      setSessaoAlunos((prev) =>
        prev.map((sa) => sa.id === sessaoAlunoId ? { ...sa, presente } : sa)
      )
    } catch {
      setError('Erro ao marcar presença.')
    } finally {
      setMarcando(null)
    }
  }

  const presentes = sessaoAlunos.filter((sa) => sa.presente).length
  const ausentes = sessaoAlunos.filter((sa) => !sa.presente).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de Presença"
        subtitle="Marque a presença dos alunos por data e turma"
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dataPresenca">Data</Label>
          <Input
            id="dataPresenca"
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-44"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="turmaPresenca">Turma</Label>
          <select
            id="turmaPresenca"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.diaSemana} {t.horarioInicio}–{t.horarioFim}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Resumo */}
      {!loading && sessaoAlunos.length > 0 && (
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium capitalize">{formatarData(dataSelecionada)}</p>
          <div className="flex items-center gap-2">
            <Badge variant="success">{presentes} presente{presentes !== 1 ? 's' : ''}</Badge>
            <Badge variant="destructive">{ausentes} ausente{ausentes !== 1 ? 's' : ''}</Badge>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aluno</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Turma</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Matéria</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Presença</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : sessaoAlunos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12">
                    <EmptyState
                      icon={<CheckSquare className="h-10 w-10" />}
                      title="Nenhuma sessão encontrada"
                      description="Não há sessões registradas para esta data. Crie sessões na página de Sessões."
                    />
                  </td>
                </tr>
              ) : (
                sessaoAlunos.map((sa) => (
                  <tr key={sa.id} className={`border-b last:border-0 transition-colors ${sa.presente ? 'hover:bg-emerald-50/40' : 'hover:bg-red-50/40 bg-red-50/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AlunoAvatar nome={sa.aluno.nome} foto={sa.aluno.foto} size="sm" />
                        <span className="font-medium">{sa.aluno.nome}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {sa.sessao?.turma?.horarioInicio}–{sa.sessao?.turma?.horarioFim}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {sa.matricula?.materia?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleMarcar(sa.id, true)}
                          disabled={marcando === sa.id}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                            sa.presente
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleMarcar(sa.id, false)}
                          disabled={marcando === sa.id}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                            !sa.presente
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-600'
                          }`}
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
