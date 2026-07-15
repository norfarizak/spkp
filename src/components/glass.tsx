'use client'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function GlassCard({
  children,
  className,
  strong,
  ...props
}: React.ComponentProps<typeof Card> & { strong?: boolean }) {
  return (
    <Card
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'border-white/20 text-white',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
}

export function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('glass-subtle rounded-xl', className)}>{children}</div>
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: any
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-12 h-12 rounded-xl glass-strong flex items-center justify-center">
            <Icon className="w-6 h-6 text-cyan-300" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && <p className="text-sm text-cyan-100/70 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const cls = `badge-${status || 'draft'} text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide inline-block`
  return <span className={cls}>{status || 'draft'}</span>
}

export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="text-center py-12 text-cyan-100/60">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs mt-1 text-cyan-100/40">{hint}</div>}
    </div>
  )
}
