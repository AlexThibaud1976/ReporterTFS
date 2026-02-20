import { cn } from '../../lib/utils'

export function Progress({ value = 0, className }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 80 ? 'bg-green' : pct >= 50 ? 'bg-yellow' : 'bg-red'
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-surface0', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
