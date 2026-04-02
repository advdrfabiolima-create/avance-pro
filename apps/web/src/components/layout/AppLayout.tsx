import { useState, useEffect } from 'react'
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
  BookMarked,
  HelpCircle,
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
  defaultOpen?: boolean
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Geral',
    defaultOpen: true,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
      { to: '/alunos', label: 'Alunos', icon: <GraduationCap size={14} /> },
      { to: '/responsaveis', label: 'Responsáveis', icon: <Users size={14} /> },
    ],
  },
  {
    label: 'Operacional',
    defaultOpen: true,
    items: [
      { to: '/turmas', label: 'Turmas', icon: <CalendarDays size={14} /> },
      { to: '/disciplinas', label: 'Disciplinas', icon: <BookOpen size={14} /> },
      { to: '/sessoes', label: 'Sessões', icon: <ClipboardList size={14} /> },
      { to: '/quadro-horarios', label: 'Quadro de Horários', icon: <Grid3X3 size={14} /> },
      { to: '/presenca', label: 'Lista de Presença', icon: <CheckSquare size={14} /> },
      { to: '/reunioes', label: 'Reuniões', icon: <MessageSquare size={14} /> },
      { to: '/exercicios', label: 'Exercícios', icon: <BookMarked size={14} /> },
    ],
  },
  {
    label: 'Equipe',
    defaultOpen: true,
    items: [
      { to: '/auxiliares', label: 'Auxiliares', icon: <UserCheck size={14} /> },
    ],
  },
  {
    label: 'Financeiro',
    defaultOpen: false,
    items: [
      { to: '/pagamentos', label: 'Mensalidades', icon: <DollarSign size={14} /> },
      { to: '/movimentos', label: 'Mov. Financeiro', icon: <ArrowLeftRight size={14} /> },
      { to: '/cobrancas', label: 'Cobranças', icon: <Receipt size={14} /> },
      { to: '/recorrencias', label: 'Recorrências', icon: <RefreshCcw size={14} /> },
      { to: '/relatorios', label: 'Relatórios', icon: <BarChart2 size={14} /> },
    ],
  },
  {
    label: 'Avançado',
    defaultOpen: false,
    items: [
      { to: '/notas-fiscais', label: 'Notas Fiscais', icon: <Landmark size={14} /> },
      { to: '/importacoes', label: 'Importações', icon: <Upload size={14} /> },
      { to: '/reajustes', label: 'Reajustes em Lote', icon: <FileText size={14} /> },
    ],
  },
  {
    label: 'Admin',
    defaultOpen: false,
    items: [
      { to: '/usuarios', label: 'Usuários', icon: <UserCog size={14} />, onlyFranqueado: true },
      { to: '/configuracoes', label: 'Configurações', icon: <Settings size={14} /> },
      { to: '/guia', label: 'Guia do Sistema', icon: <HelpCircle size={14} /> },
    ],
  },
]

const allNavItems = navGroups.flatMap((g) => g.items)
const LS_KEY = 'avancepro_sidebar_groups'

// ─── Persistência ─────────────────────────────────────────────────────────────

function loadOpenGroups(activeLabel: string | null): Set<string> {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      const set = new Set(parsed)
      if (activeLabel) set.add(activeLabel) // rota ativa sempre abre o grupo
      return set
    }
  } catch {}
  // Primeira visita: usar defaults + grupo ativo
  const defaults = new Set(navGroups.filter((g) => g.defaultOpen).map((g) => g.label))
  if (activeLabel) defaults.add(activeLabel)
  return defaults
}

function saveOpenGroups(groups: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...groups]))
  } catch {}
}

// ─── PageTitle ────────────────────────────────────────────────────────────────

function PageTitle() {
  const location = useLocation()
  const item = allNavItems.find((n) => location.pathname.startsWith(n.to))
  return (
    <span className="text-sm font-semibold tracking-tight" style={{ color: '#1E293B' }}>
      {item?.label ?? 'Avance Pro'}
    </span>
  )
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  perfil: string
  nome: string
  onLogout: () => void
  onClose?: () => void
}

