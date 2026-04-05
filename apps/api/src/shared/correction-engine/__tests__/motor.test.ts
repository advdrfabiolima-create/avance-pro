import { describe, it, expect } from 'vitest'
import { analisarRespostaPedagogicamente } from '../motor'

// ─── Português ────────────────────────────────────────────────────────────────

describe('Português — respostas corretas', () => {
  it('resposta exata → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A menina foi à escola.',
      respostaAluno: 'A menina foi à escola.',
    })
    expect(r.status).toBe('correta')
    expect(r.scoreParcial).toBe(1.0)
    expect(r.revisaoNecessaria).toBe(false)
  })

  it('espaços extras → correta (tolerarEspacosExtras=true por default)', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'O gato',
      respostaAluno: '  O gato  ',
    })
    expect(r.status).toBe('correta')
  })
})

describe('Português — acentuação', () => {
  it('crase ausente → incorreta_por_acentuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A menina foi à escola.',
      respostaAluno: 'A menina foi a escola.',
    })
    expect(r.status).toBe('incorreta_por_acentuacao')
    expect(r.simboloSugerido).toBe('´')
    expect(r.motivos.length).toBeGreaterThan(0)
    expect(r.revisaoNecessaria).toBe(false)
  })

  it('acento agudo ausente → incorreta_por_acentuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'avó',
      respostaAluno: 'avo',
    })
    expect(r.status).toBe('incorreta_por_acentuacao')
  })

  it('acento em palavra composta → incorreta_por_acentuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'ação',
      respostaAluno: 'acao',
    })
    expect(r.status).toBe('incorreta_por_acentuacao')
  })

  it('cedilha ausente → incorreta_por_acentuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'façanha',
      respostaAluno: 'facanha',
    })
    expect(r.status).toBe('incorreta_por_acentuacao')
  })

  it('quando exigirAcentuacao=false, diferença de acento → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'ação',
      respostaAluno: 'acao',
      criterios: { exigirAcentuacao: false },
    })
    // Sem acentuação exigida E sem diferença de pontuação → verifica próximos passos
    // Como sem acentos são iguais, mas exigirAcentuacao=false, deve ser correta
    expect(r.status).toBe('correta')
  })
})

describe('Português — pontuação', () => {
  it('ponto final ausente → incorreta_por_pontuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'O sol brilha.',
      respostaAluno: 'O sol brilha',
    })
    expect(r.status).toBe('incorreta_por_pontuacao')
    expect(r.simboloSugerido).toBe('.')
  })

  it('quando tolerarPontuacaoFinalAusente=true → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'O sol brilha.',
      respostaAluno: 'O sol brilha',
      criterios: { tolerarPontuacaoFinalAusente: true },
    })
    expect(r.status).toBe('correta')
  })

  it('vírgula interna ausente → incorreta_por_pontuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'Sim, claro.',
      respostaAluno: 'Sim claro.',
    })
    expect(r.status).toBe('incorreta_por_pontuacao')
  })
})

describe('Português — maiúscula', () => {
  it('início com minúscula → incorreta_por_maiuscula', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A casa é bonita.',
      respostaAluno: 'a casa é bonita.',
    })
    expect(r.status).toBe('incorreta_por_maiuscula')
    expect(r.simboloSugerido).toBe('Aa')
  })

  it('quando exigirMaiusculaInicial=false → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A casa é bonita.',
      respostaAluno: 'a casa é bonita.',
      criterios: { exigirMaiusculaInicial: false },
    })
    expect(r.status).toBe('correta')
  })
})

describe('Português — ortografia', () => {
  it('troca de letra → incorreta_por_ortografia', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'brincar',
      respostaAluno: 'brinkar',
    })
    expect(r.status).toBe('incorreta_por_ortografia')
    expect(r.simboloSugerido).toBe('ABC')
  })

  it('transposição de letras → incorreta_por_ortografia', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'pedra',
      respostaAluno: 'prdea',
    })
    expect(r.status).toBe('incorreta_por_ortografia')
  })
})

describe('Português — revisar', () => {
  it('resposta vazia → revisar', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A casa é bonita.',
      respostaAluno: '',
    })
    expect(r.status).toBe('revisar')
    expect(r.revisaoNecessaria).toBe(true)
    expect(r.simboloSugerido).toBe('?')
  })

  it('resposta muito diferente → revisar', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A menina foi à escola.',
      respostaAluno: 'O cachorro latiu no jardim.',
    })
    expect(r.status).toBe('revisar')
    expect(r.revisaoNecessaria).toBe(true)
  })
})

// ─── Matemática ───────────────────────────────────────────────────────────────

