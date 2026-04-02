import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Label'
import { Input } from '../../components/ui/Input'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { materiasService, type Materia } from '../../services/materias.service'
import { alunosService } from '../../services/alunos.service'

interface Props {
  alunoId: string
  onClose: () => void
  onSaved: () => void
}

export default function MatriculaModal({ alunoId, onClose, onSaved }: Props) {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [materiaId, setMateriaId] = useState('')
  const [nivelAtualId, setNivelAtualId] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]!)
  const [loading, setLoading] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const res = await materiasService.listar()
        const data = (res.data as any)?.data ?? res.data
        setMaterias(Array.isArray(data) ? data : [])
      } catch {
        setError('Erro ao carregar matérias')
      } finally {
        setLoadingInit(false)
      }
    }
    void init()
  }, [])

  const materiaAtual = materias.find((m) => m.id === materiaId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!materiaId || !nivelAtualId || !dataInicio) {
      setError('Preencha todos os campos')
      return
    }
    setLoading(true)
    try {
      await alunosService.matricular(alunoId, { materiaId, nivelAtualId, dataInicio })
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar matrícula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Nova Matrícula</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {loadingInit ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label>Matéria *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={materiaId}
                onChange={(e) => { setMateriaId(e.target.value); setNivelAtualId('') }}
              >
                <option value="">Selecione...</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Nível Inicial *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={nivelAtualId}
                onChange={(e) => setNivelAtualId(e.target.value)}
                disabled={!materiaId}
              >
                <option value="">Selecione...</option>
                {(materiaAtual?.niveis ?? []).map((n) => (
                  <option key={n.id} value={n.id}>{n.codigo} — {n.descricao}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Matricular'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
