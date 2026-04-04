import { useState, useRef, useCallback } from 'react'
import {
  Camera, FileText, Plus, Trash2, CheckCircle2, XCircle,
  AlertCircle, Loader2, Save, RotateCcw, Upload, HelpCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { alunosService } from '../../services/alunos.service'
import {
  correcaoAvulsaService,
  type GabaritoItem,
  type ResultadoCorrecao,
} from '../../services/correcao-avulsa.service'

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

// ─── Componente de upload de imagem ──────────────────────────────────────────

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

// ─── Gabarito manual ─────────────────────────────────────────────────────────

interface GabaritoManualProps {
  itens: GabaritoItem[]
  onChange: (itens: GabaritoItem[]) => void
}

function GabaritoManual({ itens, onChange }: GabaritoManualProps) {
  function addQuestao() {
    const prox = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1
    onChange([...itens, { ordem: prox, tipo: 'objetiva', resposta: '' }])
  }

  function remove(idx: number) {
    onChange(itens.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: keyof GabaritoItem, value: string) {
    const next = [...itens]
    if (field === 'ordem') {
      next[idx] = { ...next[idx]!, ordem: parseInt(value) || next[idx]!.ordem }
    } else if (field === 'resposta') {
      const tipo = inferirTipo(value)
      next[idx] = { ...next[idx]!, resposta: value, tipo }
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
          Nenhuma questão adicionada. Clique em "Adicionar questão".
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

// ─── Resultado ────────────────────────────────────────────────────────────────

function ResultadoView({ resultado }: { resultado: ResultadoCorrecao }) {
  const pct = resultado.percentual
  const cor = pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
  const bgCor = pct >= 70 ? 'bg-emerald-50 border-emerald-200' : pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className={`rounded-xl border p-4 ${bgCor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${cor}`}>{pct}%</p>
            <p className="text-sm text-slate-600 mt-0.5">
              {resultado.acertos} acerto(s) de {resultado.totalQuestoes} questão(ões)
            </p>
          </div>
          <div className="text-right text-sm text-slate-500 space-y-0.5">
            <p><span className="font-medium text-emerald-600">{resultado.acertos}</span> corretas</p>
            <p><span className="font-medium text-red-500">{resultado.erros}</span> erradas</p>
            {resultado.naoDetectadas > 0 && (
              <p><span className="font-medium text-amber-500">{resultado.naoDetectadas}</span> não detectadas</p>
            )}
          </div>
        </div>
      </div>

      {/* Por questão */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {resultado.questoes.map((q) => (
          <div
            key={q.questaoOrdem}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
              q.respostaAluno === null
                ? 'border-amber-200 bg-amber-50'
                : q.correta
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            {q.respostaAluno === null ? (
              <AlertCircle size={15} className="text-amber-500 shrink-0" />
            ) : q.correta ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            ) : (
              <XCircle size={15} className="text-red-500 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-600 w-14 shrink-0">Q{q.questaoOrdem}</span>
            <div className="flex-1 flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                Gabarito: <span className="font-semibold text-slate-700">{q.respostaGabarito}</span>
              </span>
              <span className="text-slate-500">
                Aluno:{' '}
                <span className={`font-semibold ${q.respostaAluno === null ? 'text-amber-600' : q.correta ? 'text-emerald-700' : 'text-red-600'}`}>
                  {q.respostaAluno ?? '—'}
                </span>
              </span>
              {q.confianca !== null && (
                <span className="text-slate-400 ml-auto">
                  {Math.round(q.confianca * 100)}% conf.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Busca de aluno ───────────────────────────────────────────────────────────

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

// ─── Página principal ────────────────────────────────────────────────────────

type Etapa = 'configurar' | 'processando' | 'resultado'
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
  const [resultado, setResultado] = useState<ResultadoCorrecao | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const gabarito: GabaritoItem[] =
    gabaritoModo === 'manual'
      ? gabaritoManual
      : (gabaritoExtraido ?? [])

  const gabaritoValido = gabarito.length > 0 && gabarito.every((g) => g.resposta.trim().length > 0)
  const podeCorrigir = aluno && folhaAluno && gabaritoValido

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
      const res = await correcaoAvulsaService.processar(folhaAluno!.base64, folhaAluno!.mime, gabarito)
      setResultado(res.data.data)
      setEtapa('resultado')
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao processar correção')
      setEtapa('configurar')
    }
  }

  async function salvar() {
    if (!resultado || !aluno || !folhaAluno) return
    setSalvando(true)
    try {
      await correcaoAvulsaService.salvar({
        alunoId: aluno.id,
        titulo: titulo || undefined,
        disciplina: disciplina || undefined,
        arquivoBase64: folhaAluno.base64,
        tipoArquivo: folhaAluno.mime,
        gabaritoFonte: gabaritoModo,
        gabarito,
        resultadoJson: resultado,
      })
      setSalvo(true)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao salvar')
    }
    setSalvando(false)
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
    setResultado(null)
    setErro('')
    setSalvo(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Correção Avulsa</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fotografe a folha respondida pelo aluno — a IA compara com o gabarito e corrige automaticamente.
        </p>
      </div>

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
            <p className="text-sm text-slate-500 mt-1">O Gemini está lendo a folha e comparando com o gabarito</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {etapa === 'resultado' && resultado && (
        <div className="space-y-4">
          <ResultadoView resultado={resultado} />

          {!salvo ? (
            <div className="flex gap-3">
              <Button onClick={salvar} disabled={salvando} className="flex-1">
                {salvando ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                Salvar no histórico de {aluno?.nome}
              </Button>
              <Button variant="outline" onClick={reiniciar}>
                <RotateCcw size={14} className="mr-2" /> Nova correção
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 font-medium">Correção salva no histórico do aluno.</span>
              </div>
              <Button variant="outline" onClick={reiniciar} className="w-full">
                <RotateCcw size={14} className="mr-2" /> Nova correção
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina (opcional)</label>
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

            {/* Seletor de modo */}
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
                  hint="Fotografe a folha de respostas corretas do Kumon"
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

          {/* Dica */}
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
