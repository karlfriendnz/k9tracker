import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-100 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('px-6 pb-6', className)} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardBody }
