import { useForm } from 'react-hook-form'
import type { Cycle } from '../types'

export interface MemberFormValues {
  name: string
  phone?: string
  joinDate: string
  cycleId?: string
}

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>
  cycles?: Cycle[]
  submitLabel?: string
  onSubmit: (values: MemberFormValues) => Promise<void> | void
}

export default function MemberForm({
  defaultValues,
  cycles,
  submitLabel = 'Save',
  onSubmit,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    defaultValues: {
      name: defaultValues?.name || '',
      phone: defaultValues?.phone || '',
      joinDate: defaultValues?.joinDate || new Date().toISOString().slice(0, 10),
      cycleId: defaultValues?.cycleId || '',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => Promise.resolve(onSubmit(values)))} className="space-y-3">
      <div>
        <label className="block text-sm text-text-secondary mb-1">Name</label>
        <input
          {...register('name', { required: 'Name is required' })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="Marie Ngo"
        />
        {errors.name && <p className="text-xs text-red-700 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Phone (+237) <span className="text-text-secondary font-normal">(optional)</span></label>
        <input
          {...register('phone')}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="+237699000000"
        />
        {errors.phone && <p className="text-xs text-red-700 mt-1">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Join date</label>
        <input type="date" {...register('joinDate', { required: true })} className="w-full px-3 py-2.5 border border-border rounded-lg" />
      </div>

      {cycles && cycles.length > 0 && (
        <div>
          <label className="block text-sm text-text-secondary mb-1">Assign to a Njangi (optional)</label>
          <select
            {...register('cycleId')}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-white"
          >
            <option value="">Not assigned</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
