// ─── Itaú CNAB Adapter ────────────────────────────────────────────────────────
// Banco: Itaú Unibanco | Código: 341
// Layouts: CNAB 240 v087, CNAB 400
// Status: Parser inicial — homologação necessária.
//
// Carteiras comuns: 109 (cobrança direta), 112 (registrada), 115, 196

import type {
  CnabBankAdapter, BankAccountConfig, CnabCharge, CnabLayout,
  CnabRemittanceResult, CnabReturnResult, OccurrenceCategory,
} from '../cnab.types'
import { generateCnab240Remittance, parseCnab240Return } from '../cnab.core'

const OCCURRENCE_MAP: Record<string, { description: string; category: OccurrenceCategory }> = {
  '02': { description: 'Confirmação de entrada do título', category: 'entry_confirmed' },
  '03': { description: 'Entrada rejeitada', category: 'rejection' },
  '06': { description: 'Liquidação normal (sem erro)', category: 'payment' },
  '07': { description: 'Liquidação parcial — cobrança simples', category: 'payment' },
  '08': { description: 'Liquidação em cartório', category: 'payment' },
  '09': { description: 'Baixa simples (solicitada)', category: 'write_off' },
  '10': { description: 'Baixa por liquidação', category: 'write_off' },
  '11': { description: 'Títulos em ser (em aberto)', category: 'unknown' },
  '12': { description: 'Abatimento concedido', category: 'alteration' },
  '13': { description: 'Abatimento cancelado', category: 'alteration' },
  '14': { description: 'Vencimento alterado', category: 'alteration' },
  '15': { description: 'Liquidação em conta', category: 'payment' },
  '17': { description: 'Liquidação após baixa ou título não registrado', category: 'payment' },
  '19': { description: 'Aceite de cobrança sem papel', category: 'entry_confirmed' },
  '23': { description: 'Remessa a cartório', category: 'protest' },
  '24': { description: 'Retirada de cartório', category: 'alteration' },
  '27': { description: 'Baixa rejeitada', category: 'rejection' },
  '30': { description: 'Alteração rejeitada', category: 'rejection' },
  '32': { description: 'Instrução rejeitada', category: 'rejection' },
  '68': { description: 'Acerto de data de crédito', category: 'alteration' },
  '69': { description: 'Acerto de valor de crédito', category: 'alteration' },
}

export class ItauAdapter implements CnabBankAdapter {
  readonly bankCode = '341'
  readonly supportedLayouts: CnabLayout[] = ['cnab240', 'cnab400']

  generateRemittance(charges: CnabCharge[], account: BankAccountConfig, _layout: CnabLayout = 'cnab240'): CnabRemittanceResult {
    return generateCnab240Remittance(charges, account, this.bankCode, 'ITAU UNIBANCO')
  }

  parseReturn(fileContent: string, _account: BankAccountConfig): CnabReturnResult {
    const result = parseCnab240Return(fileContent, OCCURRENCE_MAP)
    return { bankCode: this.bankCode, layout: 'cnab240', fileDate: result.fileDate, occurrences: result.occurrences, totalRecords: result.occurrences.length, errors: result.errors }
  }

  validateConfig(account: Partial<BankAccountConfig>): string[] {
    const errors: string[] = []
    for (const f of ['agency', 'accountNumber', 'beneficiaryDocument', 'walletCode'] as const) {
      if (!account[f]) errors.push(`Campo obrigatório ausente: ${f}`)
    }
    return errors
  }

  getOccurrenceMap() { return OCCURRENCE_MAP }
}
