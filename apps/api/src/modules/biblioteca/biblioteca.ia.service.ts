/**
 * Serviço de geração de exercícios via IA.
 * Atualmente usa mock local funcional.
 * Para conectar OpenAI: substituir `mockGerar` por chamada real à API.
 *
 * Interface: gerarExercicios(input) → ExercicioGerado[]
 * O contrato de retorno é idêntico — trocar o provider não afeta o resto.
 */

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

// ─── Mock por disciplina/tópico ───────────────────────────────────────────────

const mockBanco: Record<string, ExercicioGerado[]> = {
  matematica: [
    {
      disciplina: 'matematica', topico: 'Álgebra', subtopico: 'Equações',
      nivel: 'F', dificuldade: 'medio', tipo: 'numerico',
      enunciado: 'Resolva: 2x - 4 = 10',
      opcoes: null, resposta: '7',
      explicacao: '2x = 14, então x = 7.',
      tags: ['álgebra', 'equação'],
    },
    {
      disciplina: 'matematica', topico: 'Geometria', subtopico: 'Perímetro',
      nivel: 'D', dificuldade: 'facil', tipo: 'numerico',
      enunciado: 'Qual é o perímetro de um quadrado com lado 5 cm?',
      opcoes: null, resposta: '20',
      explicacao: 'Perímetro = 4 × lado = 4 × 5 = 20 cm.',
      tags: ['geometria', 'perímetro'],
    },
    {
      disciplina: 'matematica', topico: 'Probabilidade', subtopico: 'Básico',
      nivel: 'G', dificuldade: 'dificil', tipo: 'objetivo',
      enunciado: 'Um dado de 6 faces é lançado. Qual a probabilidade de sair um número par?',
      opcoes: ['1/6', '1/3', '1/2', '2/3'], resposta: '1/2',
      explicacao: 'Números pares: 2, 4, 6 → 3 de 6 possibilidades = 1/2.',
      tags: ['probabilidade', 'dado'],
    },
    {
      disciplina: 'matematica', topico: 'Potenciação', subtopico: 'Básico',
      nivel: 'E', dificuldade: 'facil', tipo: 'numerico',
      enunciado: 'Calcule: 3⁴',
      opcoes: null, resposta: '81',
      explicacao: '3⁴ = 3 × 3 × 3 × 3 = 81.',
      tags: ['potenciação'],
    },
    {
      disciplina: 'matematica', topico: 'Estatística', subtopico: 'Média',
      nivel: 'F', dificuldade: 'medio', tipo: 'numerico',
      enunciado: 'Qual é a média de 8, 10, 6, 12 e 4?',
      opcoes: null, resposta: '8',
      explicacao: '(8+10+6+12+4) ÷ 5 = 40 ÷ 5 = 8.',
      tags: ['estatística', 'média aritmética'],
    },
  ],
  portugues: [
    {
      disciplina: 'portugues', topico: 'Redação', subtopico: 'Coerência',
      nivel: 'G', dificuldade: 'dificil', tipo: 'texto',
      enunciado: 'Reescreva a frase de forma mais clara: "O menino que correu muito e chegou em casa e estava cansado."',
      opcoes: null,
      resposta: 'O menino que correu muito chegou em casa cansado.',
      explicacao: 'A repetição do "e" prejudica a coerência. O ideal é usar aposto ou oração reduzida.',
      tags: ['redação', 'coerência', 'reescrita'],
    },
    {
      disciplina: 'portugues', topico: 'Fonética', subtopico: 'Sílabas',
      nivel: 'B', dificuldade: 'facil', tipo: 'objetivo',
      enunciado: 'Quantas sílabas tem a palavra "computador"?',
      opcoes: ['3', '4', '5', '6'], resposta: '4',
      explicacao: 'Com-pu-ta-dor = 4 sílabas.',
      tags: ['fonética', 'sílabas', 'divisão silábica'],
    },
    {
      disciplina: 'portugues', topico: 'Verbos', subtopico: 'Tempo verbal',
      nivel: 'E', dificuldade: 'medio', tipo: 'objetivo',
      enunciado: 'Em qual tempo verbal está o verbo na frase: "Amanhã viajamos para o Rio."?',
      opcoes: ['Pretérito perfeito', 'Presente', 'Futuro do presente', 'Futuro do pretérito'],
      resposta: 'Futuro do presente',
      explicacao: '"Amanhã" indica evento futuro. "Viajamos" pode ser usado como futuro coloquial no Brasil.',
      tags: ['verbos', 'tempo verbal', 'futuro'],
    },
    {
      disciplina: 'portugues', topico: 'Figuras de Linguagem', subtopico: 'Metáfora',
      nivel: 'F', dificuldade: 'dificil', tipo: 'objetivo',
      enunciado: 'Identifique a figura de linguagem: "Minha vida é um mar de problemas."',
      opcoes: ['Metonímia', 'Comparação', 'Metáfora', 'Hipérbole'],
      resposta: 'Metáfora',
      explicacao: 'Metáfora é a identificação entre dois termos sem o uso de "como". Vida = mar de problemas.',
      tags: ['figuras de linguagem', 'metáfora'],
    },
    {
      disciplina: 'portugues', topico: 'Concordância', subtopico: 'Nominal',
      nivel: 'E', dificuldade: 'medio', tipo: 'objetivo',
      enunciado: 'Qual frase apresenta concordância nominal correta?',
      opcoes: [
        'As flores estava bonita.',
        'As flores estavam bonitas.',
        'As flores estavam bonito.',
        'As flor estavam bonitas.',
      ],
      resposta: 'As flores estavam bonitas.',
      explicacao: 'O adjetivo "bonitas" concorda em gênero e número com "flores" (feminino plural).',
      tags: ['concordância nominal', 'adjetivo'],
    },
  ],
  ingles: [
    {
      disciplina: 'ingles', topico: 'Past Simple', subtopico: 'Regular verbs',
      nivel: 'C', dificuldade: 'medio', tipo: 'objetivo',
      enunciado: 'What is the past tense of "walk"?',
      opcoes: ['walk', 'walked', 'walking', 'walks'],
      resposta: 'walked',
      explicacao: 'Regular verbs in Past Simple add -ed: walk → walked.',
      tags: ['past simple', 'regular verbs', 'conjugation'],
    },
    {
      disciplina: 'ingles', topico: 'Prepositions', subtopico: 'Time',
      nivel: 'B', dificuldade: 'medio', tipo: 'objetivo',
      enunciado: 'Choose the correct preposition: "My birthday is ___ July."',
      opcoes: ['at', 'on', 'in', 'by'],
      resposta: 'in',
      explicacao: 'Use "in" with months: in July, in March, etc.',
      tags: ['prepositions', 'time expressions'],
    },
    {
      disciplina: 'ingles', topico: 'Comparatives', subtopico: 'Short adjectives',
      nivel: 'C', dificuldade: 'medio', tipo: 'objetivo',
      enunciado: 'Complete: "A car is ___ than a bicycle."',
      opcoes: ['fast', 'faster', 'fastest', 'more fast'],
      resposta: 'faster',
      explicacao: 'Comparative of short adjectives: add -er. fast → faster.',
      tags: ['comparatives', 'adjectives'],
    },
    {
      disciplina: 'ingles', topico: 'Modal Verbs', subtopico: 'Can',
      nivel: 'A', dificuldade: 'facil', tipo: 'objetivo',
      enunciado: 'Which sentence expresses ability?',
      opcoes: ['She must swim.', 'She can swim.', 'She should swim.', 'She will swim.'],
      resposta: 'She can swim.',
      explicacao: '"Can" expresses ability or possibility. "She can swim" = she knows how to swim.',
      tags: ['modal verbs', 'can', 'ability'],
    },
    {
      disciplina: 'ingles', topico: 'Vocabulary', subtopico: 'School supplies',
      nivel: '3A', dificuldade: 'facil', tipo: 'objetivo',
      enunciado: 'What do you call the object you use to write in English class?',
      opcoes: ['ruler', 'pencil', 'eraser', 'sharpener'],
      resposta: 'pencil',
      explicacao: 'A pencil is used to write. ruler = régua, eraser = borracha, sharpener = apontador.',
      tags: ['vocabulary', 'school supplies'],
    },
  ],
}

