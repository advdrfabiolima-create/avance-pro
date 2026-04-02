export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return false
  if (/^(\d)\1+$/.test(numeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i] as string) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[9] as string)) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i] as string) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(numeros[10] as string)
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validarTelefone(tel: string): boolean {
  const numeros = tel.replace(/\D/g, '')
  return numeros.length === 10 || numeros.length === 11
}
