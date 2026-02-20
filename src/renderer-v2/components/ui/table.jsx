import { cn } from '../../lib/utils'

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHead({ className, ...props }) {
  return <thead className={cn('border-b border-surface0', className)} {...props} />
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn('border-b border-surface0/40 transition-colors hover:bg-surface0/25', className)}
      {...props}
    />
  )
}

export function Th({ className, ...props }) {
  return (
    <th
      className={cn('px-3 py-2.5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-overlay1', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }) {
  return <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />
}
