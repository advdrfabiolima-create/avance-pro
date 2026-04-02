import axios from 'axios'
import { prisma } from '@kumon-advance/db'

function getBaseUrl(ambiente: string) {
  return ambiente === 'producao'
    ? 'https://api.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3'
}

async function getConfig() {
  const config = await prisma.configGateway.findFirst({ where: { tipo: 'asaas', ativo: true } })
  if (!config) throw { statusCode: 422, message: 'Gateway Asaas não configurado. Acesse Configurações → Gateway de Pagamento.' }
  return config
}

function asaasClient(apiKey: string, ambiente: string) {
  return axios.create({
    baseURL: getBaseUrl(ambiente),
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    timeout: 15000,
  })
}

export async function asaasGetOrCreateCustomer(params: {
  nome: string
  email: string
  telefone?: string
  cpf?: string
}) {
  const config = await getConfig()
  const client = asaasClient(config.apiKey, config.ambiente)

  // Tentar buscar pelo CPF se disponível
  if (params.cpf) {
    const cpfLimpo = params.cpf.replace(/\D/g, '')
    const busca = await client.get('/customers', { params: { cpfCnpj: cpfLimpo, limit: 1 } })
    const existente = busca.data?.data?.[0]
    if (existente) return existente.id as string
  }

  // Criar novo customer
  const res = await client.post('/customers', {
    name: params.nome,
    email: params.email,
    mobilePhone: params.telefone?.replace(/\D/g, '') || undefined,
    cpfCnpj: params.cpf?.replace(/\D/g, '') || undefined,
  })
  return res.data.id as string
}

export async function asaasCriarCobranca(params: {
  customerId: string
  valor: number
  vencimento: string   // YYYY-MM-DD
  descricao: string
  tipo: 'PIX' | 'BOLETO'
}) {
  const config = await getConfig()
  const client = asaasClient(config.apiKey, config.ambiente)

  const res = await client.post('/payments', {
    customer: params.customerId,
    billingType: params.tipo,
    value: params.valor,
    dueDate: params.vencimento,
    description: params.descricao,
    externalReference: undefined,
  })

  return res.data as {
    id: string
    nossoNumero?: string
    bankSlipUrl?: string
    invoiceUrl?: string
    status: string
  }
}

export async function asaasBuscarPixQrCode(asaasPaymentId: string) {
  const config = await getConfig()
  const client = asaasClient(config.apiKey, config.ambiente)
  const res = await client.get(`/payments/${asaasPaymentId}/pixQrCode`)
  return res.data as { encodedImage: string; payload: string; expirationDate: string }
}

export async function asaasCancelarCobranca(asaasPaymentId: string) {
  const config = await getConfig()
  const client = asaasClient(config.apiKey, config.ambiente)
  await client.delete(`/payments/${asaasPaymentId}`)
}

export async function asaasTestarConexao(apiKey: string, ambiente: string) {
  const client = asaasClient(apiKey, ambiente)
  const res = await client.get('/myAccount')
  return res.data as { name: string; email: string; commercialName?: string }
}
