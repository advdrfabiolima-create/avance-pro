import { api } from './api'

export interface BankCatalog {
  id: string
  code: string
  name: string
  cnabSupport: string
  cnab240Supported: boolean
  cnab400Supported: boolean
  isActive: boolean
  metadata: string | null
}

export interface BillingBankAccount {
  id: string
  bankCode: string
  bankName: string
  accountName: string
  agreementCode: string | null
  walletCode: string | null
  agency: string
  agencyDigit: string | null
  accountNumber: string
  accountDigit: string | null
  beneficiaryName: string
  beneficiaryDocument: string
  remittanceLayout: string
  sequentialFileNumber: number
  isDefault: boolean
  isActive: boolean
  instructions: string | null
  protestDays: number
  autoDropDays: number
  createdAt: string
  updatedAt: string
  bank?: { name: string; cnab240Supported: boolean; cnab400Supported: boolean; metadata: string | null }
  cnabFiles?: CnabFileLog[]
}

export interface CnabFileLog {
  id: string
  type: 'remessa' | 'retorno'
  fileName: string
  layoutType: string
  status: 'pendente' | 'processado' | 'erro'
  totalRecords: number | null
  processedCount: number | null
  errorCount: number | null
  generatedAt: string | null
  importedAt: string | null
  processedAt: string | null
  createdBy: string | null
  createdAt: string
}

export interface RemessaResult {
  cnabFile: CnabFileLog
  fileName: string
  content: string
}

export interface RetornoPreview {
  cnabFileId: string
  bankCode: string
  fileDate: string
  totalRecords: number
  matched: number
  unmatched: number
  parseErrors: string[]
  occurrences: Array<{
    code: string
    description: string
    category: string
    ourNumber: string
    alunoNome: string | null
    matchFound: boolean
    amount?: number
    paidAmount?: number
    occurrenceDate?: string
    creditDate?: string
  }>
}

export interface ResumosBancos {
  totalContas: number
  contasAtivas: number
  ultimaRemessa: { fileName: string; createdAt: string; processedCount: number | null } | null
  ultimoRetorno: { fileName: string; createdAt: string; processedCount: number | null } | null
}

export const bancosService = {
  catalogo: () =>
    api.get<{ success: boolean; data: BankCatalog[] }>('/bancos/catalogo'),

  resumo: () =>
    api.get<{ success: boolean; data: ResumosBancos }>('/bancos/resumo'),

  listContas: () =>
    api.get<{ success: boolean; data: BillingBankAccount[] }>('/bancos/contas'),

  getContaById: (id: string) =>
    api.get<{ success: boolean; data: BillingBankAccount }>(`/bancos/contas/${id}`),

  createConta: (data: Partial<BillingBankAccount>) =>
    api.post<{ success: boolean; data: BillingBankAccount }>('/bancos/contas', data),

  updateConta: (id: string, data: Partial<BillingBankAccount>) =>
    api.put<{ success: boolean; data: BillingBankAccount }>(`/bancos/contas/${id}`, data),

  setDefault: (id: string) =>
    api.patch<{ success: boolean; data: BillingBankAccount }>(`/bancos/contas/${id}/set-default`),

  toggleActive: (id: string) =>
    api.patch<{ success: boolean; data: BillingBankAccount }>(`/bancos/contas/${id}/toggle`),

  deleteConta: (id: string) =>
    api.delete<{ success: boolean }>(`/bancos/contas/${id}`),

  validarConta: (id: string) =>
    api.get<{ success: boolean; data: { valido: boolean; erros: string[] } }>(`/bancos/contas/${id}/validar`),

  getElegiveis: (bankAccountId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/bancos/contas/${bankAccountId}/elegiveis`),

  gerarRemessa: (bankAccountId: string, cobrancaIds: string[]) =>
    api.post<{ success: boolean; data: RemessaResult }>(`/bancos/contas/${bankAccountId}/remessa`, { cobrancaIds }),

  previewRetorno: (bankAccountId: string, fileName: string, rawContent: string) =>
    api.post<{ success: boolean; data: RetornoPreview }>(`/bancos/contas/${bankAccountId}/retorno/preview`, { fileName, rawContent }),

  efetivarRetorno: (cnabFileId: string) =>
    api.post<{ success: boolean; data: { processedCount: number; errorCount: number; totalRecords: number } }>(`/bancos/retorno/${cnabFileId}/efetivar`),

  listArquivos: (bankAccountId: string) =>
    api.get<{ success: boolean; data: CnabFileLog[] }>(`/bancos/contas/${bankAccountId}/arquivos`),
}

/** Baixa um arquivo de texto como .REM ou .RET */
export function downloadCnabFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Lê um arquivo de texto selecionado pelo usuário */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file, 'latin1')
  })
}
