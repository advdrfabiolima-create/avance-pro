/**
 * Serviço de OCR com IA via Google Gemini Vision (gemini-2.0-flash).
 *
 * Substitui OcrSpaceProvider + parseOcrText em uma única chamada:
 * envia a imagem + contexto das questões e recebe JSON estruturado
 * com as respostas detectadas.
 *
 * Fallback: retorna array vazio (sem respostas detectadas) se a API
 * falhar ou a chave não estiver configurada.
 */

import https from 'https'

export interface QuestaoOcrInput {
  ordem: number
  tipo: 'objetiva' | 'numerica' | 'discursiva'
}

export interface RespostaDetectadaGemini {
  questaoOrdem: number
  letraDetectada: string | null   // para objetivas: 'A', 'B', 'C' ou 'D'
  valorDetectado: number | null   // para numéricas
  confianca: number | null        // 0.0 – 1.0
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function httpsPost(url: string, body: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(questoes: QuestaoOcrInput[]): string {
  const lista = questoes
    .map((q) => {
      if (q.tipo === 'objetiva') return `  - Questão ${q.ordem}: múltipla escolha (resposta: A, B, C ou D)`
      if (q.tipo === 'numerica') return `  - Questão ${q.ordem}: numérica (resposta: número)`
      return `  - Questão ${q.ordem}: discursiva (ignorar)`
    })
    .join('\n')

  return `Você receberá a foto de uma folha de exercícios respondida à mão por um aluno.

O exercício contém as seguintes questões:
${lista}

Analise a imagem com atenção e identifique as respostas escritas pelo aluno para cada questão.

Retorne APENAS um JSON válido, sem texto antes ou depois, no seguinte formato:
[
  {
    "questaoOrdem": 1,
    "letraDetectada": "B",
    "valorDetectado": null,
    "confianca": 0.92
  }
]

Regras:
- Para questões de múltipla escolha: preencha letraDetectada com a letra (A/B/C/D) e valorDetectado como null
- Para questões numéricas: preencha valorDetectado com o número e letraDetectada como null
- Para questões discursivas: omita ou retorne letraDetectada e valorDetectado como null
- confianca: número entre 0.0 e 1.0 indicando sua certeza sobre a detecção (0.9+ = muito claro, 0.5 = duvidoso)
- Se não conseguir identificar uma resposta, retorne letraDetectada e valorDetectado como null com confianca 0
- Retorne uma entrada para CADA questão listada acima`
}

// ─── Gemini call ──────────────────────────────────────────────────────────────

// ─── Gabarito avulso ──────────────────────────────────────────────────────────

export interface GabaritoItem {
  ordem: number
  tipo: 'objetiva' | 'numerica' | 'discursiva'
  resposta: string
}

export interface ResultadoQuestao {
  questaoOrdem: number
  tipo: string
  respostaGabarito: string
  respostaAluno: string | null
  confianca: number | null
  correta: boolean
  // Campos exclusivos para discursivas
  textoDetectado: string | null
  avaliacaoIA: 'correto' | 'parcial' | 'incorreto' | null
  justificativa: string | null
}

/**
 * Extrai gabarito de uma foto de folha de respostas.
 * Retorna [{ordem, tipo, resposta}] para cada questão encontrada.
 */
export async function extrairGabaritoDeImagem(
  imagemBase64: string,
  mimeType: string
): Promise<GabaritoItem[]> {
  const apiKey = process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const imagemPura = imagemBase64.includes(',')
    ? imagemBase64.split(',')[1]!
    : imagemBase64

  const prompt = `Analise esta imagem de um gabarito (folha de respostas corretas).

Identifique cada questão e sua resposta correta.

Retorne APENAS um JSON válido, sem texto antes ou depois:
[
  {
    "ordem": 1,
    "tipo": "objetiva",
    "resposta": "B"
  }
]

Regras:
- Se a resposta for uma letra (A/B/C/D/E), tipo = "objetiva"
- Se a resposta for um número ou expressão numérica, tipo = "numerica"
- Se a resposta for texto discursivo, tipo = "discursiva"
- Inclua TODAS as questões que conseguir identificar na imagem`

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const responseText = await httpsPost(url, {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
  })

  let parsed: any
  try { parsed = JSON.parse(responseText) } catch { throw new Error('Resposta inválida da API Gemini') }
  if (parsed?.error) throw new Error(`Erro Gemini: ${parsed.error.message ?? JSON.stringify(parsed.error)}`)

  const content: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!content) throw new Error('Conteúdo vazio na resposta do Gemini')

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta do Gemini')

  let raw: any[]
  try { raw = JSON.parse(jsonMatch[0]) } catch { throw new Error('JSON inválido retornado pelo Gemini') }

  return raw.map((r: any): GabaritoItem => ({
    ordem: Number(r.ordem),
    tipo: (['objetiva', 'numerica', 'discursiva'].includes(r.tipo) ? r.tipo : 'objetiva') as GabaritoItem['tipo'],
    resposta: String(r.resposta ?? '').trim(),
  })).filter((r) => r.ordem > 0 && r.resposta.length > 0)
}

/**
 * Corrige a folha do aluno comparando com o gabarito fornecido.
 * Retorna resultado por questão com o que o aluno escreveu e se está correto.
 */
export async function corrigirFolhaAvulsa(
  alunoBase64: string,
  mimeType: string,
  gabarito: GabaritoItem[]
): Promise<ResultadoQuestao[]> {
  const apiKey = process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const imagemPura = alunoBase64.includes(',')
    ? alunoBase64.split(',')[1]!
    : alunoBase64

  const listaGabarito = gabarito
    .map((g) => {
      if (g.tipo === 'objetiva') return `  - Questão ${g.ordem}: múltipla escolha, resposta correta = ${g.resposta}`
      if (g.tipo === 'numerica') return `  - Questão ${g.ordem}: numérica, resposta correta = ${g.resposta}`
      return `  - Questão ${g.ordem}: discursiva, resposta correta = ${g.resposta}`
    })
    .join('\n')

  const prompt = `Analise esta foto de uma folha de exercícios respondida à mão por um aluno.

O gabarito correto é:
${listaGabarito}

Para cada questão listada acima, aplique o seguinte critério conforme o tipo:

**Questões objetivas (múltipla escolha):**
- Identifique a letra marcada pelo aluno (A/B/C/D/E)
- Compare com o gabarito (desconsidere maiúsculas/minúsculas)
- textoDetectado, avaliacaoIA e justificativa devem ser null

**Questões numéricas:**
- Identifique o número escrito pelo aluno
- Compare numericamente com o gabarito (ex: "7.0" == "7")
- textoDetectado, avaliacaoIA e justificativa devem ser null

**Questões discursivas:**
- Transcreva o texto exato que o aluno escreveu no campo textoDetectado
- Compare semanticamente com a resposta esperada do gabarito
- Avalie: "correto" (resposta certa), "parcial" (parte certa), "incorreto" (errado)
- Explique em 1-2 frases no campo justificativa
- respostaAluno deve conter o texto transcrito

Retorne APENAS um JSON válido, sem texto antes ou depois:
[
  {
    "questaoOrdem": 1,
    "tipo": "objetiva",
    "respostaGabarito": "B",
    "respostaAluno": "B",
    "confianca": 0.95,
    "correta": true,
    "textoDetectado": null,
    "avaliacaoIA": null,
    "justificativa": null
  },
  {
    "questaoOrdem": 2,
    "tipo": "discursiva",
    "respostaGabarito": "O sujeito é os meninos",
    "respostaAluno": "os meninos",
    "confianca": 0.88,
    "correta": true,
    "textoDetectado": "os meninos",
    "avaliacaoIA": "correto",
    "justificativa": "O aluno identificou corretamente o sujeito da oração."
  }
]

Retorne uma entrada para CADA questão do gabarito.
Se não conseguir identificar a resposta, use respostaAluno: null, confianca: 0, correta: false.`

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const responseText = await httpsPost(url, {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
  })

  let parsed: any
  try { parsed = JSON.parse(responseText) } catch { throw new Error('Resposta inválida da API Gemini') }
  if (parsed?.error) throw new Error(`Erro Gemini: ${parsed.error.message ?? JSON.stringify(parsed.error)}`)

  const content: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!content) throw new Error('Conteúdo vazio na resposta do Gemini')

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta do Gemini')

