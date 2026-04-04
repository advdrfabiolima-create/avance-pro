import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Eye, Pencil, Copy, Archive, RefreshCw, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { bibliotecaService, type BibExercicioLista, type FiltrosBiblioteca, type Disciplina, type Dificuldade, type TipoExercicio, type StatusBib, type BibExercicio } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DIFICULDADE_LABEL, TIPO_LABEL, STATUS_LABEL, STATUS_COLORS, DIFICULDADE_COLORS, DISCIPLINA_COLORS } from './helpers'
import ExercicioFormModal from './ExercicioFormModal'
import RevisaoModal from './RevisaoModal'

const selectCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

export default function BibliotecaTab() {
  const [items, setItems] = useState<BibExercicioLista[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [page, setPage] = useState(1)
  const [filtros, setFiltros] = useState<FiltrosBiblioteca>({})
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [exercicioEmEdicao, setExercicioEmEdicao] = useState<BibExercicio | null>(null)
  const [revisaoEx, setRevisaoEx] = useState<BibExercicio | null>(null)
  const [revisaoLoading, setRevisaoLoading] = useState(false)

  const [metricas, setMetricas] = useState({ publicados: 0, rascunhos: 0, total: 0 })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await bibliotecaService.listar({ ...filtros, busca: busca || undefined, page, pageSize: 20 })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
      setTotalPaginas(res.data.data.totalPaginas)
      setError(null)
    } catch {
      setError('Erro ao carregar exercícios')
    } finally {
      setLoading(false)
    }
  }, [filtros, busca, page])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    bibliotecaService.metricas().then((res) => {
      const porStatus = res.data.data.porStatus
      const pub = porStatus.find((s: any) => s.status === 'publicado')?._count ?? 0
      const rasc = porStatus.find((s: any) => s.status === 'rascunho')?._count ?? 0
      setMetricas({ publicados: pub, rascunhos: rasc, total: res.data.data.total })
    }).catch(() => {})
  }, [items])

  function setFiltro<K extends keyof FiltrosBiblioteca>(k: K, v: FiltrosBiblioteca[K]) {
    setFiltros((prev) => ({ ...prev, [k]: v || undefined }))
    setPage(1)
  }

  async function handleRevisar(id: string) {
    try {
      const res = await bibliotecaService.buscarPorId(id)
      setRevisaoEx(res.data.data)
    } catch {}
  }

  async function handlePublicar(id: string) {
    setRevisaoLoading(true)
    try {
      await bibliotecaService.revisar(id, 'publicar')
      setRevisaoEx(null)
      carregar()
    } catch {} finally {
      setRevisaoLoading(false)
    }
  }

  async function handleArquivar(id: string) {
    setRevisaoLoading(true)
    try {
      await bibliotecaService.revisar(id, 'arquivar')
      setRevisaoEx(null)
      carregar()
    } catch {} finally {
      setRevisaoLoading(false)
    }
  }

  async function handleDuplicar(id: string) {
    try {
      await bibliotecaService.duplicar(id)
      carregar()
    } catch {}
  }

  async function handleEditar(id: string) {
    try {
      const res = await bibliotecaService.buscarPorId(id)
      setExercicioEmEdicao(res.data.data)
      setFormOpen(true)
      setRevisaoEx(null)
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total na biblioteca', value: metricas.total, color: 'text-slate-700' },
          { label: 'Publicados', value: metricas.publicados, color: 'text-emerald-600' },
          { label: 'Rascunhos', value: metricas.rascunhos, color: 'text-amber-600' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{m.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-8 text-sm"
              placeholder="Buscar por enunciado, tópico..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1) }}
            />
          </div>
          <select className={selectCls} value={filtros.disciplina ?? ''} onChange={(e) => setFiltro('disciplina', e.target.value as Disciplina)}>
            <option value="">Todas disciplinas</option>
            {(Object.entries(DISCIPLINA_LABEL) as [Disciplina, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={filtros.dificuldade ?? ''} onChange={(e) => setFiltro('dificuldade', e.target.value as Dificuldade)}>
            <option value="">Dificuldade</option>
            {(Object.entries(DIFICULDADE_LABEL) as [Dificuldade, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={filtros.tipo ?? ''} onChange={(e) => setFiltro('tipo', e.target.value as TipoExercicio)}>
            <option value="">Tipo</option>
            {(Object.entries(TIPO_LABEL) as [TipoExercicio, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={filtros.status ?? ''} onChange={(e) => setFiltro('status', e.target.value as StatusBib)}>
            <option value="">Status</option>
            {(Object.entries(STATUS_LABEL) as [StatusBib, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={filtros.origem ?? ''} onChange={(e) => setFiltro('origem', e.target.value as any)}>
            <option value="">Origem</option>
            <option value="manual">Manual</option>
            <option value="ia">IA</option>
          </select>
          <Button size="sm" onClick={() => { setFormOpen(true); setExercicioEmEdicao(null) }}>
            <Plus size={14} className="mr-1.5" /> Novo
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Lista */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-2/5" />
                <div className="h-4 bg-slate-100 rounded w-1/6" />
                <div className="h-4 bg-slate-100 rounded w-1/6" />
                <div className="ml-auto h-4 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <BookOpen size={22} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">Nenhum exercício encontrado</p>
            <p className="text-sm text-slate-400 mt-1">Ajuste os filtros ou crie um novo exercício</p>
            <Button size="sm" className="mt-4" onClick={() => { setFormOpen(true); setExercicioEmEdicao(null) }}>
              <Plus size={13} className="mr-1.5" /> Criar exercício
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Enunciado</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Disciplina</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tópico</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nível</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dificuldade</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="truncate text-slate-700 font-medium leading-snug" title={item.enunciado}>{item.enunciado}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {(item.tags as string[]).slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">{t}</span>
                        ))}
                        {item.origem === 'ia' && (
                          <span className="rounded-full bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 text-[10px] font-medium">IA</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DISCIPLINA_COLORS[item.disciplina]}`}>
                        {DISCIPLINA_LABEL[item.disciplina]}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 text-[13px]">{item.topico}</td>
                    <td className="px-3 py-3.5">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{item.nivel}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFICULDADE_COLORS[item.dificuldade]}`}>
                        {DIFICULDADE_LABEL[item.dificuldade]}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRevisar(item.id)} title="Revisar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleEditar(item.id)} title="Editar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDuplicar(item.id)} title="Duplicar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => handleArquivar(item.id)} title="Arquivar" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Archive size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
                <span className="text-xs text-slate-400">{total} exercícios</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    ← Anterior
                  </button>
                  <span className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50">{page} / {totalPaginas}</span>
                  <button disabled={page === totalPaginas} onClick={() => setPage(p => p + 1)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {formOpen && (
        <ExercicioFormModal
          exercicio={exercicioEmEdicao}
          onClose={() => { setFormOpen(false); setExercicioEmEdicao(null) }}
          onSaved={() => { setFormOpen(false); setExercicioEmEdicao(null); carregar() }}
        />
      )}

      {revisaoEx && (
        <RevisaoModal
          exercicio={revisaoEx}
          onClose={() => setRevisaoEx(null)}
          onPublicar={handlePublicar}
          onArquivar={handleArquivar}
          onEditar={(ex) => { handleEditar(ex.id) }}
          loading={revisaoLoading}
        />
      )}
    </div>
  )
}
