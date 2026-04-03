export interface OcrResult {
  text: string
  confidence?: number
}

export interface OCRProvider {
  recognize(imageBase64: string): Promise<OcrResult>
}
