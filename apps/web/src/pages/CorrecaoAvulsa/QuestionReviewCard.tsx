import { memo, useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle, Edit3 } from 'lucide-react'
import type { ResultadoQuestao, StatusCorrecaoQuestao } from '../../services/correcao-avulsa.service'
import {
  STATUS_LABEL, SIMBOLOS, STATUS_BADGE, STATUS_CARD_BORDER, STATUS_DOT, STATUS_TEXT,
  OVERRIDE_OPTIONS,
} from './constants'

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusCorrecaoQuestao }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${STATUS_BADGE[status]}`}>
      <span className="font-mono">{SIMBOLOS[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  const labels: Record<string, string> = { objetiva: 'Objetiva', numerica: 'Numérica', discursiva: 'Discursiva' }
  return (
    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
      {labels[tipo] ?? tipo}
    </span>
  )
}

function ConfidenceBar({ confianca }: { confianca: number | null }) {
  if (confianca === null) return null
  const pct = Math.round(confianca * 100)
  const level = pct >= 85 ? 'alta' : pct >= 60 ? 'média' : 'baixa'
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 85 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-700' : 'text-red-600'

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-400 w-14 shrink-0">Confiança</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-semibold tabular-nums ${textColor} w-16 shrink-0`}>
        {pct}% <span className="font-normal capitalize">{level}</span>
      </span>
    </div>
  )
}

