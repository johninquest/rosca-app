import { useForm } from 'react-hook-form'
import type { Member } from '../db/dexie-schema'

type ContributionMethod = 'cash' | 'mtn' | 'orange' | 'other'

export interface ContributionFormValues {
  memberId: string
  amount: number
  date: string
  method: ContributionMethod
  notes?: string
}

interface ContributionFormProps {
  members: Member[]
  defaultValues?: Partial<ContributionFormValues>
  submitLabel?: string
  onSubmit: (values: ContributionFormValues) => Promise<void> | void
}

export default function ContributionForm({
  members,
  defaultValues,
  submitLabel = 'Save',
  onSubmit,
}: ContributionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormValues>({
    defaultValues: {
      memberId: defaultValues?.memberId || '',
      amount: defaultValues?.amount,
      date: defaultValues?.date || new Date().toISOString().slice(0, 10),
      method: defaultValues?.method || 'cash',
      notes: defaultValues?.notes || '',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label className="block text-sm text-text-secondary mb-1">Member</label>
        <select
          {...register('memberId', { required: 'Member is required' })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
        >
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {errors.memberId && <p className="text-xs text-red-700 mt-1">{errors.memberId.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Amount (XAF)</label>
        <input
          type="number"
          min={1}
          {...register('amount', {
            required: 'Amount is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Minimum is 1' },
          })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="10000"
        />
        {errors.amount && <p className="text-xs text-red-700 mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Date</label>
        <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2.5 border border-border rounded-lg" />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Method</label>
        <select {...register('method')} className="w-full px-3 py-2.5 border border-border rounded-lg">
          <option value="cash">Cash</option>
          <option value="mtn">MTN</option>
          <option value="orange">Orange</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Notes</label>
        <input
          {...register('notes')}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Optional"
        />
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
