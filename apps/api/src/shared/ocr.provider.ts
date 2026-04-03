export interface OcrResult {
  text: string
  confidence?: number
}

export interface OCRProvider {
  recognize(arquivoBase64: string, tipoArquivo?: string): Promise<OcrResult>
}