function SidebarContent({ perfil, nome, onLogout, onClose }: SidebarContentProps) {
  const location = useLocation()

  const activeGroupLabel =
    navGroups.find((g) =>
      g.items.some((item) => location.pathname.startsWith(item.to))
    )?.label ?? null

  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    loadOpenGroups(activeGroupLabel)
  )

  // Quando a rota muda, garante que o grupo ativo está aberto
  useEffect(() => {
    if (!activeGroupLabel) return
    setOpenGroups((prev) => {
      if (prev.has(activeGroupLabel)) return prev
      const next = new Set(prev)
      next.add(activeGroupLabel)
      saveOpenGroups(next)
      return next
    })
  }, [activeGroupLabel])

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      saveOpenGroups(next)
      return next
    })
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: '#F8FAFC', borderRight: '1px solid #E5E7EB' }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div
        className="flex h-[60px] shrink-0 items-center px-5"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        <img src="/logo_color.png" alt="Avance Pro" className="h-9 w-auto" />
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 transition-colors duration-150"
            style={{ color: '#64748B' }}
            aria-label="Fechar menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter(
            (item) => !item.onlyFranqueado || perfil === 'franqueado'
          )
          if (visibleItems.length === 0) return null

          const isOpen = openGroups.has(group.label)
          const hasActive = visibleItems.some((item) =>
            location.pathname.startsWith(item.to)
          )

          return (
            <div key={group.label} className={groupIdx > 0 ? 'mt-1' : ''}>
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="group/hdr flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors duration-150"
                style={{ marginBottom: '2px' }}
              >
                <span
                  className="text-[12px] font-semibold uppercase tracking-[0.05em] transition-colors duration-150 group-hover/hdr:text-slate-500"
                  style={{ color: hasActive ? '#6366F1' : '#94A3B8' }}
                >
                  {group.label}
                </span>
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200 group-hover/hdr:opacity-80"
                  style={{
                    color: hasActive ? '#6366F1' : '#CBD5E1',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Itens com animação CSS grid-template-rows */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 200ms ease',
                }}
              >
                <div className="overflow-hidden">
                  <ul className="mb-2 space-y-px">
                    {visibleItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[14px] transition-all duration-150',
                              isActive
                                ? 'font-semibold shadow-[inset_2px_0_0_0_#4F46E5]'
                                : 'font-medium hover:bg-[#F1F5F9]'
                            )
                          }
                          style={({ isActive }) => ({
                            color: isActive ? '#4338CA' : '#334155',
                            background: isActive ? '#EEF2FF' : undefined,
                          })}
                        >
                          <span className="shrink-0 flex items-center">{item.icon}</span>
                          <span className="leading-none">{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Crédito Axion ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2 flex items-center gap-1.5">
        <span className="text-[10px]" style={{ color: '#CBD5E1' }}>dev por</span>
        <img src="/axion_systems.png" alt="Axion Systems" className="h-[18px] w-auto opacity-40" />
      </div>

      {/* ── Footer: usuário ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-3" style={{ borderTop: '1px solid #F1F5F9' }}>
        <div className="mt-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-[#F1F5F9] group/user">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase"
            style={{ background: '#EEF2FF', color: '#4338CA', boxShadow: '0 0 0 1.5px #C7D2FE' }}
          >
            {nome.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: '#1E293B' }}>
              {nome}
            </p>
            <p className="truncate text-[12px] leading-tight capitalize mt-0.5" style={{ color: '#64748B' }}>
              {perfil}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 rounded-md p-1.5 transition-all duration-150 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover/user:opacity-100"
            style={{ color: '#64748B' }}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)

  const nome = usuario?.nome ?? ''
  const perfil = usuario?.perfil ?? 'assistente'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden w-[220px] shrink-0 md:flex md:flex-col">
        <SidebarContent perfil={perfil} nome={nome} onLogout={logout} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex w-[220px] flex-col shadow-2xl">
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
        <header
          className="flex h-[60px] shrink-0 items-center gap-3 px-4 md:px-6"
          style={{ borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}
        >
          <button
            className="rounded-lg p-1.5 transition-colors duration-150 md:hidden hover:bg-slate-100"
            style={{ color: '#64748B' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={17} />
          </button>
          <PageTitle />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