function variar<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

function adaptarExercicio(ex: ExercicioGerado, input: GerarIaInput): ExercicioGerado {
  return {
    ...ex,
    disciplina: input.disciplina,
    topico: input.topico,
    subtopico: input.subtopico ?? ex.subtopico,
    nivel: input.nivel,
    dificuldade: input.dificuldade,
    tipo: input.tipo,
  }
}

// ─── Provider de IA (mock) ────────────────────────────────────────────────────

async function mockGerar(input: GerarIaInput): Promise<ExercicioGerado[]> {
  // Simula latência de rede
  await new Promise((r) => setTimeout(r, 800))

  const banco = mockBanco[input.disciplina] ?? mockBanco['matematica']!
  const selecionados = variar(banco, input.quantidade)

  // Preenche até a quantidade com variações se necessário
  const resultado: ExercicioGerado[] = []
  for (let i = 0; i < input.quantidade; i++) {
    const base = selecionados[i % selecionados.length]!
    resultado.push(adaptarExercicio({ ...base }, input))
  }

  return resultado
}

// ─── Interface pública ────────────────────────────────────────────────────────

export async function gerarExercicios(input: GerarIaInput): Promise<ExercicioGerado[]> {
  const apiKey = process.env['OPENAI_API_KEY']

  if (apiKey) {
    // TODO: conectar OpenAI real quando API key estiver configurada
    // return await openaiGerar(input)
    console.log('[IA] API key presente mas provider real não implementado — usando mock')
  }

  return mockGerar(input)
}
