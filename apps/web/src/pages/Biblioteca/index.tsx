import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Sparkles, BookMarked, ClipboardList } from 'lucide-react'
import { cn } from '../../lib/utils'
import BibliotecaTab from './BibliotecaTab'
import GerarIATab from './GerarIATab'
import TrilhasTab from './TrilhasTab'
import ListasTab from './ListasTab'

type TabId = 'biblioteca' | 'gerar-ia' | 'trilhas' | 'listas'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'biblioteca', label: 'Biblioteca',    icon: <BookOpen size={14} /> },
  { id: 'gerar-ia',  label: 'Gerar com IA',  icon: <Sparkles size={14} /> },
  { id: 'trilhas',   label: 'Trilhas',        icon: <BookMarked size={14} /> },
  { id: 'listas',    label: 'Listas',         icon: <ClipboardList size={14} /> },
]

const LS_KEY = 'avancepro.biblioteca.tab'

function resolveTab(param: string | null): TabId {
  const valid = TABS.map((t) => t.id) as string[]
  if (param && valid.includes(param)) return param as TabId
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored && valid.includes(stored)) return stored as TabId
  } catch {}
  return 'biblioteca'
}

export default function BibliotecaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveTab(searchParams.get('tab')))

  useEffect(() => {
    const t = resolveTab(searchParams.get('tab'))
    setActiveTab(t)
  }, [searchParams])

  const navigateTab = useCallback((id: TabId) => {
    setActiveTab(id)
    setSearchParams({ tab: id }, { replace: true })
    try { localStorage.setItem(LS_KEY, id) } catch {}
  }, [setSearchParams])

  const tabContent: Record<TabId, React.ReactNode> = {
    'biblioteca': <BibliotecaTab />,
    'gerar-ia':   <GerarIATab />,
    'trilhas':    <TrilhasTab />,
    'listas':     <ListasTab />,
  }

  return (
    <div className="space-y-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Biblioteca de Exercícios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie exercícios, trilhas pedagógicas e listas para alunos</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigateTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-5">
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  )
}
