import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, RefreshCw, Check, AlertTriangle,
  Info, CheckCircle2, X, Eye, ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import {
  ocrService,
  type TentativaOcrCompleta,
  type RespostaOcrDetectada,
  type QuestaoOcr,
} from '../../services/ocr.service'

// ─── Estado local por questão ─────────────────────────────────────────────────

interface EstadoQ {
  respostaOcrId: string
  letraFinal: string        // '' = sem resposta, 'A'-'E'
  valorFinal: string        // '' = sem resposta, número como string
  tocado: boolean           // usuário editou este campo
}

type CardStatus = 'vazio' | 'detectado' | 'alterado' | 'manual'

function getCardStatus(estado: EstadoQ, det: RespostaOcrDetectada | undefined): CardStatus {
  const temResposta = !!(estado.letraFinal || estado.valorFinal)
  if (!temResposta) return 'vazio'

  const ocrOriginal = det?.letraDetectada ?? (det?.valorDetectado != null ? String(det.valorDetectado) : null)
  const atual = estado.letraFinal || estado.valorFinal

  if (!ocrOriginal) return 'manual'        // OCR não detectou, usuário preencheu
  if (!estado.tocado) return 'detectado'   // vem do OCR, não foi alterado
  if (atual !== ocrOriginal) return 'alterado'
  return 'detectado'
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: CardStatus }) {
  if (status === 'vazio') return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-red-300" />
  )
  if (status === 'alterado') return (
    <AlertTriangle size={16} className="shrink-0 text-amber-500" />
  )
  if (status === 'manual') return (
    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
  )
  // detectado
  return <CheckCircle2 size={16} className="shrink-0 text-slate-400" />
}

// ─── Letter pills ─────────────────────────────────────────────────────────────

interface LetraPillsProps {
  letras: string[]
  selected: string
  onSelect: (l: string) => void
  disabled?: boolean
}

