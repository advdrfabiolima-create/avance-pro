/**
 * Serviço de OCR com IA via Google Gemini Vision (gemini-2.5-flash).
 *
 * Funções principais:
 * - extrairGabaritoDeImagem: extrai gabarito de foto
 * - corrigirFolhaEstruturada: corrige folha do aluno com classificação pedagógica
 * - detectarRespostasGemini: OCR para exercícios cadastrados (legado)
 * - corrigirFolhaAvulsa: correção simples sem classificação (legado)
 */

import https from 'https'
import { analisarRespostaPedagogicamente } from './correction-engine'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusCorrecaoQuestao =
  | 'correta'
  | 'incorreta_por_ortografia'
  | 'incorreta_por_acentuacao'
  | 'incorreta_por_pontuacao'
  | 'incorreta_por_maiuscula'
  | 'incorreta_por_regra'
  | 'revisar'

export interface QuestaoOcrInput {
  ordem: number
  tipo: 'objetiva' | 'numerica' | 'discursiva'
}

export interface RespostaDetectadaGemini {
  questaoOrdem: number
  letraDetectada: string | null
  valorDetectado: number | null
  confianca: number | null
}

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
  textoDetectado: string | null
  avaliacaoIA: 'correto' | 'parcial' | 'incorreto' | null
  justificativa: string | null
}

export interface ResultadoQuestaoEstruturado {
  questaoOrdem: number
  tipo: string
  respostaGabarito: string
  respostaAluno: string | null
  confianca: number | null
  correta: boolean
  statusCorrecao: StatusCorrecaoQuestao
  textoDetectado: string | null
  avaliacaoIA: 'correto' | 'parcial' | 'incorreto' | null
  justificativa: string | null
  revisadaManual: boolean
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

// ─── Gemini helper (filtra thinking parts) ────────────────────────────────────

async function callGemini(parts: any[], maxOutputTokens = 2000, thinkingBudget = 1024): Promise<string> {
  const apiKey = process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const responseText = await httpsPost(url, {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens,
      thinkingConfig: { thinkingBudget },
    },
  })

  let parsed: any
  try { parsed = JSON.parse(responseText) } catch { throw new Error('Resposta inválida da API Gemini') }
  if (parsed?.error) throw new Error(`Erro Gemini: ${parsed.error.message ?? JSON.stringify(parsed.error)}`)

  // gemini-2.5-flash retorna parts com thought:true — filtrar
  const responseParts: any[] = parsed?.candidates?.[0]?.content?.parts ?? []
  const textContent = responseParts
    .filter((p: any) => !p.thought && typeof p.text === 'string')
    .map((p: any) => p.text as string)
    .join('')

  if (!textContent) throw new Error('Conteúdo vazio na resposta do Gemini')
  return textContent
}

function extractJsonArray(text: string): any[] {
  // Remove markdown code fences (```json ... ``` ou ``` ... ```)
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()

  // Tenta match de array JSON
  const match = stripped.match(/\[[\s\S]*\]/)
  if (!match) {
    console.error('[Gemini] Resposta bruta (sem JSON array):', stripped.slice(0, 500))
    throw new Error('JSON não encontrado na resposta do Gemini')
  }
  try { return JSON.parse(match[0]) } catch { throw new Error('JSON inválido retornado pelo Gemini') }
}

// ─── Critérios por disciplina ─────────────────────────────────────────────────

function buildCriteriosDisciplina(disciplina?: string): string {
  const d = (disciplina ?? '').toLowerCase()

  if (d.includes('portugu')) {
    return `
**Critérios específicos para Português:**
- Acentuação é OBRIGATÓRIA. Palavra com acento errado ou faltando → "incorreta_por_acentuacao"
- Pontuação é OBRIGATÓRIA quando exigida. Falta ou erro de pontuação → "incorreta_por_pontuacao"
- Erro ortográfico (grafia errada sem ser acento) → "incorreta_por_ortografia"
- Erro gramatical / regra → "incorreta_por_regra"`
  }

  if (d.includes('matem') || d.includes('math')) {
    return `
**Critérios específicos para Matemática:**
- Aceite equivalência numérica: "7.0" = "7" = "7,0" são todos corretos
- Frações equivalentes são corretas (ex: "1/2" = "0.5")
- Erro de cálculo → "incorreta_por_regra"
- Não penalize formatação (vírgula vs ponto decimal)`
  }

  if (d.includes('ingl') || d.includes('engl')) {
    return `
**Critérios específicos para Inglês:**
- Erro ortográfico em inglês → "incorreta_por_ortografia"
- Falta de maiúscula em proper nouns → "incorreta_por_regra"`
  }

  return ''
}

// ─── Correção estruturada com classificação pedagógica ────────────────────────

