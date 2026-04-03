import type { OCRProvider, OcrResult } from './ocr.provider'

// OCR.space free tier — https://ocr.space/ocrapi
// Key 'helloworld' works for testing; set OCR_SPACE_KEY env var for production.
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image'

export class OcrSpaceProvider implements OCRProvider {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['OCR_SPACE_KEY'] ?? 'helloworld'
  }

  async recognize(arquivoBase64: string, tipoArquivo = 'image/jpeg'): Promise<OcrResult> {
    // Garantir que o prefixo data URI esteja correto para o tipo do arquivo
    const base64Data = arquivoBase64.includes(',')
      ? arquivoBase64
      : `data:${tipoArquivo};base64,${arquivoBase64}`

    const params = new URLSearchParams({
      base64Image: base64Data,
      language: 'por',
      isOverlayRequired: 'false',
      detectOrientation: 'true',
      scale: 'true',
      OCREngine: '2', // Engine 2 is better for printed text
    })

    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`OCR.space HTTP ${response.status}`)
    }

    const json = (await response.json()) as {
      IsErroredOnProcessing: boolean
      ErrorMessage?: string[]
      ParsedResults?: Array<{ ParsedText: string; TextOverlay?: { MeanConfidence?: number } }>
    }

    if (json.IsErroredOnProcessing) {
      throw new Error(json.ErrorMessage?.join(', ') ?? 'OCR processing failed')
    }

    const parsed = json.ParsedResults?.[0]
    if (!parsed) {
      throw new Error('No OCR result returned')
    }

    return {
      text: parsed.ParsedText ?? '',
      confidence: parsed.TextOverlay?.MeanConfidence,
    }
  }
}
