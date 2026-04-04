// ─── CNAB Registry ────────────────────────────────────────────────────────────
// Mapeia código do banco → adapter CNAB.
// Para adicionar um novo banco: criar o adapter e registrar aqui.

import type { CnabBankAdapter } from './cnab.types'
import { BradescoAdapter } from './adapters/bradesco.adapter'
import { ItauAdapter } from './adapters/itau.adapter'
import { SantanderAdapter } from './adapters/santander.adapter'
import { BbAdapter } from './adapters/bb.adapter'
import { InterCnabAdapter } from './adapters/inter.adapter'

const ADAPTERS = new Map<string, CnabBankAdapter>([
  ['237', new BradescoAdapter()],
  ['341', new ItauAdapter()],
  ['033', new SantanderAdapter()],
  ['001', new BbAdapter()],
  ['077', new InterCnabAdapter()],
])

export function getCnabAdapter(bankCode: string): CnabBankAdapter {
  const adapter = ADAPTERS.get(bankCode.padStart(3, '0'))
  if (!adapter) throw { statusCode: 400, message: `Banco ${bankCode} não possui adapter CNAB configurado` }
  return adapter
}

export function listSupportedBanks(): { bankCode: string; supportedLayouts: string[] }[] {
  return Array.from(ADAPTERS.entries()).map(([code, adapter]) => ({
    bankCode: code,
    supportedLayouts: adapter.supportedLayouts,
  }))
}
