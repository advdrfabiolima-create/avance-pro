import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Loader2,
  RefreshCw, Check, ScanLine, Eye,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import PageHeader from '../../components/shared/PageHeader'
import {
  ocrService,
  type TentativaOcrCompleta,
  type RespostaOcrDetectada,
  type QuestaoOcr,
} from '../../services/ocr.service'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface EstadoResposta {
  respostaOcrId: string
  letraFinal: string | null
  valorFinal: string         // string para edição, convertido antes de salvar
  revisadaManual: boolean
}

// ─── Badge de status ─────────────────────────────────────────────────────────

type StatusDeteccao = 'detectado-alta' | 'detectado-media' | 'detectado-baixa' | 'nao-detectado' | 'revisado'

function statusDeteccao(d: RespostaOcrDetectada | undefined, local: EstadoResposta): StatusDeteccao {
  if (local.revisadaManual) return 'revisado'
  if (!d || (d.letraDetectada == null && d.valorDetectado == null)) return 'nao-detectado'
  const c = d.confianca ?? 0
  if (c >= 0.85) return 'detectado-alta'
  if (c >= 0.6) return 'detectado-media'
  return 'detectado-baixa'
}

function StatusBadge({ status }: { status: StatusDeteccao }) {
  switch (status) {
    case 'revisado':
      return <Badge variant="default" className="text-[10px]">Revisado</Badge>
    case 'detectado-alta':
      return <Badge variant="success" className="text-[10px]">Detectado</Badge>
    case 'detectado-media':
      return <Badge variant="warning" className="text-[10px]">Confiança média</Badge>
    case 'detectado-baixa':
      return <Badge variant="destructive" className="text-[10px]">Confiança baixa</Badge>
    case 'nao-detectado':
      return <Badge variant="outline" className="text-[10px] border-red-200 text-red-500">Não detectado</Badge>
  }
}

// ─── Linha de questão ─────────────────────────────────────────────────────────

interface LinhaQuestaoProps {
  questao: QuestaoOcr
  deteccao: RespostaOcrDetectada | undefined
  estado: EstadoResposta
  onChange: (novo: Partial<EstadoResposta>) => void
}

function LinhaQuestao({ questao, deteccao, estado, onChange }: LinhaQuestaoProps) {
  const status = statusDeteccao(deteccao, estado)

  // Sugestão do OCR como texto legível
  const sugestaoOcr = (() => {
    if (!deteccao) return null
    if (deteccao.letraDetectada) return deteccao.letraDetectada
    if (deteccao.valorDetectado != null) return String(deteccao.valorDetectado)
    return null
  })()

  function marcarRevisado(patch: Partial<EstadoResposta>) {
    onChange({ ...patch, revisadaManual: true })
  }

  return (
    <div
      className="grid gap-3 rounded-xl border p-4 transition-colors"
      style={{
        gridTemplateColumns: '2rem 1fr auto auto',
        borderColor: status === 'nao-detectado' ? '#FCA5A5'
          : status === 'revisado' ? '#86EFAC'
          : '#E2E8F0',
        background: status === 'revisado' ? '#F0FFF4' : undefined,
      }}
    >
      {/* Número */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold self-start mt-0.5"
        style={{ background: '#EEF2FF', color: '#4338CA' }}
      >
        {questao.ordem}
      </span>

      {/* Enunciado + tipo + status */}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1E293B] leading-snug truncate" title={questao.enunciado}>
          {questao.enunciado}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="tp-caption capitalize">{questao.tipo}</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Sugestão OCR */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">OCR</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold"
          style={{
            background: sugestaoOcr ? '#F1F5F9' : '#FEF2F2',
            color: sugestaoOcr ? '#475569' : '#FCA5A5',
            border: '1px solid',
            borderColor: sugestaoOcr ? '#E2E8F0' : '#FECACA',
          }}
          title={sugestaoOcr ? `OCR detectou: ${sugestaoOcr}` : 'Não detectado'}
        >
          {sugestaoOcr ?? '—'}
        </span>
      </div>

      {/* Resposta final (editável) */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-[10px] text-indigo-500 uppercase font-semibold tracking-wide">Final</span>
        {questao.tipo === 'objetiva' ? (
          <select
            className="h-8 w-16 rounded-lg border text-[13px] font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            style={{
              borderColor: estado.letraFinal ? '#4F46E5' : '#E2E8F0',
              background: estado.letraFinal ? '#EEF2FF' : undefined,
              color: estado.letraFinal ? '#4338CA' : '#94A3B8',
            }}
            value={estado.letraFinal ?? ''}
            onChange={(e) => marcarRevisado({ letraFinal: e.target.value || null })}
          >
            <option value="">—</option>
            {questao.alternativas.map((a) => (
              <option key={a.id} value={a.letra}>{a.letra}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            className="h-8 w-20 rounded-lg border px-2 text-[13px] font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            style={{
              borderColor: estado.valorFinal ? '#4F46E5' : '#E2E8F0',
              background: estado.valorFinal ? '#EEF2FF' : undefined,
            }}
            placeholder="—"
            value={estado.valorFinal}
            onChange={(e) => marcarRevisado({ valorFinal: e.target.value })}
          />
        )}
      </div>
    </div>
  )
}

