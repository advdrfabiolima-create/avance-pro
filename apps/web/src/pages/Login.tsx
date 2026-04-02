import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, BarChart2, Users, Clock } from 'lucide-react'
import { useAuth, getLoginError } from '../hooks/useAuth'
import { Alert, AlertDescription } from '../components/ui/Alert'
import { cn } from '../lib/utils'

interface FormState {
  email: string
  senha: string
}

interface FormErrors {
  email?: string
  senha?: string
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.email.trim()) {
    errors.email = 'O e-mail é obrigatório.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Informe um e-mail válido.'
  }
  if (!form.senha) {
    errors.senha = 'A senha é obrigatória.'
  } else if (form.senha.length < 6) {
    errors.senha = 'A senha deve ter no mínimo 6 caracteres.'
  }
  return errors
}

const features = [
  {
    icon: <BarChart2 className="h-[15px] w-[15px]" />,
    text: 'Acompanhe a evolução de cada aluno em tempo real',
  },
  {
    icon: <Users className="h-[15px] w-[15px]" />,
    text: 'Gerencie turmas, matrículas e responsáveis',
  },
  {
    icon: <Clock className="h-[15px] w-[15px]" />,
    text: 'Identifique dificuldades antes que virem problemas',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginComCredenciais } = useAuth()

  const [form, setForm] = useState<FormState>({ email: '', senha: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setIsLoading(true)
    setApiError(null)
    try {
      await loginComCredenciais(form.email, form.senha)
      navigate('/dashboard')
    } catch (error) {
      const kind = getLoginError(error)
      if (kind === 'invalid_credentials') {
        setApiError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.')
      } else {
        setApiError('Ocorreu um erro ao fazer login. Por favor, tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Painel esquerdo — branding ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[44%] relative flex-col justify-between overflow-hidden"
        style={{
          padding: '48px 52px',
          background: 'linear-gradient(150deg, #0F1E6E 0%, #1E3A8A 30%, #1D4ED8 65%, #3B82F6 100%)',
        }}
      >
        {/* Camada de profundidade — radial glows */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 55% at 10% 8%, rgba(147,197,253,0.13) 0%, transparent 55%),' +
              'radial-gradient(ellipse 55% 75% at 88% 90%, rgba(15,30,110,0.65) 0%, transparent 55%),' +
              'radial-gradient(ellipse 45% 38% at 70% 22%, rgba(255,255,255,0.055) 0%, transparent 50%),' +
              'radial-gradient(ellipse 30% 30% at 30% 70%, rgba(59,130,246,0.12) 0%, transparent 50%)',
          }}
        />

        {/* Textura de pontos — mais premium que grid de linhas */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            opacity: 0.18,
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.png" alt="Avance Pro" className="h-[52px] w-auto" />
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-9">
          <div className="space-y-4">
            <h1
              className="font-bold text-white leading-[1.15] tracking-[-0.02em]"
              style={{ fontSize: '30px' }}
            >
              Controle total<br />da sua unidade
            </h1>
            <p
              className="leading-relaxed max-w-[280px]"
              style={{ fontSize: '14.5px', color: 'rgba(186,210,255,0.75)', lineHeight: '1.65' }}
            >
              Acompanhe a evolução dos alunos, identifique dificuldades e tome decisões com precisão.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span
                  className="mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(186,210,255,0.9)',
                  }}
                >
                  {f.icon}
                </span>
                <span
                  className="leading-snug pt-[5px]"
                  style={{ fontSize: '13.5px', color: 'rgba(186,210,255,0.65)' }}
                >
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé esquerdo */}
        <div className="relative z-10">
          <p
            className="tracking-wide"
            style={{ fontSize: '11px', color: 'rgba(147,197,253,0.3)', letterSpacing: '0.04em' }}
          >
            Avance Pro — Sistema de Gestão
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ──────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16"
        style={{ background: '#F8FAFC' }}
      >
        {/* Logo mobile */}
        <div className="mb-10 lg:hidden">
          <img src="/logo_color.png" alt="Avance Pro" className="h-10 w-auto" />
        </div>

        {/* Card do formulário */}
        <div
          className="w-full max-w-[380px]"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '40px 36px 36px',
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)',
            animation: 'fadeInUp 0.3s ease both',
          }}
        >
          {/* Cabeçalho */}
          <div className="mb-8">
            <h2
              className="font-bold leading-tight tracking-tight"
              style={{ fontSize: '22px', color: '#111827' }}
            >
              Bem-vindo de volta
            </h2>
            <p
              className="mt-1.5 leading-relaxed"
              style={{ fontSize: '14px', color: '#6B7280' }}
            >
              Acesse sua conta para continuar
            </p>
          </div>

          {apiError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* E-mail */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block font-semibold uppercase tracking-[0.05em]"
                style={{ fontSize: '11px', color: '#6B7280' }}
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ width: 15, height: 15, color: '#CBD5E1' }}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={cn(
                    'w-full rounded-lg pl-10 pr-4 text-sm outline-none transition-all duration-150',
                    'placeholder:text-slate-300 disabled:opacity-60 disabled:cursor-not-allowed',
                    errors.email
                      ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                      : 'focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] hover:border-slate-300'
                  )}
                  style={{
                    height: '42px',
                    background: '#F8FAFC',
                    border: `1px solid ${errors.email ? '#FCA5A5' : '#E2E8F0'}`,
                    color: '#1E293B',
                    fontSize: '13.5px',
                  }}
                />
              </div>
              {errors.email && (
                <p className="text-xs" style={{ color: '#EF4444' }}>{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label
                htmlFor="senha"
                className="block font-semibold uppercase tracking-[0.05em]"
                style={{ fontSize: '11px', color: '#6B7280' }}
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ width: 15, height: 15, color: '#CBD5E1' }}
                />
                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={cn(
                    'w-full rounded-lg pl-10 pr-11 text-sm outline-none transition-all duration-150',
                    'placeholder:text-slate-300 disabled:opacity-60 disabled:cursor-not-allowed',
                    errors.senha
                      ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                      : 'focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] hover:border-slate-300'
                  )}
                  style={{
                    height: '42px',
                    background: '#F8FAFC',
                    border: `1px solid ${errors.senha ? '#FCA5A5' : '#E2E8F0'}`,
                    color: '#1E293B',
                    fontSize: '13.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150 hover:text-slate-600"
                  style={{ color: '#CBD5E1' }}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 15, height: 15 }} />
                    : <Eye style={{ width: 15, height: 15 }} />
                  }
                </button>
              </div>
              {errors.senha && (
                <p className="text-xs" style={{ color: '#EF4444' }}>{errors.senha}</p>
              )}
            </div>

            {/* Botão */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'relative w-full text-sm font-semibold text-white transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-60',
                  'active:scale-[0.985]',
                  !isLoading && 'hover:shadow-lg hover:brightness-[1.06]',
                )}
                style={{
                  height: '44px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
                  boxShadow: '0 1px 2px rgba(79,70,229,0.2), 0 4px 12px rgba(79,70,229,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
                  cursor: isLoading ? 'wait' : 'pointer',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar na conta'
                )}
              </button>
            </div>
          </form>

          {/* Elemento de confiança */}
          <div
            className="mt-7 flex items-center justify-center gap-1.5"
            style={{ color: '#D1D5DB' }}
          >
            <ShieldCheck style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ fontSize: '11.5px' }}>Seus dados estão protegidos e criptografados.</span>
          </div>
        </div>

        {/* Suporte */}
        <p className="mt-5 text-center" style={{ fontSize: '12px', color: '#9CA3AF' }}>
          Problemas para acessar?{' '}
          <span style={{ color: '#6B7280', fontWeight: 500 }}>Contate o administrador.</span>
        </p>

        {/* Crédito Axion */}
        <div className="mt-7 flex items-center justify-center gap-1.5">
          <span style={{ fontSize: '11px', color: '#D1D5DB' }}>sistema desenvolvido por</span>
          <a href="https://axionsystem.com.br" target="_blank" rel="noopener noreferrer">
            <img
              src="/axion_systems.png"
              alt="Axion Systems"
              className="hover:opacity-90 transition-opacity duration-200"
              style={{ height: '22px', width: 'auto', opacity: 0.55 }}
            />
          </a>
        </div>
      </div>

      {/* Animação de entrada do card */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