function AvaliacaoIA({ avaliacao, justificativa }: { avaliacao: string | null; justificativa: string | null }) {
  if (!avaliacao && !justificativa) return null
  const cls: Record<string, string> = {
    correto: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    parcial: 'bg-amber-50 border-amber-200 text-amber-800',
    incorreto: 'bg-red-50 border-red-200 text-red-700',
  }
  const label: Record<string, string> = { correto: 'Correto', parcial: 'Parcial', incorreto: 'Incorreto' }
  return (
    <div className={`rounded-lg border px-3 py-2 ${cls[avaliacao ?? ''] ?? 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <div className="flex items-start gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-60 shrink-0 mt-0.5">
          IA {avaliacao ? `— ${label[avaliacao]}` : ''}
        </span>
        {justificativa && (
          <p className="text-xs leading-relaxed italic">"{justificativa}"</p>
        )}
      </div>
    </div>
  )
}

// ─── Override buttons ─────────────────────────────────────────────────────────

interface OverrideButtonsProps {
  currentStatus: StatusCorrecaoQuestao
  isOverridden: boolean
  onSelect: (decisao: boolean, status: StatusCorrecaoQuestao) => void
}

function OverrideButtons({ currentStatus, isOverridden, onSelect }: OverrideButtonsProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-400 shrink-0">Decisão:</span>
        {isOverridden && (
          <span className="text-[10px] rounded bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 font-semibold">
            editado
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OVERRIDE_OPTIONS.map((opt) => {
          const isSelected = currentStatus === opt.status
          return (
            <button
              key={opt.status}
              onClick={() => onSelect(opt.decisao, opt.status)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                isSelected ? opt.clsActive : opt.cls
              }`}
            >
              <span className="font-mono text-[10px]">{opt.simbolo}</span>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

export interface Override {
  decisaoManual: boolean
  statusManual: StatusCorrecaoQuestao
}

interface QuestionReviewCardProps {
  questao: ResultadoQuestao
  override?: Override
  onOverride: (ordem: number, decisaoManual: boolean, statusManual: StatusCorrecaoQuestao) => void
}

export const QuestionReviewCard = memo(function QuestionReviewCard({
  questao,
  override,
  onOverride,
}: QuestionReviewCardProps) {
  const statusEfetivo: StatusCorrecaoQuestao = override?.statusManual ?? questao.statusCorrecao
  const corretaEfetiva = override ? override.decisaoManual : questao.correta
  const precisaRevisar = !questao.revisadaManual && !override
  const baixaConfianca = questao.confianca !== null && questao.confianca < 0.6

  // Expanded by default for pending/incorrect cards
  const [expanded, setExpanded] = useState(() => precisaRevisar || !corretaEfetiva || baixaConfianca)

  const respostaText = questao.respostaAluno ?? '—'
  const naoDetectada = questao.respostaAluno === null

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm border-l-[3px] ${STATUS_CARD_BORDER[statusEfetivo]} ${
        precisaRevisar ? 'ring-2 ring-amber-300 ring-offset-1' : ''
      }`}
    >
      {/* ── Header (sempre visível, clicável) ─────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        {/* Dot */}
        <div className={`shrink-0 w-2 h-2 rounded-full ${STATUS_DOT[statusEfetivo]}`} />

        {/* Q + tipo */}
        <span className="font-bold text-slate-700 text-sm w-8 shrink-0">Q{questao.questaoOrdem}</span>
        <TipoBadge tipo={questao.tipo} />

        {/* Gabarito → Resposta (resumo) */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <span className="font-medium text-slate-600 truncate max-w-[120px]">{questao.respostaGabarito}</span>
          <span className="text-slate-300">→</span>
          <span className={`font-medium truncate max-w-[120px] ${naoDetectada ? 'text-amber-600' : STATUS_TEXT[statusEfetivo]}`}>
            {respostaText}
          </span>
        </div>

        {/* Badges direita */}
        <div className="shrink-0 flex items-center gap-2">
          {precisaRevisar && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
              <AlertCircle size={9} /> Pendente
            </span>
          )}
          {baixaConfianca && !precisaRevisar && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-red-500">
              <AlertCircle size={9} /> Baixa conf.
            </span>
          )}
          <StatusBadge status={statusEfetivo} />
          <div className="text-slate-300 ml-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </button>

      {/* ── Detail (expansível) ────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Gabarito vs Resposta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Gabarito</p>
              <p className="text-sm font-medium text-slate-700 break-words">{questao.respostaGabarito}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2.5 ${
              naoDetectada
                ? 'bg-amber-50 border-amber-200'
                : corretaEfetiva
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Resposta do aluno</p>
                {naoDetectada && <AlertCircle size={11} className="text-amber-500" />}
                {!naoDetectada && corretaEfetiva && <CheckCircle2 size={11} className="text-emerald-600" />}
                {!naoDetectada && !corretaEfetiva && <XCircle size={11} className="text-red-500" />}
              </div>
              <p className={`text-sm font-medium break-words ${
                naoDetectada ? 'text-amber-700 italic' : STATUS_TEXT[statusEfetivo]
              }`}>
                {naoDetectada ? 'Não detectada' : questao.respostaAluno}
              </p>
            </div>
          </div>

          {/* Motivo / justificativa */}
          {questao.justificativa && (
            <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
              <Edit3 size={12} className="text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Motivo</p>
                <p className="text-sm text-slate-600">{questao.justificativa}</p>
              </div>
            </div>
          )}

          {/* Texto detectado + avaliação IA (discursivas) */}
          {questao.tipo === 'discursiva' && (
            <>
              {questao.textoDetectado && questao.textoDetectado !== questao.respostaAluno && (
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Texto detectado:</span>{' '}
                  <span className="italic text-slate-600">"{questao.textoDetectado}"</span>
                </div>
              )}
              <AvaliacaoIA avaliacao={questao.avaliacaoIA} justificativa={null} />
            </>
          )}

          {/* Barra de confiança */}
          <ConfidenceBar confianca={questao.confianca} />

          {/* Separador */}
          <div className="border-t border-slate-100" />

          {/* Override buttons */}
          <OverrideButtons
            currentStatus={statusEfetivo}
            isOverridden={!!override}
            onSelect={(decisao, status) => onOverride(questao.questaoOrdem, decisao, status)}
          />
        </div>
      )}
    </div>
  )
}, (prev, next) => prev.questao === next.questao && prev.override === next.override)
