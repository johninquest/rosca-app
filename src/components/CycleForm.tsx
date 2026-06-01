import { useForm } from 'react-hook-form'
import type { Member } from '../types'
import type { PaymentMethod } from '../types'

export interface CycleFormValues {
  name: string
  amountPerPerson: number
  startDate: string
  memberIds: string[]
  defaultPaymentMethod: PaymentMethod
}

interface CycleFormProps {
  members: Member[]
  defaultValues?: Partial<CycleFormValues>
  submitLabel?: string
  onSubmit: (values: CycleFormValues) => Promise<void> | void
}

export default function CycleForm({
  members,
  defaultValues,
  submitLabel = 'Save',
  onSubmit,
}: CycleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      amountPerPerson: defaultValues?.amountPerPerson,
      startDate: defaultValues?.startDate || new Date().toISOString().slice(0, 10),
      memberIds: defaultValues?.memberIds || [],
      defaultPaymentMethod: defaultValues?.defaultPaymentMethod || 'cash',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label htmlFor="cycle-name" className="block text-sm text-text-secondary mb-1">Cycle name</label>
        <input
          id="cycle-name"
          {...register('name', { required: 'Name is required' })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Family Njangi 2026"
        />
        {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="cycle-amount" className="block text-sm text-text-secondary mb-1">Amount per person (XAF)</label>
        <input
          id="cycle-amount"
          type="number"
          min={1}
          {...register('amountPerPerson', {
            required: 'Amount is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Minimum is 1' },
          })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="5000"
        />
        {errors.amountPerPerson && (
          <p className="text-xs text-red-700 mt-1">{errors.amountPerPerson.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cycle-start-date" className="block text-sm text-text-secondary mb-1">Start date</label>
        <input
          id="cycle-start-date"
          type="date"
          {...register('startDate', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        />
      </div>

      <div>
        <label htmlFor="cycle-default-method" className="block text-sm text-text-secondary mb-1">
          Default payment method
        </label>
        <select
          id="cycle-default-method"
          {...register('defaultPaymentMethod', { required: true })}
          className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_money">Mobile money</option>
        </select>
      </div>

      <fieldset className="border border-border rounded-lg p-3 space-y-2">
        <legend className="text-sm px-1 text-text-secondary">Members</legend>
        {members.map((member) => (
          <label key={member.id} className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" value={member.id} {...register('memberIds', { required: true })} />
            {member.name} ({member.phone})
          </label>
        ))}
        {errors.memberIds && <p className="text-xs text-red-700">Select at least one member</p>}
      </fieldset>

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
