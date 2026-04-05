import { useState, useRef, useCallback } from 'react'
import {
  Camera, FileText, Plus, Trash2, CheckCircle2, XCircle,
  AlertCircle, Loader2, RotateCcw, Upload, HelpCircle,
  ClipboardCheck, ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { alunosService } from '../../services/alunos.service'
import {
  correcaoAvulsaService,
  type GabaritoItem,
  type ResultadoQuestao,
  type StatusCorrecaoQuestao,
} from '../../services/correcao-avulsa.service'

// ─── Status constants ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusCorrecaoQuestao, string> = {
  correta: 'Correta',
  incorreta_por_ortografia: 'Erro ortográfico',
  incorreta_por_acentuacao: 'Erro de acentuação',
  incorreta_por_pontuacao: 'Erro de pontuação',
  incorreta_por_regra: 'Erro de regra',
  revisar: 'Revisar',
}

const STATUS_BADGE_CLS: Record<StatusCorrecaoQuestao, string> = {
  correta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  incorreta_por_ortografia: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_acentuacao: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_pontuacao: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_regra: 'bg-red-100 text-red-600 border-red-200',
  revisar: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_ROW_CLS: Record<StatusCorrecaoQuestao, string> = {
  correta: 'border-emerald-200 bg-emerald-50',
  incorreta_por_ortografia: 'border-red-200 bg-red-50',
  incorreta_por_acentuacao: 'border-red-200 bg-red-50',
  incorreta_por_pontuacao: 'border-red-200 bg-red-50',
  incorreta_por_regra: 'border-red-200 bg-red-50',
  revisar: 'border-amber-200 bg-amber-50',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function inferirTipo(resposta: string): GabaritoItem['tipo'] {
  const r = resposta.trim().toUpperCase()
  if (/^[A-E]$/.test(r)) return 'objetiva'
  if (/^-?\d+([.,]\d+)?$/.test(r)) return 'numerica'
  return 'discursiva'
}

// ─── ImageUpload ──────────────────────────────────────────────────────────────

interface ImageUploadProps {
  label: string
  hint?: string
  value: { base64: string; mime: string; preview: string } | null
  onChange: (val: { base64: string; mime: string; preview: string } | null) => void
}

function ImageUpload({ label, hint, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const base64 = await fileToBase64(file)
    onChange({ base64, mime: file.type, preview: URL.createObjectURL(file) })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value.preview} alt="preview" className="w-full max-h-64 object-contain" />
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-red-50 transition-colors"
            title="Remover"
          >
            <Trash2 size={13} className="text-red-500" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
        >
          <Upload size={24} className="text-slate-400" />
          <span className="text-sm text-slate-500">Clique ou arraste a imagem aqui</span>
          <span className="text-xs text-slate-400">JPG, PNG ou WebP</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

// ─── GabaritoManual ───────────────────────────────────────────────────────────

function GabaritoManual({ itens, onChange }: { itens: GabaritoItem[]; onChange: (v: GabaritoItem[]) => void }) {
  function addQuestao() {
    const prox = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1
    onChange([...itens, { ordem: prox, tipo: 'objetiva', resposta: '' }])
  }

  function remove(idx: number) { onChange(itens.filter((_, i) => i !== idx)) }

  function update(idx: number, field: keyof GabaritoItem, value: string) {
    const next = [...itens]
    if (field === 'ordem') {
      next[idx] = { ...next[idx]!, ordem: parseInt(value) || next[idx]!.ordem }
    } else if (field === 'resposta') {
      next[idx] = { ...next[idx]!, resposta: value, tipo: inferirTipo(value) }
    } else if (field === 'tipo') {
      next[idx] = { ...next[idx]!, tipo: value as GabaritoItem['tipo'] }
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{itens.length} questão(ões)</span>
        <Button size="sm" variant="outline" onClick={addQuestao}>
          <Plus size={13} className="mr-1" /> Adicionar questão
        </Button>
      </div>
      {itens.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
          Nenhuma questão adicionada.
        </div>
      )}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {itens.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="w-6 text-center text-xs font-bold text-slate-500">{item.ordem}</span>
            <Input
              value={item.resposta}
              onChange={(e) => update(idx, 'resposta', e.target.value)}
              placeholder="Ex: B ou 7.5"
              className="flex-1 h-8 text-sm"
            />
            <span className="text-[11px] text-slate-400 w-20 text-right capitalize">{item.tipo}</span>
            <button onClick={() => remove(idx)} className="text-slate-300 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AlunoBusca ───────────────────────────────────────────────────────────────

interface AlunoInfo { id: string; nome: string }

function AlunoBusca({ value, onChange }: { value: AlunoInfo | null; onChange: (a: AlunoInfo | null) => void }) {
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<AlunoInfo[]>([])
  const [carregando, setCarregando] = useState(false)

  const pesquisar = useCallback(async (termo: string) => {
    if (termo.length < 2) { setSugestoes([]); return }
    setCarregando(true)
    try {
      const res = await alunosService.listar({ nome: termo, page: 1, pageSize: 8, ativo: true } as any)
      const lista = (res.data.data as any).items ?? res.data.data
      setSugestoes((Array.isArray(lista) ? lista : []).map((a: any) => ({ id: a.id, nome: a.nome })))
    } catch {}
    setCarregando(false)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
        <span className="flex-1 text-sm font-medium text-slate-700">{value.nome}</span>
        <button onClick={() => onChange(null)} className="text-slate-400 hover:text-red-500 transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        placeholder="Digite o nome do aluno..."
        value={busca}
        onChange={(e) => { setBusca(e.target.value); pesquisar(e.target.value) }}
        className="text-sm"
      />
      {carregando && (
        <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      )}
      {sugestoes.length > 0 && (
        <div className="absolute z-20 w-full mt-1 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {sugestoes.map((a) => (
            <button
              key={a.id}
              onClick={() => { onChange(a); setSugestoes([]); setBusca('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              {a.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tela de revisão ──────────────────────────────────────────────────────────

type Override = { decisaoManual: boolean; statusManual: StatusCorrecaoQuestao }

interface RevisaoViewProps {
  questoes: ResultadoQuestao[]
  overrides: Record<number, Override>
  onOverride: (ordem: number, decisaoManual: boolean, statusManual: StatusCorrecaoQuestao) => void
}

function RevisaoView({ questoes, overrides, onOverride }: RevisaoViewProps) {
  const resolvedQuestoes = questoes.map((q) => {
    const ov = overrides[q.questaoOrdem]
    return {
      ...q,
      statusEfetivo: (ov?.statusManual ?? q.statusCorrecao) as StatusCorrecaoQuestao,
      corretaEfetiva: ov ? ov.decisaoManual : q.correta,
      revisada: q.revisadaManual || ov !== undefined,
    }
  })

  const total = resolvedQuestoes.length
  const acertos = resolvedQuestoes.filter((q) => q.corretaEfetiva).length
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
  const pendentes = resolvedQuestoes.filter((q) => !q.revisada).length

  const cor = pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
  const bgCor = pct >= 70 ? 'bg-emerald-50 border-emerald-200' : pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-4">
      {pendentes > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pendentes} questão(ões)</span> aguardam sua revisão. Confirme a decisão abaixo.
          </p>
        </div>
      )}

      <div className={`rounded-xl border p-4 ${bgCor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${cor}`}>{pct}%</p>
            <p className="text-sm text-slate-600 mt-0.5">{acertos} acerto(s) de {total} questão(ões)</p>
          </div>
          <div className="text-right text-sm text-slate-500 space-y-0.5">
            <p><span className="font-medium text-emerald-600">{acertos}</span> corretas</p>
            <p><span className="font-medium text-red-500">{total - acertos}</span> erradas</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {resolvedQuestoes.map((q) => {
          const naoDetectada = q.respostaAluno === null
          const rowCls = naoDetectada ? 'border-amber-200 bg-amber-50' : STATUS_ROW_CLS[q.statusEfetivo]
          const precisaRevisar = !q.revisada

          return (
            <div key={q.questaoOrdem} className={`rounded-xl border p-3 ${rowCls} ${precisaRevisar ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {naoDetectada ? (
                    <AlertCircle size={15} className="text-amber-500" />
                  ) : q.corretaEfetiva ? (
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  ) : (
                    <XCircle size={15} className="text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-bold text-slate-700">Q{q.questaoOrdem}</span>
                    <span className="text-slate-500">
                      Gabarito: <span className="font-semibold text-slate-700">{q.respostaGabarito}</span>
                    </span>
                    <span className="text-slate-500">
                      Aluno:{' '}
                      <span className={`font-semibold ${
                        naoDetectada ? 'text-amber-600' : q.corretaEfetiva ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                        {q.respostaAluno ?? '—'}
                      </span>
                    </span>
                    {q.confianca !== null && (
                      <span className="text-slate-400">{Math.round(q.confianca * 100)}% conf.</span>
                    )}
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLS[q.statusEfetivo]}`}>
                      {STATUS_LABEL[q.statusEfetivo]}
                    </span>
                    {overrides[q.questaoOrdem] && (
                      <span className="text-[11px] text-slate-400 italic">editado</span>
                    )}
                  </div>

                  {q.tipo === 'discursiva' && q.textoDetectado && (
                    <p className="mt-1 text-xs text-slate-500">
                      Texto detectado: <span className="text-slate-700 italic">"{q.textoDetectado}"</span>
                    </p>
                  )}
                  {q.justificativa && (
                    <p className="mt-1 text-xs text-slate-600 italic">"{q.justificativa}"</p>
                  )}
                </div>
              </div>

              {/* Override buttons — visíveis para questões pendentes ou que o professor queira editar */}
              {(precisaRevisar || q.statusEfetivo !== 'correta') && (
                <div className="mt-2.5 flex items-center gap-2 pl-[22px] flex-wrap">
                  <span className="text-[11px] text-slate-500 font-medium">Sua decisão:</span>
                  <button
                    onClick={() => onOverride(q.questaoOrdem, true, 'correta')}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ${
                      overrides[q.questaoOrdem]?.decisaoManual === true ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                    }`}
                  >
                    <CheckCircle2 size={10} className="inline mr-1" /> Correta
                  </button>
                  {(['incorreta_por_ortografia', 'incorreta_por_acentuacao', 'incorreta_por_pontuacao', 'incorreta_por_regra'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onOverride(q.questaoOrdem, false, s)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all border-red-300 text-red-600 bg-red-50 hover:bg-red-100 ${
                        overrides[q.questaoOrdem]?.statusManual === s ? 'ring-2 ring-red-400 ring-offset-1' : ''
                      }`}
                    >
                      {STATUS_LABEL[s].replace('Erro ', '')}
                    </button>
                  ))}
                  {precisaRevisar && !overrides[q.questaoOrdem] && (
                    <span className="text-[11px] text-amber-600 font-medium">— confirme</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Etapa = 'configurar' | 'processando' | 'revisao' | 'concluido'
type GabaritoModo = 'manual' | 'foto'

export default function CorrecaoAvulsaPage() {
  const [etapa, setEtapa] = useState<Etapa>('configurar')
  const [aluno, setAluno] = useState<AlunoInfo | null>(null)
  const [titulo, setTitulo] = useState('')
  const [disciplina, setDisciplina] = useState('')

  const [gabaritoModo, setGabaritoModo] = useState<GabaritoModo>('manual')
  const [gabaritoManual, setGabaritoManual] = useState<GabaritoItem[]>([])
  const [gabaritoFoto, setGabaritoFoto] = useState<{ base64: string; mime: string; preview: string } | null>(null)
  const [gabaritoExtraido, setGabaritoExtraido] = useState<GabaritoItem[] | null>(null)
  const [extraindo, setExtraindo] = useState(false)

  const [folhaAluno, setFolhaAluno] = useState<{ base64: string; mime: string; preview: string } | null>(null)
  const [correcaoId, setCorrecaoId] = useState<string | null>(null)
  const [questoes, setQuestoes] = useState<ResultadoQuestao[]>([])
  const [overrides, setOverrides] = useState<Record<number, Override>>({})
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const gabarito: GabaritoItem[] =
    gabaritoModo === 'manual' ? gabaritoManual : (gabaritoExtraido ?? [])

  const gabaritoValido = gabarito.length > 0 && gabarito.every((g) => g.resposta.trim().length > 0)
  const podeCorrigir = aluno && folhaAluno && gabaritoValido

  // Pendentes = questões que precisam de revisão e ainda não têm override
  const pendentes = questoes.filter((q) => !q.revisadaManual && overrides[q.questaoOrdem] === undefined).length

  async function extrairGabarito() {
    if (!gabaritoFoto) return
    setExtraindo(true)
    setErro('')
    try {
      const res = await correcaoAvulsaService.extrairGabarito(gabaritoFoto.base64, gabaritoFoto.mime)
      setGabaritoExtraido(res.data.data)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao extrair gabarito')
    }
    setExtraindo(false)
  }

  async function corrigir() {
    if (!podeCorrigir) return
    setEtapa('processando')
    setErro('')
    try {
      const res = await correcaoAvulsaService.corrigir({
        alunoId: aluno!.id,
        titulo: titulo || undefined,
        disciplina: disciplina || undefined,
        arquivoBase64: folhaAluno!.base64,
        tipoArquivo: folhaAluno!.mime,
        gabaritoFonte: gabaritoModo,
        gabaritoBase64: gabaritoFoto?.base64,
        gabaritoMime: gabaritoFoto?.mime,
        gabarito,
      })
      setCorrecaoId(res.data.data.id)
      setQuestoes(res.data.data.questoes as ResultadoQuestao[])
      setOverrides({})
      setEtapa('revisao')
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao processar correção')
      setEtapa('configurar')
    }
  }

  function handleOverride(ordem: number, decisaoManual: boolean, statusManual: StatusCorrecaoQuestao) {
    setOverrides((prev) => ({ ...prev, [ordem]: { decisaoManual, statusManual } }))
  }

  async function confirmar() {
    if (!correcaoId) return
    setConfirmando(true)
    setErro('')
    try {
      // Envia todas as questões que têm override
      const overrideList = Object.entries(overrides).map(([ordemStr, ov]) => ({
        ordem: parseInt(ordemStr),
        decisaoManual: ov.decisaoManual,
        statusManual: ov.statusManual,
      }))

      if (overrideList.length > 0) {
        await correcaoAvulsaService.atualizarQuestoes(correcaoId, overrideList)
      }

      await correcaoAvulsaService.confirmar(correcaoId)
      setEtapa('concluido')
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao confirmar correção')
    }
    setConfirmando(false)
  }

  function reiniciar() {
    setEtapa('configurar')
    setAluno(null)
    setTitulo('')
    setDisciplina('')
    setGabaritoManual([])
    setGabaritoFoto(null)
    setGabaritoExtraido(null)
    setFolhaAluno(null)
    setCorrecaoId(null)
    setQuestoes([])
    setOverrides({})
    setErro('')
  }

  // Resumo para tela concluído
  const acertosFinal = questoes.filter((q) => {
    const ov = overrides[q.questaoOrdem]
    return ov ? ov.decisaoManual : q.correta
  }).length
  const pctFinal = questoes.length > 0 ? Math.round((acertosFinal / questoes.length) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Correção Avulsa</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fotografe a folha respondida — a IA corrige, classifica e você revisa antes de confirmar.
        </p>
      </div>

      {/* Progress */}
      {etapa !== 'configurar' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {(['configurar', 'processando', 'revisao', 'concluido'] as const).map((e, i) => {
            const labels = { configurar: 'Configurar', processando: 'Processando', revisao: 'Revisão', concluido: 'Concluído' }
            const ativo = etapa === e
            const passado = ['configurar', 'processando', 'revisao', 'concluido'].indexOf(etapa) > i
            return (
              <div key={e} className="flex items-center gap-2">
                {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                <span className={`font-medium ${ativo ? 'text-blue-600' : passado ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {labels[e]}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Processando */}
      {etapa === 'processando' && (
        <div className="flex flex-col items-center gap-4 py-20 rounded-2xl border border-blue-100 bg-blue-50">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <div className="text-center">
            <p className="font-semibold text-slate-700">Corrigindo com IA...</p>
            <p className="text-sm text-slate-500 mt-1">O Gemini está lendo a folha e classificando cada resposta</p>
          </div>
        </div>
      )}

      {/* Revisão */}
      {etapa === 'revisao' && (
        <div className="space-y-4">
          <RevisaoView questoes={questoes} overrides={overrides} onOverride={handleOverride} />

          <div className="space-y-2">
            {pendentes > 0 && (
              <p className="text-xs text-amber-700 text-center">
                Confirme as {pendentes} questão(ões) pendentes acima antes de finalizar.
              </p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={confirmar}
                disabled={confirmando || pendentes > 0}
                className="flex-1"
              >
                {confirmando
                  ? <><Loader2 size={14} className="mr-2 animate-spin" /> Confirmando...</>
                  : <><ClipboardCheck size={14} className="mr-2" /> Confirmar correção</>
                }
              </Button>
              <Button variant="outline" onClick={reiniciar}>
                <RotateCcw size={14} className="mr-2" /> Nova correção
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Concluído */}
      {etapa === 'concluido' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-6 text-center ${pctFinal >= 70 ? 'border-emerald-200 bg-emerald-50' : pctFinal >= 50 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
            <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-600" />
            <p className={`text-4xl font-bold mb-1 ${pctFinal >= 70 ? 'text-emerald-600' : pctFinal >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {pctFinal}%
            </p>
            <p className="text-sm text-slate-600">{acertosFinal} acerto(s) de {questoes.length} questão(ões)</p>
            <p className="text-xs text-slate-500 mt-1">Correção salva no histórico de <strong>{aluno?.nome}</strong></p>
          </div>
          <Button variant="outline" onClick={reiniciar} className="w-full">
            <RotateCcw size={14} className="mr-2" /> Nova correção
          </Button>
        </div>
      )}

      {/* Formulário de configuração */}
      {etapa === 'configurar' && (
        <div className="space-y-6">
          {/* Aluno */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">1</span>
              Aluno
            </h2>
            <AlunoBusca value={aluno} onChange={setAluno} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título / identificação (opcional)</label>
                <Input
                  placeholder="Ex: Ficha 4A — Setembro"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina</label>
                <select
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">— selecionar —</option>
                  <option value="matematica">Matemática</option>
                  <option value="portugues">Língua Portuguesa</option>
                  <option value="ingles">Inglês</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gabarito */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">2</span>
              Gabarito
            </h2>
            <div className="flex gap-2">
              {(['manual', 'foto'] as const).map((modo) => (
                <button
                  key={modo}
                  onClick={() => setGabaritoModo(modo)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    gabaritoModo === modo
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {modo === 'manual' ? <FileText size={13} /> : <Camera size={13} />}
                  {modo === 'manual' ? 'Digitar' : 'Foto do gabarito'}
                </button>
              ))}
            </div>

            {gabaritoModo === 'manual' && (
              <GabaritoManual itens={gabaritoManual} onChange={setGabaritoManual} />
            )}

            {gabaritoModo === 'foto' && (
              <div className="space-y-3">
                <ImageUpload
                  label="Foto do gabarito"
                  hint="Fotografe a folha de respostas corretas"
                  value={gabaritoFoto}
                  onChange={(v) => { setGabaritoFoto(v); setGabaritoExtraido(null) }}
                />
                {gabaritoFoto && !gabaritoExtraido && (
                  <Button onClick={extrairGabarito} disabled={extraindo} variant="outline" className="w-full">
                    {extraindo
                      ? <><Loader2 size={13} className="mr-2 animate-spin" /> Extraindo gabarito...</>
                      : <><Camera size={13} className="mr-2" /> Extrair gabarito com IA</>
                    }
                  </Button>
                )}
                {gabaritoExtraido && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                      <CheckCircle2 size={14} /> Gabarito extraído — revise antes de corrigir
                    </div>
                    <GabaritoManual itens={gabaritoExtraido} onChange={setGabaritoExtraido} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Folha do aluno */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">3</span>
              Folha do aluno
            </h2>
            <ImageUpload
              label="Foto da folha respondida"
              hint="Fotografe a folha com as respostas escritas pelo aluno"
              value={folhaAluno}
              onChange={setFolhaAluno}
            />
          </div>

          {!podeCorrigir && (
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
              <HelpCircle size={13} className="shrink-0 mt-0.5" />
              <span>Preencha o aluno, o gabarito e a foto da folha para habilitar a correção.</span>
            </div>
          )}

          <Button onClick={corrigir} disabled={!podeCorrigir} className="w-full" size="lg">
            <Camera size={15} className="mr-2" /> Corrigir com IA
          </Button>
        </div>
      )}
    </div>
  )
}
