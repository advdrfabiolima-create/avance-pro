import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, ArrowLeftRight,
  RefreshCw, BarChart2, Settings, DollarSign, GitMerge, Zap,
} from 'lucide-react'
import VisaoGeral from './VisaoGeral'
import ConfiguracoesBilling from './ConfiguracoesBilling'
import ConciliacaoPage from './Conciliacao'
import RegraCobrancaPage from './RegraCobranca'
import PagamentosPage from '../Pagamentos/index'
import CobrancasPage from '../Cobrancas/index'
import MovimentosPage from '../Movimentos/index'
import RecorrenciasPage from '../Recorrencias/index'
import RelatoriosPage from '../Relatorios/index'

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = 'visao-geral' | 'cobrancas' | 'movimentacoes' | 'recorrencia' | 'conciliacao' | 'relatorios' | 'regua' | 'configuracoes'
type CobrancasSubTab = 'mensalidades' | 'avulsas'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'visao-geral',     label: 'Visão Geral',    icon: <LayoutDashboard size={14} /> },
  { id: 'cobrancas',       label: 'Cobranças',      icon: <Receipt size={14} /> },
  { id: 'movimentacoes',   label: 'Movimentações',  icon: <ArrowLeftRight size={14} /> },
  { id: 'recorrencia',     label: 'Recorrência',    icon: <RefreshCw size={14} /> },
  { id: 'conciliacao',     label: 'Conciliação',    icon: <GitMerge size={14} /> },
  { id: 'relatorios',      label: 'Relatórios',     icon: <BarChart2 size={14} /> },
  { id: 'regua',           label: 'Régua',          icon: <Zap size={14} /> },
  { id: 'configuracoes',   label: 'Configurações',  icon: <Settings size={14} /> },
]

const LS_TAB = 'avancepro.financeiro.tab'

function resolveTab(param: string | null): TabId {
  const valid: TabId[] = TABS.map((t) => t.id)
  if (param && valid.includes(param as TabId)) return param as TabId
  try {
    const stored = localStorage.getItem(LS_TAB)
    if (stored && valid.includes(stored as TabId)) return stored as TabId
  } catch {}
  return 'visao-geral'
}

// ─── CobrancasTab ─────────────────────────────────────────────────────────────
// Sub-navegação: Mensalidades | Cobranças Avulsas

function CobrancasTab() {
  const [sub, setSub] = useState<CobrancasSubTab>('mensalidades')

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b">
        {([
          { id: 'mensalidades' as const, label: 'Mensalidades', icon: <DollarSign size={13} /> },
          { id: 'avulsas'      as const, label: 'Cobranças Avulsas', icon: <Receipt size={13} /> },
        ]).map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              sub === s.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da sub-aba com fade */}
      <div key={sub} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
        {sub === 'mensalidades' ? (
          <PagamentosPage embedded />
        ) : (
          <CobrancasPage embedded />
        )}
      </div>
    </div>
  )
}

// ─── FinanceiroPage ───────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState<TabId>(() => resolveTab(tabParam))

  // Sincroniza URL → tab
  useEffect(() => {
    const resolved = resolveTab(tabParam)
    setActiveTab(resolved)
  }, [tabParam])

  const navigateTab = useCallback((id: TabId) => {
    setActiveTab(id)
    setSearchParams({ tab: id }, { replace: true })
    try { localStorage.setItem(LS_TAB, id) } catch {}
  }, [setSearchParams])

  const tabContent: Record<TabId, React.ReactNode> = {
    'visao-geral':    <VisaoGeral />,
    'cobrancas':      <CobrancasTab />,
    'movimentacoes':  <MovimentosPage embedded />,
    'recorrencia':    <RecorrenciasPage embedded />,
    'conciliacao':    <ConciliacaoPage />,
    'relatorios':     <RelatoriosPage embedded />,
    'regua':          <RegraCobrancaPage />,
    'configuracoes':  <ConfiguracoesBilling />,
  }

  return (
    <div className="space-y-0">
      {/* Cabeçalho da página */}
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestão financeira completa da unidade</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigateTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab com transição fade + slide */}
      <div className="pt-5">
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  )
}