describe('Matemática — respostas corretas', () => {
  it('número exato → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '7',
      respostaAluno: '7',
    })
    expect(r.status).toBe('correta')
  })

  it('7.0 e 7 → correta (equivalência)', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '7',
      respostaAluno: '7.0',
    })
    expect(r.status).toBe('correta')
  })

  it('vírgula decimal → correta (7,5 = 7.5)', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '7.5',
      respostaAluno: '7,5',
    })
    expect(r.status).toBe('correta')
  })

  it('fração equivalente → correta (1/2 = 0.5)', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '0.5',
      respostaAluno: '1/2',
    })
    expect(r.status).toBe('correta')
  })

  it('inteiro e fração → correta (2 = 4/2)', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '2',
      respostaAluno: '4/2',
    })
    expect(r.status).toBe('correta')
  })
})

describe('Matemática — respostas incorretas', () => {
  it('número errado → incorreta_por_regra', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '8',
      respostaAluno: '9',
    })
    expect(r.status).toBe('incorreta_por_regra')
  })

  it('decimal errado → incorreta_por_regra', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '3.14',
      respostaAluno: '3.15',
    })
    expect(r.status).toBe('incorreta_por_regra')
  })
})

describe('Matemática — revisar', () => {
  it('resposta vazia → revisar', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '42',
      respostaAluno: '',
    })
    expect(r.status).toBe('revisar')
  })

  it('texto não numérico → revisar', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'matematica',
      gabarito: '42',
      respostaAluno: 'quarenta e dois',
    })
    expect(r.status).toBe('revisar')
    expect(r.revisaoNecessaria).toBe(true)
  })
})

// ─── Inglês ───────────────────────────────────────────────────────────────────

describe('Inglês — respostas corretas', () => {
  it('resposta exata → correta', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'ingles',
      gabarito: 'The cat is black.',
      respostaAluno: 'The cat is black.',
    })
    expect(r.status).toBe('correta')
  })
})

describe('Inglês — erros', () => {
  it('erro ortográfico → incorreta_por_ortografia', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'ingles',
      gabarito: 'beautiful',
      respostaAluno: 'beutiful',
    })
    expect(r.status).toBe('incorreta_por_ortografia')
  })

  it('ausência de ponto final → incorreta_por_pontuacao', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'ingles',
      gabarito: 'The cat is black.',
      respostaAluno: 'The cat is black',
    })
    expect(r.status).toBe('incorreta_por_pontuacao')
  })

  it('letra minúscula no início → incorreta_por_maiuscula', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'ingles',
      gabarito: 'The cat is black.',
      respostaAluno: 'the cat is black.',
    })
    expect(r.status).toBe('incorreta_por_maiuscula')
  })
})

// ─── Símbolos e score ─────────────────────────────────────────────────────────

describe('Símbolos', () => {
  it('correta → ✔', () => {
    const r = analisarRespostaPedagogicamente({ disciplina: 'matematica', gabarito: '5', respostaAluno: '5' })
    expect(r.simboloSugerido).toBe('✔')
  })

  it('acentuação → ´', () => {
    const r = analisarRespostaPedagogicamente({ disciplina: 'portugues', gabarito: 'ação', respostaAluno: 'acao' })
    expect(r.simboloSugerido).toBe('´')
  })

  it('revisar → ?', () => {
    const r = analisarRespostaPedagogicamente({ disciplina: 'portugues', gabarito: 'abc', respostaAluno: '' })
    expect(r.simboloSugerido).toBe('?')
  })
})

describe('Score parcial', () => {
  it('correta → score 1.0', () => {
    const r = analisarRespostaPedagogicamente({ disciplina: 'matematica', gabarito: '5', respostaAluno: '5' })
    expect(r.scoreParcial).toBe(1.0)
  })

  it('incorreta → score 0.0', () => {
    const r = analisarRespostaPedagogicamente({ disciplina: 'matematica', gabarito: '5', respostaAluno: '6' })
    expect(r.scoreParcial).toBe(0.0)
  })
})

// ─── Debug ────────────────────────────────────────────────────────────────────

describe('Debug', () => {
  it('inclui texto original, normalizado e regra aplicada', () => {
    const r = analisarRespostaPedagogicamente({
      disciplina: 'portugues',
      gabarito: 'A menina foi à escola.',
      respostaAluno: 'A menina foi a escola.',
    })
    expect(r.debug.regraAplicada).toBeTruthy()
    expect(r.debug.textoOriginal).toBeTruthy()
    expect(r.debug.gabaritoOriginal).toBeTruthy()
    expect(r.debug.motivos).toEqual(r.motivos)
  })
})
