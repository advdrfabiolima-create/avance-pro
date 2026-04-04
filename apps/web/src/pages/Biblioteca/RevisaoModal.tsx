import { X, CheckCircle, Archive, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { BibExercicio } from '../../services/biblioteca.service'
import { DISCIPLINA_LABEL, DIFICULDADE_LABEL, TIPO_LABEL, STATUS_LABEL, ORIGEM_LABEL, STATUS_COLORS, DIFICULDADE_COLORS, DISCIPLINA_COLORS } from './helpers'

interface Props {
  exercicio: BibExercicio
  onClose: () => void
  onPublicar: (id: string) => void
  onArquivar: (id: string) => void
  onEditar: (ex: BibExercicio) => void
  loading?: boolean
}

export default function RevisaoModal({ exercicio, onClose, onPublicar, onArquivar, onEditar, loading }: Props) {
  const tags = exercicio.tags as string[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Revisão Editorial</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[exercicio.status]}`}>
              {STATUS_LABEL[exercicio.status]}
            </span>
            {exercicio.origem === 'ia' && (
              <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-xs font-medium">IA</span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Metadados */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DISCIPLINA_COLORS[exercicio.disciplina]}`}>
              {DISCIPLINA_LABEL[exercicio.disciplina]}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFICULDADE_COLORS[exercicio.dificuldade]}`}>
              {DIFICULDADE_LABEL[exercicio.dificuldade]}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-xs font-medium">
              Nível {exercicio.nivel}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-xs font-medium">
              {TIPO_LABEL[exercicio.tipo]}
            </span>
          </div>

          {/* Tópico */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Tópico</p>
            <p className="text-sm font-medium text-slate-700">{exercicio.topico}{exercicio.subtopico ? ` · ${exercicio.subtopico}` : ''}</p>
          </div>

          {/* Enunciado */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Enunciado</p>
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              {exercicio.enunciado}
            </p>
          </div>

          {/* Alternativas */}
          {exercicio.tipo === 'objetivo' && exercicio.opcoes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Alternativas</p>
              <div className="space-y-1.5">
                {(exercicio.opcoes as string[]).map((op, idx) => {
                  const letra = String.fromCharCode(65 + idx)
                  const isCorreta = op === exercicio.resposta
                  return (
                    <div key={idx} className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${isCorreta ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 text-slate-700'}`}>
                      <span className="shrink-0 font-semibold">{letra})</span>
                      <span>{op}</span>
                      {isCorreta && <span className="ml-auto text-xs text-emerald-600 font-medium">✓ Correta</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resposta (não-objetivo) */}
          {exercicio.tipo !== 'objetivo' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Resposta esperada</p>
              <p className="text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-4 py-2.5 font-medium">
                {exercicio.resposta}
              </p>
            </div>
          )}

          {/* Explicação */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Explicação</p>
            <p className="text-sm text-slate-700 leading-relaxed">{exercicio.explicacao}</p>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-2 justify-between">
          <Button variant="outline" size="sm" onClick={() => onEditar(exercicio)}>
            <Pencil size={13} className="mr-1.5" /> Editar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onArquivar(exercicio.id)} disabled={loading}
              className="border-slate-200 text-slate-600 hover:bg-slate-50">
              <Archive size={13} className="mr-1.5" /> Arquivar
            </Button>
            {exercicio.status !== 'publicado' && (
              <Button size="sm" onClick={() => onPublicar(exercicio.id)} disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle size={13} className="mr-1.5" /> Publicar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
