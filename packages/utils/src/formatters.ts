export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '')
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarTelefone(tel: string): string {
  const numeros = tel.replace(/\D/g, '')
  if (numeros.length === 11) {
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(data)
}

export function formatarMesReferencia(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(data)
}

export function calcularIdade(dataNascimento: Date): number {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const mesAtual = hoje.getMonth()
  const mesNasc = dataNascimento.getMonth()
  if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < dataNascimento.getDate())) {
    idade--
  }
  return idade
}
