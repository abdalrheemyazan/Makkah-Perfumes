'use client';

import { useId } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

/** Admin form primitives. All labels and messages are Hebrew. */

export function FormAlert({
  status,
  messageHe,
}: {
  status: 'idle' | 'success' | 'error';
  messageHe: string;
}) {
  if (status === 'idle' || !messageHe) return null;
  return (
    <p
      role="alert"
      className={cn(
        'rounded-sm border p-3 text-sm',
        status === 'success'
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-danger/40 bg-danger/10 text-danger',
      )}
    >
      {messageHe}
    </p>
  );
}

const CONTROL =
  'mt-1.5 w-full rounded-sm border border-gold/25 bg-ink px-3 py-2.5 text-sm text-ivory ' +
  'placeholder:text-faint focus:border-gold focus:outline-none aria-[invalid=true]:border-danger';

export function TextField({
  name,
  labelHe,
  error,
  hintHe,
  className,
  ...props
}: {
  name: string;
  labelHe: string;
  error?: string;
  hintHe?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
        {props.required && (
          <span className="ms-1 text-gold" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hintHe && hintId) || undefined}
        className={CONTROL}
        {...props}
      />
      {hintHe && (
        <p id={hintId} className="mt-1 text-xs text-faint">
          {hintHe}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  name,
  labelHe,
  error,
  hintHe,
  rows = 4,
  className,
  ...props
}: {
  name: string;
  labelHe: string;
  error?: string;
  hintHe?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(CONTROL, 'resize-y leading-relaxed')}
        {...props}
      />
      {hintHe && <p className="mt-1 text-xs text-faint">{hintHe}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  name,
  labelHe,
  options,
  error,
  hintHe,
  className,
  ...props
}: {
  name: string;
  labelHe: string;
  options: { value: string; labelHe: string }[];
  error?: string;
  hintHe?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm text-cream">
        {labelHe}
      </label>
      <select id={id} name={name} className={CONTROL} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.labelHe}
          </option>
        ))}
      </select>
      {hintHe && <p className="mt-1 text-xs text-faint">{hintHe}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckboxField({
  name,
  labelHe,
  hintHe,
  defaultChecked,
}: {
  name: string;
  labelHe: string;
  hintHe?: string;
  defaultChecked?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
      />
      <label htmlFor={id} className="text-sm text-cream">
        {labelHe}
        {hintHe && <span className="mt-0.5 block text-xs text-faint">{hintHe}</span>}
      </label>
    </div>
  );
}

/** Multi-select rendered as checkboxes — easier to use than a native multiple. */
export function CheckboxGroup({
  name,
  legendHe,
  options,
  selected,
}: {
  name: string;
  legendHe: string;
  options: { value: string; labelHe: string }[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm text-cream">{legendHe}</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-cream/85">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="h-4 w-4 accent-[var(--color-gold)]"
            />
            {option.labelHe}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SubmitButton({
  labelHe,
  pendingLabelHe,
  variant = 'primary',
  className,
  confirmHe,
}: {
  labelHe: string;
  pendingLabelHe?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  /** When set, the browser asks for confirmation before submitting. */
  confirmHe?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={
        confirmHe
          ? (event) => {
              if (!window.confirm(confirmHe)) event.preventDefault();
            }
          : undefined
      }
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors disabled:opacity-55',
        variant === 'primary' && 'bg-gold text-ink hover:bg-cream',
        variant === 'secondary' && 'border border-gold/40 text-cream hover:border-gold',
        variant === 'danger' && 'border border-danger/50 text-danger hover:bg-danger/10',
        className,
      )}
    >
      {pending ? (pendingLabelHe ?? 'שומר…') : labelHe}
    </button>
  );
}

export function FieldGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {children}
    </div>
  );
}
