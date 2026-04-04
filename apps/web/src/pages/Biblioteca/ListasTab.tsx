import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, X, Send, Import, ClipboardList, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { listasService, bibliotecaService, trilhasService, type ListaExercicio, type Disciplina } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DISCIPLINA_COLORS, STATUS_LABEL, STATUS_COLORS } from './helpers'

const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

function ListaFormModal({ lista, onClose, onSaved }: { lista: ListaExercicio | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ titulo: lista?.titulo ?? '', disciplina: (lista?.disciplina ?? '') as Disciplina | '', descricao: lista?.descricao ?? '', destinatario: (lista?.destinatario ?? 'aluno') as 'aluno' | 'turma' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = { ...form, disciplina: form.disciplina || undefined }
      if (lista) {
        await listasService.atualizar(lista.id, payload)
      } else {
        await listasService.criar(payload as any)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar lista')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{lista ? 'Editar Lista' : 'Nova Lista'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Lista de Frações — Nível D" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Disciplina</Label>
              <select className={selectCls} value={form.disciplina} onChange={(e) => setForm(p => ({ ...p, disciplina: e.target.value as Disciplina | '' }))}>
                <option value="">Todas</option>
                {(Object.entries(DISCIPLINA_LABEL) as [Disciplina, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Destinatário</Label>
              <select className={selectCls} value={form.destinatario} onChange={(e) => setForm(p => ({ ...p, destinatario: e.target.value as 'aluno' | 'turma' }))}>
                <option value="aluno">Aluno</option>
                <option value="turma">Turma</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Descrição</Label>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              rows={2} value={form.descricao} onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : lista ? 'Salvar' : 'Criar lista'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ListasTab() {
  const [listas, setListas] = useState<ListaExercicio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [listaEmEdicao, setListaEmEdicao] = useState<ListaExercicio | null>(null)
  const [listaExpandida, setListaExpandida] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<any | null>(null)
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState<any[]>([])
  const [addExercicioId, setAddExercicioId] = useState('')
  const [trilhas, setTrilhas] = useState<any[]>([])
  const [trilhaImportId, setTrilhaImportId] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listasService.listar()
      setListas(res.data.data.items)
      setError(null)
    } catch {
      setError('Erro ao carregar listas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    trilhasService.listar({ status: 'publicado' }).then((res) => setTrilhas(res.data.data.items)).catch(() => {})
  }, [])

  async function expandir(id: string) {
    if (listaExpandida === id) { setListaExpandida(null); setDetalhe(null); return }
    setListaExpandida(id)
    try {
      const res = await listasService.buscarPorId(id)
      setDetalhe(res.data.data)
    } catch {}
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir lista?')) return
    try {
      await listasService.excluir(id)
      carregar()
    } catch {}
  }

  async function handlePublicar(id: string) {
    try {
      await listasService.publicar(id)
      carregar()
    } catch {}
  }

  async function buscarExercicios(q: string) {
    if (!q.trim()) { setSugestoes([]); return }
    try {
      const res = await bibliotecaService.listar({ busca: q, pageSize: 5 })
      setSugestoes(res.data.data.items)
    } catch {}
  }

  async function handleAdicionarExercicio(listaId: string) {
    if (!addExercicioId) return
    try {
      const ordemIndex = detalhe?.itens?.length ?? 0
      await listasService.adicionarItem(listaId, addExercicioId, ordemIndex)
      setAddExercicioId(''); setBusca(''); setSugestoes([])
      const res = await listasService.buscarPorId(listaId)
      setDetalhe(res.data.data)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro')
    }
  }

  async function handleRemoverItem(listaId: string, exercicioId: string) {
    try {
      await listasService.removerItem(listaId, exercicioId)
      const res = await listasService.buscarPorId(listaId)
      setDetalhe(res.data.data)
    } catch {}
  }

  async function handleImportarTrilha(listaId: string) {
    if (!trilhaImportId) return
    try {
      const res = await listasService.importarTrilha(listaId, trilhaImportId)
      alert(`${(res.data as any).data?.importados ?? 0} exercício(s) importado(s)!`)
      setTrilhaImportId('')
      const det = await listasService.buscarPorId(listaId)
      setDetalhe(det.data.data)
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Erro ao importar')
    }
  }

  async function handleMover(listaId: string, idx: number, dir: 'up' | 'down') {
    if (!detalhe?.itens) return
    const itens = detalhe.itens
    const outro = dir === 'up' ? idx - 1 : idx + 1
    if (outro < 0 || outro >= itens.length) return
    const a = itens[idx].ordemIndex
    const b = itens[outro].ordemIndex
    try {
      // Swap via two updates (API doesn't have a batch endpoint per list items, do it individually)
      await (listasService as any).reordenar?.(listaId, [{ id: itens[idx].id, ordemIndex: b }, { id: itens[outro].id, ordemIndex: a }])
      const res = await listasService.buscarPorId(listaId)
      setDetalhe(res.data.data)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{listas.length} lista(s) cadastrada(s)</p>
        <Button size="sm" onClick={() => { setListaEmEdicao(null); setFormOpen(true) }}>
          <Plus size={14} className="mr-1.5" /> Nova Lista
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : listas.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-slate-200 py-12 text-center">
          <ClipboardList size={28} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Nenhuma lista cadastrada</p>
          <p className="text-xs text-slate-400 mt-1">Monte listas de exercícios para atribuir a alunos ou turmas</p>
          <Button size="sm" className="mt-4" onClick={() => { setListaEmEdicao(null); setFormOpen(true) }}>
            <Plus size={13} className="mr-1.5" /> Nova lista
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {listas.map((lista) => (
            <div key={lista.id} className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-3.5">
                <button onClick={() => expandir(lista.id)} className="flex-1 flex items-center gap-3 text-left">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{lista.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lista.disciplina && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DISCIPLINA_COLORS[lista.disciplina]}`}>
                          {DISCIPLINA_LABEL[lista.disciplina]}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 capitalize">{lista.destinatario}</span>
                      <span className="text-[11px] text-slate-400">{lista._count?.itens ?? 0} exercício(s)</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[lista.status]}`}>
                        {STATUS_LABEL[lista.status]}
                      </span>
                    </div>
                  </div>
                  {listaExpandida === lista.id ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </button>
                <div className="flex gap-1">
                  {lista.status === 'rascunho' && (
                    <button onClick={() => handlePublicar(lista.id)} title="Publicar" className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={() => { setListaEmEdicao(lista); setFormOpen(true) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleExcluir(lista.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {listaExpandida === lista.id && detalhe && detalhe.id === lista.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
                  {/* Adicionar exercício */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input placeholder="Buscar exercício para adicionar..."
                        value={busca}
                        onChange={(e) => { setBusca(e.target.value); buscarExercicios(e.target.value) }} />
                      {sugestoes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
                          {sugestoes.map((s) => (
                            <button key={s.id} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                              onClick={() => { setAddExercicioId(s.id); setBusca(s.enunciado.slice(0, 60)); setSugestoes([]) }}>
                              <span className="font-medium">{s.enunciado.slice(0, 80)}</span>
                              <span className="text-slate-400 ml-2">{s.topico} · {s.nivel}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAdicionarExercicio(lista.id)} disabled={!addExercicioId}>
                      <Plus size={13} className="mr-1" /> Adicionar
                    </Button>
                  </div>

                  {/* Importar de trilha */}
                  {trilhas.length > 0 && (
                    <div className="flex gap-2 items-center">
                      <select className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                        value={trilhaImportId} onChange={(e) => setTrilhaImportId(e.target.value)}>
                        <option value="">Importar exercícios de uma trilha...</option>
                        {trilhas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                      <Button variant="outline" size="sm" onClick={() => handleImportarTrilha(lista.id)} disabled={!trilhaImportId}>
                        <Import size={13} className="mr-1" /> Importar
                      </Button>
                    </div>
                  )}

                  {/* Itens */}
                  {detalhe.itens?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum exercício na lista ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detalhe.itens?.map((item: any, idx: number) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                          <span className="text-xs font-semibold text-slate-400 w-5 text-center">{idx + 1}</span>
                          <p className="flex-1 text-xs text-slate-700 truncate">{item.exercicio.enunciado}</p>
                          <span className="text-[10px] text-slate-400">{item.exercicio.topico} · {item.exercicio.nivel}</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleMover(lista.id, idx, 'up')} disabled={idx === 0} className="rounded p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0">
                              <ArrowUp size={12} />
                            </button>
                            <button onClick={() => handleMover(lista.id, idx, 'down')} disabled={idx === detalhe.itens.length - 1} className="rounded p-1 text-slate-300 hover:text-slate-600 disabled:opacity-0">
                              <ArrowDown size={12} />
                            </button>
                            <button onClick={() => handleRemoverItem(lista.id, item.exercicio.id)} className="rounded p-1 text-slate-300 hover:text-red-500">
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
        <ListaFormModal
          lista={listaEmEdicao}
          onClose={() => { setFormOpen(false); setListaEmEdicao(null) }}
          onSaved={() => { setFormOpen(false); setListaEmEdicao(null); carregar() }}
        />
      )}
    </div>
  )
}
