import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-40 focus:outline-none',
  {
    variants: {
      variant: {
        default:   'bg-blue text-crust hover:bg-blue/85 shadow-sm',
        secondary: 'bg-surface0 text-text hover:bg-surface1',
        outline:   'border border-surface1 bg-transparent text-text hover:bg-surface0 hover:border-surface2',
        ghost:     'hover:bg-surface0 text-subtext0 hover:text-text',
        danger:    'bg-red/10 text-red border border-red/25 hover:bg-red/20',
        success:   'bg-green/10 text-green border border-green/25 hover:bg-green/20',
      },
      size: {
        default: 'h-9 px-4',
        sm:      'h-7 px-3 text-xs',
        lg:      'h-10 px-5 text-base',
        icon:    'h-8 w-8',
        'icon-sm': 'h-6 w-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(variants({ variant, size }), className)} {...props} />
}
