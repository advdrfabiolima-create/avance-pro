import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarDays,
  ClipboardList,
  DollarSign,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  UserCheck,
  MessageSquare,
  Grid3X3,
  CheckSquare,
  ArrowLeftRight,
  FileText,
  Receipt,
  RefreshCcw,
  BarChart2,
  Upload,
  Landmark,
  ChevronDown,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/auth.store'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  onlyFranqueado?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Geral',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
      { to: '/alunos', label: 'Alunos', icon: <GraduationCap size={15} /> },
      { to: '/responsaveis', label: 'Responsáveis', icon: <Users size={15} /> },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { to: '/turmas', label: 'Turmas', icon: <CalendarDays size={15} /> },
      { to: '/disciplinas', label: 'Disciplinas', icon: <BookOpen size={15} /> },
      { to: '/sessoes', label: 'Sessões', icon: <ClipboardList size={15} /> },
      { to: '/quadro-horarios', label: 'Quadro de Horários', icon: <Grid3X3 size={15} /> },
      { to: '/presenca', label: 'Lista de Presença', icon: <CheckSquare size={15} /> },
      { to: '/reunioes', label: 'Reuniões', icon: <MessageSquare size={15} /> },
    ],
  },
  {
    label: 'Equipe',
    items: [
      { to: '/auxiliares', label: 'Auxiliares', icon: <UserCheck size={15} /> },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/pagamentos', label: 'Mensalidades', icon: <DollarSign size={15} /> },
      { to: '/movimentos', label: 'Mov. Financeiro', icon: <ArrowLeftRight size={15} /> },
      { to: '/cobrancas', label: 'Cobranças', icon: <Receipt size={15} /> },
      { to: '/recorrencias', label: 'Recorrências', icon: <RefreshCcw size={15} /> },
      { to: '/relatorios', label: 'Relatórios', icon: <BarChart2 size={15} /> },
    ],
  },
  {
    label: 'Avançado',
    items: [
      { to: '/notas-fiscais', label: 'Notas Fiscais', icon: <Landmark size={15} /> },
      { to: '/importacoes', label: 'Importações', icon: <Upload size={15} /> },
      { to: '/reajustes', label: 'Reajustes em Lote', icon: <FileText size={15} /> },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/usuarios', label: 'Usuários', icon: <UserCog size={15} />, onlyFranqueado: true },
      { to: '/configuracoes', label: 'Configurações', icon: <Settings size={15} /> },
    ],
  },
]

// Lista plana para PageTitle
const allNavItems = navGroups.flatMap((g) => g.items)

function PageTitle() {
  const location = useLocation()
  const item = allNavItems.find((n) => location.pathname.startsWith(n.to))
  return (
    <span className="text-sm font-semibold text-foreground tracking-tight">
      {item?.label ?? 'Avance Pro'}
    </span>
  )
}

interface SidebarContentProps {
  perfil: string
  nome: string
  onLogout: () => void
  onClose?: () => void
}

function SidebarContent({ perfil, nome, onLogout, onClose }: SidebarContentProps) {
  const location = useLocation()

  // Determina qual grupo contém a rota ativa para abrir por padrão
  function getActiveGroup() {
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname.startsWith(item.to))) {
        return group.label
      }
    }
    return navGroups[0]?.label ?? ''
  }

  const [openGroup, setOpenGroup] = useState<string>(getActiveGroup)

  function toggleGroup(label: string) {
    setOpenGroup((prev) => (prev === label ? '' : label))
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-6">
        <img src="/logo_color.png" alt="Avance Pro" className="h-9 w-auto" />
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav com grupos accordion */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.onlyFranqueado || perfil === 'franqueado'
          )
          if (visibleItems.length === 0) return null

          const isOpen = openGroup === group.label
          const hasActive = visibleItems.some((item) => location.pathname.startsWith(item.to))

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150',
                  hasActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={14}
                  className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <ul className="mb-1 mt-0.5 space-y-0.5 pl-2">
                  {visibleItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-150',
                            isActive
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )
                        }
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      {/* Crédito */}
      <div className="px-4 pb-1 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground/40">dev por</span>
        <img src="/axion_systems.png" alt="Axion Systems" className="h-5 w-auto opacity-60" />
      </div>

      {/* Footer: user + logout */}
      <div className="border-t border-border/60 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
            {nome.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{nome}</p>
            <p className="truncate text-[11px] text-muted-foreground capitalize">{perfil}</p>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)

  const nome = usuario?.nome ?? ''
  const perfil = usuario?.perfil ?? 'assistente'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-border/60 md:flex md:flex-col">
        <SidebarContent perfil={perfil} nome={nome} onLogout={logout} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex w-60 flex-col shadow-xl">
            <SidebarContent
              perfil={perfil}
              nome={nome}
              onLogout={logout}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-card px-4 md:px-6">
          <button
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <PageTitle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
