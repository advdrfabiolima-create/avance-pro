import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, Plus, X, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { exerciciosService, type Exercicio } from '../../services/exercicios.service'
import { materiasService } from '../../services/materias.service'

const MATERIA_COLORS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  MAT: 'success',
  PORT: 'default',
  ING: 'warning',
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 rounded bg-muted" /></td>
      ))}
    </tr>
  )
}

// ─── Modal de criação/edição ──────────────────────────────────────────────────

interface ModalExercicioProps {
  exercicio: Exercicio | null
  onClose: () => void
  onSaved: () => void
}

function ModalExercicio({ exercicio, onClose, onSaved }: ModalExercicioProps) {
  const [materias, setMaterias] = useState<any[]>([])
  const [niveis, setNiveis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    titulo: exercicio?.titulo ?? '',
    descricao: exercicio?.descricao ?? '',
    materiaId: exercicio?.materiaId ?? '',
    nivelId: exercicio?.nivelId ?? '',
  })

  useEffect(() => {
    materiasService.listar().then((res) => {
      const lista = res.data?.data?.items ?? res.data?.data ?? []
      setMaterias(lista)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.materiaId) { setNiveis([]); return }
    const mat = materias.find((m) => m.id === form.materiaId)
    setNiveis(mat?.niveis ?? [])
    if (form.nivelId && mat?.niveis && !mat.niveis.find((n: any) => n.id === form.nivelId)) {
      setForm((f) => ({ ...f, nivelId: '' }))
    }
  }, [form.materiaId, materias])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('Título obrigatório'); return }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        materiaId: form.materiaId || undefined,
        nivelId: form.nivelId || undefined,
      }
      if (exercicio) {
        await exerciciosService.atualizar(exercicio.id, payload)
      } else {
        await exerciciosService.criar(payload)
      }
      onSaved()
    } catch {
      setError('Erro ao salvar exercício')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="font-semibold text-foreground">{exercicio ? 'Editar Exercício' : 'Novo Exercício'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Adição de frações — Nível 3A" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Instruções ou objetivos do exercício..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="materiaId">Matéria</Label>
              <select
                id="materiaId"
                value={form.materiaId}
                onChange={(e) => setForm((f) => ({ ...f, materiaId: e.target.value, nivelId: '' }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Todas —</option>
                {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nivelId">Nível</Label>
              <select
                id="nivelId"
                value={form.nivelId}
                onChange={(e) => setForm((f) => ({ ...f, nivelId: e.target.value }))}
                disabled={!form.materiaId || niveis.length === 0}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">— Todos —</option>
                {niveis.map((n: any) => <option key={n.id} value={n.id}>{n.codigo} — {n.descricao}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ExerciciosPage() {
  const navigate = useNavigate()
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Exercicio | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await exerciciosService.listar({ page, pageSize })
      const d = res.data?.data
      setExercicios(d?.items ?? [])
      setTotal(d?.total ?? 0)
    } catch {
      setExercicios([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { carregar() }, [carregar])

  async function handleExcluir(e: Exercicio) {
    if (!confirm(`Excluir o exercício "${e.titulo}"? Esta ação não pode ser desfeita.`)) return
    try {
      await exerciciosService.excluir(e.id)
      carregar()
    } catch {
      alert('Erro ao excluir exercício')
    }
  }

  const filtrados = busca
    ? exercicios.filter((e) =>
        e.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        e.materia?.nome.toLowerCase().includes(busca.toLowerCase())
      )
    : exercicios

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercícios"
        subtitle={`${total} exercício${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => { setEditando(null); setModalOpen(true) }}>
            <Plus size={15} />
            Novo Exercício
          </Button>
        }
      />

      {/* Barra de busca */}
      <div className="max-w-sm">
        <Input
          placeholder="Buscar por título ou matéria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Matéria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nível</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Questões</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tentativas</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : filtrados.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<BookMarked size={32} className="text-muted-foreground/40" />}
                      title="Nenhum exercício encontrado"
                      description={busca ? 'Tente outro termo de busca' : 'Crie o primeiro exercício clicando no botão acima'}
                    />
                  </td>
                </tr>
              )
              : filtrados.map((ex) => (
                <tr key={ex.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{ex.titulo}</span>
                    {ex.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">{ex.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ex.materia
                      ? <Badge variant={MATERIA_COLORS[ex.materia.codigo] ?? 'secondary'}>{ex.materia.nome}</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ex.nivel
                      ? <span className="text-xs">{ex.nivel.codigo} — {ex.nivel.descricao}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium">{ex._count?.questoes ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-muted-foreground">{ex._count?.tentativas ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/exercicios/${ex.id}`)}
                        title="Ver / Editar questões"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditando(ex); setModalOpen(true) }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleExcluir(ex)}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalExercicio
          exercicio={editando}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); carregar() }}
        />
      )}
    </div>
  )
}
