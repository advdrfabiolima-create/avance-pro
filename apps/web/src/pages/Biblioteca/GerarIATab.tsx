import { useState } from 'react'
import { Sparkles, CheckCircle, Trash2, Pencil, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { bibliotecaService, type ExercicioGerado, type Disciplina, type Dificuldade, type TipoExercicio } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DIFICULDADE_LABEL, TIPO_LABEL, DIFICULDADE_COLORS, DISCIPLINA_COLORS, NIVEIS } from './helpers'

const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

export default function GerarIATab() {
  const [form, setForm] = useState({
    disciplina: 'matematica' as Disciplina,
    topico: '',
    subtopico: '',
    nivel: 'C',
    dificuldade: 'medio' as Dificuldade,
    tipo: 'objetivo' as TipoExercicio,
    quantidade: 3,
  })
  const [gerando, setGerando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [gerados, setGerados] = useState<ExercicioGerado[]>([])
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleGerar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topico.trim()) { setError('Informe o tópico'); return }
    setGerando(true)
    setError(null)
    setSuccess(null)
    setGerados([])
    setSelecionados(new Set())
    try {
      const res = await bibliotecaService.gerarIA({
        disciplina: form.disciplina,
        topico: form.topico,
        subtopico: form.subtopico || undefined,
        nivel: form.nivel,
        dificuldade: form.dificuldade,
        tipo: form.tipo,
        quantidade: form.quantidade,
      })
      setGerados(res.data.data)
      setSelecionados(new Set(res.data.data.map((_, i) => i)))
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao gerar exercícios')
    } finally {
      setGerando(false)
    }
  }

  async function handleSalvar() {
    const para_salvar = gerados.filter((_, i) => selecionados.has(i))
    if (para_salvar.length === 0) { setError('Selecione ao menos um exercício'); return }
    setSalvando(true)
    setError(null)
    try {
      await bibliotecaService.salvarGerados(para_salvar)
      setSuccess(`${para_salvar.length} exercício(s) salvos como rascunho. Acesse a aba "Biblioteca" para revisar e publicar.`)
      setGerados([])
      setSelecionados(new Set())
    } catch {
      setError('Erro ao salvar exercícios')
    } finally {
      setSalvando(false)
    }
  }

  function toggleSelect(i: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function editarCampo(idx: number, campo: keyof ExercicioGerado, valor: any) {
    setGerados((prev) => prev.map((ex, i) => i === idx ? { ...ex, [campo]: valor } : ex))
  }

  return (
    <div className="space-y-5">
      {/* Header explicativo */}
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <Sparkles size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Geração assistida por IA</p>
            <p className="text-sm text-slate-500 mt-0.5">Configure os parâmetros e gere exercícios automaticamente. Todos os gerados entram como <strong>rascunho</strong> e precisam de revisão antes de publicar.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Formulário */}
        <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Parâmetros da geração</h3>
          <form onSubmit={handleGerar} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Disciplina</Label>
              <select className={selectCls} value={form.disciplina} onChange={(e) => set('disciplina', e.target.value as Disciplina)}>
                {(Object.entries(DISCIPLINA_LABEL) as [Disciplina, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tópico *</Label>
              <Input value={form.topico} onChange={(e) => set('topico', e.target.value)} placeholder="Ex: Frações, Verb to be..." required />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subtópico (opcional)</Label>
              <Input value={form.subtopico} onChange={(e) => set('subtopico', e.target.value)} placeholder="Ex: Adição de frações..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nível</Label>
                <select className={selectCls} value={form.nivel} onChange={(e) => set('nivel', e.target.value)}>
                  {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dificuldade</Label>
                <select className={selectCls} value={form.dificuldade} onChange={(e) => set('dificuldade', e.target.value as Dificuldade)}>
                  {(Object.entries(DIFICULDADE_LABEL) as [Dificuldade, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</Label>
                <select className={selectCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoExercicio)}>
                  {(Object.entries(TIPO_LABEL) as [TipoExercicio, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quantidade (máx. 10)</Label>
                <Input type="number" min={1} max={10} value={form.quantidade} onChange={(e) => set('quantidade', parseInt(e.target.value) || 1)} />
              </div>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
                <CheckCircle size={15} className="mt-0.5 shrink-0" />{success}
              </div>
            )}

            <Button type="submit" disabled={gerando} className="w-full">
              <Sparkles size={14} className="mr-2" />
              {gerando ? 'Gerando...' : 'Gerar exercícios'}
            </Button>
          </form>
        </div>

        {/* Preview dos gerados */}
        <div className="space-y-3">
          {gerados.length === 0 ? (
            <div className="rounded-xl bg-white border border-dashed border-slate-200 p-8 text-center">
              <Sparkles size={28} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Os exercícios gerados aparecerão aqui para revisão antes de salvar.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{gerados.length} exercício(s) gerado(s)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelecionados(new Set(gerados.map((_, i) => i)))}>
                    Selecionar todos
                  </Button>
                  <Button size="sm" disabled={salvando || selecionados.size === 0} onClick={handleSalvar}>
                    <Save size={13} className="mr-1.5" />
                    {salvando ? 'Salvando...' : `Salvar ${selecionados.size} como rascunho`}
                  </Button>
                </div>
              </div>

              {gerados.map((ex, idx) => (
                <div key={idx} className={`rounded-xl bg-white border shadow-sm overflow-hidden transition-all ${selecionados.has(idx) ? 'border-blue-200' : 'border-slate-100 opacity-60'}`}>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                    <input type="checkbox" checked={selecionados.has(idx)} onChange={() => toggleSelect(idx)}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DISCIPLINA_COLORS[ex.disciplina]}`}>
                        {DISCIPLINA_LABEL[ex.disciplina]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFICULDADE_COLORS[ex.dificuldade]}`}>
                        {DIFICULDADE_LABEL[ex.dificuldade]}
                      </span>
                      <span className="text-xs text-slate-400">{ex.topico} · Nível {ex.nivel}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditandoIdx(editandoIdx === idx ? null : idx)} className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => { setGerados((p) => p.filter((_, i) => i !== idx)); setSelecionados((p) => { const n = new Set(p); n.delete(idx); return n }) }}
                        className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {editandoIdx === idx ? (
                      <div className="space-y-2">
                        <textarea className="w-full text-sm rounded border border-slate-200 px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400" rows={2}
                          value={ex.enunciado} onChange={(e) => editarCampo(idx, 'enunciado', e.target.value)} />
                        <Input className="text-xs" value={ex.resposta} onChange={(e) => editarCampo(idx, 'resposta', e.target.value)} placeholder="Resposta" />
                        <textarea className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400" rows={1}
                          value={ex.explicacao} onChange={(e) => editarCampo(idx, 'explicacao', e.target.value)} />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-700 leading-snug">{ex.enunciado}</p>
                        {ex.opcoes && (
                          <div className="grid grid-cols-2 gap-1">
                            {(ex.opcoes as string[]).map((op, i) => (
                              <span key={i} className={`text-xs rounded px-2 py-1 ${op === ex.resposta ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200' : 'bg-slate-50 text-slate-500'}`}>
                                {String.fromCharCode(65 + i)}) {op}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 italic">{ex.explicacao}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
