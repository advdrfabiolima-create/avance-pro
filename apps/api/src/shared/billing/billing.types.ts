// ─── Billing Core — Types ────────────────────────────────────────────────────
// Camada de abstração independente de gateway. Todo fluxo de cobrança
// passa por aqui antes de chegar ao provider externo.

export type BillingProvider = 'asaas' | 'inter' | 'bradesco' | 'manual'
export type BillingPaymentMethod = 'pix' | 'boleto'

export interface CreateChargeParams {
  /** ID interno da Cobranca (nosso sistema) */
  externalId: string
  payerName: string
  payerDocument?: string
  payerEmail?: string
  payerPhone?: string
  amount: number
  /** ISO date string YYYY-MM-DD */
  dueDate: string
  description?: string
  paymentMethod: BillingPaymentMethod
}

export interface ChargeResult {
  providerChargeId: string
  boletoUrl?: string
  linhaDigitavel?: string
  pixQrCode?: string
  pixChave?: string
  status: string
}

/** Interface que todo provider deve implementar */
export interface BillingProviderAdapter {
  createCharge(params: CreateChargeParams): Promise<ChargeResult>
  getCharge(providerChargeId: string): Promise<ChargeResult>
  cancelCharge(providerChargeId: string): Promise<void>
}
