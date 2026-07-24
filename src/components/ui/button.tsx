import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gold text-ink hover:bg-cream focus-visible:bg-cream border border-transparent',
  secondary:
    'border border-gold/45 text-cream hover:border-gold hover:text-ivory bg-transparent',
  ghost: 'border border-transparent text-cream hover:text-ivory hover:bg-stone/60',
  danger: 'bg-danger text-ivory hover:bg-danger/85 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium tracking-wide ' +
  // Transition colours only: the button must never move out from under the pointer.
  'transition-colors duration-200 ease-[var(--ease-editorial)] ' +
  'disabled:pointer-events-none disabled:opacity-45 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-45';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href,
  ...props
}: BaseProps & { href: string } & Omit<
    React.ComponentPropsWithoutRef<typeof Link>,
    'href' | 'className'
  >) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
