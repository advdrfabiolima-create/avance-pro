import { cn } from '../../lib/utils'

interface AlunoAvatarProps {
  nome: string
  foto?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeiro = partes[0] ?? ''
  if (partes.length === 1) return primeiro.charAt(0).toUpperCase()
  const ultimo = partes[partes.length - 1] ?? ''
  return (primeiro.charAt(0) + ultimo.charAt(0)).toUpperCase()
}

export default function AlunoAvatar({ nome, foto, size = 'md', className }: AlunoAvatarProps) {
  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        className={cn('rounded-full object-cover shrink-0', sizeMap[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary shrink-0 select-none',
        sizeMap[size],
        className
      )}
    >
      {iniciais(nome)}
    </div>
  )
}
