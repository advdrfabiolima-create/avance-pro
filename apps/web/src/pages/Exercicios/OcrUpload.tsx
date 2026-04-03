import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, Camera, ArrowLeft, Loader2, FileImage } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import { ocrService } from '../../services/ocr.service'
import { alunosService } from '../../services/alunos.service'
import { exerciciosService } from '../../services/exercicios.service'

export default function OcrUpload() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const preAlunoId = searchParams.get('alunoId') ?? ''
  const preExercicioId = searchParams.get('exercicioId') ?? ''

  const [alunoId, setAlunoId] = useState(preAlunoId)
  const [exercicioId, setExercicioId] = useState(preExercicioId)
  const [imagemBase64, setImagemBase64] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [alunos, setAlunos] = useState<Array<{ id: string; nome: string }>>([])
  const [exercicios, setExercicios] = useState<Array<{ id: string; titulo: string }>>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    alunosService.listar({ page: 1, pageSize: 200 }).then((r) => {
      setAlunos(r.data.data?.data ?? [])
    })
    exerciciosService.listar({ page: 1, pageSize: 200 }).then((r) => {
      setExercicios(r.data.data?.items ?? r.data.data ?? [])
    })
  }, [])

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem (JPG, PNG, etc.)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagemBase64(result)
      setPreviewUrl(result)
      setErro(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleEnviar() {
    if (!alunoId) { setErro('Selecione o aluno'); return }
    if (!exercicioId) { setErro('Selecione o exercício'); return }
    if (!imagemBase64) { setErro('Adicione uma foto da folha'); return }

    setLoading(true)
    setErro(null)
    try {
      const res = await ocrService.criar({ alunoId, exercicioId, imagemBase64 })
      const ocrId = res.data.data?.id
      if (!ocrId) throw new Error('Falha ao criar')

      // Auto-processar
      await ocrService.processar(ocrId)
      navigate(`/ocr/${ocrId}/revisar`)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Erro ao processar imagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Correção por Foto"
        subtitle="Fotografe a folha preenchida para correção automática"
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

      {/* Upload / Câmera */}
      <div className="space-y-1.5">
        <label className="tp-label">Foto da Folha</label>

        {previewUrl ? (
          <div className="relative rounded-xl border border-border overflow-hidden">
            <img src={previewUrl} alt="Preview" className="w-full max-h-80 object-contain bg-slate-50" />
            <button
              onClick={() => { setImagemBase64(null); setPreviewUrl(null) }}
              className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-white"
            >
              Remover
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
          >
            <FileImage size={32} className="text-slate-300" />
            <p className="tp-secondary text-center">
              Arraste uma imagem ou clique para selecionar<br />
              <span className="text-[11px] text-slate-400">JPG, PNG, WEBP</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                <Upload size={13} className="mr-1.5" /> Galeria
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}
              >
                <Camera size={13} className="mr-1.5" /> Câmera
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleEnviar}
        disabled={loading || !imagemBase64 || !alunoId || !exercicioId}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="mr-2 animate-spin" /> Processando OCR...
          </>
        ) : (
          'Enviar e Processar'
        )}
      </Button>

      <p className="tp-caption text-center">
        O sistema detectará automaticamente as respostas marcadas na folha.
        Você poderá revisar antes de confirmar a correção.
      </p>
    </div>
  )
}
