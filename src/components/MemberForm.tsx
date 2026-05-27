import { useForm } from 'react-hook-form'

export interface MemberFormValues {
  name: string
  phone: string
  joinDate: string
}

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>
  submitLabel?: string
  onSubmit: (values: MemberFormValues) => Promise<void> | void
}

const CM_PHONE_REGEX = /^\+237\d{8,9}$/

export default function MemberForm({
  defaultValues,
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
      phone: defaultValues?.phone || '+237',
      joinDate: defaultValues?.joinDate || new Date().toISOString().slice(0, 10),
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
        <label className="block text-sm text-text-secondary mb-1">Phone (+237)</label>
        <input
          {...register('phone', {
            required: 'Phone is required',
            pattern: {
              value: CM_PHONE_REGEX,
              message: 'Use format +237XXXXXXXXX',
            },
          })}
          className="w-full px-3 py-2.5 border border-border rounded-lg"
          placeholder="+237699000000"
        />
        {errors.phone && <p className="text-xs text-red-700 mt-1">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1">Join date</label>
        <input type="date" {...register('joinDate', { required: true })} className="w-full px-3 py-2.5 border border-border rounded-lg" />
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
