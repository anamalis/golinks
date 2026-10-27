// Inline validation and the submit cycle shared by every form. Forms use `noValidate`, so
// the browser runs its constraint checks (required, type="url", pattern) without showing
// its own bubbles; `useForm` turns the results into per-field messages, and server 422s
// land on the same fields (see ApiError).
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ApiError } from './api/client'

/** Messages keyed by input `name`, which matches the API's field names. */
export type FieldErrors = Partial<Record<string, string>>

function describe(input: HTMLInputElement): string {
  const { validity } = input
  if (validity.valueMissing) return 'Required.'
  if (validity.typeMismatch && input.type === 'url') {
    return 'Enter a full URL, like https://example.com.'
  }
  // Each input's `title` doubles as the explanation of its pattern.
  if (validity.patternMismatch && input.title) return input.title
  return input.validationMessage
}

/** Client-side errors for every invalid input in the form; focuses the first one. */
function checkFields(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {}
  let first: HTMLInputElement | null = null
  for (const element of form.elements) {
    if (!(element instanceof HTMLInputElement) || !element.name || element.validity.valid) continue
    errors[element.name] = describe(element)
    first ??= element
  }
  first?.focus()
  return errors
}

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0

type Values = Record<string, string>

/**
 * One form's whole cycle: values, client checks, submit, server errors under their fields,
 * and a fresh form after each save.
 *
 * Render `<form key={form.key} {...form.props}>`. The key changes on every save and reset,
 * remounting the inputs so no stale validity state (or red border) survives.
 */
export function useForm<V extends Values, R>({
  initialValues,
  submit,
  valuesAfterSave,
  onSaved,
  describeError = (error) => (error as Error).message,
}: {
  initialValues: V
  submit: (values: V) => Promise<R>
  /** What the inputs hold after a successful save. */
  valuesAfterSave: (result: R) => V
  onSaved?: (result: R) => void
  /** The message for a failure that isn't about a field (field errors are handled here). */
  describeError?: (error: unknown, values: V) => ReactNode
}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<ReactNode>(null)
  const [submitting, setSubmitting] = useState(false)
  const [key, setKey] = useState(0)

  /** Start over with `next`: clears every error and remounts the inputs. */
  const reset = (next: V) => {
    setValues(next)
    setErrors({})
    setError(null)
    setKey((current) => current + 1)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const clientErrors = checkFields(event.currentTarget)
    setErrors(clientErrors)
    if (hasErrors(clientErrors)) return
    setSubmitting(true)
    try {
      const result = await submit(values)
      reset(valuesAfterSave(result))
      onSaved?.(result)
    } catch (caught) {
      if (caught instanceof ApiError && hasErrors(caught.fieldErrors)) {
        setErrors(caught.fieldErrors)
      } else {
        setError(describeError(caught, values))
      }
    } finally {
      setSubmitting(false)
    }
  }

  /** Props for the input bound to `name` (show `errors[name]` with it); editing clears it. */
  const input = (name: keyof V & string) => ({
    name,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [name]: event.target.value }))
      setErrors((current) => {
        const next = { ...current }
        delete next[name]
        return next
      })
    },
  })

  return {
    key,
    props: { noValidate: true, onSubmit },
    input,
    values,
    errors,
    error,
    submitting,
    reset,
  }
}
