import { describe, it, expect } from 'vitest'
import {
  removerAcentos,
  normalizarBase,
  normalizarSemAcentos,
  normalizarSemPontuacao,
  igualNormalizado,
  difereSomentePorAcentuacao,
  difereSomentePorPontuacao,
  difereSomentePorPontuacaoFinal,
  difereSomentePorMaiuscula,
  iniciaComMinuscula,
  parecerErroOrtografico,
  distanciaLevenshtein,
  similaridade,
} from '../normalizer'

describe('removerAcentos', () => {
  it('remove acentos comuns do português', () => {
    expect(removerAcentos('é')).toBe('e')
    expect(removerAcentos('ã')).toBe('a')
    expect(removerAcentos('ç')).toBe('c')
    expect(removerAcentos('à')).toBe('a')
    expect(removerAcentos('ó')).toBe('o')
    expect(removerAcentos('ú')).toBe('u')
  })

  it('mantém texto sem acentos intacto', () => {
    expect(removerAcentos('casa')).toBe('casa')
    expect(removerAcentos('Maria')).toBe('Maria')
  })

  it('processa frase completa', () => {
    expect(removerAcentos('A menina foi à escola.')).toBe('A menina foi a escola.')
  })
})

describe('normalizarBase', () => {
  it('aplica trim e lowercase', () => {
    expect(normalizarBase('  Casa  ')).toBe('casa')
    expect(normalizarBase('MARIA')).toBe('maria')
  })

  it('colapsa múltiplos espaços', () => {
    expect(normalizarBase('a  b   c')).toBe('a b c')
  })
})

describe('igualNormalizado', () => {
  it('retorna true para textos iguais após normalização', () => {
    expect(igualNormalizado('Casa', 'casa')).toBe(true)
    expect(igualNormalizado('  casa  ', 'casa')).toBe(true)
    expect(igualNormalizado('A  menina', 'a menina')).toBe(true)
  })

  it('retorna false para textos diferentes', () => {
    expect(igualNormalizado('casa', 'casas')).toBe(false)
    expect(igualNormalizado('ação', 'acao')).toBe(false)
  })
})

describe('difereSomentePorAcentuacao', () => {
  it('detecta diferença apenas por acento', () => {
    expect(difereSomentePorAcentuacao('à escola', 'a escola')).toBe(true)
    expect(difereSomentePorAcentuacao('ação', 'acao')).toBe(true)
    expect(difereSomentePorAcentuacao('avó', 'avo')).toBe(true)
  })

  it('retorna false para textos idênticos', () => {
    expect(difereSomentePorAcentuacao('casa', 'casa')).toBe(false)
  })

  it('retorna false quando há diferença além do acento', () => {
    expect(difereSomentePorAcentuacao('ação', 'axao')).toBe(false)
    expect(difereSomentePorAcentuacao('casa', 'casas')).toBe(false)
  })
})

describe('difereSomentePorPontuacaoFinal', () => {
  it('detecta ausência de ponto final', () => {
    expect(difereSomentePorPontuacaoFinal('A casa é bonita.', 'A casa é bonita')).toBe(true)
  })

  it('detecta troca de ponto por exclamação', () => {
    expect(difereSomentePorPontuacaoFinal('Que belo!', 'Que belo.')).toBe(true)
  })

  it('retorna false para textos iguais', () => {
    expect(difereSomentePorPontuacaoFinal('casa', 'casa')).toBe(false)
  })
})

describe('difereSomentePorPontuacao', () => {
  it('detecta diferença apenas por pontuação interna', () => {
    expect(difereSomentePorPontuacao('sim, claro', 'sim claro')).toBe(true)
  })
})

describe('difereSomentePorMaiuscula', () => {
  it('detecta inicial minúscula', () => {
    expect(difereSomentePorMaiuscula('A casa', 'a casa')).toBe(true)
  })

  it('retorna false para textos iguais', () => {
    expect(difereSomentePorMaiuscula('Casa', 'Casa')).toBe(false)
  })
})

describe('iniciaComMinuscula', () => {
  it('detecta início minúsculo', () => {
    expect(iniciaComMinuscula('a menina')).toBe(true)
  })

  it('retorna false para início maiúsculo', () => {
    expect(iniciaComMinuscula('A menina')).toBe(false)
  })

  it('retorna false para número inicial', () => {
    expect(iniciaComMinuscula('7 é par')).toBe(false)
  })
})

describe('distanciaLevenshtein', () => {
  it('strings idênticas → 0', () => {
    expect(distanciaLevenshtein('casa', 'casa')).toBe(0)
  })

  it('uma substituição', () => {
    expect(distanciaLevenshtein('casa', 'cása')).toBeGreaterThan(0)
  })

  it('strings completamente diferentes', () => {
    expect(distanciaLevenshtein('abc', 'xyz')).toBe(3)
  })

  it('string vazia', () => {
    expect(distanciaLevenshtein('', 'abc')).toBe(3)
    expect(distanciaLevenshtein('abc', '')).toBe(3)
  })
})

describe('parecerErroOrtografico', () => {
  it('detecta erro ortográfico próximo', () => {
    // 'brincar' vs 'brinacr' — transposição
    expect(parecerErroOrtografico('brincar', 'brinacr')).toBe(true)
  })

  it('retorna false para textos iguais sem acentos', () => {
    // Diferença apenas por acento → NÃO é ortografia
    expect(parecerErroOrtografico('ação', 'acao')).toBe(false)
  })

  it('retorna false para textos muito diferentes', () => {
    expect(parecerErroOrtografico('casa', 'xyzwq')).toBe(false)
  })
})
