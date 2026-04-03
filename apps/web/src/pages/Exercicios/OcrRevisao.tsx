import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Check,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import PageHeader from '../../components/shared/PageHeader'
import { ocrService, type TentativaOcrCompleta, type RespostaOcrDetectada } from '../../services/ocr.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confiancaBadge(confianca: number | null) {
  if (confianca == null) return null
  if (confianca >= 0.85) return <Badge variant="success">Alta</Badge>
  if (confianca >= 0.6) return <Badge variant="warning">Média</Badge>
  return <Badge variant="destructive">Baixa</Badge>
}

// ─── QuestaoRevisao ───────────────────────────────────────────────────────────

interface QuestaoRevisaoProps {
  questao: TentativaOcrCompleta['exercicio']['questoes'][0]
  deteccao: RespostaOcrDetectada | undefined
  onChange: (id: string, letra: string | null, valor: number | null, confirmada: boolean) => void
}

function QuestaoRevisao({ questao, deteccao, onChange }: QuestaoRevisaoProps) {
  const [letra, setLetra] = useState(deteccao?.letraDetectada ?? '')
  const [valor, setValor] = useState(
    deteccao?.valorDetectado != null ? String(deteccao.valorDetectado) : ''
  )

  useEffect(() => {
    setLetra(deteccao?.letraDetectada ?? '')
    setValor(deteccao?.valorDetectado != null ? String(deteccao.valorDetectado) : '')
  }, [deteccao])

  const semDeteccao = !deteccao

  function emitChange(l: string, v: string, confirmada: boolean) {
    onChange(
      deteccao?.id ?? '',
      questao.tipo === 'objetiva' ? (l || null) : null,
      questao.tipo === 'numerica' ? (v ? parseFloat(v) : null) : null,
      confirmada
    )
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        borderColor: semDeteccao ? '#FCA5A5' : deteccao.confirmada ? '#86EFAC' : '#E2E8F0',
        background: semDeteccao ? '#FFF5F5' : deteccao.confirmada ? '#F0FFF4' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: '#EEF2FF', color: '#4338CA' }}
        >
          {questao.ordem}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#1E293B] leading-snug">{questao.enunciado}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="tp-caption capitalize">{questao.tipo}</span>
            {deteccao && confiancaBadge(deteccao.confianca)}
            {semDeteccao && (
              <span className="text-[11px] text-red-500 font-medium">Não detectado</span>
            )}
          </div>
        </div>
      </div>

      {/* Input de revisão */}
      {questao.tipo === 'objetiva' && (
        <div className="flex flex-wrap gap-2">
          {questao.alternativas.map((alt) => (
            <button
              key={alt.id}
              onClick={() => {
                setLetra(alt.letra)
                emitChange(alt.letra, valor, true)
              }}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all"
              style={{
                borderColor: letra === alt.letra ? '#4F46E5' : '#E2E8F0',
                background: letra === alt.letra ? '#EEF2FF' : undefined,
                color: letra === alt.letra ? '#4338CA' : '#334155',
              }}
            >
              <span className="font-bold">{alt.letra}</span>
              <span className="text-[12px] opacity-70 max-w-[160px] truncate">{alt.texto}</span>
            </button>
          ))}
          {letra && (
            <button
              onClick={() => { setLetra(''); emitChange('', valor, false) }}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-[12px] text-red-500 hover:bg-red-50"
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>
      )}

      {questao.tipo === 'numerica' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-40 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Valor numérico"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              emitChange(letra, e.target.value, !!e.target.value)
            }}
          />
          {questao.respostaCorreta?.tolerancia != null && (
            <span className="tp-caption">± {questao.respostaCorreta.tolerancia}</span>
          )}
        </div>
      )}

      {/* Resposta correta (feedback) */}
      {questao.respostaCorreta && (
        <div className="text-[12px] text-slate-400">
          Gabarito:{' '}
          {questao.tipo === 'objetiva' && questao.alternativas.find(
            (a) => a.id === questao.respostaCorreta!.alternativaId
          )?.letra}
          {questao.tipo === 'numerica' && questao.respostaCorreta.valorNumerico}
        </div>
      )}
    </div>
  )
}

// ─── OcrRevisao ───────────────────────────────────────────────────────────────

