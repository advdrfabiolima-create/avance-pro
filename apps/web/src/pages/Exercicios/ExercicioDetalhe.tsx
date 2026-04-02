import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp, BookMarked
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Badge } from '../../components/ui/Badge'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { exerciciosService, type ExercicioDetalhe, type Questao } from '../../services/exercicios.service'

const TIPO_LABELS = { objetiva: 'Objetiva', numerica: 'Numérica', discursiva: 'Discursiva' }
const TIPO_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  objetiva: 'default',
  numerica: 'secondary',
  discursiva: 'outline',
}

// ─── Formulário de nova questão ───────────────────────────────────────────────

interface FormQuestao {
  enunciado: string
  tipo: 'objetiva' | 'numerica' | 'discursiva'
  pontos: number
  alternativas: Array<{ letra: string; texto: string }>
  respostaCorreta: {
    alternativaId?: string
    valorNumerico?: string
    tolerancia?: string
    textoEsperado?: string
  }
}

function novaFormQuestao(): FormQuestao {
  return {
    enunciado: '',
    tipo: 'objetiva',
    pontos: 1,
    alternativas: [
      { letra: 'A', texto: '' },
      { letra: 'B', texto: '' },
      { letra: 'C', texto: '' },
      { letra: 'D', texto: '' },
    ],
    respostaCorreta: {},
  }
}

interface FormQuestaoProps {
  questao: Questao
  index: number
  onRemove: () => void
}

