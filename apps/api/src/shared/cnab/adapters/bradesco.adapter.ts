// ─── Bradesco CNAB Adapter ────────────────────────────────────────────────────
// Banco: Bradesco | Código: 237
// Layouts: CNAB 240 v087, CNAB 400 v84
// Status: Parser inicial — homologação necessária com convênio do cliente.
//
// Referência: Manual CNAB 240 Bradesco v087 (cobrança registrada)
// Carteiras comuns: 09 (cobrança registrada), 26 (vendor)

import type {
  CnabBankAdapter, BankAccountConfig, CnabCharge, CnabLayout,
  CnabRemittanceResult, CnabReturnResult, OccurrenceCategory,
} from '../cnab.types'
import { generateCnab240Remittance, parseCnab240Return } from '../cnab.core'

const OCCURRENCE_MAP: Record<string, { description: string; category: OccurrenceCategory }> = {
  '02': { description: 'Entrada confirmada', category: 'entry_confirmed' },
  '03': { description: 'Entrada rejeitada', category: 'rejection' },
  '06': { description: 'Liquidação normal', category: 'payment' },
  '09': { description: 'Baixa automática/manual', category: 'write_off' },
  '10': { description: 'Baixa por liquidação', category: 'write_off' },
  '12': { description: 'Abatimento concedido', category: 'alteration' },
  '13': { description: 'Abatimento cancelado', category: 'alteration' },
  '14': { description: 'Vencimento alterado', category: 'alteration' },
  '15': { description: 'Liquidação em cartório', category: 'payment' },
  '17': { description: 'Liquidação após baixa', category: 'payment' },
  '19': { description: 'Confirmação recebimento instrução protesto', category: 'protest' },
  '20': { description: 'Confirmação recebimento instrução sustação protesto', category: 'protest' },
  '23': { description: 'Remessa a cartório (aponte)', category: 'protest' },
  '24': { description: 'Retirada de cartório e manutenção em carteira', category: 'alteration' },
  '27': { description: 'Baixa rejeitada', category: 'rejection' },
  '28': { description: 'Débito de tarifas/custas', category: 'alteration' },
  '30': { description: 'Alteração de dados rejeitada', category: 'rejection' },
  '32': { description: 'Instrução rejeitada', category: 'rejection' },
  '68': { description: 'Acerto de data de pagamento', category: 'alteration' },
  '69': { description: 'Acerto de valor de pagamento', category: 'alteration' },
}

const REQUIRED_FIELDS: (keyof BankAccountConfig)[] = [
  'agency', 'accountNumber', 'beneficiaryName', 'beneficiaryDocument',
  'walletCode', 'agreementCode',
]

export class BradescoAdapter implements CnabBankAdapter {
  readonly bankCode = '237'
  readonly supportedLayouts: CnabLayout[] = ['cnab240', 'cnab400']

  generateRemittance(charges: CnabCharge[], account: BankAccountConfig, layout: CnabLayout = 'cnab240'): CnabRemittanceResult {
    if (layout === 'cnab400') {
      // CNAB 400 v84 — estrutura diferente
      // CNAB-400-READY: implementar parser específico v84 quando necessário
      throw new Error('Bradesco CNAB 400 em desenvolvimento — use CNAB 240 por enquanto')
    }
    return generateCnab240Remittance(charges, account, this.bankCode, 'BRADESCO')
  }

  parseReturn(fileContent: string, _account: BankAccountConfig): CnabReturnResult {
    const result = parseCnab240Return(fileContent, OCCURRENCE_MAP)
    return {
      bankCode: this.bankCode,
      layout: 'cnab240',
      fileDate: result.fileDate,
      occurrences: result.occurrences,
      totalRecords: result.occurrences.length,
      errors: result.errors,
    }
  }

  validateConfig(account: Partial<BankAccountConfig>): string[] {
    const errors: string[] = []
    for (const field of REQUIRED_FIELDS) {
      if (!account[field]) errors.push(`Campo obrigatório ausente: ${field}`)
    }
    const wallet = account.walletCode?.replace(/\D/g, '') ?? ''
    if (wallet && !['09', '26', '19'].includes(wallet.padStart(2, '0'))) {
      errors.push('Carteira Bradesco recomendada: 09 (cobrança registrada) ou 26 (vendor)')
    }
    return errors
  }

  getOccurrenceMap() {
    return OCCURRENCE_MAP
  }
}
