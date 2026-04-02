import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, BarChart2, Users, Clock } from 'lucide-react'
import { useAuth, getLoginError } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
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
    icon: <BarChart2 className="h-4 w-4" />,
    text: 'Acompanhe a evolução de cada aluno em tempo real',
  },
  {
    icon: <Users className="h-4 w-4" />,
    text: 'Gerencie turmas, matrículas e responsáveis',
  },
  {
    icon: <Clock className="h-4 w-4" />,
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

      {/* ── Painel esquerdo — branding ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 100%)',
        }}
      >
        {/* Radial highlights — profundidade */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99,179,237,0.18) 0%, transparent 60%),' +
              'radial-gradient(ellipse 60% 80% at 80% 80%, rgba(30,58,138,0.5) 0%, transparent 60%),' +
              'radial-gradient(ellipse 40% 40% at 60% 30%, rgba(255,255,255,0.06) 0%, transparent 50%)',
          }}
        />

        {/* Grid texture muito sutil */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.png" alt="Avance Pro" className="h-14 w-auto" />
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
              Controle total<br />da sua unidade
            </h1>
            <p className="text-base text-blue-100/80 leading-relaxed max-w-xs">
              Acompanhe a evolução dos alunos, identifique dificuldades e tome decisões com precisão.
            </p>
          </div>

          <ul className="space-y-3.5">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-blue-100">
                  {f.icon}
                </span>
                <span className="text-sm text-blue-100/75 leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé discreto */}
        <div className="relative z-10">
          <p className="text-xs text-blue-200/40 tracking-wide">
            Avance Pro — Sistema de Gestão
          </p>
        </div>
      </div>

      {/* ── Painel direito — formulário ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[hsl(220_20%_97%)] px-6 py-12 lg:px-16">

        {/* Logo mobile */}
        <div className="mb-10 lg:hidden">
          <img src="/logo_color.png" alt="Avance Pro" className="h-10 w-auto" />
        </div>

        {/* Card do formulário */}
        <div className="w-full max-w-[360px] rounded-2xl border border-border/60 bg-white px-8 py-9 shadow-md">

          {/* Cabeçalho */}
          <div className="mb-7">
            <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">
              Acesse sua conta para continuar
            </p>
          </div>

          {apiError && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  className={cn(
                    'pl-9 h-10 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-300',
                    'focus-visible:bg-white focus-visible:border-blue-400/60',
                    errors.email && 'border-red-300 focus-visible:ring-red-200',
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={handleChange}
                  className={cn(
                    'pl-9 pr-10 h-10 bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-300',
                    'focus-visible:bg-white focus-visible:border-blue-400/60',
                    errors.senha && 'border-red-300 focus-visible:ring-red-200',
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors duration-150"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.senha && (
                <p className="text-xs text-red-500">{errors.senha}</p>
              )}
            </div>

            {/* Botão premium */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'relative w-full h-10 rounded-lg text-sm font-semibold text-white',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-60',
                  'active:scale-[0.98]',
                  isLoading ? 'cursor-wait' : 'hover:brightness-110 hover:shadow-md hover:shadow-blue-500/25',
                )}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 1px 3px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
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
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-gray-300">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Seus dados estão protegidos e criptografados.</span>
          </div>
        </div>

        {/* Suporte */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Problemas para acessar?{' '}
          <span className="text-gray-500 font-medium">Contate o administrador.</span>
        </p>

        {/* Crédito */}
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <span className="text-[11px] text-gray-300">sistema desenvolvido por</span>
          <img src="/axion_systems.png" alt="Axion Systems" className="h-6 w-auto opacity-70" />
        </div>
      </div>
    </div>
  )
}
