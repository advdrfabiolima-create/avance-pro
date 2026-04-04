// ─── Banco Inter Adapter (Placeholder) ───────────────────────────────────────
//
// Estrutura pronta para integração com a API Open Finance do Banco Inter.
// Docs: https://developers.inter.co/
//
// Pré-requisitos para ativar:
//   1. Certificado mTLS (.crt + .key) emitido pelo Inter
//   2. Client ID + Client Secret do app cadastrado no Developer Portal
//   3. Escopos: boleto-cobranca.read, boleto-cobranca.write
//
// Configurar em ConfigGateway: tipo = 'inter'

import type { BillingProviderAdapter, CreateChargeParams, ChargeResult } from '../billing.types'

const INTER_BASE_URL = 'https://cdpj.partners.bancointer.com.br'

export class InterAdapter implements BillingProviderAdapter {
  // TODO: injetar clientId, clientSecret e certificados via ConfigGateway

  /** POST /cobranca/v3/cobrancas */
  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    // Passo 1: OAuth2 — obter access_token com certificado mTLS
    // const token = await this.getAccessToken()

    // Passo 2: Montar payload do Inter (formato diferente do Asaas)
    // const payload = {
    //   seuNumero: params.externalId,
    //   valorNominal: params.amount,
    //   dataVencimento: params.dueDate,
    //   numDiasAgenda: 60,
    //   pagador: {
    //     cpfCnpj: params.payerDocument,
    //     nome: params.payerName,
    //     email: params.payerEmail,
    //   },
    //   mensagem: { linha1: params.description },
    // }

    // Passo 3: POST para a API do Inter
    // const res = await fetch(`${INTER_BASE_URL}/cobranca/v3/cobrancas`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    //   agent: this.mtlsAgent, // certificado mTLS obrigatório
    // })

    void INTER_BASE_URL // referência para evitar lint warning
    throw new Error('Banco Inter não configurado. Configure as credenciais em Financeiro → Configurações.')
  }

  /** GET /cobranca/v3/cobrancas/{nossoNumero} */
  async getCharge(_providerChargeId: string): Promise<ChargeResult> {
    throw new Error('Banco Inter não configurado.')
  }

  /** DELETE /cobranca/v3/cobrancas/{nossoNumero}/cancelar */
  async cancelCharge(_providerChargeId: string): Promise<void> {
    throw new Error('Banco Inter não configurado.')
  }
}

export const interAdapter = new InterAdapter()