function QuestaoCard({ questao, index, onRemove }: FormQuestaoProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium truncate">{questao.enunciado}</span>
        <Badge variant={TIPO_VARIANTS[questao.tipo]}>{TIPO_LABELS[questao.tipo]}</Badge>
        <span className="text-xs text-muted-foreground">{questao.pontos}pt</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-1 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remover questão"
        >
          <Trash2 size={13} />
        </button>
        {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-foreground">{questao.enunciado}</p>

          {questao.tipo === 'objetiva' && questao.alternativas.length > 0 && (
            <div className="space-y-1.5">
              {questao.alternativas.map((alt) => {
                const correta = questao.respostaCorreta?.alternativaId === alt.id
                return (
                  <div
                    key={alt.id}
                    className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-sm ${correta ? 'bg-green-50 text-green-800 font-medium' : ''}`}
                  >
                    <span className="shrink-0 font-semibold">{alt.letra})</span>
                    <span>{alt.texto}</span>
                    {correta && <span className="ml-auto text-xs text-green-600">✓ Correta</span>}
                  </div>
                )
              })}
            </div>
          )}

          {questao.tipo === 'numerica' && questao.respostaCorreta && (
            <div className="text-sm">
              <span className="text-muted-foreground">Resposta: </span>
              <span className="font-medium">{questao.respostaCorreta.valorNumerico}</span>
              {questao.respostaCorreta.tolerancia != null && (
                <span className="text-muted-foreground"> (±{questao.respostaCorreta.tolerancia})</span>
              )}
            </div>
          )}

          {questao.tipo === 'discursiva' && questao.respostaCorreta?.textoEsperado && (
            <div className="text-sm">
              <span className="text-muted-foreground">Resposta esperada: </span>
              <span className="italic">{questao.respostaCorreta.textoEsperado}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulário add questão ───────────────────────────────────────────────────

interface AddQuestaoFormProps {
  exercicioId: string
  ordem: number
  onAdded: () => void
  onCancel: () => void
}

function AddQuestaoForm({ exercicioId, ordem, onAdded, onCancel }: AddQuestaoFormProps) {
  const [form, setForm] = useState<FormQuestao>(novaFormQuestao())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Para objetiva: qual alternativa está marcada como correta
  const [altCorretaIdx, setAltCorretaIdx] = useState<number | null>(null)

  function addAlternativa() {
    const letras = 'ABCDEFGHIJ'
    const proxLetra = letras[form.alternativas.length] ?? String(form.alternativas.length + 1)
    setForm((f) => ({ ...f, alternativas: [...f.alternativas, { letra: proxLetra, texto: '' }] }))
  }

  function removeAlternativa(idx: number) {
    setForm((f) => ({ ...f, alternativas: f.alternativas.filter((_, i) => i !== idx) }))
    if (altCorretaIdx === idx) setAltCorretaIdx(null)
  }

  async function handleSave() {
    if (!form.enunciado.trim()) { setError('Enunciado obrigatório'); return }
    if (form.tipo === 'objetiva' && form.alternativas.some((a) => !a.texto.trim())) {
      setError('Preencha o texto de todas as alternativas')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Construir payload de alternativas e resposta correta
      const alternativas = form.tipo === 'objetiva' ? form.alternativas : undefined
      let respostaCorreta: any = undefined

      if (form.tipo === 'objetiva' && altCorretaIdx !== null) {
        // A alternativaId será resolvida depois, passamos a letra temporariamente
        // O backend recebe alternativaId que precisa ser o UUID — criaremos a questão primeiro
        // sem respostaCorreta, depois buscaremos o UUID da alternativa criada
        // Solução: criar questão sem respostaCorreta, depois editar
        respostaCorreta = undefined
      } else if (form.tipo === 'numerica') {
        const val = parseFloat(form.respostaCorreta.valorNumerico ?? '')
        if (!isNaN(val)) {
          respostaCorreta = {
            valorNumerico: val,
            tolerancia: form.respostaCorreta.tolerancia ? parseFloat(form.respostaCorreta.tolerancia) : 0,
          }
        }
      } else if (form.tipo === 'discursiva') {
        if (form.respostaCorreta.textoEsperado?.trim()) {
          respostaCorreta = { textoEsperado: form.respostaCorreta.textoEsperado.trim() }
        }
      }

      const res = await exerciciosService.adicionarQuestao(exercicioId, {
        enunciado: form.enunciado.trim(),
        tipo: form.tipo,
        ordem,
        pontos: form.pontos,
        alternativas,
        respostaCorreta,
      })

      // Se objetiva e tem alternativa correta selecionada, atualizar a resposta correta
      if (form.tipo === 'objetiva' && altCorretaIdx !== null) {
        const questaoCriada = res.data?.data
        if (questaoCriada?.alternativas?.[altCorretaIdx]?.id) {
          await exerciciosService.atualizarQuestao(exercicioId, questaoCriada.id, {
            respostaCorreta: { alternativaId: questaoCriada.alternativas[altCorretaIdx].id },
          })
        }
      }

      onAdded()
    } catch {
      setError('Erro ao adicionar questão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Nova Questão</h3>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Tipo</Label>
          <select
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as any }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="objetiva">Objetiva (múltipla escolha)</option>
            <option value="numerica">Numérica</option>
            <option value="discursiva">Discursiva (texto)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Pontos</Label>
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={form.pontos}
            onChange={(e) => setForm((f) => ({ ...f, pontos: parseFloat(e.target.value) || 1 }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Enunciado *</Label>
        <textarea
          value={form.enunciado}
          onChange={(e) => setForm((f) => ({ ...f, enunciado: e.target.value }))}
          placeholder="Digite o enunciado da questão..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
        />
      </div>

      {/* Objetiva */}
      {form.tipo === 'objetiva' && (
        <div className="space-y-2">
          <Label>Alternativas (marque a correta)</Label>
          {form.alternativas.map((alt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correta"
                checked={altCorretaIdx === idx}
                onChange={() => setAltCorretaIdx(idx)}
                className="accent-primary"
              />
              <span className="w-6 text-sm font-semibold text-muted-foreground">{alt.letra})</span>
              <Input
                value={alt.texto}
                onChange={(e) => {
                  const alts = [...form.alternativas]
                  alts[idx] = { ...alts[idx], texto: e.target.value }
                  setForm((f) => ({ ...f, alternativas: alts }))
                }}
                placeholder={`Alternativa ${alt.letra}`}
                className="flex-1"
              />
              {form.alternativas.length > 2 && (
                <button onClick={() => removeAlternativa(idx)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {form.alternativas.length < 6 && (
            <Button type="button" variant="outline" size="sm" onClick={addAlternativa}>
              <Plus size={13} /> Adicionar alternativa
            </Button>
          )}
        </div>
      )}

      {/* Numérica */}
      {form.tipo === 'numerica' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Resposta esperada</Label>
            <Input
              type="number"
              step="any"
              value={form.respostaCorreta.valorNumerico ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, respostaCorreta: { ...f.respostaCorreta, valorNumerico: e.target.value } }))}
              placeholder="Ex: 42.5"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tolerância (±)</Label>
            <Input
              type="number"
              step="any"
              min={0}
              value={form.respostaCorreta.tolerancia ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, respostaCorreta: { ...f.respostaCorreta, tolerancia: e.target.value } }))}
              placeholder="Ex: 0.5"
            />
          </div>
        </div>
      )}

      {/* Discursiva */}
      {form.tipo === 'discursiva' && (
        <div className="space-y-1.5">
          <Label>Resposta esperada (para comparação automática)</Label>
          <Input
            value={form.respostaCorreta.textoEsperado ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, respostaCorreta: { ...f.respostaCorreta, textoEsperado: e.target.value } }))}
            placeholder="Texto que será comparado com a resposta do aluno"
          />
          <p className="text-xs text-muted-foreground">A comparação ignora maiúsculas, acentos e espaços extras.</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
          <Save size={13} />
          {loading ? 'Salvando...' : 'Salvar Questão'}
        </Button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ExercicioDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercicio, setExercicio] = useState<ExercicioDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingQuestao, setAddingQuestao] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function carregar() {
    if (!id) return
    setLoading(true)
    try {
      const res = await exerciciosService.buscarPorId(id)
      setExercicio(res.data?.data ?? null)
    } catch {
      setError('Exercício não encontrado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function handleRemoverQuestao(questaoId: string) {
    if (!id || !confirm('Remover esta questão?')) return
    try {
      await exerciciosService.removerQuestao(id, questaoId)
      carregar()
    } catch {
      alert('Erro ao remover questão')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !exercicio) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/exercicios')}><ArrowLeft size={15} /> Voltar</Button>
        <Alert variant="destructive"><AlertDescription>{error ?? 'Exercício não encontrado'}</AlertDescription></Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/exercicios')}>
          <ArrowLeft size={15} /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{exercicio.titulo}</h1>
            {exercicio.materia && (
              <Badge variant="secondary">{exercicio.materia.nome}</Badge>
            )}
            {exercicio.nivel && (
              <Badge variant="outline">{exercicio.nivel.codigo}</Badge>
            )}
            {!exercicio.ativo && (
              <Badge variant="destructive">Inativo</Badge>
            )}
          </div>
          {exercicio.descricao && (
            <p className="mt-1 text-sm text-muted-foreground">{exercicio.descricao}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{exercicio.questoes.length}</p>
            <p className="text-xs text-muted-foreground">Questões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">
              {exercicio.questoes.reduce((s, q) => s + parseFloat(q.pontos.toString()), 0).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Total de Pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{(exercicio as any)._count?.tentativas ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Tentativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Questões */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookMarked size={16} />
            Questões
          </CardTitle>
          {!addingQuestao && (
            <Button size="sm" onClick={() => setAddingQuestao(true)}>
              <Plus size={13} /> Adicionar Questão
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {addingQuestao && (
            <AddQuestaoForm
              exercicioId={exercicio.id}
              ordem={exercicio.questoes.length}
              onAdded={() => { setAddingQuestao(false); carregar() }}
              onCancel={() => setAddingQuestao(false)}
            />
          )}

          {exercicio.questoes.length === 0 && !addingQuestao && (
            <EmptyQuestoes onAdd={() => setAddingQuestao(true)} />
          )}

          {exercicio.questoes.map((q, idx) => (
            <QuestaoCard
              key={q.id}
              questao={q}
              index={idx}
              onRemove={() => handleRemoverQuestao(q.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyQuestoes({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <BookMarked size={32} className="text-muted-foreground/40" />
      <div>
        <p className="font-medium text-foreground">Nenhuma questão ainda</p>
        <p className="text-sm text-muted-foreground">Adicione a primeira questão ao exercício</p>
      </div>
      <Button size="sm" onClick={onAdd}><Plus size={13} /> Adicionar Questão</Button>
    </div>
  )
}
