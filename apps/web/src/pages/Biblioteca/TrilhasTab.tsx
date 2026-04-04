import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, BookMarked, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { trilhasService, bibliotecaService, type TrilhaPedagogica, type TrilhaDetalhe, type Disciplina } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DISCIPLINA_COLORS, STATUS_LABEL, STATUS_COLORS, NIVEIS } from './helpers'

const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

function TrilhaFormModal({ trilha, onClose, onSaved }: { trilha: TrilhaPedagogica | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: trilha?.nome ?? '', disciplina: (trilha?.disciplina ?? 'matematica') as Disciplina, descricao: trilha?.descricao ?? '', nivelInicio: trilha?.nivelInicio ?? 'A', nivelFim: trilha?.nivelFim ?? 'F' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (trilha) {
        await trilhasService.atualizar(trilha.id, form)
      } else {
        await trilhasService.criar(form)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar trilha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{trilha ? 'Editar Trilha' : 'Nova Trilha'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome da trilha" required />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Disciplina</Label>
            <select className={selectCls} value={form.disciplina} onChange={(e) => setForm(p => ({ ...p, disciplina: e.target.value as Disciplina }))}>
              {(Object.entries(DISCIPLINA_LABEL) as [Disciplina, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nível início</Label>
              <select className={selectCls} value={form.nivelInicio} onChange={(e) => setForm(p => ({ ...p, nivelInicio: e.target.value }))}>
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nível fim</Label>
              <select className={selectCls} value={form.nivelFim} onChange={(e) => setForm(p => ({ ...p, nivelFim: e.target.value }))}>
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Descrição</Label>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              rows={2} value={form.descricao} onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional..." />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : trilha ? 'Salvar' : 'Criar trilha'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TrilhasTab() {
  const [trilhas, setTrilhas] = useState<TrilhaPedagogica[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [trilhaEmEdicao, setTrilhaEmEdicao] = useState<TrilhaPedagogica | null>(null)
  const [trilhaExpandida, setTrilhaExpandida] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<TrilhaDetalhe | null>(null)
  const [addExercicioId, setAddExercicioId] = useState('')
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<any[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await trilhasService.listar()
      setTrilhas(res.data.data.items)
      setError(null)
    } catch {
      setError('Erro ao carregar trilhas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function expandir(id: string) {
    if (trilhaExpandida === id) { setTrilhaExpandida(null); setDetalhe(null); return }
    setTrilhaExpandida(id)
    try {
      const res = await trilhasService.buscarPorId(id)
      setDetalhe(res.data.data)
    } catch {}
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir trilha?')) return
    try {
      await trilhasService.excluir(id)
      carregar()
    } catch {}
  }

  async function handleAdicionarExercicio(trilhaId: string) {
    if (!addExercicioId.trim()) return
    try {
      const ordemIndex = (detalhe?.itens.length ?? 0)
      await trilhasService.adicionarItem(trilhaId, addExercicioId, ordemIndex)
      setAddExercicioId('')
      const res = await trilhasService.buscarPorId(trilhaId)
      setDetalhe(res.data.data)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro')
    }
  }

  async function handleRemoverItem(trilhaId: string, exercicioId: string) {
    try {
      await trilhasService.removerItem(trilhaId, exercicioId)
      const res = await trilhasService.buscarPorId(trilhaId)
      setDetalhe(res.data.data)
    } catch {}
  }

  async function handleMover(trilhaId: string, idx: number, dir: 'up' | 'down') {
    if (!detalhe) return
    const itens = [...detalhe.itens]
    const outro = dir === 'up' ? idx - 1 : idx + 1
    if (outro < 0 || outro >= itens.length) return
    const reordenados = itens.map((item, i) => {
      if (i === idx) return { ...item, ordemIndex: itens[outro]!.ordemIndex }
      if (i === outro) return { ...item, ordemIndex: item.ordemIndex }
      return item
    })
    const payload = reordenados.map((item) => ({ id: item.id, ordemIndex: item.ordemIndex === itens[outro]!.ordemIndex && item !== reordenados[idx] ? itens[idx]!.ordemIndex : item.ordemIndex }))
    // Swap simples
    const a = itens[idx]!.ordemIndex
    const b = itens[outro]!.ordemIndex
    try {
      await trilhasService.reordenar(trilhaId, [{ id: itens[idx]!.id, ordemIndex: b }, { id: itens[outro]!.id, ordemIndex: a }])
      const res = await trilhasService.buscarPorId(trilhaId)
      setDetalhe(res.data.data)
    } catch {}
  }

  async function buscarExercicios(q: string) {
    if (!q.trim()) { setSugestoes([]); return }
    try {
      const res = await bibliotecaService.listar({ busca: q, pageSize: 5, status: 'publicado' })
      setSugestoes(res.data.data.items)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{trilhas.length} trilha(s) cadastrada(s)</p>
        <Button size="sm" onClick={() => { setTrilhaEmEdicao(null); setFormOpen(true) }}>
          <Plus size={14} className="mr-1.5" /> Nova Trilha
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : trilhas.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-slate-200 py-12 text-center">
          <BookMarked size={28} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Nenhuma trilha cadastrada</p>
          <p className="text-xs text-slate-400 mt-1">Crie uma trilha pedagógica para organizar exercícios em sequência</p>
          <Button size="sm" className="mt-4" onClick={() => { setTrilhaEmEdicao(null); setFormOpen(true) }}>
            <Plus size={13} className="mr-1.5" /> Nova trilha
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {trilhas.map((trilha) => (
            <div key={trilha.id} className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-3.5">
                <button onClick={() => expandir(trilha.id)} className="flex-1 flex items-center gap-3 text-left">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{trilha.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DISCIPLINA_COLORS[trilha.disciplina]}`}>
                        {DISCIPLINA_LABEL[trilha.disciplina]}
                      </span>
                      <span className="text-[11px] text-slate-400">Nível {trilha.nivelInicio} → {trilha.nivelFim}</span>
                      <span className="text-[11px] text-slate-400">{trilha._count?.itens ?? 0} exercício(s)</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[trilha.status]}`}>
                        {STATUS_LABEL[trilha.status]}
                      </span>
                    </div>
                  </div>
                  {trilhaExpandida === trilha.id ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => { setTrilhaEmEdicao(trilha); setFormOpen(true) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleExcluir(trilha.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {trilhaExpandida === trilha.id && detalhe && detalhe.id === trilha.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
                  {/* Adicionar exercício */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Buscar exercício para adicionar..."
                        value={busca}
                        onChange={(e) => { setBusca(e.target.value); buscarExercicios(e.target.value) }}
                        onFocus={() => buscarExercicios(busca)}
                      />
                      {sugestoes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
                          {sugestoes.map((s) => (
                            <button key={s.id} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                              onClick={() => { setAddExercicioId(s.id); setBusca(s.enunciado.slice(0, 60)); setSugestoes([]) }}>
                              <span className="font-medium">{s.enunciado.slice(0, 80)}</span>
                              <span className="text-slate-400 ml-2">{s.topico} · Nível {s.nivel}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAdicionarExercicio(trilha.id)} disabled={!addExercicioId}>
                      <Plus size={13} className="mr-1" /> Adicionar
                    </Button>
                  </div>

                  {/* Lista de itens */}
                  {detalhe.itens.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum exercício na trilha ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detalhe.itens.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                          <span className="text-xs font-semibold text-slate-400 w-5 text-center">{idx + 1}</span>
                          <p className="flex-1 text-xs text-slate-700 truncate">{item.exercicio.enunciado}</p>
                          <span className="text-[10px] text-slate-400">{item.exercicio.topico} · {item.exercicio.nivel}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleMover(trilha.id, idx, 'up')} disabled={idx === 0} className="rounded p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0 transition-colors">
                              <ArrowUp size={12} />
                            </button>
                            <button onClick={() => handleMover(trilha.id, idx, 'down')} disabled={idx === detalhe.itens.length - 1} className="rounded p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0 transition-colors">
                              <ArrowDown size={12} />
                            </button>
                            <button onClick={() => handleRemoverItem(trilha.id, item.exercicio.id)} className="rounded p-1 text-slate-300 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <TrilhaFormModal
          trilha={trilhaEmEdicao}
          onClose={() => { setFormOpen(false); setTrilhaEmEdicao(null) }}
          onSaved={() => { setFormOpen(false); setTrilhaEmEdicao(null); carregar() }}
        />
      )}
    </div>
  )
}
