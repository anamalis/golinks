// Go Link inputs with their validation rules, shared by the create and edit forms.
import type { ComponentProps } from 'react'
import { DESTINATION_URL_MAX_LENGTH, DESTINATION_URL_PATTERN } from '../links'
import { Field, TextInput } from './ui'

export function DestinationUrlField({
  error,
  ...props
}: ComponentProps<'input'> & { error?: string }) {
  return (
    <Field label="Destination URL" error={error}>
      <TextInput
        required
        type="url"
        pattern={DESTINATION_URL_PATTERN}
        maxLength={DESTINATION_URL_MAX_LENGTH}
        title="Use an http:// or https:// URL."
        {...props}
      />
    </Field>
  )
}