export default function OcrRevisao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [ocr, setOcr] = useState<TentativaOcrCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [reprocessando, setReprocessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Local state: map questaoId → deteccao override
  type DeteccaoLocal = {
    respostaOcrId: string
    letraDetectada: string | null
    valorDetectado: number | null
    confirmada: boolean
  }
  const [overrides, setOverrides] = useState<Map<string, DeteccaoLocal>>(new Map())

  useEffect(() => {
    if (!id) return
    ocrService.buscar(id)
      .then((r) => setOcr(r.data.data ?? null))
      .catch(() => setErro('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(respostaOcrId: string, questaoId: string, letra: string | null, valor: number | null, confirmada: boolean) {
    if (!respostaOcrId) return // sem deteccao ainda, ignorar
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(questaoId, { respostaOcrId, letraDetectada: letra, valorDetectado: valor, confirmada })
      return next
    })
  }

  async function handleReprocessar() {
    if (!id) return
    setReprocessando(true)
    setErro(null)
    try {
      const r = await ocrService.processar(id)
      setOcr(r.data.data ?? null)
      setOverrides(new Map())
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao reprocessar')
    } finally {
      setReprocessando(false)
    }
  }

  async function handleConfirmar() {
    if (!id || !ocr) return

    // Save overrides first if any
    if (overrides.size > 0) {
      const respostas = [...overrides.values()].map((o) => ({
        respostaOcrId: o.respostaOcrId,
        letraDetectada: o.letraDetectada,
        valorDetectado: o.valorDetectado,
        confirmada: o.confirmada,
      }))
      try {
        await ocrService.atualizarRespostas(id, respostas)
      } catch {
        setErro('Erro ao salvar revisões')
        return
      }
    }

    setConfirmando(true)
    setErro(null)
    try {
      const r = await ocrService.confirmar(id)
      navigate(`/tentativas/${r.data.data?.tentativaId}`)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao confirmar')
    } finally {
      setConfirmando(false)
    }
  }

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
        <AlertDescription>OCR não encontrado.</AlertDescription>
      </Alert>
    )
  }

  const questoesOCR = ocr.exercicio.questoes.filter((q) => q.tipo !== 'discursiva')
  const detectadas = ocr.respostasDetectadas
  const detectadasMap = new Map(detectadas.map((d) => [d.questaoId ?? '', d]))

  const totalDetectadas = detectadas.length
  const altaConfianca = detectadas.filter((d) => (d.confianca ?? 0) >= 0.85).length
  const semDeteccao = questoesOCR.length - totalDetectadas

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Revisar Detecções"
        subtitle={`${ocr.aluno.nome} · ${ocr.exercicio.titulo}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1.5" /> Voltar
          </Button>
        }
      />

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Detectadas', value: totalDetectadas, color: '#4338CA' },
          { label: 'Alta confiança', value: altaConfianca, color: '#059669' },
          { label: 'Sem detecção', value: semDeteccao, color: semDeteccao > 0 ? '#DC2626' : '#94A3B8' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-3 text-center">
            <p className="tp-stat-value text-2xl" style={{ color: s.color }}>{s.value}</p>
            <p className="tp-caption">{s.label}</p>
          </div>
        ))}
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {ocr.status === 'erro' && (
        <Alert variant="destructive">
          <AlertTriangle size={14} className="mr-2 inline" />
          <AlertDescription>
            Erro no OCR: {ocr.erroMensagem}
            <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={handleReprocessar}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Questões */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="tp-section-title">Questões ({questoesOCR.length})</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReprocessar}
            disabled={reprocessando}
          >
            {reprocessando ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <RefreshCw size={13} className="mr-1.5" />}
            Reprocessar
          </Button>
        </div>

        {questoesOCR.map((q) => {
          const deteccao = detectadasMap.get(q.id)
          return (
            <QuestaoRevisao
              key={q.id}
              questao={q}
              deteccao={deteccao}
              onChange={(respostaOcrId, letra, valor, confirmada) =>
                handleChange(respostaOcrId, q.id, letra, valor, confirmada)
              }
            />
          )
        })}

        {ocr.exercicio.questoes.some((q) => q.tipo === 'discursiva') && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-700">
            <AlertTriangle size={13} className="mr-1.5 inline" />
            Questões discursivas não são corrigidas pelo OCR e serão marcadas como não respondidas.
          </div>
        )}
      </div>

      {/* Texto OCR bruto */}
      {ocr.textoOcr && (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-slate-500 select-none">
            Ver texto extraído pelo OCR
          </summary>
          <pre className="px-4 pb-4 text-[12px] text-slate-500 whitespace-pre-wrap leading-relaxed">
            {ocr.textoOcr}
          </pre>
        </details>
      )}

      {/* Confirmar */}
      <div className="flex gap-3 pb-6">
        <Button
          className="flex-1"
          onClick={handleConfirmar}
          disabled={confirmando || ocr.status === 'confirmado'}
        >
          {confirmando ? (
            <><Loader2 size={14} className="mr-2 animate-spin" /> Confirmando...</>
          ) : ocr.status === 'confirmado' ? (
            <><CheckCircle2 size={14} className="mr-2 text-green-500" /> Já confirmado</>
          ) : (
            <><Check size={14} className="mr-2" /> Confirmar e Corrigir</>
          )}
        </Button>
        {ocr.status === 'confirmado' && ocr.tentativaId && (
          <Button variant="outline" onClick={() => navigate(`/tentativas/${ocr.tentativaId}`)}>
            Ver Resultado
          </Button>
        )}
      </div>
    </div>
  )
}
