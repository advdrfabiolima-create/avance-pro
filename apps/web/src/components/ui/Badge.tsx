import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary text-secondary-foreground border border-border',
        destructive:
          'bg-red-50 text-red-700 border border-red-200',
        outline:
          'border border-border text-foreground bg-transparent',
        success:
          'bg-green-50 text-green-700 border border-green-200',
        warning:
          'bg-amber-50 text-amber-700 border border-amber-200',
        stagnant:
          'bg-orange-50 text-orange-700 border border-orange-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
