import { useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, Users, DollarSign, Download,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert, AlertDescription } from '../../components/ui/Alert'
import PageHeader from '../../components/shared/PageHeader'
import { api } from '../../services/api'

// ─── Templates CSV ────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { header: string; exemplo: string }> = {
  alunos: {
    header: 'nome,data_nascimento,escola,serie_escolar',
    exemplo: 'João Silva,2012-03-15,Escola Estadual Dom Pedro,6º ano',
  },
  responsaveis: {
    header: 'nome,cpf,email,telefone,aluno_nome,parentesco,principal',
    exemplo: 'Maria Silva,123.456.789-00,maria@email.com,(11) 99999-9999,João Silva,mãe,true',
  },
  pagamentos: {
    header: 'aluno_nome,mes_referencia,valor,data_pagamento,forma_pagamento',
    exemplo: 'João Silva,2024-01-01,350.00,2024-01-05,pix',
  },
}

function gerarCSV(tipo: string): string {
  const t = TEMPLATES[tipo]
  if (!t) return ''
  return `${t.header}\n${t.exemplo}\n`
}

function downloadCSV(tipo: string, label: string) {
  const conteudo = gerarCSV(tipo)
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `template_${tipo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Resultado de linha ───────────────────────────────────────────────────────

interface LinhaResultado {
  linha: number
  dados: Record<string, string>
  status: 'ok' | 'erro' | 'aviso'
  mensagem?: string
}

interface ResultadoImportacao {
  total: number
  sucesso: number
  erros: number
  avisos: number
  linhas: LinhaResultado[]
}

// ─── Parsear CSV ──────────────────────────────────────────────────────────────

function parseCSV(texto: string): Array<Record<string, string>> {
  const linhas = texto.trim().split('\n').map((l) => l.replace(/\r$/, ''))
  if (linhas.length < 2) return []
  const cabecalho = linhas[0]!.split(',').map((h) => h.trim().toLowerCase())
  return linhas.slice(1).map((linha) => {
    const valores = linha.split(',').map((v) => v.trim())
    const obj: Record<string, string> = {}
    cabecalho.forEach((col, i) => { obj[col] = valores[i] ?? '' })
    return obj
  })
}

// ─── Validadores ──────────────────────────────────────────────────────────────

function validarAluno(dados: Record<string, string>, linha: number): LinhaResultado {
  if (!dados['nome']?.trim()) {
    return { linha, dados, status: 'erro', mensagem: 'Nome obrigatório' }
  }
  if (!dados['data_nascimento']?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { linha, dados, status: 'erro', mensagem: 'data_nascimento deve estar no formato AAAA-MM-DD' }
  }
  return { linha, dados, status: 'ok' }
}

function validarResponsavel(dados: Record<string, string>, linha: number): LinhaResultado {
  if (!dados['nome']?.trim()) return { linha, dados, status: 'erro', mensagem: 'Nome obrigatório' }
  if (!dados['email']?.includes('@')) return { linha, dados, status: 'erro', mensagem: 'E-mail inválido' }
  if (!dados['telefone']?.trim()) return { linha, dados, status: 'erro', mensagem: 'Telefone obrigatório' }
  return { linha, dados, status: 'ok' }
}

function validarPagamento(dados: Record<string, string>, linha: number): LinhaResultado {
  if (!dados['aluno_nome']?.trim()) return { linha, dados, status: 'erro', mensagem: 'aluno_nome obrigatório' }
  if (!dados['mes_referencia']?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return { linha, dados, status: 'erro', mensagem: 'mes_referencia deve ser AAAA-MM-DD' }
  }
  if (isNaN(parseFloat(dados['valor'] ?? ''))) {
    return { linha, dados, status: 'erro', mensagem: 'valor deve ser numérico' }
  }
  return { linha, dados, status: 'ok' }
}

// ─── Importar via API ─────────────────────────────────────────────────────────

async function importarAlunos(linhas: Array<Record<string, string>>): Promise<LinhaResultado[]> {
  const resultados: LinhaResultado[] = []
  for (let i = 0; i < linhas.length; i++) {
    const d = linhas[i]!
    const numLinha = i + 2
    const validacao = validarAluno(d, numLinha)
    if (validacao.status === 'erro') { resultados.push(validacao); continue }

    try {
      await api.post('/alunos', {
        nome: d['nome'],
        dataNascimento: d['data_nascimento'],
        escola: d['escola'] || undefined,
        serieEscolar: d['serie_escolar'] || undefined,
        responsaveis: [],
      })
      resultados.push({ linha: numLinha, dados: d, status: 'ok', mensagem: 'Importado com sucesso' })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao importar'
      resultados.push({ linha: numLinha, dados: d, status: 'erro', mensagem: msg })
    }
  }
  return resultados
}

async function importarResponsaveis(linhas: Array<Record<string, string>>): Promise<LinhaResultado[]> {
  const resultados: LinhaResultado[] = []
  for (let i = 0; i < linhas.length; i++) {
    const d = linhas[i]!
    const numLinha = i + 2
    const validacao = validarResponsavel(d, numLinha)
    if (validacao.status === 'erro') { resultados.push(validacao); continue }

    try {
      await api.post('/responsaveis', {
        nome: d['nome'],
        cpf: d['cpf'] || undefined,
        email: d['email'],
        telefone: d['telefone'],
      })
      resultados.push({ linha: numLinha, dados: d, status: 'ok', mensagem: 'Importado com sucesso' })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao importar'
      resultados.push({ linha: numLinha, dados: d, status: 'erro', mensagem: msg })
    }
  }
  return resultados
}

async function importarPagamentos(linhas: Array<Record<string, string>>): Promise<LinhaResultado[]> {
  // Pagamentos requerem vínculo com aluno e matrícula — registramos como movimento financeiro
  const resultados: LinhaResultado[] = []
  for (let i = 0; i < linhas.length; i++) {
    const d = linhas[i]!
    const numLinha = i + 2
    const validacao = validarPagamento(d, numLinha)
    if (validacao.status === 'erro') { resultados.push(validacao); continue }

    try {
      await api.post('/movimentos', {
        tipo: 'entrada',
        origem: 'mensalidade',
        descricao: `Importação: ${d['aluno_nome']} — ${d['mes_referencia']?.slice(0, 7)}`,
        valor: parseFloat(d['valor'] ?? '0'),
        data: d['data_pagamento'] || d['mes_referencia'],
        status: 'confirmado',
      })
      resultados.push({ linha: numLinha, dados: d, status: 'ok', mensagem: 'Registrado como movimento financeiro' })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao importar'
      resultados.push({ linha: numLinha, dados: d, status: 'erro', mensagem: msg })
    }
  }
  return resultados
}

// ─── Card de tipo ─────────────────────────────────────────────────────────────

interface TipoConfig {
  id: string
  titulo: string
  descricao: string
  icon: React.ReactNode
  campos: string[]
  formato: string
}

const TIPOS: TipoConfig[] = [
  {
    id: 'alunos',
    titulo: 'Alunos',
    descricao: 'Importe dados cadastrais de alunos a partir de uma planilha CSV.',
    icon: <Users size={20} />,
    campos: ['nome*', 'data_nascimento* (AAAA-MM-DD)', 'escola', 'serie_escolar'],
    formato: 'CSV',
  },
  {
    id: 'responsaveis',
    titulo: 'Responsáveis',
    descricao: 'Importe responsáveis. O vínculo com alunos pode ser feito manualmente após a importação.',
    icon: <Users size={20} />,
    campos: ['nome*', 'email*', 'telefone*', 'cpf', 'aluno_nome', 'parentesco', 'principal'],
    formato: 'CSV',
  },
  {
    id: 'pagamentos',
    titulo: 'Histórico de Pagamentos',
    descricao: 'Importe histórico de pagamentos. Os registros são lançados como movimentos financeiros.',
    icon: <DollarSign size={20} />,
    campos: ['aluno_nome*', 'mes_referencia* (AAAA-MM-DD)', 'valor*', 'data_pagamento', 'forma_pagamento'],
    formato: 'CSV',
  },
]

interface CardImportacaoProps {
  tipo: TipoConfig
}

function CardImportacao({ tipo }: CardImportacaoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [expandido, setExpandido] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!inputRef.current) return
    inputRef.current.value = ''
    if (!arquivo) return

    setCarregando(true)
    setResultado(null)
    setErro(null)

    try {
      const texto = await arquivo.text()
      const linhas = parseCSV(texto)

      if (linhas.length === 0) {
        setErro('Arquivo vazio ou sem linhas de dados além do cabeçalho.')
        return
      }

      let linhasResultado: LinhaResultado[]
      if (tipo.id === 'alunos') linhasResultado = await importarAlunos(linhas)
      else if (tipo.id === 'responsaveis') linhasResultado = await importarResponsaveis(linhas)
      else linhasResultado = await importarPagamentos(linhas)

      const sucesso = linhasResultado.filter((l) => l.status === 'ok').length
      const erros = linhasResultado.filter((l) => l.status === 'erro').length
      const avisos = linhasResultado.filter((l) => l.status === 'aviso').length

      setResultado({ total: linhas.length, sucesso, erros, avisos, linhas: linhasResultado })
    } catch {
      setErro('Erro ao processar o arquivo. Verifique se é um CSV válido.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {tipo.icon}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadCSV(tipo.id, tipo.titulo)}
          title="Baixar template CSV"
        >
          <Download size={13} /> Template
        </Button>
      </div>

      <div>
        <h3 className="font-semibold">{tipo.titulo}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tipo.descricao}</p>
      </div>

      {/* Campos */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Colunas do CSV:</p>
        <div className="flex flex-wrap gap-1">
          {tipo.campos.map((campo) => (
            <span
              key={campo}
              className={`text-xs px-2 py-0.5 rounded font-mono ${campo.endsWith('*') ? 'bg-primary/10 text-primary' : 'bg-muted'}`}
            >
              {campo.replace('*', '')}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">* obrigatório</p>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="rounded-lg border overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2.5 bg-muted/30 cursor-pointer"
            onClick={() => setExpandido((v) => !v)}
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 size={13} /> {resultado.sucesso} importados
              </span>
              {resultado.erros > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle size={13} /> {resultado.erros} erros
                </span>
              )}
              {resultado.avisos > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle size={13} /> {resultado.avisos} avisos
                </span>
              )}
            </div>
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>

          {expandido && (
            <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
              {resultado.linhas.map((linha) => (
                <div key={linha.linha} className={`flex items-start gap-2 px-3 py-2 text-xs ${
                  linha.status === 'erro' ? 'bg-red-50' : linha.status === 'aviso' ? 'bg-yellow-50' : ''
                }`}>
                  {linha.status === 'ok'
                    ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-600" />
                    : linha.status === 'aviso'
                    ? <AlertTriangle size={12} className="mt-0.5 shrink-0 text-yellow-600" />
                    : <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
                  }
                  <span className="text-muted-foreground w-10 shrink-0">L{linha.linha}</span>
                  <span className="flex-1">
                    <span className="font-medium">{Object.values(linha.dados)[0]}</span>
                    {linha.mensagem && <span className="text-muted-foreground"> — {linha.mensagem}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleArquivo}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={carregando}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-3 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload size={14} />
        {carregando ? 'Importando...' : 'Selecionar arquivo CSV'}
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ImportacoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importações"
        subtitle="Importe dados de planilhas CSV para o sistema"
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <FileSpreadsheet size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-700">
          Baixe o template de cada tipo, preencha com seus dados e faça o upload.
          Linhas com erro são sinalizadas individualmente — as corretas são importadas normalmente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TIPOS.map((tipo) => (
          <CardImportacao key={tipo.id} tipo={tipo} />
        ))}
      </div>
    </div>
  )
}
