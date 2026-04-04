/**
 * Serviço de geração de exercícios via IA.
 *
 * Provider atual: Maritaca AI (Sabiá-3) — API compatível com OpenAI.
 * Fallback: mock local (quando MARITACA_API_KEY não estiver configurada).
 *
 * Para trocar de provider: implemente uma função com a mesma assinatura
 * e substitua a chamada em `gerarExercicios()`.
 */

import https from 'https'
import type { GerarIaInput } from './biblioteca.schema'

export interface ExercicioGerado {
  disciplina: 'matematica' | 'portugues' | 'ingles'
  topico: string
  subtopico?: string
  nivel: string
  dificuldade: 'facil' | 'medio' | 'dificil'
  tipo: 'objetivo' | 'numerico' | 'texto'
  enunciado: string
  opcoes?: string[] | null
  resposta: string
  explicacao: string
  tags: string[]
}

// ─── Prompt de sistema ────────────────────────────────────────────────────────

const DISCIPLINA_PT: Record<string, string> = {
  matematica: 'Matemática',
  portugues: 'Língua Portuguesa',
  ingles: 'Inglês',
}

const DIFICULDADE_PT: Record<string, string> = {
  facil: 'fácil',
  medio: 'médio',
  dificil: 'difícil',
}

const TIPO_PT: Record<string, string> = {
  objetivo: 'objetiva (múltipla escolha com 4 alternativas)',
  numerico: 'numérica (resposta é um número ou expressão)',
  texto: 'discursiva (resposta em texto curto)',
}

function buildPrompt(input: GerarIaInput): string {
  return `Você é um professor especialista em ${DISCIPLINA_PT[input.disciplina]} para o método Kumon.

Gere exatamente ${input.quantidade} exercício(s) com as seguintes características:
- Disciplina: ${DISCIPLINA_PT[input.disciplina]}
- Tópico: ${input.topico}${input.subtopico ? `\n- Subtópico: ${input.subtopico}` : ''}
- Nível Kumon: ${input.nivel}
- Dificuldade: ${DIFICULDADE_PT[input.dificuldade]}
- Tipo: ${TIPO_PT[input.tipo]}

Retorne APENAS um JSON válido, sem texto antes ou depois, no seguinte formato:
[
  {
    "enunciado": "texto da questão",
    "opcoes": ["A", "B", "C", "D"] ou null se não for objetiva,
    "resposta": "resposta correta exata",
    "explicacao": "explicação breve da solução",
    "tags": ["tag1", "tag2"]
  }
]

Regras:
- Para tipo objetiva: opcoes deve ter exatamente 4 alternativas, resposta deve ser idêntica a uma delas
- Para tipo numérica: opcoes deve ser null, resposta deve ser o valor numérico
- Para tipo discursiva: opcoes deve ser null, resposta deve ser uma resposta modelo
- Cada exercício deve ser original e adequado ao nível ${input.nivel} do Kumon
- Tags devem ser palavras-chave pedagógicas relevantes (2 a 4 tags)
- Explicação deve ser curta e didática (1 a 2 frases)`
}

// ─── Provider Maritaca AI ─────────────────────────────────────────────────────

