import { Upload, FileSpreadsheet, Users, DollarSign, AlertCircle } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader'

interface TipoImportacao {
  id: string
  titulo: string
  descricao: string
  formato: string
  icon: React.ReactNode
  campos: string[]
  status: 'disponivel' | 'em_breve'
}

const TIPOS: TipoImportacao[] = [
  {
    id: 'alunos',
    titulo: 'Alunos',
    descricao: 'Importe uma planilha com os dados cadastrais dos alunos',
    formato: 'CSV / Excel (.xlsx)',
    icon: <Users size={20} />,
    campos: ['nome', 'data_nascimento', 'escola', 'serie_escolar'],
    status: 'em_breve',
  },
  {
    id: 'responsaveis',
    titulo: 'Responsáveis',
    descricao: 'Importe responsáveis e seus vínculos com alunos',
    formato: 'CSV / Excel (.xlsx)',
    icon: <Users size={20} />,
    campos: ['nome', 'cpf', 'email', 'telefone', 'aluno_nome'],
    status: 'em_breve',
  },
  {
    id: 'pagamentos',
    titulo: 'Histórico de Pagamentos',
    descricao: 'Importe histórico de pagamentos de sistemas anteriores',
    formato: 'CSV',
    icon: <DollarSign size={20} />,
    campos: ['aluno_nome', 'mes_referencia', 'valor', 'data_pagamento'],
    status: 'em_breve',
  },
]

export default function ImportacoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importações"
        subtitle="Importe dados de planilhas ou sistemas externos"
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-700">
          <strong>Fase 3 — Em desenvolvimento:</strong> A funcionalidade de importação está sendo preparada.
          A estrutura de processamento está pronta; a UI de upload e validação será liberada em breve.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TIPOS.map((tipo) => (
          <div key={tipo.id} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {tipo.icon}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {tipo.status === 'disponivel' ? '✓ Disponível' : 'Em breve'}
              </span>
            </div>

            <div>
              <h3 className="font-semibold">{tipo.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tipo.descricao}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Campos suportados:</p>
              <div className="flex flex-wrap gap-1">
                {tipo.campos.map((campo) => (
                  <span key={campo} className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{campo}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
              <FileSpreadsheet size={12} />
              <span>{tipo.formato}</span>
            </div>

            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <Upload size={14} />
              Selecionar arquivo
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3">Template de Importação</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Baixe os templates em formato CSV para preparar seus dados antes de importar.
          Os arquivos incluem exemplos de preenchimento e validações automáticas.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.id}
              disabled
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed hover:bg-accent transition-colors"
            >
              <FileSpreadsheet size={14} />
              Template {tipo.titulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
