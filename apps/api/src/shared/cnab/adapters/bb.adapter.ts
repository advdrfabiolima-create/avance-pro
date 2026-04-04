// ─── Banco do Brasil CNAB Adapter ────────────────────────────────────────────
// Banco: Banco do Brasil | Código: 001
// Layouts: CNAB 240 v084, CNAB 400
// Status: Parser inicial — homologação necessária.
//
// Carteiras comuns: 17 (cobrança registrada), 18, 11 (descontada)
// Convênio de 6, 7 ou 8 dígitos obrigatório.

import type {
  CnabBankAdapter, BankAccountConfig, CnabCharge, CnabLayout,
  CnabRemittanceResult, CnabReturnResult, OccurrenceCategory,
} from '../cnab.types'
import { generateCnab240Remittance, parseCnab240Return } from '../cnab.core'

const OCCURRENCE_MAP: Record<string, { description: string; category: OccurrenceCategory }> = {
  '02': { description: 'Entrada confirmada', category: 'entry_confirmed' },
  '03': { description: 'Entrada rejeitada', category: 'rejection' },
  '04': { description: 'Transferência de carteira/título', category: 'alteration' },
  '06': { description: 'Liquidação normal', category: 'payment' },
  '07': { description: 'Liquidação parcial', category: 'payment' },
  '08': { description: 'Liquidação em cartório', category: 'payment' },
  '09': { description: 'Baixa automática', category: 'write_off' },
  '10': { description: 'Baixa por liquidação', category: 'write_off' },
  '12': { description: 'Abatimento concedido', category: 'alteration' },
  '13': { description: 'Abatimento cancelado', category: 'alteration' },
  '14': { description: 'Vencimento alterado', category: 'alteration' },
  '17': { description: 'Liquidação após baixa', category: 'payment' },
  '19': { description: 'Protesto confirmado', category: 'protest' },
  '20': { description: 'Sustação de protesto confirmada', category: 'alteration' },
  '23': { description: 'Remessa a cartório', category: 'protest' },
  '27': { description: 'Baixa rejeitada', category: 'rejection' },
  '30': { description: 'Alteração rejeitada', category: 'rejection' },
  '32': { description: 'Instrução rejeitada', category: 'rejection' },
}

export class BbAdapter implements CnabBankAdapter {
  readonly bankCode = '001'
  readonly supportedLayouts: CnabLayout[] = ['cnab240', 'cnab400']

  generateRemittance(charges: CnabCharge[], account: BankAccountConfig, _layout: CnabLayout = 'cnab240'): CnabRemittanceResult {
    return generateCnab240Remittance(charges, account, this.bankCode, 'BANCO DO BRASIL')
  }

  parseReturn(fileContent: string, _account: BankAccountConfig): CnabReturnResult {
    const result = parseCnab240Return(fileContent, OCCURRENCE_MAP)
    return { bankCode: this.bankCode, layout: 'cnab240', fileDate: result.fileDate, occurrences: result.occurrences, totalRecords: result.occurrences.length, errors: result.errors }
  }

  validateConfig(account: Partial<BankAccountConfig>): string[] {
    const errors: string[] = []
    for (const f of ['agency', 'accountNumber', 'beneficiaryDocument', 'walletCode', 'agreementCode'] as const) {
      if (!account[f]) errors.push(`Campo obrigatório: ${f}`)
    }
    const conv = account.agreementCode?.replace(/\D/g, '') ?? ''
    if (conv && ![6, 7, 8].includes(conv.length)) {
      errors.push('Convênio BB deve ter 6, 7 ou 8 dígitos')
    }
    return errors
  }

  getOccurrenceMap() { return OCCURRENCE_MAP }
}
