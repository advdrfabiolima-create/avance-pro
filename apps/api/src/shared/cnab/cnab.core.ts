// ─── CNAB Core — Utilitários compartilhados ───────────────────────────────────
// Funções de formatação, padding e construção de linhas CNAB 240.
// Não contém regras específicas de nenhum banco.

import type {
  BankAccountConfig, CnabCharge, CnabLayout, CnabRemittanceResult,
  ParsedOccurrence, OccurrenceCategory,
} from './cnab.types'

// ── Helpers de formatação ─────────────────────────────────────────────────────

/** Pad numérico à esquerda com zeros */
export function padN(value: string | number, length: number): string {
  return String(value).replace(/\D/g, '').padStart(length, '0').slice(-length)
}

/** Pad alfanumérico à direita com espaços */
export function padA(value: string | null | undefined, length: number): string {
  return (value ?? '').toUpperCase().padEnd(length, ' ').slice(0, length)
}

/** Formata data Date → DDMMAAAA */
export function fmtDate8(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d}T12:00:00`) : d
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}${mm}${yyyy}`
}

/** Formata hora Date → HHMMSS */
export function fmtTime6(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}${mi}${ss}`
}

/** Formata valor em centavos, zero-padded */
export function fmtAmount(value: number, length: number): string {
  const cents = Math.round(value * 100)
  return String(cents).padStart(length, '0').slice(-length)
}

/** Limpa documento (CPF/CNPJ) removendo pontuação */
export function cleanDoc(doc: string): string {
  return doc.replace(/\D/g, '')
}

/** Tipo de inscrição: 1=CPF, 2=CNPJ */
export function inscType(doc: string): string {
  return cleanDoc(doc).length <= 11 ? '1' : '2'
}

/** Verifica e assegura exatamente 240 chars por linha */
export function assertLine240(line: string, context: string): string {
  if (line.length !== 240) {
    throw new Error(`CNAB: linha "${context}" tem ${line.length} chars (esperado 240)`)
  }
  return line
}

/** Parse de data CNAB DDMMAAAA → YYYY-MM-DD */
export function parseCnabDate8(s: string): string | undefined {
  if (!s || s === '00000000' || s.trim() === '') return undefined
  const dd = s.slice(0, 2)
  const mm = s.slice(2, 4)
  const yyyy = s.slice(4, 8)
  if (Number(yyyy) < 2000 || Number(mm) > 12 || Number(dd) > 31) return undefined
  return `${yyyy}-${mm}-${dd}`
}

/** Parse de valor CNAB em centavos */
export function parseCnabAmount(s: string): number {
  const n = parseInt(s.replace(/\D/g, ''), 10) || 0
  return n / 100
}

// ── CNAB 240 — Construção de linhas padrão FEBRABAN ───────────────────────────

export interface Cnab240HeaderArquivo {
  bankCode: string
  bankName: string
  account: BankAccountConfig
  fileDate: Date
  /** 1 = remessa, 2 = retorno */
  fileType: '1' | '2'
}

/**
 * Gera o Header de Arquivo CNAB 240 (posições FEBRABAN v087).
 * Cada banco pode precisar de ajustes menores nas posições exatas —
 * o adapter específico pode sobrescrever este método.
 */
export function buildHeaderArquivo240(params: Cnab240HeaderArquivo): string {
  const { bankCode, bankName, account, fileDate, fileType } = params
  const doc = cleanDoc(account.beneficiaryDocument)

  const line =
    padN(bankCode, 3) +                              // 001-003 Banco
    '0000' +                                          // 004-007 Lote header
    '0' +                                             // 008     Tipo registro
    '         ' +                                     // 009-017 Uso FEBRABAN
    inscType(doc) +                                   // 018     Tipo inscrição
    padN(doc, 14) +                                   // 019-032 CPF/CNPJ
    padA(account.agreementCode, 20) +                 // 033-052 Convênio
    padN(account.agency, 5) +                         // 053-057 Agência
    padA(account.agencyDigit, 1) +                    // 058     Dígito agência
    padN(account.accountNumber, 12) +                 // 059-070 Conta
    padA(account.accountDigit, 1) +                   // 071     Dígito conta
    ' ' +                                             // 072     Dígito ag/conta
    padA(account.beneficiaryName, 30) +               // 073-102 Nome empresa
    padA(bankName, 30) +                              // 103-132 Nome banco
    '          ' +                                    // 133-142 Uso FEBRABAN
    fileType +                                        // 143     Tipo arquivo
    fmtDate8(fileDate) +                              // 144-151 Data geração
    fmtTime6(fileDate) +                              // 152-157 Hora geração
    padN(account.sequentialFileNumber, 6) +           // 158-163 Nro sequencial
    '087' +                                           // 164-166 Versão layout
    '01600' +                                         // 167-171 Densidade
    '                    ' +                          // 172-191 Uso banco
    '                    ' +                          // 192-211 Uso empresa
    '                             '                   // 212-240 Brancos

  return assertLine240(line, 'Header Arquivo')
}

export interface Cnab240HeaderLote {
  bankCode: string
  loteNum: number
  account: BankAccountConfig
  /** 1 = cobrança simples, 4 = cobrança com vinculação */
  serviceType: string
  fileDate: Date
}

export function buildHeaderLote240(params: Cnab240HeaderLote): string {
  const { bankCode, loteNum, account, serviceType, fileDate } = params
  const doc = cleanDoc(account.beneficiaryDocument)

  const line =
    padN(bankCode, 3) +                              // 001-003
    padN(loteNum, 4) +                               // 004-007 Lote
    '1' +                                            // 008     Tipo
    'R' +                                            // 009     Operação (R=remessa, E=retorno)
    '01' +                                           // 010-011 Serviço (01=cobrança)
    padA(serviceType, 2) +                           // 012-013 Forma lançamento
    '040' +                                          // 014-016 Versão layout lote
    ' ' +                                            // 017     Uso FEBRABAN
    inscType(doc) +                                  // 018     Tipo inscrição
    padN(doc, 15) +                                  // 019-033 CPF/CNPJ
    padA(account.agreementCode, 20) +                // 034-053 Convênio
    padN(account.agency, 5) +                        // 054-058 Agência
    padA(account.agencyDigit, 1) +                   // 059     Dígito
    padN(account.accountNumber, 12) +                // 060-071 Conta
    padA(account.accountDigit, 1) +                  // 072     Dígito
    ' ' +                                            // 073     Dígito ag/conta
    padA(account.beneficiaryName, 30) +              // 074-103 Nome empresa
    padA('', 40) +                                   // 104-143 Mensagem 1
    padA('', 40) +                                   // 144-183 Mensagem 2
    padN(account.sequentialFileNumber, 8) +          // 184-191 Nro remessa
    fmtDate8(fileDate) +                             // 192-199 Data gravação
    '00000000' +                                     // 200-207 Data crédito
    padA('', 33)                                     // 208-240 Uso FEBRABAN

  return assertLine240(line, 'Header Lote')
}

export interface Cnab240SegmentoP {
  bankCode: string
  loteNum: number
  seqNum: number
  walletCode: string
  ourNumber: string
  agency: string
  agencyDigit: string
  accountNumber: string
  accountDigit: string
  documentNumber: string
  dueDate: string
  amount: number
  protestDays: number
}

export function buildSegmentoP240(p: Cnab240SegmentoP): string {
  const line =
    padN(p.bankCode, 3) +                            // 001-003 Banco
    padN(p.loteNum, 4) +                             // 004-007 Lote
    '3' +                                            // 008     Tipo detalhe
    padN(p.seqNum, 5) +                              // 009-013 Seq registro
    'P' +                                            // 014     Segmento
    ' ' +                                            // 015     Uso FEBRABAN
    '01' +                                           // 016-017 Movimento (01=inclusão)
    padN(p.agency, 5) +                              // 018-022 Agência
    padA(p.agencyDigit, 1) +                         // 023     Dígito ag
    padN(p.accountNumber, 12) +                      // 024-035 Conta
    padA(p.accountDigit, 1) +                        // 036     Dígito conta
    ' ' +                                            // 037     Dígito ag/conta
    padN(p.walletCode, 3) +                          // 038-040 Carteira
    padA(p.ourNumber, 20) +                          // 041-060 Nosso número
    '3' +                                            // 061     Tipo nosso número (3=numérico)
    padA('', 20) +                                   // 062-081 Uso banco
    '0' +                                            // 082     Tipo carteira
    '1' +                                            // 083     Forma cadastro
    '1' +                                            // 084     Tipo data
    padA('', 8) +                                    // 085-092 Uso banco
    padN(p.documentNumber, 15) +                     // 093-107 Nro documento
    fmtDate8(new Date(`${p.dueDate}T12:00:00`)) +    // 108-115 Vencimento
    fmtAmount(p.amount, 15) +                        // 116-130 Valor título
    padN('', 5) +                                    // 131-135 Banco cobrador
    padN('', 5) +                                    // 136-140 Agência cobr
    '2' +                                            // 141     Tipo espécie (02=DM)
    ' ' +                                            // 142     ID título aceito
    fmtDate8(new Date()) +                           // 143-150 Data emissão
    '00' +                                           // 151-152 Código juros
    '00000000' +                                     // 153-160 Data juros
    fmtAmount(0, 15) +                               // 161-175 Valor juros
    '00' +                                           // 176-177 Código desconto
    '00000000' +                                     // 178-185 Data desconto
    fmtAmount(0, 15) +                               // 186-200 Valor desconto
    fmtAmount(0, 15) +                               // 201-215 Valor IOF
    fmtAmount(0, 15) +                               // 216-230 Valor abatimento
    padA('', 25)                                     // 231-240 + extras

  // Ajusta para 240 se necessário (algumas posições variam por banco)
  return line.padEnd(240, ' ').slice(0, 240)
}

export interface Cnab240SegmentoQ {
  bankCode: string
  loteNum: number
  seqNum: number
  payerName: string
  payerDocument: string
  payerAddress: string
  payerNeighborhood: string
  payerCity: string
  payerState: string
  payerZipCode: string
  guarantorName?: string
  guarantorDocument?: string
}

export function buildSegmentoQ240(q: Cnab240SegmentoQ): string {
  const doc = cleanDoc(q.payerDocument)
  const zip = cleanDoc(q.payerZipCode)

  const line =
    padN(q.bankCode, 3) +                            // 001-003
    padN(q.loteNum, 4) +                             // 004-007
    '3' +                                            // 008
    padN(q.seqNum, 5) +                              // 009-013
    'Q' +                                            // 014
    ' ' +                                            // 015
    '01' +                                           // 016-017 Movimento
    inscType(doc) +                                  // 018     Tipo inscrição pagador
    padN(doc, 15) +                                  // 019-033 CPF/CNPJ pagador
    padA(q.payerName, 40) +                          // 034-073 Nome pagador
    padA(q.payerAddress, 40) +                       // 074-113 Endereço
    padA(q.payerNeighborhood, 15) +                  // 114-128 Bairro
    padN(zip.slice(0, 5), 5) +                       // 129-133 CEP prefixo
    padN(zip.slice(5), 3) +                          // 134-136 CEP sufixo
    padA(q.payerCity, 15) +                          // 137-151 Cidade
    padA(q.payerState.slice(0, 2), 2) +              // 152-153 Estado
    inscType(cleanDoc(q.guarantorDocument ?? '')) +  // 154     Tipo sacador
    padN(cleanDoc(q.guarantorDocument ?? ''), 15) +  // 155-169 CNPJ sacador
    padA(q.guarantorName ?? '', 40) +                // 170-209 Nome sacador
    padN('', 3) +                                    // 210-212 Banco correspondente
    padA('', 20) +                                   // 213-232 Nosso nro corresp
    padA('', 8)                                      // 233-240 Uso FEBRABAN

  return line.padEnd(240, ' ').slice(0, 240)
}

export interface Cnab240TrailerLote {
  bankCode: string
  loteNum: number
  recordCount: number
  totalAmount: number
}

export function buildTrailerLote240(p: Cnab240TrailerLote): string {
  const line =
    padN(p.bankCode, 3) +
    padN(p.loteNum, 4) +
    '5' +
    padA('', 9) +
    padN(p.recordCount + 2, 6) +    // +2: header + trailer do lote
    padN('', 6) +
    fmtAmount(p.totalAmount, 17) +
    padN('', 6) +
    fmtAmount(0, 17) +
    padN('', 6) +
    fmtAmount(0, 17) +
    padA('', 8) +
    padA('', 133)

  return line.padEnd(240, ' ').slice(0, 240)
}

export interface Cnab240TrailerArquivo {
  bankCode: string
  totalLotes: number
  totalRecords: number
}

export function buildTrailerArquivo240(p: Cnab240TrailerArquivo): string {
  const line =
    padN(p.bankCode, 3) +
    '9999' +
    '9' +
    padA('', 9) +
    padN(p.totalLotes, 6) +
    padN(p.totalRecords + 4, 6) +   // +4: 2 headers + 2 trailers arquivo/lote
    padN('', 6) +
    padA('', 205)

  return line.padEnd(240, ' ').slice(0, 240)
}

// ── Gerador genérico CNAB 240 ─────────────────────────────────────────────────

/**
 * Gera remessa CNAB 240 genérica (FEBRABAN padrão).
 * Adapters específicos podem chamar isto ou sobrescrever segmentos por banco.
 */
export function generateCnab240Remittance(
  charges: CnabCharge[],
  account: BankAccountConfig,
  bankCode: string,
  bankName: string,
): CnabRemittanceResult {
  const now = new Date()
  const lines: string[] = []

  // Header do Arquivo
  lines.push(buildHeaderArquivo240({ bankCode, bankName, account, fileDate: now, fileType: '1' }))

  // Lote 1
  lines.push(buildHeaderLote240({ bankCode, loteNum: 1, account, serviceType: '01', fileDate: now }))

  let seq = 1
  let totalAmount = 0

  for (const charge of charges) {
    lines.push(buildSegmentoP240({
      bankCode, loteNum: 1, seqNum: seq++,
      walletCode: account.walletCode,
      ourNumber: charge.ourNumber,
      agency: account.agency,
      agencyDigit: account.agencyDigit,
      accountNumber: account.accountNumber,
      accountDigit: account.accountDigit,
      documentNumber: charge.documentNumber,
      dueDate: charge.dueDate,
      amount: charge.amount,
      protestDays: account.protestDays ?? 0,
    }))

    lines.push(buildSegmentoQ240({
      bankCode, loteNum: 1, seqNum: seq++,
      payerName: charge.payerName,
      payerDocument: charge.payerDocument,
      payerAddress: charge.payerAddress ?? '',
      payerNeighborhood: charge.payerNeighborhood ?? '',
      payerCity: charge.payerCity ?? '',
      payerState: charge.payerState ?? 'SP',
      payerZipCode: charge.payerZipCode ?? '00000000',
    }))

    totalAmount += charge.amount
  }

  lines.push(buildTrailerLote240({ bankCode, loteNum: 1, recordCount: seq - 1, totalAmount }))
  lines.push(buildTrailerArquivo240({ bankCode, totalLotes: 1, totalRecords: lines.length }))

  const content = lines.join('\r\n') + '\r\n'
  const dateStr = fmtDate8(now)
  const fileName = `REM${bankCode}_${dateStr}_${padN(account.sequentialFileNumber, 4)}.REM`

  return {
    fileName,
    content,
    totalLines: lines.length,
    chargesIncluded: charges.length,
  }
}

// ── Parser genérico CNAB 240 ──────────────────────────────────────────────────

/**
 * Parser genérico para retorno CNAB 240.
 * Lê Segmentos T e U (padrão de retorno FEBRABAN).
 * Adapters específicos podem complementar com ocorrências do banco.
 */
export function parseCnab240Return(
  fileContent: string,
  occurrenceMap: Record<string, { description: string; category: OccurrenceCategory }>,
): { bankCode: string; fileDate: string; occurrences: ParsedOccurrence[]; errors: string[] } {
  const lines = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.length >= 200)
  const occurrences: ParsedOccurrence[] = []
  const errors: string[] = []

  let bankCode = ''
  let fileDate = ''
  let lineNum = 0

  for (const line of lines) {
    lineNum++
    const tipoReg = line[7]  // posição 8 (0-indexed = 7)

    if (tipoReg === '0') {
      // Header arquivo
      bankCode = line.slice(0, 3).trim()
      fileDate = parseCnabDate8(line.slice(143, 151)) ?? ''
      continue
    }

    if (tipoReg === '3') {
      const segmento = line[13]  // posição 14

      // Segmento T — dados do título no retorno
      if (segmento === 'T') {
        try {
          const occCode = line.slice(15, 17).trim()  // posição 16-17
          const ourNumber = line.slice(37, 57).trim() // posição 38-57
          const docNumber = line.slice(58, 73).trim() // posição 59-73
          const dueDate = parseCnabDate8(line.slice(73, 81))
          const amount = parseCnabAmount(line.slice(81, 96))
          const occDate = parseCnabDate8(line.slice(110, 118))

          const mapped = occurrenceMap[occCode]
          occurrences.push({
            code: occCode,
            description: mapped?.description ?? `Ocorrência ${occCode}`,
            category: mapped?.category ?? 'unknown',
            ourNumber,
            documentNumber: docNumber,
            dueDate,
            occurrenceDate: occDate,
            amount,
            rawLine: line,
            lineNumber: lineNum,
          })
        } catch (e) {
          errors.push(`Linha ${lineNum}: erro ao parsear Segmento T — ${e}`)
        }
      }

      // Segmento U — valores de pagamento
      if (segmento === 'U') {
        const lastOcc = occurrences[occurrences.length - 1]
        if (lastOcc) {
          try {
            const paidAmount = parseCnabAmount(line.slice(17, 32))
            const creditDate = parseCnabDate8(line.slice(145, 153))
            lastOcc.paidAmount = paidAmount || lastOcc.amount
            lastOcc.creditDate = creditDate
          } catch {
            /* silencioso */
          }
        }
      }
    }
  }

  return { bankCode, fileDate, occurrences, errors }
}
