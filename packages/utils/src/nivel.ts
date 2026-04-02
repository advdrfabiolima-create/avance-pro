import { NIVEIS_KUMON, type NivelKumon } from '@kumon-advance/types'

export function proximoNivel(atual: NivelKumon): NivelKumon | null {
  const index = NIVEIS_KUMON.indexOf(atual)
  if (index === -1 || index === NIVEIS_KUMON.length - 1) return null
  return NIVEIS_KUMON[index + 1] as NivelKumon
}

export function nivelAnterior(atual: NivelKumon): NivelKumon | null {
  const index = NIVEIS_KUMON.indexOf(atual)
  if (index <= 0) return null
  return NIVEIS_KUMON[index - 1] as NivelKumon
}

export function ordemNivel(nivel: NivelKumon): number {
  return NIVEIS_KUMON.indexOf(nivel) + 1
}

export function calcularDesempenho(erros: number, folhas: number): 'otimo' | 'bom' | 'regular' | 'ruim' {
  const taxaErro = folhas > 0 ? erros / folhas : 0
  if (taxaErro <= 0.05) return 'otimo'
  if (taxaErro <= 0.15) return 'bom'
  if (taxaErro <= 0.30) return 'regular'
  return 'ruim'
}
