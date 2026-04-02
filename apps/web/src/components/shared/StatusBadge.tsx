import { Badge } from '../ui/Badge'

export type StatusOperacional = 'avancando_bem' | 'atencao' | 'estagnado' | 'critico' | 'sem_dados'

const STATUS_CONFIG: Record<
  StatusOperacional,
  { label: string; variant: 'success' | 'warning' | 'stagnant' | 'destructive' | 'outline'; dot: string }
> = {
  avancando_bem: { label: 'Avançando bem', variant: 'success', dot: 'bg-green-500' },
  atencao:       { label: 'Atenção',        variant: 'warning', dot: 'bg-yellow-500' },
  estagnado:     { label: 'Estagnado',      variant: 'stagnant', dot: 'bg-orange-500' },
  critico:       { label: 'Crítico',        variant: 'destructive', dot: 'bg-red-500' },
  sem_dados:     { label: 'Sem dados',      variant: 'outline', dot: 'bg-gray-400' },
}

interface StatusBadgeProps {
  status: StatusOperacional
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, showDot = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.sem_dados
  return (
    <Badge variant={config.variant} className={className}>
      {showDot && (
        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      )}
      {config.label}
    </Badge>
  )
}

export function StatusDot({ status, className }: { status: StatusOperacional; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.sem_dados
  return (
    <span
      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${className ?? ''}`}
      title={config.label}
    />
  )
}

export function getStatusSeverity(status: StatusOperacional): number {
  const order: Record<StatusOperacional, number> = {
    critico: 0,
    estagnado: 1,
    atencao: 2,
    avancando_bem: 3,
    sem_dados: 4,
  }
  return order[status] ?? 4
}
