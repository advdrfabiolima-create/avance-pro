// ─── Asaas Adapter ───────────────────────────────────────────────────────────
// Adapta a integração existente com Asaas para o padrão BillingProviderAdapter.
// Toda lógica de HTTP com a API Asaas continua em asaas.service.ts.

import type { BillingProviderAdapter, CreateChargeParams, ChargeResult } from '../billing.types'
import {
  asaasGetOrCreateCustomer,
  asaasCriarCobranca,
  asaasBuscarPixQrCode,
  asaasCancelarCobranca,
} from '../../asaas.service'

export class AsaasAdapter implements BillingProviderAdapter {
  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    // 1. Garante que o pagador existe no Asaas
    const customerId = await asaasGetOrCreateCustomer({
      nome: params.payerName,
      email: params.payerEmail ?? '',
      telefone: params.payerPhone,
      cpf: params.payerDocument,
    })

    // 2. Cria a cobrança
    const tipo = params.paymentMethod === 'pix' ? 'PIX' : 'BOLETO'
    const pagamento = await asaasCriarCobranca({
      customerId,
      valor: params.amount,
      vencimento: params.dueDate,
      descricao: params.description ?? `Cobrança ${params.externalId}`,
      tipo,
    })

    const result: ChargeResult = {
      providerChargeId: pagamento.id,
      status: pagamento.status,
    }

    // 3. Para PIX, busca o QR Code
    if (params.paymentMethod === 'pix') {
      try {
        const qr = await asaasBuscarPixQrCode(pagamento.id)
        result.pixQrCode = qr.encodedImage
        result.pixChave = qr.payload
      } catch {
        // QR pode demorar alguns segundos para ficar disponível — ignora erro aqui
      }
    }

    // 4. Para BOLETO, salva a URL do slip
    if (params.paymentMethod === 'boleto' && pagamento.bankSlipUrl) {
      result.boletoUrl = pagamento.bankSlipUrl
    }

    return result
  }

  async getCharge(providerChargeId: string): Promise<ChargeResult> {
    // TODO: implementar asaasGetCharge em asaas.service.ts quando necessário
    throw new Error(`getCharge(${providerChargeId}) não implementado ainda`)
  }

  async cancelCharge(providerChargeId: string): Promise<void> {
    await asaasCancelarCobranca(providerChargeId)
  }
}

export const asaasAdapter = new AsaasAdapter()
