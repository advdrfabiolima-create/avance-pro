export interface QuestaoInfo {
  ordem: number
  tipo: 'objetiva' | 'numerica' | 'discursiva'
  id: string
}

export interface RespostaDetectada {
  questaoOrdem: number
  questaoId: string | null
  tipoDetectado: 'objetiva' | 'numerica'
  letraDetectada: string | null    // 'A'–'E', uppercase
  valorDetectado: number | null
  confianca: number                // 0–1
}

// Matches: "1) A", "2. B", "3 - C", "4: D", "Q5 E", "Questão 6 = A"
// Capture groups: [1] = question number, [2] = answer token
const LINE_RE =
  /^\s*(?:quest[aã]o\s*)?(?:q\.?\s*)?(\d{1,3})\s*[)\-.:=\s]\s*([A-Ea-e]|[-\d][\d.,]*)\s*$/i

export function parseOcrText(text: string, questoes: QuestaoInfo[]): RespostaDetectada[] {
  const questaoMap = new Map(questoes.map((q) => [q.ordem, q]))
  const detected = new Map<number, RespostaDetectada>()

  const lines = text.split(/\r?\n/)

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const match = LINE_RE.exec(line)
    if (!match) continue

    const ordem = parseInt(match[1]!, 10)
    const token = match[2]!.trim()

    const questao = questaoMap.get(ordem)
    if (!questao || questao.tipo === 'discursiva') continue

    // Determine if the token is a letter (objetiva) or number (numerica)
    const isLetter = /^[A-Ea-e]$/.test(token)
    const isNumber = /^-?[\d.,]+$/.test(token)

    if (!isLetter && !isNumber) continue

    // If questao type doesn't match the detected token type, lower confidence
    let confianca = 0.9
    let tipoDetectado: 'objetiva' | 'numerica'
    let letraDetectada: string | null = null
    let valorDetectado: number | null = null

    if (isLetter) {
      tipoDetectado = 'objetiva'
      letraDetectada = token.toUpperCase()
      if (questao.tipo === 'numerica') confianca = 0.5
    } else {
      tipoDetectado = 'numerica'
      const num = parseFloat(token.replace(',', '.'))
      if (isNaN(num)) continue
      valorDetectado = num
      if (questao.tipo === 'objetiva') confianca = 0.5
    }

    // Keep only the first (highest confidence) detection per question
    if (!detected.has(ordem)) {
      detected.set(ordem, {
        questaoOrdem: ordem,
        questaoId: questao.id,
        tipoDetectado,
        letraDetectada,
        valorDetectado,
        confianca,
      })
    }
  }

  // Also try to cover questions not matched via line detection
  // by scanning the full text for isolated patterns (lower confidence)
  for (const questao of questoes) {
    if (detected.has(questao.ordem)) continue
    if (questao.tipo === 'discursiva') continue

    const numStr = String(questao.ordem)
    // Pattern like "1A", "1:A", "1=5" anywhere in text (lower confidence)
    const inline = new RegExp(
      `(?:^|\\D)${numStr}\\s*[):.-=\\s]\\s*([A-Ea-e]|[-\\d][\\d.,]*)(?:\\D|$)`,
      'im'
    )
    const m = inline.exec(text)
    if (!m) continue

    const token = m[1]!.trim()
    const isLetter = /^[A-Ea-e]$/.test(token)
    const isNumber = /^-?[\d.,]+$/.test(token)
    if (!isLetter && !isNumber) continue

    if (isLetter && questao.tipo === 'objetiva') {
      detected.set(questao.ordem, {
        questaoOrdem: questao.ordem,
        questaoId: questao.id,
        tipoDetectado: 'objetiva',
        letraDetectada: token.toUpperCase(),
        valorDetectado: null,
        confianca: 0.6,
      })
    } else if (isNumber && questao.tipo === 'numerica') {
      const num = parseFloat(token.replace(',', '.'))
      if (!isNaN(num)) {
        detected.set(questao.ordem, {
          questaoOrdem: questao.ordem,
          questaoId: questao.id,
          tipoDetectado: 'numerica',
          letraDetectada: null,
          valorDetectado: num,
          confianca: 0.6,
        })
      }
    }
  }

  return [...detected.values()].sort((a, b) => a.questaoOrdem - b.questaoOrdem)
}
