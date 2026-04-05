import { useCallback, useMemo, useState } from 'react'
import { ClipboardCheck, ArrowLeft, AlertCircle, CheckCircle2, XCircle, ChevronDown, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { ResultadoQuestao, StatusCorrecaoQuestao } from '../../services/correcao-avulsa.service'
import { QuestionReviewCard, type Override } from './QuestionReviewCard'
import { SIMBOLOS } from './constants'

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  total: number
  corretas: number
  incorretas: number
  pendentes: number
}

function SummaryCards({ total, corretas, incorretas, pendentes }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-slate-500">Total</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{total}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">questões</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs font-medium text-emerald-600">Corretas</p>
        <p className="text-2xl font-bold text-emerald-700 mt-0.5">{corretas}</p>
        <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
          {total > 0 ? Math.round((corretas / total) * 100) : 0}%
        </p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-medium text-red-600">Incorretas</p>
        <p className="text-2xl font-bold text-red-700 mt-0.5">{incorretas}</p>
        <p className="text-[11px] text-red-600 mt-0.5 font-medium">
          {total > 0 ? Math.round((incorretas / total) * 100) : 0}%
        </p>
      </div>
      <div className={`rounded-xl border px-4 py-3 ${pendentes > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <p className={`text-xs font-medium ${pendentes > 0 ? 'text-amber-700' : 'text-slate-500'}`}>Para revisar</p>
        <p className={`text-2xl font-bold mt-0.5 ${pendentes > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{pendentes}</p>
        <p className={`text-[11px] mt-0.5 font-medium ${pendentes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {pendentes > 0 ? 'pendente(s)' : 'tudo revisado'}
        </p>
      </div>
    </div>
  )
}

// ─── Quick actions ────────────────────────────────────────────────────────────

interface QuickActionsProps {
  pendentes: ResultadoQuestao[]
  onAceitarTodas: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

function QuickActions({ pendentes, onAceitarTodas, onExpandAll, onCollapseAll }: QuickActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400 font-medium">Ações rápidas:</span>

      {pendentes.length > 0 && (
        showConfirm ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
            <span className="text-xs text-amber-800">Aceitar sugestões da IA para {pendentes.length} questão(ões)?</span>
            <button
              onClick={() => { onAceitarTodas(); setShowConfirm(false) }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <CheckCircle2 size={11} />
            Aceitar sugestões da IA ({pendentes.length})
          </button>
        )
      )}

      <button
        onClick={onExpandAll}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <ChevronDown size={11} /> Expandir todas
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RevisaoPedagogicaProps {
  questoes: ResultadoQuestao[]
  overrides: Record<number, Override>
  onOverride: (ordem: number, decisaoManual: boolean, statusManual: StatusCorrecaoQuestao) => void
  onConfirmar: () => void
  onVoltar: () => void
  confirmando: boolean
  nomeAluno?: string
}

export function RevisaoPedagogica({
  questoes,
  overrides,
  onOverride,
  onConfirmar,
  onVoltar,
  confirmando,
  nomeAluno,
}: RevisaoPedagogicaProps) {

  // ── Derived state ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let corretas = 0
    let incorretas = 0
    let pendentes = 0

    for (const q of questoes) {
      const ov = overrides[q.questaoOrdem]
      const efetivo = ov ? ov.statusManual : q.statusCorrecao
      const corretaEfetiva = ov ? ov.decisaoManual : q.correta
      const revisada = q.revisadaManual || ov !== undefined

      if (efetivo === 'revisar' || !revisada) pendentes++
      else if (corretaEfetiva) corretas++
      else incorretas++
    }

    return { total: questoes.length, corretas, incorretas, pendentes }
  }, [questoes, overrides])

  const questoesPendentes = useMemo(
    () => questoes.filter((q) => !q.revisadaManual && overrides[q.questaoOrdem] === undefined),
    [questoes, overrides]
  )

  const podeConcluir = questoesPendentes.length === 0

  // ── Quick action: aceitar sugestões da IA para pendentes ──────────────────
  const aceitarTodas = useCallback(() => {
    for (const q of questoesPendentes) {
      onOverride(q.questaoOrdem, q.correta, q.statusCorrecao)
    }
  }, [questoesPendentes, onOverride])

  // ── Expand all trick: use a key to force re-mount ─────────────────────────
  const [expandKey, setExpandKey] = useState(0)
  const handleExpandAll = () => setExpandKey((k) => k + 1)

  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Revisão Pedagógica</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {nomeAluno
            ? `Revise os resultados de ${nomeAluno} antes de confirmar`
            : 'Revise os resultados antes de confirmar'}
        </p>
      </div>

      {/* Summary */}
      <SummaryCards
        total={stats.total}
        corretas={stats.corretas}
        incorretas={stats.incorretas}
        pendentes={stats.pendentes}
      />

      {/* Quick actions */}
      <QuickActions
        pendentes={questoesPendentes}
        onAceitarTodas={aceitarTodas}
        onExpandAll={handleExpandAll}
        onCollapseAll={() => {}}
      />

      {/* Legenda de símbolos */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-full sm:w-auto">Símbolos:</span>
        {(Object.keys(SIMBOLOS) as StatusCorrecaoQuestao[]).map((s) => (
          <span key={s} className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="font-mono font-bold text-slate-600">{SIMBOLOS[s]}</span>
            <span className="capitalize">{s.replace('incorreta_por_', '').replace('_', ' ')}</span>
          </span>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {questoes.map((q) => (
          <QuestionReviewCard
            key={`${q.questaoOrdem}-${expandKey}`}
            questao={q}
            override={overrides[q.questaoOrdem]}
            onOverride={onOverride}
          />
        ))}
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Alert for pending */}
          {!podeConcluir && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{questoesPendentes.length} questão(ões)</span> aguardam sua decisão.
                Revise ou clique em "Aceitar sugestões da IA" acima.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onVoltar} className="gap-2">
              <ArrowLeft size={14} /> Voltar
            </Button>
            <Button
              onClick={onConfirmar}
              disabled={!podeConcluir || confirmando}
              className="flex-1 gap-2"
            >
              {confirmando ? (
                <><Loader2 size={14} className="animate-spin" /> Confirmando...</>
              ) : (
                <><ClipboardCheck size={14} /> Confirmar correção</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
