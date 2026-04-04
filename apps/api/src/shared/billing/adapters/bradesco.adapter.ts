// ─── Bradesco Adapter (Placeholder + CNAB Ready) ─────────────────────────────
//
// Estrutura para integração com o Bradesco via dois canais:
//
// CANAL 1 — API REST (ShopFácil / Meios de Pagamento Bradesco)
//   Docs: https://meiosdepagamento.bradesco
//   Requer: merchantId, merchantKey, certificado HTTPS
//
// CANAL 2 — CNAB 400/240 (remessa/retorno) — estrutura pronta abaixo
//   Usado para emissão e reconciliação de boletos em lote
//   Arquivos trocados via SFTP ou portal internet banking
//
// Configurar em ConfigGateway: tipo = 'bradesco'

import type { BillingProviderAdapter, CreateChargeParams, ChargeResult } from '../billing.types'

// ─── CNAB ─────────────────────────────────────────────────────────────────────

/**
 * Gera um arquivo de remessa CNAB 400 para o Bradesco.
 * Cada boleto = 1 registro tipo "1" de 400 bytes.
 *
 * Uso futuro:
 *   const cnab = BradescoCnab.gerarRemessa([cobranca1, cobranca2])
 *   fs.writeFileSync('CB240101.REM', cnab, 'ascii')
 *   // Enviar via SFTP para o banco
 */
export class BradescoCnab {
  static gerarRemessa(_cobrancas: unknown[]): string {
    // TODO:
    // 1. Header de arquivo (registro tipo 0)
    // 2. Header de lote (registro tipo 1)
    // 3. Registros de cobrança (registro tipo "1" do segmento J)
    // 4. Trailer de lote
    // 5. Trailer de arquivo
    // Referência: Layout CNAB 240 Bradesco versão 2023
    throw new Error('CNAB 400 Bradesco — implementação pendente')
  }

  /**
   * Processa arquivo de retorno CNAB 400 recebido do Bradesco.
   * Retorna lista de boletos pagos/liquidados para reconciliação.
   *
   * Uso futuro:
   *   const pagamentos = BradescoCnab.processarRetorno(arquivoRET)
   *   for (const p of pagamentos) { await reconciliarCobranca(p) }
   */
  static processarRetorno(_conteudo: string): unknown[] {
    // TODO:
    // 1. Ler linha por linha (400 chars cada)
    // 2. Identificar registros tipo "T" (confirmação de entrada) e "U" (liquidação)
    // 3. Extrair: nossoNumero, dataPagamento, valorPago
    // 4. Retornar lista para reconciliação no sistema
    throw new Error('Processamento de retorno CNAB 400 — implementação pendente')
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class BradescoAdapter implements BillingProviderAdapter {
  // TODO: injetar merchantId, merchantKey, SFTP credentials via ConfigGateway

  /** POST /webservice/pagamentos/v1/boletos */
  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    // Passo 1: Autenticar via OAuth2
    // const token = await this.getAccessToken()

    // Passo 2: Montar payload Bradesco
    // const payload = {
    //   merchant: { id: this.merchantId },
    //   payment: {
    //     type: 'boleto',
    //     amount: Math.round(params.amount * 100), // centavos
    //     dueDate: params.dueDate,
    //     instructions: params.description,
    //   },
    //   customer: { name: params.payerName, document: params.payerDocument },
    // }

    // Alternativa: para volume alto, usar CNAB 400 via BradescoCnab.gerarRemessa()
    // e enviar arquivo via SFTP

    void params
    throw new Error('Bradesco não configurado. Configure as credenciais em Financeiro → Configurações.')
  }

  async getCharge(_providerChargeId: string): Promise<ChargeResult> {
    throw new Error('Bradesco não configurado.')
  }

  async cancelCharge(_providerChargeId: string): Promise<void> {
    throw new Error('Bradesco não configurado.')
  }
}

export const bradescoAdapter = new BradescoAdapter()
