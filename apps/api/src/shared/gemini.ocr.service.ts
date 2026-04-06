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
import { aplicarAjuste } from './learning'

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

// ─── Gemini helper (filtra thinking parts + retry em rate-limit) ─────────────

const GEMINI_MAX_RETRIES = 3
const GEMINI_RETRY_BASE_MS = 15_000  // 15s entre tentativas

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGemini(parts: any[], maxOutputTokens = 2000, thinkingBudget = 1024): Promise<string> {
  const apiKey = process.env['GOOGLE_API_KEY']
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens,
      thinkingConfig: { thinkingBudget },
    },
  }

  let lastError = ''

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const responseText = await httpsPost(url, body)

    let parsed: any
    try { parsed = JSON.parse(responseText) } catch { throw new Error('Resposta inválida da API Gemini') }

    // Rate-limit (429) ou quota temporária: aguarda e tenta novamente
    if (parsed?.error) {
      const code: number = parsed.error.code ?? 0
      const msg: string = parsed.error.message ?? JSON.stringify(parsed.error)

      if (code === 429 && attempt < GEMINI_MAX_RETRIES) {
        // Tenta extrair o delay sugerido pela API ("retry in X.Xs")
        const match = msg.match(/retry in ([0-9.]+)s/i)
        const delaySec = match ? Math.ceil(parseFloat(match[1]!) * 1.1) : attempt * GEMINI_RETRY_BASE_MS / 1000
        const delayMs = Math.min(delaySec * 1000, 90_000)  // máx 90s
        console.warn(`[Gemini] rate-limit (tentativa ${attempt}/${GEMINI_MAX_RETRIES}), aguardando ${delayMs / 1000}s...`)
        lastError = msg
        await sleep(delayMs)
        continue
      }

      throw new Error(`Erro Gemini: ${msg}`)
    }

    // gemini-2.5-flash retorna parts com thought:true — filtrar
    const responseParts: any[] = parsed?.candidates?.[0]?.content?.parts ?? []
    const textContent = responseParts
      .filter((p: any) => !p.thought && typeof p.text === 'string')
      .map((p: any) => p.text as string)
      .join('')

    if (!textContent) throw new Error('Conteúdo vazio na resposta do Gemini')
    return textContent
  }

  throw new Error(`Erro Gemini após ${GEMINI_MAX_RETRIES} tentativas: ${lastError}`)
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
- Erro gramatical / regra → "incorreta_por_regra"
- Para questões de LISTA DE PALAVRAS: na justificativa liste CADA palavra escrita errada
  pelo aluno e a forma correta. Formato: "heroico (correto: heróico), facíl (correto: fácil)"
  Avalie comparando o que você VÊ na imagem com o gabarito — mesmo que respostaAluno
  esteja normalizado, o statusCorrecao e justificativa devem refletir a imagem real.`
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

  const prompt = `Você é um leitor de folhas de exercícios. Sua função é APENAS fazer OCR — ler o que o aluno escreveu na folha.

O gabarito correto é:
${listaGabarito}
${criterios}

════════════════════════════════════════════════════
REGRA ABSOLUTA — TRANSCRIÇÃO LITERAL (não negociável):
════════════════════════════════════════════════════
O campo "respostaAluno" DEVE ser copiado EXATAMENTE como o aluno escreveu,
caractere por caractere. NUNCA corrija, normalize ou ajuste.

✗ PROIBIDO: aluno escreveu "facíl" → você devolve "fácil"
✗ PROIBIDO: aluno escreveu "Voce" → você devolve "você"
✗ PROIBIDO: aluno escreveu "támbem" → você devolve "também"
✗ PROIBIDO: aluno escreveu "juíz" → você devolve "juiz"

✓ CORRETO: preserve o acento exatamente onde o aluno colocou, mesmo que errado
✓ CORRETO: preserve maiúsculas/minúsculas exatamente como escritas
✓ CORRETO: para listas de palavras, transcreva a linha completa como escrita

A avaliação de correto/incorreto SERÁ FEITA PELO SISTEMA, não por você.
Sua única responsabilidade é transcrever o que está na folha.
════════════════════════════════════════════════════

**Para cada questão:**
- Objetivas (A/B/C/D/E): identifique a letra marcada (respostaAluno = a letra)
- Numéricas: identifique o número escrito (respostaAluno = o número como escrito)
- Discursivas: respostaAluno = transcrição LITERAL do texto escrito pelo aluno
  textoDetectado = mesma transcrição literal (nunca null para discursivas legíveis)

