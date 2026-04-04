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
  MessageSquare,
  Grid3X3,
  CheckSquare,
  Upload,
  FileText,
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
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
      { to: '/alunos', label: 'Alunos', icon: <GraduationCap size={15} /> },
      { to: '/responsaveis', label: 'Responsáveis', icon: <Users size={15} /> },
    ],
  },
  {
    label: 'Operacional',
    defaultOpen: true,
    items: [
      { to: '/turmas', label: 'Turmas', icon: <CalendarDays size={15} /> },
      { to: '/disciplinas', label: 'Disciplinas', icon: <BookOpen size={15} /> },
      { to: '/sessoes', label: 'Sessões', icon: <ClipboardList size={15} /> },
      { to: '/quadro-horarios', label: 'Quadro de Horários', icon: <Grid3X3 size={15} /> },
      { to: '/presenca', label: 'Lista de Presença', icon: <CheckSquare size={15} /> },
      { to: '/reunioes', label: 'Reuniões', icon: <MessageSquare size={15} /> },
      { to: '/exercicios', label: 'Exercícios', icon: <BookMarked size={15} /> },
    ],
  },
  {
    label: 'Financeiro',
    defaultOpen: true,
    items: [
      { to: '/financeiro', label: 'Financeiro', icon: <DollarSign size={15} /> },
    ],
  },
  {
    label: 'Avançado',
    defaultOpen: false,
    items: [
      { to: '/notas-fiscais', label: 'Notas Fiscais', icon: <Landmark size={15} /> },
      { to: '/importacoes', label: 'Importações', icon: <Upload size={15} /> },
      { to: '/reajustes', label: 'Reajustes em Lote', icon: <FileText size={15} /> },
    ],
  },
  {
    label: 'Admin',
    defaultOpen: false,
    items: [
      { to: '/usuarios', label: 'Usuários', icon: <UserCog size={15} />, onlyFranqueado: true },
      { to: '/configuracoes', label: 'Configurações', icon: <Settings size={15} /> },
      { to: '/guia', label: 'Guia do Sistema', icon: <HelpCircle size={15} /> },
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
      if (activeLabel) set.add(activeLabel)
      return set
    }
  } catch {}
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
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.10), transparent 35%), linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)',
        boxShadow: 'inset -1px 0 0 rgba(37, 99, 235, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      }}
    >
      {/* Overlay de luz suave */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 40%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Conteúdo acima do overlay */}
      <div className="relative z-10 flex h-full flex-col">
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div
        className="flex h-[60px] shrink-0 items-center px-5"
        style={{ borderBottom: '1px solid #E2E8F0' }}
      >
        <img src="/logo_color.png" alt="Avance Pro" className="h-9 w-auto" />
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 transition-colors duration-150 hover:bg-slate-200/60"
            style={{ color: '#64748B' }}
            aria-label="Fechar menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
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
            <div key={group.label} className={groupIdx > 0 ? 'mt-6' : ''}>
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGroup(group.label)}
                className="group/hdr flex w-full items-center justify-between rounded-md px-2 py-1 transition-colors duration-150"
                style={{ marginBottom: '4px' }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 group-hover/hdr:text-slate-400"
                  style={{ color: hasActive ? '#2563EB' : '#94A3B8' }}
                >
                  {group.label}
                </span>
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200 group-hover/hdr:opacity-70"
                  style={{
                    color: hasActive ? '#2563EB' : '#CBD5E1',
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
                  <ul className="mb-1 space-y-0.5">
                    {visibleItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-[15.5px] transition-all duration-200',
                              isActive
                                ? 'font-semibold'
                                : 'font-medium hover:bg-[#E2E8F0]'
                            )
                          }
                          style={({ isActive }) => ({
                            color: isActive ? '#1E40AF' : '#64748B',
                            background: isActive ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.06))' : undefined,
                            boxShadow: isActive ? 'inset 3px 0 0 0 #2563EB' : undefined,
                          })}
                        >
                          <span
                            className="shrink-0 flex items-center transition-colors duration-150"
                            style={{ color: 'inherit' }}
                          >
                            {item.icon}
                          </span>
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
      <div className="px-3 pb-3" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-[#E2E8F0] group/user cursor-default">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold uppercase"
            style={{ background: '#EEF2FF', color: '#4338CA', boxShadow: '0 0 0 2px #C7D2FE' }}
          >
            {nome.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: '#1E293B' }}>
              {nome}
            </p>
            <p className="truncate text-[11.5px] leading-tight capitalize mt-0.5" style={{ color: '#94A3B8' }}>
              {perfil}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 rounded-lg p-1.5 transition-all duration-150 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover/user:opacity-100"
            style={{ color: '#94A3B8' }}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
      </div>{/* fim z-10 */}
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
      <aside className="hidden w-[240px] shrink-0 md:flex md:flex-col">
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
          <div className="relative z-50 flex w-[240px] flex-col shadow-2xl">
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
          style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}
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
