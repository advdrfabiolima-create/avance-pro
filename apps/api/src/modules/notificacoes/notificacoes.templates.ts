interface TemplateResult {
  assunto: string
  mensagem: string
}

export function templatePagamentoVencendo(
  nomeAluno: string,
  valor: number,
  vencimento: string,
): TemplateResult {
  const valorFormatado = valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return {
    assunto: `Lembrete: Pagamento de ${nomeAluno} vence em breve`,
    mensagem:
      `O pagamento referente ao aluno *${nomeAluno}* no valor de *${valorFormatado}* vence em *${vencimento}*.\n\n` +
      `Por favor, realize o pagamento dentro do prazo para evitar pendências.\n\n` +
      `Caso já tenha efetuado o pagamento, desconsidere este aviso.`,
  }
}

export function templatePagamentoConfirmado(
  nomeAluno: string,
  valor: number,
  mes: string,
): TemplateResult {
  const valorFormatado = valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return {
    assunto: `Pagamento confirmado — ${nomeAluno} — ${mes}`,
    mensagem:
      `Confirmamos o recebimento do pagamento referente ao aluno *${nomeAluno}*.\n\n` +
      `Mês de referência: *${mes}*\n` +
      `Valor pago: *${valorFormatado}*\n\n` +
      `Obrigado pela pontualidade! Qualquer dúvida, estamos à disposição.`,
  }
}

export function templateBoasVindas(
  nomeAluno: string,
  materias: string[],
): TemplateResult {
  const listaMaterias =
    materias.length === 1
      ? materias[0]
      : `${materias.slice(0, -1).join(', ')} e ${materias[materias.length - 1]}`

  return {
    assunto: `Bem-vindo(a) ao Kumon — ${nomeAluno}`,
    mensagem:
      `Seja muito bem-vindo(a), *${nomeAluno}*!\n\n` +
      `Estamos felizes em tê-lo(a) em nossa unidade Kumon Advance. ` +
      `O aluno(a) está matriculado(a) em: *${listaMaterias}*.\n\n` +
      `Nosso método é baseado no estudo autônomo e progressivo. ` +
      `Com dedicação e regularidade, os resultados virão!\n\n` +
      `Qualquer dúvida ou necessidade, entre em contato com a nossa equipe.`,
  }
}

export function templateAvisoGeral(titulo: string, corpo: string): TemplateResult {
  return {
    assunto: titulo,
    mensagem: corpo,
  }
}