**Classificação de status (sua melhor estimativa — o sistema vai verificar):**
- "correta": parece correto
- "incorreta_por_ortografia": erro de grafia (letra errada, mas não acento)
- "incorreta_por_acentuacao": falta ou erro de acento/til/cedilha
- "incorreta_por_pontuacao": falta ou erro de pontuação
- "incorreta_por_regra": erro conceitual ou de cálculo
- "revisar": ilegível ou muito ambíguo

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
- Se ilegível ou confianca < 0.5: statusCorrecao = "revisar", correta = false
- Para discursivas: avaliacaoIA = "correto" | "parcial" | "incorreto"
- justificativa: baseie-se no que você VÊ na imagem original, não no que escreveu
  em respostaAluno. Se o aluno escreveu "facíl" mas você normalizou para "fácil"
  em respostaAluno, o statusCorrecao ainda deve ser "incorreta_por_acentuacao"
  e a justificativa deve listar a palavra errada conforme estava na folha.
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

  return Promise.all(raw.map(async (r: any): Promise<ResultadoQuestaoEstruturado> => {
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

    // ── Motor pedagógico (pós-processamento) ────────────────────────────────
    // Regra de prioridade:
    // • Se Gemini já disse "incorreta_por_X" → motor NÃO sobrescreve com "correta"
    //   (Gemini viu a imagem real; OCR pode ter normalizado respostaAluno)
    // • Se Gemini disse "correta" ou "revisar" → motor pode reclassificar
    // • Se ambos encontraram erro → mantém status do Gemini, usa motivos do motor
    //   para justificativa mais detalhada (por palavra)
    if (respostaAluno !== null) {
      const motorResult = analisarRespostaPedagogicamente({
        disciplina: disciplina ?? 'geral',
        gabarito: respostaGabarito,
        respostaAluno,
      })

      const geminiJaDetectouErro = status !== 'correta' && status !== 'revisar'
      const motorDetectouErro = motorResult.status !== 'correta' && motorResult.status !== 'revisar'

      if (!geminiJaDetectouErro) {
        // Gemini não tinha certeza (correta ou revisar) → motor decide
        if (motorResult.status !== 'revisar' || status === 'revisar') {
          status = motorResult.status as StatusCorrecaoQuestao
          correta = motorResult.status === 'correta'
          if (motorResult.motivos.length > 0) {
            motorJustificativa = motorResult.motivos.join(' | ')
          }
        }
      } else if (motorDetectouErro && motorResult.motivos.length > 0) {
        // Gemini E motor encontraram erros → usa motivos do motor (mais específicos)
        // mas mantém o status do Gemini (ele viu a imagem real)
        motorJustificativa = motorResult.motivos.join(' | ')
      }
      // Se Gemini disse incorreta e motor disse correta → silêncio (OCR normalizou)
    }

    // ── Ajustes aprendidos (3ª camada, após motor) ───────────────────────────
    // Consulta regras que o professor ensinou ao sistema. Só aplica quando
    // confiança ≥ 0.5 (≥ 10 ocorrências confirmadas). Nunca aplica a revisar
    // com baixa confiança — fallback para revisão manual preservado.
    if (respostaAluno !== null) {
      const ajuste = await aplicarAjuste(disciplina ?? 'geral', respostaGabarito, respostaAluno, status)
      if (ajuste) {
        const statusAnterior = status
        status = ajuste.statusAjustado as StatusCorrecaoQuestao
        correta = status === 'correta'
        const pct = Math.round(ajuste.confianca * 100)
        motorJustificativa = `[Aprendizado: ${pct}% conf., ${ajuste.ocorrencias}x] ${motorJustificativa ?? `${statusAnterior} → ${status}`}`
      }
    }

    const respostaExibida = respostaAluno

    return {
      questaoOrdem: Number(r.questaoOrdem),
      tipo,
      respostaGabarito,
      respostaAluno: respostaExibida,
      confianca,
      correta,
      statusCorrecao: status,
      textoDetectado: r.textoDetectado != null ? String(r.textoDetectado) : null,
      avaliacaoIA: (['correto', 'parcial', 'incorreto'].includes(r.avaliacaoIA) ? r.avaliacaoIA : null) as ResultadoQuestaoEstruturado['avaliacaoIA'],
      justificativa: motorJustificativa ?? (r.justificativa != null ? String(r.justificativa) : null),
      // Questões com status 'revisar' precisam de decisão manual; demais são auto-revisadas
      revisadaManual: status === 'revisar' ? false : true,
    }
  }))
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
