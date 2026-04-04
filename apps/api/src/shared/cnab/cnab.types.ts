// ─── CNAB Types ───────────────────────────────────────────────────────────────
// Tipos compartilhados por todos os adapters bancários.
// Não acoplado a nenhum banco específico.

export type CnabLayout = 'cnab240' | 'cnab400'
export type CnabFileType = 'remessa' | 'retorno'

// ── Conta bancária (input dos adapters) ────────────────────────────────────

export interface BankAccountConfig {
  bankCode: string
  bankName: string
  agency: string
  agencyDigit: string
  accountNumber: string
  accountDigit: string
  agreementCode: string
  walletCode: string
  beneficiaryName: string
  beneficiaryDocument: string   // CPF ou CNPJ limpo
  sequentialFileNumber: number
  protestDays?: number
  autoDropDays?: number
  instructions?: string
}

// ── Título (cobrança) para remessa ─────────────────────────────────────────

export interface CnabCharge {
  /** Nosso número — número do título no banco */
  ourNumber: string
  /** Número do documento (interno) */
  documentNumber: string
  dueDate: string           // YYYY-MM-DD
  amount: number            // em reais
  /** Nome do pagador */
  payerName: string
  /** CPF ou CNPJ do pagador */
  payerDocument: string
  payerAddress?: string
  payerNeighborhood?: string
  payerCity?: string
  payerState?: string
  payerZipCode?: string
  description?: string
}

// ── Ocorrência de retorno ──────────────────────────────────────────────────

export type OccurrenceCategory =
  | 'entry_confirmed'   // Entrada confirmada
  | 'payment'           // Liquidação / pagamento
  | 'write_off'         // Baixa
  | 'rejection'         // Rejeição
  | 'alteration'        // Alteração
  | 'protest'           // Protesto
  | 'unknown'           // Desconhecida

export interface ParsedOccurrence {
  /** Código da ocorrência conforme layout do banco */
  code: string
  description: string
  category: OccurrenceCategory
  ourNumber: string
  documentNumber?: string
  dueDate?: string           // YYYY-MM-DD
  occurrenceDate?: string    // YYYY-MM-DD
  creditDate?: string        // YYYY-MM-DD
  amount?: number
  paidAmount?: number
  rawLine: string
  lineNumber: number
}

// ── Resultado do parse de retorno ──────────────────────────────────────────

export interface CnabReturnResult {
  bankCode: string
  layout: CnabLayout
  fileDate: string
  occurrences: ParsedOccurrence[]
  totalRecords: number
  errors: string[]
}

// ── Resultado da geração de remessa ───────────────────────────────────────

export interface CnabRemittanceResult {
  fileName: string
  content: string           // texto do arquivo CNAB
  totalLines: number
  chargesIncluded: number
}

// ── Interface do adapter ──────────────────────────────────────────────────

export interface CnabBankAdapter {
  /** Código FEBRABAN do banco */
  readonly bankCode: string
  /** Layouts suportados */
  readonly supportedLayouts: CnabLayout[]

  /** Gera arquivo de remessa CNAB */
  generateRemittance(
    charges: CnabCharge[],
    account: BankAccountConfig,
    layout?: CnabLayout,
  ): CnabRemittanceResult

  /** Faz o parse de um arquivo de retorno CNAB */
  parseReturn(
    fileContent: string,
    account: BankAccountConfig,
  ): CnabReturnResult

  /** Valida se a conta bancária tem todos os campos mínimos */
  validateConfig(account: Partial<BankAccountConfig>): string[]

  /** Mapa de ocorrências do banco: código → descrição/categoria */
  getOccurrenceMap(): Record<string, { description: string; category: OccurrenceCategory }>
}
