// ─── Banco Inter CNAB Adapter ─────────────────────────────────────────────────
// Banco: Banco Inter | Código: 077
// Layout: CNAB 240 v030
// Status: Parser inicial — homologação necessária.
//
// Obs: Inter também possui API REST (PIX + boleto). Para uso via API,
// ver apps/api/src/shared/billing/adapters/inter.adapter.ts (BillingCore).
// Este adapter cobre apenas o fluxo CNAB/arquivo.
//
// API-READY: quando integrar via API, o BillingBankAccount.metadata pode
// conter { mode: 'api', clientId, clientSecret, certPath }.

import type {
  CnabBankAdapter, BankAccountConfig, CnabCharge, CnabLayout,
  CnabRemittanceResult, CnabReturnResult, OccurrenceCategory,
} from '../cnab.types'
import { generateCnab240Remittance, parseCnab240Return } from '../cnab.core'

const OCCURRENCE_MAP: Record<string, { description: string; category: OccurrenceCategory }> = {
  '02': { description: 'Entrada confirmada', category: 'entry_confirmed' },
  '03': { description: 'Entrada rejeitada', category: 'rejection' },
  '06': { description: 'Liquidação normal', category: 'payment' },
  '09': { description: 'Baixa automática', category: 'write_off' },
  '10': { description: 'Baixa por liquidação', category: 'write_off' },
  '12': { description: 'Abatimento concedido', category: 'alteration' },
  '13': { description: 'Abatimento cancelado', category: 'alteration' },
  '14': { description: 'Vencimento alterado', category: 'alteration' },
  '17': { description: 'Liquidação após baixa', category: 'payment' },
  '27': { description: 'Baixa rejeitada', category: 'rejection' },
  '32': { description: 'Instrução rejeitada', category: 'rejection' },
}

export class InterCnabAdapter implements CnabBankAdapter {
  readonly bankCode = '077'
  readonly supportedLayouts: CnabLayout[] = ['cnab240']

  generateRemittance(charges: CnabCharge[], account: BankAccountConfig, _layout: CnabLayout = 'cnab240'): CnabRemittanceResult {
    return generateCnab240Remittance(charges, account, this.bankCode, 'BANCO INTER')
  }

  parseReturn(fileContent: string, _account: BankAccountConfig): CnabReturnResult {
    const result = parseCnab240Return(fileContent, OCCURRENCE_MAP)
    return { bankCode: this.bankCode, layout: 'cnab240', fileDate: result.fileDate, occurrences: result.occurrences, totalRecords: result.occurrences.length, errors: result.errors }
  }

  validateConfig(account: Partial<BankAccountConfig>): string[] {
    const errors: string[] = []
    for (const f of ['agency', 'accountNumber', 'beneficiaryDocument'] as const) {
      if (!account[f]) errors.push(`Campo obrigatório: ${f}`)
    }
    return errors
  }

  getOccurrenceMap() { return OCCURRENCE_MAP }
}