function httpsPost(url: string, body: object, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
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

async function maritacaGerar(input: GerarIaInput, apiKey: string): Promise<ExercicioGerado[]> {
  const prompt = buildPrompt(input)

  const responseText = await httpsPost(
    'https://chat.maritaca.ai/api/chat/completions',
    {
      model: 'sabia-3',
      messages: [
        { role: 'system', content: 'Você é um assistente educacional especializado em criar exercícios pedagógicos. Responda sempre em JSON válido conforme solicitado.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    { Authorization: `Bearer ${apiKey}` }
  )

  let parsed: any
  try {
    parsed = JSON.parse(responseText)
  } catch {
    throw new Error('Resposta inválida da API Maritaca')
  }

  const content: string = parsed?.choices?.[0]?.message?.content ?? ''
  if (!content) throw new Error('Conteúdo vazio na resposta da Maritaca')

  // Extrai o JSON da resposta (pode vir com markdown ```json ... ```)
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta da IA')

  let exerciciosRaw: any[]
  try {
    exerciciosRaw = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('JSON inválido retornado pela IA')
  }

  return exerciciosRaw.map((ex: any): ExercicioGerado => ({
    disciplina: input.disciplina,
    topico: input.topico,
    subtopico: input.subtopico,
    nivel: input.nivel,
    dificuldade: input.dificuldade,
    tipo: input.tipo,
    enunciado: String(ex.enunciado ?? ''),
    opcoes: Array.isArray(ex.opcoes) ? ex.opcoes.map(String) : null,
    resposta: String(ex.resposta ?? ''),
    explicacao: String(ex.explicacao ?? ''),
    tags: Array.isArray(ex.tags) ? ex.tags.map(String) : [],
  }))
}

// ─── Mock (fallback sem API key) ──────────────────────────────────────────────

const mockBanco: Record<string, ExercicioGerado[]> = {
  matematica: [
    { disciplina: 'matematica', topico: 'Álgebra', nivel: 'F', dificuldade: 'medio', tipo: 'numerico', enunciado: 'Resolva: 2x - 4 = 10', opcoes: null, resposta: '7', explicacao: '2x = 14, então x = 7.', tags: ['álgebra', 'equação'] },
    { disciplina: 'matematica', topico: 'Geometria', nivel: 'D', dificuldade: 'facil', tipo: 'numerico', enunciado: 'Qual é o perímetro de um quadrado com lado 5 cm?', opcoes: null, resposta: '20', explicacao: 'Perímetro = 4 × lado = 4 × 5 = 20 cm.', tags: ['geometria', 'perímetro'] },
    { disciplina: 'matematica', topico: 'Probabilidade', nivel: 'G', dificuldade: 'dificil', tipo: 'objetivo', enunciado: 'Qual a probabilidade de sair número par em um dado?', opcoes: ['1/6', '1/3', '1/2', '2/3'], resposta: '1/2', explicacao: 'Pares: 2,4,6 → 3 de 6 = 1/2.', tags: ['probabilidade'] },
  ],
  portugues: [
    { disciplina: 'portugues', topico: 'Fonética', nivel: 'B', dificuldade: 'facil', tipo: 'objetivo', enunciado: 'Quantas sílabas tem "computador"?', opcoes: ['3', '4', '5', '6'], resposta: '4', explicacao: 'Com-pu-ta-dor = 4 sílabas.', tags: ['fonética', 'sílabas'] },
    { disciplina: 'portugues', topico: 'Concordância', nivel: 'E', dificuldade: 'medio', tipo: 'objetivo', enunciado: 'Qual frase está correta?', opcoes: ['As flores estava bonita.', 'As flores estavam bonitas.', 'As flores estavam bonito.', 'As flor estavam bonitas.'], resposta: 'As flores estavam bonitas.', explicacao: 'Adjetivo concorda com o substantivo.', tags: ['concordância'] },
  ],
  ingles: [
    { disciplina: 'ingles', topico: 'Past Simple', nivel: 'C', dificuldade: 'medio', tipo: 'objetivo', enunciado: 'What is the past tense of "walk"?', opcoes: ['walk', 'walked', 'walking', 'walks'], resposta: 'walked', explicacao: 'Regular verbs add -ed: walk → walked.', tags: ['past simple'] },
    { disciplina: 'ingles', topico: 'Modal Verbs', nivel: 'A', dificuldade: 'facil', tipo: 'objetivo', enunciado: 'Which sentence expresses ability?', opcoes: ['She must swim.', 'She can swim.', 'She should swim.', 'She will swim.'], resposta: 'She can swim.', explicacao: '"Can" expresses ability.', tags: ['modal verbs'] },
  ],
}

async function mockGerar(input: GerarIaInput): Promise<ExercicioGerado[]> {
  await new Promise((r) => setTimeout(r, 600))
  const banco = mockBanco[input.disciplina] ?? mockBanco['matematica']!
  const resultado: ExercicioGerado[] = []
  for (let i = 0; i < input.quantidade; i++) {
    const base = banco[i % banco.length]!
    resultado.push({ ...base, disciplina: input.disciplina, topico: input.topico, subtopico: input.subtopico, nivel: input.nivel, dificuldade: input.dificuldade, tipo: input.tipo })
  }
  return resultado
}

// ─── Interface pública ────────────────────────────────────────────────────────

export async function gerarExercicios(input: GerarIaInput): Promise<ExercicioGerado[]> {
  const apiKey = process.env['MARITACA_API_KEY']

  if (apiKey) {
    console.log('[IA] Usando Maritaca AI (Sabiá-3)')
    try {
      return await maritacaGerar(input, apiKey)
    } catch (err) {
      console.error('[IA] Erro na Maritaca, usando mock:', err)
      return mockGerar(input)
    }
  }

  console.log('[IA] MARITACA_API_KEY não configurada — usando mock local')
  return mockGerar(input)
}