export async function corrigirFolhaEstruturada(
  alunoBase64: string,
  mimeType: string,
  gabarito: GabaritoItem[],
  disciplina?: string,
  gabaritoBase64?: string,
  gabaritoMime?: string
): Promise<ResultadoQuestaoEstruturado[]> {
  const imagemPura = alunoBase64.includes(',') ? alunoBase64.split(',')[1]! : alunoBase64

  const listaGabarito = gabarito
    .map((g) => {
      if (g.tipo === 'objetiva') return `  - Questão ${g.ordem}: múltipla escolha, resposta correta = ${g.resposta}`
      if (g.tipo === 'numerica') return `  - Questão ${g.ordem}: numérica, resposta correta = ${g.resposta}`
      return `  - Questão ${g.ordem}: discursiva, resposta correta = ${g.resposta}`
    })
    .join('\n')

  const criterios = buildCriteriosDisciplina(disciplina)

  const prompt = `Você é um professor corrigindo a folha de exercícios de um aluno.

O gabarito correto é:
${listaGabarito}
${criterios}

**Classificação de status para cada questão:**
- "correta": resposta do aluno está correta
- "incorreta_por_ortografia": erro de grafia (letra errada, mas não acento)
- "incorreta_por_acentuacao": falta ou erro de acento/til/cedilha
- "incorreta_por_pontuacao": falta ou erro de pontuação (vírgula, ponto, etc)
- "incorreta_por_regra": erro conceitual, de cálculo ou regra gramatical
- "revisar": resposta ilegível, ambígua ou confiança < 0.6 — professor deve revisar manualmente

**Para cada questão:**
- Objetivas (A/B/C/D/E): identifique a letra marcada, compare com gabarito
- Numéricas: identifique o número escrito, compare numericamente
- Discursivas: transcreva o texto exato no textoDetectado, avalie semanticamente

Retorne APENAS um JSON válido, sem texto antes ou depois:
[
  {
    "questaoOrdem": 1,
    "tipo": "objetiva",
    "respostaGabarito": "B",
    "respostaAluno": "B",
    "confianca": 0.95,
    "correta": true,
    "statusCorrecao": "correta",
    "textoDetectado": null,
    "avaliacaoIA": null,
    "justificativa": null
  }
]

Regras adicionais:
- Se confianca < 0.6 ou resposta ilegível: statusCorrecao = "revisar", correta = false
- Para discursivas: avaliacaoIA = "correto" | "parcial" | "incorreto", justificativa em 1-2 frases
- Se avaliacaoIA = "parcial": statusCorrecao = "revisar" (professor decide)
- Retorne uma entrada para CADA questão do gabarito`

  const parts: any[] = [
    { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
    { text: prompt },
  ]

  // Se gabarito veio em foto, inclui como segunda imagem
  if (gabaritoBase64) {
    const gabaritoPuro = gabaritoBase64.includes(',') ? gabaritoBase64.split(',')[1]! : gabaritoBase64
    parts.unshift({ inline_data: { mime_type: (gabaritoMime ?? 'image/jpeg') === 'application/pdf' ? 'image/jpeg' : (gabaritoMime ?? 'image/jpeg'), data: gabaritoPuro } })
  }

  // thinking budget baixo: tarefa estruturada não precisa de raciocínio profundo
  const content = await callGemini(parts, 6000, 512)
  const raw = extractJsonArray(content)

  const VALID_STATUS: StatusCorrecaoQuestao[] = [
    'correta', 'incorreta_por_ortografia', 'incorreta_por_acentuacao',
    'incorreta_por_pontuacao', 'incorreta_por_maiuscula', 'incorreta_por_regra', 'revisar',
  ]

  return raw.map((r: any): ResultadoQuestaoEstruturado => {
    const tipo = String(r.tipo ?? 'objetiva')
    const respostaAluno = r.respostaAluno != null ? String(r.respostaAluno) : null
    const respostaGabarito = String(r.respostaGabarito ?? '')
    const confianca = r.confianca != null ? parseFloat(String(r.confianca)) : null

    // Status base da IA
    let status: StatusCorrecaoQuestao = VALID_STATUS.includes(r.statusCorrecao)
      ? r.statusCorrecao
      : (r.correta ? 'correta' : 'revisar')
    let correta = Boolean(r.correta)

    // Justificativa do motor
    let motorJustificativa: string | undefined

    // ── Motor pedagógico (pós-processamento para TODAS as questões) ──
    // Para objetivas/numéricas: motor é mais preciso que Gemini para classificar
    // o tipo de erro. Para discursivas (ex: listas de palavras em português):
    // motor detecta erros de acento/ortografia que o Gemini frequentemente ignora.
    // O motor só sobrescreve quando chega a conclusão específica (não 'revisar'),
    // ou quando a IA também ficou em dúvida — preservando avaliação semântica do
    // Gemini quando motor não consegue classificar (textos muito distintos).
    // Confiança mínima: 0.55 (abaixo → IA decide).
    if (respostaAluno !== null && (confianca === null || confianca >= 0.55)) {
      const motorResult = analisarRespostaPedagogicamente({
        disciplina: disciplina ?? 'geral',
        gabarito: respostaGabarito,
        respostaAluno,
      })
      if (motorResult.status !== 'revisar' || status === 'revisar') {
        status = motorResult.status as StatusCorrecaoQuestao
        correta = motorResult.status === 'correta'
        if (motorResult.motivos.length > 0) {
          motorJustificativa = motorResult.motivos[0]!
        }
      }
    }

    return {
      questaoOrdem: Number(r.questaoOrdem),
      tipo,
      respostaGabarito,
      respostaAluno,
      confianca,
      correta,
      statusCorrecao: status,
      textoDetectado: r.textoDetectado != null ? String(r.textoDetectado) : null,
      avaliacaoIA: (['correto', 'parcial', 'incorreto'].includes(r.avaliacaoIA) ? r.avaliacaoIA : null) as ResultadoQuestaoEstruturado['avaliacaoIA'],
      justificativa: motorJustificativa ?? (r.justificativa != null ? String(r.justificativa) : null),
      // Questões com status 'revisar' precisam de decisão manual; demais são auto-revisadas
      revisadaManual: status === 'revisar' ? false : true,
    }
  })
}

// ─── Extração de gabarito ─────────────────────────────────────────────────────

export async function extrairGabaritoDeImagem(
  imagemBase64: string,
  mimeType: string
): Promise<GabaritoItem[]> {
  if (!process.env['GOOGLE_API_KEY']) throw new Error('GOOGLE_API_KEY não configurada')

  const imagemPura = imagemBase64.includes(',') ? imagemBase64.split(',')[1]! : imagemBase64

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

  // thinking budget baixo: extração simples não precisa de raciocínio profundo
  const content = await callGemini([
    { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
    { text: prompt },
  ], 4000, 512)

  const raw = extractJsonArray(content)

  return raw.map((r: any): GabaritoItem => ({
    ordem: Number(r.ordem),
    tipo: (['objetiva', 'numerica', 'discursiva'].includes(r.tipo) ? r.tipo : 'objetiva') as GabaritoItem['tipo'],
    resposta: String(r.resposta ?? '').trim(),
  })).filter((r) => r.ordem > 0 && r.resposta.length > 0)
}

// ─── Correção simples (legado) ────────────────────────────────────────────────

export async function corrigirFolhaAvulsa(
  alunoBase64: string,
  mimeType: string,
  gabarito: GabaritoItem[]
): Promise<ResultadoQuestao[]> {
  if (!process.env['GOOGLE_API_KEY']) throw new Error('GOOGLE_API_KEY não configurada')

  const imagemPura = alunoBase64.includes(',') ? alunoBase64.split(',')[1]! : alunoBase64

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
  }
]

Retorne uma entrada para CADA questão do gabarito.
Se não conseguir identificar a resposta, use respostaAluno: null, confianca: 0, correta: false.`

  const content = await callGemini([
    { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
    { text: prompt },
  ], 2000)

  const raw = extractJsonArray(content)

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

// ─── OCR para exercícios cadastrados (legado) ─────────────────────────────────

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
- confianca: número entre 0.0 e 1.0
- Se não conseguir identificar: letraDetectada e valorDetectado como null, confianca 0
- Retorne uma entrada para CADA questão listada`
}

export async function detectarRespostasGemini(
  imagemBase64: string,
  mimeType: string,
  questoes: QuestaoOcrInput[]
): Promise<RespostaDetectadaGemini[]> {
  if (!process.env['GOOGLE_API_KEY']) throw new Error('GOOGLE_API_KEY não configurada')

  const questoesOcr = questoes.filter((q) => q.tipo !== 'discursiva')
  if (questoesOcr.length === 0) return []

  const imagemPura = imagemBase64.includes(',') ? imagemBase64.split(',')[1]! : imagemBase64

  const content = await callGemini([
    { inline_data: { mime_type: mimeType === 'application/pdf' ? 'image/jpeg' : mimeType, data: imagemPura } },
    { text: buildPrompt(questoesOcr) },
  ], 1000)

  const raw = extractJsonArray(content)

  return raw.map((r: any): RespostaDetectadaGemini => ({
    questaoOrdem: Number(r.questaoOrdem),
    letraDetectada: r.letraDetectada ? String(r.letraDetectada).toUpperCase() : null,
    valorDetectado: r.valorDetectado != null ? parseFloat(String(r.valorDetectado)) : null,
    confianca: r.confianca != null ? parseFloat(String(r.confianca)) : null,
  }))
}
