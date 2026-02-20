import { cn } from '../../lib/utils'

const VARIANTS = {
  default:      'bg-surface0/60 text-subtext0 border-surface1/50',
  blue:         'bg-blue/10 text-blue border-blue/20',
  green:        'bg-green/10 text-green border-green/20',
  red:          'bg-red/10 text-red border-red/20',
  yellow:       'bg-yellow/10 text-yellow border-yellow/20',
  peach:        'bg-peach/10 text-peach border-peach/20',
  mauve:        'bg-mauve/10 text-mauve border-mauve/20',
  overlay:      'bg-overlay0/10 text-subtext0 border-overlay0/20',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none',
        VARIANTS[variant] || VARIANTS.default,
        className
      )}
      {...props}
    />
  )
}

const STATUS_MAP = {
  Passed:        { label: 'Réussi',       variant: 'green' },
  Failed:        { label: 'Échoué',       variant: 'red' },
  Blocked:       { label: 'Bloqué',       variant: 'yellow' },
  NotExecuted:   { label: 'Non exécuté',  variant: 'overlay' },
  Inconclusive:  { label: 'Inconclusive', variant: 'peach' },
  NotApplicable: { label: 'N/A',          variant: 'overlay' },
  InProgress:    { label: 'En cours',     variant: 'blue' },
}

export function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, variant: 'default' }
  return <Badge variant={info.variant}>{info.label}</Badge>
}

export function RatePill({ value }) {
  const variant = value >= 80 ? 'green' : value >= 50 ? 'yellow' : 'red'
  return <Badge variant={variant} className="font-mono font-bold">{value}%</Badge>
}
