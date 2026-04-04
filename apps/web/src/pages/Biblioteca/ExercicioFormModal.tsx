import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { bibliotecaService, type BibExercicio, type CriarExercicioPayload, type Disciplina, type Dificuldade, type TipoExercicio, type StatusBib } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DIFICULDADE_LABEL, TIPO_LABEL, NIVEIS } from './helpers'

interface Props {
  exercicio: BibExercicio | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: CriarExercicioPayload = {
  disciplina: 'matematica',
  topico: '',
  subtopico: '',
  nivel: 'A',
  dificuldade: 'facil',
  tipo: 'objetivo',
  enunciado: '',
  opcoes: ['', '', '', ''],
  resposta: '',
  explicacao: '',
  tags: [],
  status: 'rascunho',
}

export default function ExercicioFormModal({ exercicio, onClose, onSaved }: Props) {
  const isEdit = !!exercicio
  const [form, setForm] = useState<CriarExercicioPayload>(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (exercicio) {
      setForm({
        disciplina: exercicio.disciplina,
        topico: exercicio.topico,
        subtopico: exercicio.subtopico ?? '',
        nivel: exercicio.nivel,
        dificuldade: exercicio.dificuldade,
        tipo: exercicio.tipo,
        enunciado: exercicio.enunciado,
        opcoes: exercicio.opcoes ?? ['', '', '', ''],
        resposta: exercicio.resposta,
        explicacao: exercicio.explicacao,
        tags: exercicio.tags as string[],
        status: exercicio.status,
      })
    } else {
      setForm(EMPTY)
    }
  }, [exercicio])

  function set<K extends keyof CriarExercicioPayload>(k: K, v: CriarExercicioPayload[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function setOpcao(idx: number, v: string) {
    const next = [...(form.opcoes ?? [])]
    next[idx] = v
    set('opcoes', next)
  }

  function addOpcao() {
    set('opcoes', [...(form.opcoes ?? []), ''])
  }

  function removeOpcao(idx: number) {
    const next = (form.opcoes ?? []).filter((_, i) => i !== idx)
    set('opcoes', next)
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !(form.tags ?? []).includes(t)) {
      set('tags', [...(form.tags ?? []), t])
    }
    setTagInput('')
  }

  function removeTag(t: string) {
    set('tags', (form.tags ?? []).filter((x) => x !== t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.enunciado.trim()) { setError('Enunciado obrigatório'); return }
    if (!form.resposta.trim()) { setError('Resposta obrigatória'); return }
    if (!form.explicacao.trim()) { setError('Explicação obrigatória'); return }

    const payload = {
      ...form,
      opcoes: form.tipo === 'objetivo' ? (form.opcoes ?? []).filter(Boolean) : null,
      subtopico: form.subtopico || undefined,
    }

    setLoading(true)
    setError(null)
    try {
      if (isEdit) {
        await bibliotecaService.atualizar(exercicio.id, payload)
      } else {
        await bibliotecaService.criar(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao salvar exercício')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{isEdit ? 'Editar Exercício' : 'Novo Exercício'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Disciplina + Tipo + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Disciplina</Label>
              <select className={selectCls} value={form.disciplina} onChange={(e) => set('disciplina', e.target.value as Disciplina)}>
                {(Object.entries(DISCIPLINA_LABEL) as [Disciplina, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</Label>
              <select className={selectCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoExercicio)}>
                {(Object.entries(TIPO_LABEL) as [TipoExercicio, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</Label>
              <select className={selectCls} value={form.status} onChange={(e) => set('status', e.target.value as StatusBib)}>
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          {/* Tópico + Subtópico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tópico *</Label>
              <Input value={form.topico} onChange={(e) => set('topico', e.target.value)} placeholder="Ex: Frações" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subtópico</Label>
              <Input value={form.subtopico ?? ''} onChange={(e) => set('subtopico', e.target.value)} placeholder="Ex: Adição de frações" />
            </div>
          </div>

          {/* Nível + Dificuldade */}
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

          {/* Enunciado */}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Enunciado *</Label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              rows={3}
              value={form.enunciado}
              onChange={(e) => set('enunciado', e.target.value)}
              placeholder="Digite o enunciado da questão..."
              required
            />
          </div>

          {/* Alternativas (tipo objetivo) */}
          {form.tipo === 'objetivo' && (
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Alternativas</Label>
              <div className="space-y-2 mt-1">
                {(form.opcoes ?? []).map((op, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-semibold text-slate-400">{String.fromCharCode(65 + idx)})</span>
                    <Input value={op} onChange={(e) => setOpcao(idx, e.target.value)} placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`} />
                    {(form.opcoes?.length ?? 0) > 2 && (
                      <button type="button" onClick={() => removeOpcao(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {(form.opcoes?.length ?? 0) < 6 && (
                  <button type="button" onClick={addOpcao} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus size={13} /> Adicionar alternativa
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resposta correta */}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Resposta correta *
              {form.tipo === 'objetivo' && <span className="normal-case font-normal text-slate-400 ml-1">(copie exatamente uma alternativa)</span>}
            </Label>
            <Input value={form.resposta} onChange={(e) => set('resposta', e.target.value)} placeholder="Resposta exata" required />
          </div>

          {/* Explicação */}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Explicação *</Label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              rows={2}
              value={form.explicacao}
              onChange={(e) => set('explicacao', e.target.value)}
              placeholder="Explique brevemente a solução..."
              required
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Adicionar tag..."
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tags ?? []).map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar exercício'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
