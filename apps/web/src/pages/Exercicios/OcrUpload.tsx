import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, Camera, ArrowLeft, Loader2, FileImage, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import { ocrService } from '../../services/ocr.service'
import { alunosService } from '../../services/alunos.service'
import { exerciciosService } from '../../services/exercicios.service'

const TIPOS_ACEITOS: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/pdf': 'PDF',
}

function iconeArquivo(tipo: string) {
  if (tipo === 'application/pdf') return <FileText size={32} className="text-red-300" />
  return <FileImage size={32} className="text-slate-300" />
}

export default function OcrUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [alunoId, setAlunoId] = useState(searchParams.get('alunoId') ?? '')
  const [exercicioId, setExercicioId] = useState(searchParams.get('exercicioId') ?? '')
  const [arquivo, setArquivo] = useState<{ base64: string; tipo: string; nome: string } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [alunos, setAlunos] = useState<Array<{ id: string; nome: string }>>([])
  const [exercicios, setExercicios] = useState<Array<{ id: string; titulo: string }>>([])

  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    alunosService.listar({ page: 1, pageSize: 200 }).then((r) => {
      setAlunos(r.data.data?.data ?? [])
    })
    exerciciosService.listar({ page: 1, pageSize: 200 }).then((r) => {
      const res = r.data.data as any
      setExercicios(res?.items ?? res?.data ?? [])
    })
  }, [])

  function handleFile(file: File) {
    if (!TIPOS_ACEITOS[file.type]) {
      setErro(`Tipo não suportado: ${file.type}. Use JPG, PNG, WebP ou PDF.`)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setArquivo({ base64: dataUrl, tipo: file.type, nome: file.name })
      setPreviewUrl(file.type.startsWith('image/') ? dataUrl : null)
      setErro(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleEnviar() {
    if (!alunoId) { setErro('Selecione o aluno'); return }
    if (!exercicioId) { setErro('Selecione o exercício'); return }
    if (!arquivo) { setErro('Selecione um arquivo'); return }

    setLoading(true)
    setErro(null)
    try {
      const res = await ocrService.criar({
        alunoId,
        exercicioId,
        arquivoBase64: arquivo.base64,
        tipoArquivo: arquivo.tipo,
      })
      const ocrId = res.data.data?.id
      if (!ocrId) throw new Error('Falha ao criar registro')

      // Processar OCR automaticamente e ir para revisão
      await ocrService.processar(ocrId)
      navigate(`/ocr/${ocrId}/revisar`)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Erro ao processar'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Correção por OCR"
        subtitle="Envie a folha respondida para extração automática das respostas"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} className="mr-1.5" /> Voltar
          </Button>
        }
      />

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Aluno */}
      <div className="space-y-1.5">
        <label className="tp-label">Aluno</label>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
        >
          <option value="">Selecione...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      </div>

      {/* Exercício */}
      <div className="space-y-1.5">
        <label className="tp-label">Exercício</label>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          value={exercicioId}
          onChange={(e) => setExercicioId(e.target.value)}
        >
          <option value="">Selecione...</option>
          {exercicios.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.titulo}</option>
          ))}
        </select>
      </div>

      {/* Upload */}
      <div className="space-y-1.5">
        <label className="tp-label">Arquivo</label>

        {arquivo ? (
          <div className="rounded-xl border border-border overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full max-h-72 object-contain bg-slate-50" />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50">
                <FileText size={40} className="text-red-400 mb-2" />
                <p className="text-[13px] font-medium text-slate-600">{arquivo.nome}</p>
                <p className="tp-caption">{TIPOS_ACEITOS[arquivo.tipo]}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-border">
              <span className="tp-caption">{arquivo.nome}</span>
              <button
                onClick={() => { setArquivo(null); setPreviewUrl(null) }}
                className="text-[12px] text-red-500 font-medium hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
          >
            <FileImage size={32} className="text-slate-300" />
            <p className="tp-secondary text-center">
              Arraste o arquivo ou clique para selecionar<br />
              <span className="text-[11px] text-slate-400">JPG · PNG · WebP · PDF</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" type="button"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                <Upload size={13} className="mr-1.5" /> Arquivo
              </Button>
              <Button variant="outline" size="sm" type="button"
                onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}>
                <Camera size={13} className="mr-1.5" /> Câmera
              </Button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      <Button className="w-full" onClick={handleEnviar}
        disabled={loading || !arquivo || !alunoId || !exercicioId}>
        {loading ? (
          <><Loader2 size={14} className="mr-2 animate-spin" /> Extraindo respostas...</>
        ) : (
          'Processar e Revisar'
        )}
      </Button>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
        <strong>Revisão obrigatória:</strong> após o processamento, você verá as respostas detectadas
        e poderá corrigir qualquer erro antes de confirmar a correção.
      </div>
    </div>
  )
}