// ─── OcrRevisao ───────────────────────────────────────────────────────────────

export default function OcrRevisao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ocr, setOcr] = useState<TentativaOcrCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [reprocessando, setReprocessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarTexto, setMostrarTexto] = useState(false)

  // Estado local de cada resposta, indexado por questaoId
  const [estados, setEstados] = useState<Map<string, EstadoResposta>>(new Map())

  function inicializarEstados(dados: TentativaOcrCompleta) {
    const map = new Map<string, EstadoResposta>()
    for (const d of dados.respostasDetectadas) {
      if (!d.questaoId) continue
      map.set(d.questaoId, {
        respostaOcrId: d.id,
        letraFinal: d.letraFinal,
        valorFinal: d.valorFinal != null ? String(d.valorFinal) : '',
        revisadaManual: d.revisadaManual,
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
      .catch(() => setErro('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(questaoId: string, patch: Partial<EstadoResposta>) {
    setEstados((prev) => {
      const current = prev.get(questaoId)
      if (!current) return prev
      const next = new Map(prev)
      next.set(questaoId, { ...current, ...patch })
      return next
    })
  }

  async function handleSalvar() {
    if (!id) return
    setSalvando(true)
    setErro(null)
    try {
      const respostas = [...estados.values()].map((e) => ({
        respostaOcrId: e.respostaOcrId,
        letraFinal: e.letraFinal,
        valorFinal: e.valorFinal ? parseFloat(e.valorFinal) : null,
        revisadaManual: e.revisadaManual,
      }))
      const r = await ocrService.atualizarRespostas(id, respostas)
      if (r.data.data) { setOcr(r.data.data); inicializarEstados(r.data.data) }
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar revisões')
    } finally {
      setSalvando(false)
    }
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

  async function handleConfirmar() {
    if (!id || !ocr) return

    // Salvar estado atual antes de confirmar
    await handleSalvar()

    setConfirmando(true)
    setErro(null)
    try {
      const r = await ocrService.confirmar(id)
      navigate(`/tentativas/${r.data.data?.tentativaId}`)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao confirmar')
      setConfirmando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={24} />
      </div>
    )
  }

  if (!ocr) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Registro OCR não encontrado.</AlertDescription>
      </Alert>
    )
  }

  const questoesOcr = ocr.exercicio.questoes.filter((q) => q.tipo !== 'discursiva')
  const questoesDisc = ocr.exercicio.questoes.filter((q) => q.tipo === 'discursiva')
  const detMap = new Map(ocr.respostasDetectadas.map((d) => [d.questaoId ?? '', d]))

  // Estatísticas
  const total = questoesOcr.length
  const detectadas = ocr.respostasDetectadas.filter(
    (d) => d.letraDetectada != null || d.valorDetectado != null
  ).length
  const revisadas = [...estados.values()].filter((e) => e.revisadaManual).length
  const naoDetectadas = total - detectadas

  const jaConfirmado = ocr.status === 'confirmado'

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <PageHeader
        title="Revisar Detecções"
        subtitle={`${ocr.aluno.nome} · ${ocr.exercicio.titulo}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1.5" /> Voltar
          </Button>
        }
      />

      {/* Painel de status */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Questões', value: total, color: '#4338CA' },
          { label: 'Detectadas', value: detectadas, color: '#059669' },
          { label: 'Não detect.', value: naoDetectadas, color: naoDetectadas > 0 ? '#DC2626' : '#94A3B8' },
          { label: 'Revisadas', value: revisadas, color: '#7C3AED' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-3 text-center">
            <p className="text-[22px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
            <p className="tp-caption mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Erros e avisos */}
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      {ocr.status === 'erro' && (
        <Alert variant="destructive">
          <AlertTriangle size={14} className="mr-2 inline" />
          <AlertDescription>
            Erro no OCR: {ocr.erroMensagem}.{' '}
            <button className="underline font-medium" onClick={handleReprocessar}>
              Tentar novamente
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Instruções */}
      {!jaConfirmado && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[13px] text-indigo-700">
          <strong>Como revisar:</strong> verifique a coluna <em>OCR</em> (sugestão automática) e confirme ou
          corrija a coluna <em>Final</em> (resposta que será corrigida). Questões que você editar ficam
          marcadas como "Revisado".
        </div>
      )}

      {/* Lista de questões objetivas/numéricas */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="tp-section-title">
            Questões ({total})
          </h2>
          <Button variant="ghost" size="sm" onClick={handleReprocessar} disabled={reprocessando || jaConfirmado}>
            {reprocessando
              ? <><Loader2 size={12} className="mr-1.5 animate-spin" /> Processando...</>
              : <><RefreshCw size={12} className="mr-1.5" /> Reprocessar OCR</>
            }
          </Button>
        </div>

        {questoesOcr.map((q) => {
          const estado = estados.get(q.id)
          if (!estado) return null
          return (
            <LinhaQuestao
              key={q.id}
              questao={q}
              deteccao={detMap.get(q.id)}
              estado={estado}
              onChange={(patch) => !jaConfirmado && handleChange(q.id, patch)}
            />
          )
        })}
      </div>

      {/* Questões discursivas (informativo) */}
      {questoesDisc.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          <AlertTriangle size={13} className="mr-1.5 inline" />
          <strong>{questoesDisc.length} questão(ões) discursiva(s)</strong> não são suportadas pelo OCR
          e serão marcadas como não respondidas.
        </div>
      )}

      {/* Texto bruto extraído */}
      {ocr.textoOcr && (
        <div className="rounded-xl border border-border">
          <button
            className="flex w-full items-center gap-2 px-4 py-3 text-[13px] font-medium text-slate-500 select-none"
            onClick={() => setMostrarTexto((v) => !v)}
          >
            <Eye size={13} /> Texto extraído pelo OCR
          </button>
          {mostrarTexto && (
            <pre className="px-4 pb-4 text-[12px] text-slate-500 whitespace-pre-wrap leading-relaxed border-t border-border">
              {ocr.textoOcr}
            </pre>
          )}
        </div>
      )}

      {/* Ações */}
      {!jaConfirmado ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSalvar}
            disabled={salvando || confirmando}
            className="shrink-0"
          >
            {salvando ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Salvar rascunho
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmar}
            disabled={confirmando || salvando}
          >
            {confirmando
              ? <><Loader2 size={14} className="mr-2 animate-spin" /> Confirmando...</>
              : <><Check size={14} className="mr-2" /> Confirmar e Corrigir</>
            }
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <p className="text-[13px] text-green-700 font-medium">Correção confirmada</p>
          </div>
          {ocr.tentativaId && (
            <Button variant="outline" onClick={() => navigate(`/tentativas/${ocr.tentativaId}`)}>
              Ver Resultado
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
