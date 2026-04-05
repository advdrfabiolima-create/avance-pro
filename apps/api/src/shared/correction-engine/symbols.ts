import type { StatusCorrecaoPedagogica } from './types'

/**
 * Símbolos de correção pedagógica — equivalentes aos sinais usados por professores.
 *
 * ✔   correta
 * ✖   incorreta geral / por regra
 * ´   erro de acentuação (acento, crase, til, cedilha)
 * .   erro de pontuação
 * ABC erro ortográfico
 * Aa  erro de maiúscula/minúscula
 * ?   revisar (professor decide)
 */
export const SIMBOLOS: Record<StatusCorrecaoPedagogica, string> = {
  correta: '✔',
  incorreta_por_ortografia: 'ABC',
  incorreta_por_acentuacao: '´',
  incorreta_por_pontuacao: '.',
  incorreta_por_maiuscula: 'Aa',
  incorreta_por_regra: '✖',
  revisar: '?',
}

export function simboloPara(status: StatusCorrecaoPedagogica): string {
  return SIMBOLOS[status]
}