function LetraPills({ letras, selected, onSelect, disabled }: LetraPillsProps) {
  return (
    <div className="flex gap-1">
      {letras.map((l) => {
        const isActive = l === selected
        return (
          <button
            key={l}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => onSelect(isActive ? '' : l)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors"
            style={{
              background: isActive ? '#2563EB' : '#F1F5F9',
              color: isActive ? '#fff' : '#6B7280',
              outline: 'none',
            }}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

// ─── QuestaoCard ──────────────────────────────────────────────────────────────

interface QuestaoCardProps {
  questao: QuestaoOcr
  deteccao: RespostaOcrDetectada | undefined
  estado: EstadoQ
  onChange: (patch: Partial<EstadoQ>) => void
  onAdvance: () => void
  disabled: boolean
  cardRef?: (el: HTMLDivElement | null) => void
}

function QuestaoCard({
  questao, deteccao, estado, onChange, onAdvance, disabled, cardRef,
}: QuestaoCardProps) {
  const status = getCardStatus(estado, deteccao)

  const ocrSugestao =
    deteccao?.letraDetectada ??
    (deteccao?.valorDetectado != null ? String(deteccao.valorDetectado) : null)

  const cardBorder =
    status === 'vazio' ? '#FECACA'
    : status === 'alterado' ? '#FDE68A'
    : status === 'manual' ? '#BBF7D0'
    : '#E5E7EB'

  const cardBg =
    status === 'alterado' ? '#FEFCE8'
    : status === 'manual' ? '#F0FFF4'
    : '#ffffff'

  function handleKey(e: React.KeyboardEvent) {
    if (disabled) return
    if (questao.tipo === 'objetiva') {
      const k = e.key.toUpperCase()
      if (/^[A-E]$/.test(k)) {
        e.preventDefault()
        const letras = questao.alternativas.map((a) => a.letra.toUpperCase())
        if (letras.includes(k)) {
          onChange({ letraFinal: k === estado.letraFinal ? '' : k, tocado: true })
          if (k !== estado.letraFinal) setTimeout(onAdvance, 120)
        }
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      onAdvance()
    }
  }

  return (
    <div
      ref={cardRef}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKey}
      className="flex items-center gap-2.5 rounded-lg p-3 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
      style={{ border: `1px solid ${cardBorder}`, background: cardBg }}
      title={questao.enunciado}
    >
      {/* Número */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: '#F1F5F9', color: '#374151' }}
      >
        {String(questao.ordem).padStart(2, '0')}
      </span>

      {/* OCR detectou */}
      <div className="flex shrink-0 flex-col items-center gap-px">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">ocr</span>
        <span
          className="flex h-6 w-7 items-center justify-center rounded text-[12px] font-bold"
          style={{
            background: ocrSugestao ? '#F1F5F9' : '#FEF2F2',
            color: ocrSugestao ? '#6B7280' : '#FECACA',
          }}
        >
          {ocrSugestao ?? '—'}
        </span>
      </div>

      {/* Arrow */}
      <ChevronRight size={12} className="shrink-0 text-slate-300" />

      {/* Input */}
      <div className="flex-1">
        {questao.tipo === 'objetiva' ? (
          <LetraPills
            letras={questao.alternativas.map((a) => a.letra.toUpperCase())}
            selected={estado.letraFinal}
            onSelect={(l) => !disabled && onChange({ letraFinal: l, tocado: true })}
            disabled={disabled}
          />
        ) : (
          <input
            type="number"
            tabIndex={-1}
            disabled={disabled}
            placeholder="—"
            value={estado.valorFinal}
            onChange={(e) => !disabled && onChange({ valorFinal: e.target.value, tocado: true })}
            onKeyDown={(e) => e.key === 'Enter' && onAdvance()}
            className="w-24 rounded-md border border-[#E5E7EB] px-2 py-1 text-[13px] font-bold text-center focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            style={{ background: estado.valorFinal ? '#EFF6FF' : undefined }}
          />
        )}
      </div>

      {/* Status */}
      <StatusIcon status={status} />
    </div>
  )
}

// ─── Barra de progresso ───────────────────────────────────────────────────────

function ProgressBar({ atual, total }: { atual: number; total: number }) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10B981' : '#2563EB',
          }}
        />
      </div>
      <span className="shrink-0 text-[12px] font-medium text-slate-500">
        {atual} <span className="text-slate-300">/</span> {total}
      </span>
    </div>
  )
}

// ─── Modal de arquivo ────────────────────────────────────────────────────────

function ArquivoModal({ base64, tipo, onClose }: { base64: string; tipo: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <span className="text-[13px] font-semibold text-[#111827]">Arquivo enviado</span>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
        <div className="p-4">
          {tipo.startsWith('image/') ? (
            <img src={base64} alt="Arquivo" className="max-w-full rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-[14px] text-slate-600">Pré-visualização de PDF não disponível no navegador.</p>
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = base64
                  link.download = 'exercicio.pdf'
                  link.click()
                }}
              >
                Baixar PDF
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── OcrRevisao ──────────────────────────────────────────────────────────────

export default function OcrRevisao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ocr, setOcr] = useState<TentativaOcrCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [reprocessando, setReprocessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [verArquivo, setVerArquivo] = useState(false)
  const [mostrarAlertaVazios, setMostrarAlertaVazios] = useState(false)
  const [mostrarTextoOcr, setMostrarTextoOcr] = useState(false)

  const [estados, setEstados] = useState<Map<string, EstadoQ>>(new Map())
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function inicializarEstados(dados: TentativaOcrCompleta) {
    const map = new Map<string, EstadoQ>()
    for (const d of dados.respostasDetectadas) {
      if (!d.questaoId) continue
      map.set(d.questaoId, {
        respostaOcrId: d.id,
        letraFinal: d.letraFinal ?? '',
        valorFinal: d.valorFinal != null ? String(d.valorFinal) : '',
        tocado: d.revisadaManual,
      })
    }
    setEstados(map)
  }

  useEffect(() => {
    if (!id) return
    ocrService.buscar(id)
      .then((r) => {
        const data = r.data.data
        if (data) { setOcr(data); inicializarEstados(data) }
      })
      .catch(() => setErro('Não foi possível carregar o registro OCR.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(questaoId: string, patch: Partial<EstadoQ>) {
    setEstados((prev) => {
      const cur = prev.get(questaoId)
      if (!cur) return prev
      const next = new Map(prev)
      next.set(questaoId, { ...cur, ...patch })
      return next
    })
  }

  const questoesOrdenadas = useCallback(() => {
    if (!ocr) return []
    return ocr.exercicio.questoes.filter((q) => q.tipo !== 'discursiva')
  }, [ocr])

  function advanceTo(questaoId: string) {
    const qs = questoesOrdenadas()
    const idx = qs.findIndex((q) => q.id === questaoId)
    const next = qs[idx + 1]
    if (next) {
      cardRefs.current.get(next.id)?.focus()
    }
  }

  async function salvarEstados() {
    if (!id) return
    const respostas = [...estados.values()].map((e) => ({
      respostaOcrId: e.respostaOcrId,
      letraFinal: e.letraFinal || null,
      valorFinal: e.valorFinal ? parseFloat(e.valorFinal) : null,
      revisadaManual: e.tocado,
    }))
    await ocrService.atualizarRespostas(id, respostas)
  }

  async function handleReprocessar() {
    if (!id) return
    setReprocessando(true)
    setErro(null)
    try {
      const r = await ocrService.processar(id)
      if (r.data.data) { setOcr(r.data.data); inicializarEstados(r.data.data) }
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao reprocessar')
    } finally {
      setReprocessando(false)
    }
  }

  async function handleConfirmar(force = false) {
    if (!ocr || !id) return

    const detMap = new Map(ocr.respostasDetectadas.map((d) => [d.questaoId ?? '', d]))
    const questoes = questoesOrdenadas()
    const vazios = questoes.filter((q) => {
      const e = estados.get(q.id)
      return !e || (!e.letraFinal && !e.valorFinal)
    })

    if (!force && vazios.length > 0) {
      setMostrarAlertaVazios(true)
      return
    }

    setConfirmando(true)
    setErro(null)
    try {
      await salvarEstados()
      const r = await ocrService.confirmar(id)
      navigate(`/tentativas/${r.data.data?.tentativaId}`)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao confirmar correção')
      setConfirmando(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    )
  }
  if (!ocr) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={24} className="text-red-400" />
        <p className="text-[14px] text-slate-500">Registro OCR não encontrado.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} className="mr-1.5" /> Voltar
        </Button>
      </div>
    )
  }

  // ── Dados derivados ────────────────────────────────────────────────────────
  const questoes = questoesOrdenadas()
  const questoesDisc = ocr.exercicio.questoes.filter((q) => q.tipo === 'discursiva')
  const detMap = new Map(ocr.respostasDetectadas.map((d) => [d.questaoId ?? '', d]))

  const total = questoes.length
  const comResposta = questoes.filter((q) => {
    const e = estados.get(q.id)
    return e && (e.letraFinal || e.valorFinal)
  }).length
  const detectadas = ocr.respostasDetectadas.filter(
    (d) => d.letraDetectada != null || d.valorDetectado != null
  ).length

  const jaConfirmado = ocr.status === 'confirmado'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 -mt-6 md:-mx-6 flex flex-col">

      {/* ── Header fixo ──────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-4 bg-white px-4 py-4 md:px-6"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#111827] leading-tight">
            {ocr.aluno.nome}
          </p>
          <p className="truncate text-[12px] text-[#6B7280] leading-tight">
            {ocr.exercicio.titulo}
            {ocr.exercicio.materia && (
              <> · <span className="text-[11px]">{ocr.exercicio.materia.nome}</span></>
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: jaConfirmado ? '#D1FAE5' : ocr.status === 'erro' ? '#FEE2E2' : '#EFF6FF',
              color: jaConfirmado ? '#065F46' : ocr.status === 'erro' ? '#991B1B' : '#1D4ED8',
            }}
          >
            {jaConfirmado ? <CheckCircle2 size={10} /> : ocr.status === 'erro' ? <AlertTriangle size={10} /> : null}
            {jaConfirmado ? 'Confirmado' : ocr.status === 'revisao' ? 'Aguardando revisão' : ocr.status === 'erro' ? 'Erro' : 'Processando...'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerArquivo(true)}
            className="hidden sm:flex"
          >
            <Eye size={13} className="mr-1.5" /> Ver arquivo
          </Button>

          {!jaConfirmado && (
            <Button
              size="sm"
              onClick={() => handleConfirmar()}
              disabled={confirmando || reprocessando}
            >
              {confirmando
                ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Confirmando...</>
                : <><Check size={13} className="mr-1.5" /> Confirmar correção</>
              }
            </Button>
          )}

          {jaConfirmado && ocr.tentativaId && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/tentativas/${ocr.tentativaId}`)}>
              Ver resultado
            </Button>
          )}
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-5 md:px-6 space-y-5">

        {/* Info alert */}
        {!jaConfirmado && (
          <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ background: '#EFF6FF' }}>
            <Info size={15} className="shrink-0 mt-0.5 text-blue-400" />
            <p className="text-[13px] text-blue-700 leading-snug">
              Revise as respostas detectadas antes de confirmar.
              <span className="text-blue-500"> O OCR pode conter erros — você está no controle.</span>
            </p>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <p className="text-[13px] text-red-700">{erro}</p>
          </div>
        )}

        {/* OCR erro */}
        {ocr.status === 'erro' && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1 text-[13px] text-red-700">
              <p>{ocr.erroMensagem}</p>
              <button
                onClick={handleReprocessar}
                disabled={reprocessando}
                className="mt-1 font-medium underline disabled:opacity-50"
              >
                {reprocessando ? 'Reprocessando...' : 'Tentar novamente'}
              </button>
            </div>
          </div>
        )}

        {/* Alerta vazios */}
        {mostrarAlertaVazios && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
            <div className="flex-1 text-[13px] text-amber-700">
              <p className="font-semibold">Existem questões sem resposta.</p>
              <p className="mt-0.5">Questões em branco serão marcadas como erradas. Deseja confirmar mesmo assim?</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => setMostrarAlertaVazios(false)}>
                  Continuar revisando
                </Button>
                <Button size="sm"
                  style={{ background: '#D97706', color: '#fff' }}
                  onClick={() => { setMostrarAlertaVazios(false); handleConfirmar(true) }}
                  disabled={confirmando}>
                  {confirmando ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : null}
                  Confirmar assim mesmo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cabeçalho da seção + stats + progresso */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">
                {total} questão{total !== 1 ? 'ões' : ''} para revisar
              </p>
              <p className="text-[12px] text-[#6B7280] mt-0.5">
                {detectadas} detectada{detectadas !== 1 ? 's' : ''} pelo OCR
                {questoesDisc.length > 0 && ` · ${questoesDisc.length} discursiva${questoesDisc.length !== 1 ? 's' : ''} ignorada${questoesDisc.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={handleReprocessar}
              disabled={reprocessando || jaConfirmado}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              {reprocessando
                ? <Loader2 size={12} className="animate-spin" />
                : <RefreshCw size={12} />
              }
              Reprocessar
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6B7280]">
                {comResposta} de {total} questões com resposta
              </span>
              {comResposta === total && (
                <span className="text-[11px] font-semibold text-emerald-600">Todas revisadas ✓</span>
              )}
            </div>
            <ProgressBar atual={comResposta} total={total} />
          </div>
        </div>

        {/* Legenda de status */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { status: 'detectado' as CardStatus, label: 'Detectado pelo OCR' },
            { status: 'alterado' as CardStatus, label: 'Alterado' },
            { status: 'manual' as CardStatus, label: 'Preenchido manualmente' },
            { status: 'vazio' as CardStatus, label: 'Sem resposta' },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <StatusIcon status={item.status} />
              <span className="text-[11px] text-[#6B7280]">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Dica de teclado */}
        {!jaConfirmado && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">Dica:</span>{' '}
            Clique em uma questão e pressione <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">A</kbd>–
            <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">E</kbd> para selecionar.
            <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 font-mono">Tab</kbd> ou
            <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 font-mono">Enter</kbd> para avançar.
          </div>
        )}

        {/* Grid de questões */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {questoes.map((q) => {
            const estado = estados.get(q.id)
            if (!estado) return null
            return (
              <QuestaoCard
                key={q.id}
                questao={q}
                deteccao={detMap.get(q.id)}
                estado={estado}
                onChange={(patch) => !jaConfirmado && handleChange(q.id, patch)}
                onAdvance={() => advanceTo(q.id)}
                disabled={jaConfirmado}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(q.id, el)
                  else cardRefs.current.delete(q.id)
                }}
              />
            )
          })}
        </div>

        {/* Texto OCR bruto */}
        {ocr.textoOcr && (
          <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-[12px] font-medium text-[#6B7280] hover:bg-slate-50 transition-colors"
              onClick={() => setMostrarTextoOcr((v) => !v)}
            >
              <Eye size={12} />
              {mostrarTextoOcr ? 'Ocultar' : 'Ver'} texto extraído pelo OCR
            </button>
            {mostrarTextoOcr && (
              <pre className="border-t border-[#E5E7EB] px-4 py-3 text-[11px] text-[#6B7280] whitespace-pre-wrap leading-relaxed font-mono bg-slate-50">
                {ocr.textoOcr}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ── Footer fixo ──────────────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-white px-4 py-4 md:px-6"
        style={{ borderTop: '1px solid #E5E7EB' }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          disabled={confirmando}
        >
          Cancelar
        </Button>

        {jaConfirmado ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-[13px] font-semibold text-emerald-700">Correção confirmada</span>
            {ocr.tentativaId && (
              <Button size="sm" className="ml-2" onClick={() => navigate(`/tentativas/${ocr.tentativaId}`)}>
                Ver resultado
              </Button>
            )}
          </div>
        ) : (
          <Button
            onClick={() => handleConfirmar()}
            disabled={confirmando || reprocessando}
            className="min-w-[160px]"
          >
            {confirmando
              ? <><Loader2 size={14} className="mr-2 animate-spin" /> Confirmando...</>
              : <><Check size={14} className="mr-2" /> Confirmar correção</>
            }
          </Button>
        )}
      </div>

      {/* ── Modal de arquivo ──────────────────────────────────────────────────── */}
      {verArquivo && (
        <ArquivoModal
          base64={ocr.arquivoBase64}
          tipo={ocr.tipoArquivo}
          onClose={() => setVerArquivo(false)}
        />
      )}
    </div>
  )
}
