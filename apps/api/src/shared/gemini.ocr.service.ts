/**
 * Serviço de OCR com IA via Google Gemini Vision (gemini-1.5-flash).
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

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