  let raw: any[]
  try { raw = JSON.parse(jsonMatch[0]) } catch { throw new Error('JSON inválido retornado pelo Gemini') }

  return raw.map((r: any): ResultadoQuestao => ({
    questaoOrdem: Number(r.questaoOrdem),
    tipo: String(r.tipo ?? 'objetiva'),
    respostaGabarito: String(r.respostaGabarito ?? ''),
    respostaAluno: r.respostaAluno != null ? String(r.respostaAluno) : null,
    confianca: r.confianca != null ? parseFloat(String(r.confianca)) : null,
    textoDetectado: r.textoDetectado != null ? String(r.textoDetectado) : null,
    avaliacaoIA: (['correto', 'parcial', 'incorreto'].includes(r.avaliacaoIA) ? r.avaliacaoIA : null) as ResultadoQuestao['avaliacaoIA'],
    justificativa: r.justificativa != null ? String(r.justificativa) : null,
    correta: Boolean(r.correta),
  }))
}

// ─── OCR para exercícios cadastrados ─────────────────────────────────────────

export async function detectarRespostasGemini(
  imagemBase64: string,
  mimeType: string,
  questoes: QuestaoOcrInput[]
): Promise<RespostaDetectadaGemini[]> {
  const apiKey = process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const questoesOcr = questoes.filter((q) => q.tipo !== 'discursiva')
  if (questoesOcr.length === 0) return []

  // Gemini aceita base64 sem o prefixo data:...;base64,
  const imagemPura = imagemBase64.includes(',')
    ? imagemBase64.split(',')[1]!
    : imagemBase64

  const prompt = buildPrompt(questoesOcr)

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const responseText = await httpsPost(url, {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType,
              data: imagemPura,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
    },
  })

  let parsed: any
  try {
    parsed = JSON.parse(responseText)
  } catch {
    throw new Error('Resposta inválida da API Gemini')
  }

  if (parsed?.error) {
    throw new Error(`Erro Gemini: ${parsed.error.message ?? JSON.stringify(parsed.error)}`)
  }

  const content: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!content) throw new Error('Conteúdo vazio na resposta do Gemini')

  // Extrai JSON da resposta (pode vir com markdown ```json ... ```)
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta do Gemini')

  let respostasRaw: any[]
  try {
    respostasRaw = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('JSON inválido retornado pelo Gemini')
  }

  return respostasRaw.map((r: any): RespostaDetectadaGemini => ({
    questaoOrdem: Number(r.questaoOrdem),
    letraDetectada: r.letraDetectada ? String(r.letraDetectada).toUpperCase() : null,
    valorDetectado: r.valorDetectado != null ? parseFloat(String(r.valorDetectado)) : null,
    confianca: r.confianca != null ? parseFloat(String(r.confianca)) : null,
  }))
}
