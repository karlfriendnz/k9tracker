import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 text-sm',
        {
          'bg-blue-50 text-blue-800': variant === 'info',
          'bg-green-50 text-green-800': variant === 'success',
          'bg-amber-50 text-amber-800': variant === 'warning',
          'bg-red-50 text-red-800': variant === 'error',
        },
        className
      )}
    >
      {children}
    </div>
  )
}
