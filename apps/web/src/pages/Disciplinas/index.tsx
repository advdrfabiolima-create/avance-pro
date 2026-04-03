import { useState, useEffect } from 'react'
import { BookOpen, ChevronRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { materiasService, type Materia } from '../../services/materias.service'

const CORES_MATERIA: Record<string, string> = {
  MAT: 'bg-blue-50 border-blue-200 text-blue-700',
  PORT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  ING: 'bg-amber-50 border-amber-200 text-amber-700',
}

const DESCRICAO_MATERIA: Record<string, string> = {
  MAT: 'Desenvolvimento do raciocínio matemático e cálculo mental',
  PORT: 'Leitura, escrita e interpretação textual em língua portuguesa',
  ING: 'Leitura e compreensão em língua inglesa',
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-card p-6">
      <div className="h-5 w-32 rounded bg-muted mb-2" />
      <div className="h-4 w-48 rounded bg-muted mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded bg-muted" />
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    </div>
  )
}

interface DetalheMateriaProps {
  materia: Materia
  onClose: () => void
}

function DetalheMateria({ materia, onClose }: DetalheMateriaProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{materia.nome}</h2>
            <p className="text-sm text-muted-foreground">{DESCRICAO_MATERIA[materia.codigo] ?? 'Disciplina do programa Kumon'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Código:</span>
            <Badge variant="secondary">{materia.codigo}</Badge>
            <span className="text-sm font-medium text-muted-foreground ml-4">Total de níveis:</span>
            <Badge variant="outline">{materia.niveis?.length ?? 0}</Badge>
          </div>

          {materia.niveis && materia.niveis.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Estrutura de Níveis</h3>
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ordem</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Código</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materia.niveis.map((nivel) => (
                      <tr key={nivel.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 text-muted-foreground">{nivel.ordem}</td>
                        <td className="px-4 py-2 font-mono font-semibold">{nivel.codigo}</td>
                        <td className="px-4 py-2 text-muted-foreground">{nivel.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DisciplinasPage() {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<Materia | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await materiasService.listar()
        const data = (res.data as any)?.data ?? res.data
        setMaterias(Array.isArray(data) ? data : [])
      } catch {
        setError('Erro ao carregar disciplinas.')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disciplinas"
        subtitle="Matérias e estrutura de níveis do programa Kumon"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : materias.length === 0 ? (
          <div className="col-span-3 py-12">
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="Nenhuma disciplina encontrada"
              description="As disciplinas são configuradas na inicialização do sistema."
            />
          </div>
        ) : (
          materias.map((materia) => (
            <button
              key={materia.id}
              onClick={() => setSelecionada(materia)}
              className={`group text-left rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${CORES_MATERIA[materia.codigo] ?? 'bg-card border-border'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">
                    {materia.codigo}
                  </p>
                  <h3 className="text-lg font-bold">{materia.nome}</h3>
                  <p className="mt-1 text-sm opacity-70 leading-snug">
                    {DESCRICAO_MATERIA[materia.codigo] ?? 'Disciplina do programa'}
                  </p>
                </div>
                <ChevronRight size={16} className="mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={13} className="opacity-60" />
                    <span className="text-xs font-medium">{materia.niveis?.length ?? 0} níveis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="opacity-60" />
                    <span className="text-xs font-medium">
                      {(materia as any).alunosAtivos ?? 0} aluno{((materia as any).alunosAtivos ?? 0) !== 1 ? 's' : ''} ativo{((materia as any).alunosAtivos ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/alunos?materiaId=${materia.id}&materiaNome=${encodeURIComponent(materia.nome)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity underline underline-offset-2"
                >
                  Ver alunos
                </Link>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Sobre as Disciplinas</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          As disciplinas do programa Kumon são fixas e definidas pela metodologia.
          Cada disciplina possui uma estrutura progressiva de níveis que o aluno percorre
          no seu próprio ritmo. Novos alunos são matriculados em uma ou mais disciplinas
          na tela de <strong>Alunos</strong>.
        </p>
      </div>

      {selecionada && (
        <DetalheMateria
          materia={selecionada}
          onClose={() => setSelecionada(null)}
        />
      )}
    </div>
  )
}
