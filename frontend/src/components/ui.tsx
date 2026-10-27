// Small styled building blocks shared by the pages. Page-specific styling stays as
// Tailwind utilities in the pages themselves.
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react'

export const linkStyles = 'text-blue-600 hover:underline dark:text-blue-400'

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600',
  secondary:
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
  dangerOutline:
    'border border-red-600/40 text-red-600 hover:bg-red-50 focus-visible:outline-red-600 dark:text-red-400 dark:hover:bg-red-950/40',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-base font-medium shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  )
}

export function TextInput({ className = '', ...props }: ComponentProps<'input'>) {
  // Inside a Field with an error, the input is marked invalid and described by that error.
  const field = useContext(FieldContext)
  return (
    <input
      aria-invalid={field?.error ? true : undefined}
      aria-describedby={field?.error ? field.errorId : undefined}
      className={`block w-full min-w-0 rounded-md border border-zinc-300 bg-white px-4 py-2 text-base shadow-xs placeholder:text-zinc-400 focus:border-blue-500 focus:outline-2 focus:outline-blue-500/30 aria-invalid:border-red-500 aria-invalid:focus:outline-red-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500 ${className}`}
      {...props}
    />
  )
}

const FieldContext = createContext<{ error?: string; errorId: string } | null>(null)

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  const errorId = useId()
  return (
    <FieldContext value={{ error, errorId }}>
      <div className="grid gap-1.5">
        <label className="grid gap-1.5 text-base font-medium">
          {label}
          {children}
        </label>
        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </FieldContext>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </section>
  )
}

const messageTones = {
  error: 'text-red-600 dark:text-red-400',
  success: 'text-green-700 dark:text-green-400',
  info: 'rounded-md bg-blue-50 px-4 py-2 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
}

export function Message({
  tone,
  children,
}: {
  tone: keyof typeof messageTones
  children: ReactNode
}) {
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`text-base ${messageTones[tone]}`}>
      {children}
    </p>
  )
}

/** A modal confirmation built on the native <dialog>: focus trap, Escape and backdrop click cancel. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog?.open) dialog?.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onCancel}
      // Escape fires `cancel`; while busy the action can't be called back, so don't pretend.
      onCancel={(event) => busy && event.preventDefault()}
      // The dialog itself has no padding, so a click whose target is the dialog hit the backdrop.
      onClick={(event) => !busy && event.target === event.currentTarget && onCancel()}
      className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-xl backdrop:bg-zinc-950/50 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-base text-zinc-600 dark:text-zinc-400">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
