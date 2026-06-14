import { useForm } from 'react-hook-form'

export interface CycleMemberFormValues {
  name: string
  phone?: string
  joinDate: string
  contributionAmount: number
}

interface CycleMemberFormProps {
  defaultValues?: Partial<CycleMemberFormValues>
  defaultAmount?: number
  submitLabel?: string
  onSubmit: (values: CycleMemberFormValues) => Promise<void> | void
}

export default function CycleMemberForm({
  defaultValues,
  defaultAmount,
  submitLabel = 'Save',
  onSubmit,
}: CycleMemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CycleMemberFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      phone: defaultValues?.phone || '',
      joinDate: defaultValues?.joinDate || new Date().toISOString().slice(0, 10),
      contributionAmount: defaultValues?.contributionAmount ?? defaultAmount,
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label htmlFor="cm-name" className="block text-sm text-text-secondary mb-1">Name</label>
        <input
          id="cm-name"
          {...register('name', { required: 'Name is required' })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Marie Ngo"
        />
        {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="cm-phone" className="block text-sm text-text-secondary mb-1">Phone (+237) <span className="text-text-secondary font-normal">(optional)</span></label>
        <input
          id="cm-phone"
          {...register('phone')}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="+237699000000"
        />
      </div>

      <div>
        <label htmlFor="cm-amount" className="block text-sm text-text-secondary mb-1">Contribution amount (XAF)</label>
        <input
          id="cm-amount"
          type="number"
          min={1}
          {...register('contributionAmount', {
            required: 'Contribution amount is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Minimum is 1' },
          })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="5000"
        />
        {errors.contributionAmount && (
          <p className="text-xs text-red-700 mt-1">{errors.contributionAmount.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cm-join-date" className="block text-sm text-text-secondary mb-1">Join date</label>
        <input id="cm-join-date" type="date" {...register('joinDate', { required: true })} className="w-full px-3 py-2.5 border border-border rounded-lg" />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg bg-text-primary text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
