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

async function asaasRequest(apiKey: string, ambiente: string, method: string, path: string, body?: unknown) {
  const url = `${getBaseUrl(ambiente)}${path}`
  const res = await fetch(url, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json() as any
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description ?? data?.message ?? `Asaas error ${res.status}`
    throw { statusCode: res.status >= 500 ? 502 : 422, message: msg }
  }
  return data
}

export async function asaasGetOrCreateCustomer(params: {
  nome: string
  email: string
  telefone?: string
  cpf?: string
}) {
  const config = await getConfig()

  if (params.cpf) {
    const cpfLimpo = params.cpf.replace(/\D/g, '')
    const busca = await asaasRequest(config.apiKey, config.ambiente, 'GET', `/customers?cpfCnpj=${cpfLimpo}&limit=1`)
    const existente = busca?.data?.[0]
    if (existente) return existente.id as string
  }

  const res = await asaasRequest(config.apiKey, config.ambiente, 'POST', '/customers', {
    name: params.nome,
    email: params.email,
    mobilePhone: params.telefone?.replace(/\D/g, '') || undefined,
    cpfCnpj: params.cpf?.replace(/\D/g, '') || undefined,
  })
  return res.id as string
}

export async function asaasCriarCobranca(params: {
  customerId: string
  valor: number
  vencimento: string
  descricao: string
  tipo: 'PIX' | 'BOLETO'
}) {
  const config = await getConfig()
  return asaasRequest(config.apiKey, config.ambiente, 'POST', '/payments', {
    customer: params.customerId,
    billingType: params.tipo,
    value: params.valor,
    dueDate: params.vencimento,
    description: params.descricao,
  }) as Promise<{ id: string; nossoNumero?: string; bankSlipUrl?: string; status: string }>
}

export async function asaasBuscarPixQrCode(asaasPaymentId: string) {
  const config = await getConfig()
  return asaasRequest(config.apiKey, config.ambiente, 'GET', `/payments/${asaasPaymentId}/pixQrCode`) as Promise<{
    encodedImage: string
    payload: string
    expirationDate: string
  }>
}

export async function asaasCancelarCobranca(asaasPaymentId: string) {
  const config = await getConfig()
  await asaasRequest(config.apiKey, config.ambiente, 'DELETE', `/payments/${asaasPaymentId}`)
}

export async function asaasTestarConexao(apiKey: string, ambiente: string) {
  return asaasRequest(apiKey, ambiente, 'GET', '/myAccount') as Promise<{
    name: string
    email: string
    commercialName?: string
  }>
}
