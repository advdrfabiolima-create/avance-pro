import { useState, useEffect, useCallback } from 'react'
import { Eye, Plus, ChevronLeft, ChevronRight, Loader2, ClipboardList, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { correcaoAvulsaService, type CorrecaoAvulsaDetalhe, type StatusCorrecaoQuestao } from '../../services/correcao-avulsa.service'
import { Button } from '../../components/ui/Button'
import { SIMBOLOS, STATUS_LABEL, STATUS_BADGE } from './constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CorrecaoResumo {
  id: string
  titulo: string | null
  disciplina: string | null
  status: string
  criadoEm: string
  totalQuestoes: number | null
  totalAcertos: number | null
  percentual: number | null
  aluno: { id: string; nome: string }
}

const STATUS_CORRECAO_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  revisao: 'Em revisão',
  confirmado: 'Confirmado',
  erro: 'Erro',
}

// ─── Score chip ───────────────────────────────────────────────────────────────

function ScoreChip({ percentual, status }: { percentual: number | null; status: string }) {
  if (status === 'processando') {
    return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">...</span>
  }
  if (status === 'erro') {
    return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">Erro</span>
  }
  if (percentual === null) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">—</span>
  }
  const cls =
    percentual >= 70 ? 'bg-emerald-100 text-emerald-700' :
    percentual >= 50 ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${cls}`}>
      {percentual}%
    </span>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function CorrecaoDetalheModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detalhe, setDetalhe] = useState<CorrecaoAvulsaDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    correcaoAvulsaService
      .obter(id)
      .then((res) => setDetalhe(res.data.data))
      .catch(() => setErro('Erro ao carregar correção'))
      .finally(() => setCarregando(false))
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">

        {/* Header fixo */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800">
              {detalhe?.titulo ?? 'Correção Avulsa'}
            </h2>
            {detalhe && (
              <p className="text-xs text-slate-500 mt-0.5">
                {detalhe.aluno?.nome}
                {' · '}
                {new Date(detalhe.criadoEm).toLocaleDateString('pt-BR')}
                {detalhe.disciplina && ` · ${detalhe.disciplina}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {carregando && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          )}

          {erro && <p className="py-8 text-center text-sm text-red-600">{erro}</p>}

          {detalhe && !carregando && (
            <div className="space-y-5">

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{detalhe.totalQuestoes ?? '—'}</p>
                  <p className="text-[11px] text-slate-400">questões</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-emerald-600">Acertos</p>
                  <p className="text-2xl font-bold text-emerald-700">{detalhe.totalAcertos ?? '—'}</p>
                  <p className="text-[11px] text-emerald-600">
                    {detalhe.totalQuestoes != null && detalhe.totalAcertos != null
                      ? `${Math.round(((detalhe.totalAcertos) / (detalhe.totalQuestoes)) * 100)}%`
                      : ''}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-red-600">Erros</p>
                  <p className="text-2xl font-bold text-red-700">
                    {detalhe.totalQuestoes != null && detalhe.totalAcertos != null
                      ? detalhe.totalQuestoes - detalhe.totalAcertos
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Questões */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Questões</p>
                {(detalhe.questoes as any[]).map((q) => {
                  const ordem = q.ordem ?? q.questaoOrdem
                  const status: StatusCorrecaoQuestao = (q.statusManual ?? q.statusCorrecao) as StatusCorrecaoQuestao
                  const correta = q.decisaoManual !== null && q.decisaoManual !== undefined
                    ? q.decisaoManual
                    : q.correta
                  const borderCls = correta
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : status === 'revisar'
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-red-200 bg-red-50/60'

                  return (
                    <div key={ordem} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${borderCls}`}>
                      <span className="mt-0.5 w-8 shrink-0 text-xs font-bold text-slate-500">Q{ordem}</span>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="text-slate-400">Gabarito:</span>
                          <span className="font-medium text-slate-700">{q.respostaGabarito}</span>
                          <span className="text-slate-300">→</span>
                          <span className={`font-medium ${correta ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {q.respostaAluno ?? <span className="italic text-amber-600">não detectada</span>}
                          </span>
                        </div>
                        {q.justificativa && (
                          <p className="text-[11px] italic text-slate-500">{q.justificativa}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${STATUS_BADGE[status] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        <span className="font-mono">{SIMBOLOS[status] ?? '?'}</span>
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface HistoricoCorrecoesProps {
  alunoId?: string
  compact?: boolean
  onNovaCorrecao?: () => void
}

export function HistoricoCorrecoes({ alunoId, compact = false, onNovaCorrecao }: HistoricoCorrecoesProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<CorrecaoResumo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)

  const pageSize = compact ? 5 : 10

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await correcaoAvulsaService.listar({ alunoId, page, pageSize })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
    } catch {}
    setCarregando(false)
  }, [alunoId, page, pageSize])

  useEffect(() => { void carregar() }, [carregar])

  if (carregando && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-300" size={20} />
      </div>
    )
  }

  if (!carregando && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ClipboardList size={28} className="text-slate-300" />
        <p className="text-sm text-slate-400">Nenhuma correção registrada</p>
        {onNovaCorrecao && (
          <Button size="sm" variant="outline" onClick={onNovaCorrecao}>
            <Plus size={12} className="mr-1" /> Nova correção
          </Button>
        )}
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-3">
      {/* Cabeçalho (apenas modo completo) */}
      {!compact && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{total} correção(ões) no total</p>
          {onNovaCorrecao && (
            <Button size="sm" onClick={onNovaCorrecao} className="gap-1.5">
              <Plus size={12} /> Nova correção
            </Button>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelecionadoId(item.id)}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <ScoreChip percentual={item.percentual} status={item.status} />

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {item.titulo ?? item.disciplina ?? 'Correção Avulsa'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {!alunoId && `${item.aluno.nome} · `}
                {new Date(item.criadoEm).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                })}
                {item.disciplina && item.titulo && ` · ${item.disciplina}`}
                {item.totalQuestoes != null && ` · ${item.totalQuestoes} questões`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                item.status === 'confirmado' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                item.status === 'revisao'    ? 'border-amber-200 bg-amber-50 text-amber-700' :
                item.status === 'erro'       ? 'border-red-200 bg-red-50 text-red-600' :
                'border-slate-200 bg-slate-50 text-slate-500'
              }`}>
                {STATUS_CORRECAO_LABEL[item.status] ?? item.status}
              </span>
              <Eye size={13} className="text-slate-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Paginação (modo completo) */}
      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Link "ver todas" (modo compact) */}
      {compact && total > pageSize && (
        <button
          onClick={() =>
            navigate(`/correcao-avulsa?tab=historico${alunoId ? `&alunoId=${alunoId}` : ''}`)
          }
          className="w-full py-1 text-center text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todas ({total} no total) →
        </button>
      )}

      {/* Modal de detalhe */}
      {selecionadoId && (
        <CorrecaoDetalheModal id={selecionadoId} onClose={() => setSelecionadoId(null)} />
      )}
    </div>
  )
}
