import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { todayISO } from '../utils/format'

/**
 * Modal form for adding or editing a contribution.
 */
export default function ContributionForm({ defaultValues, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: defaultValues ?? { contributorName: '', amount: '', date: todayISO(), note: '' },
  })

  // Re-populate when defaultValues changes (edit mode)
  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E0E0E0]">
          <h2 className="font-semibold text-[#1A1A1A]">
            {defaultValues?.contributorName ? 'Edit Contribution' : 'Add Contribution'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-[#555555] hover:text-[#1A1A1A] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-5 py-4 flex flex-col gap-4">
          {/* Contributor Name */}
          <div>
            <label htmlFor="contributorName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="contributorName"
              type="text"
              placeholder="e.g. Aunt Marie"
              className={`w-full px-3 py-2.5 border rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition ${
                errors.contributorName ? 'border-[#1A1A1A]' : 'border-[#E0E0E0]'
              }`}
              {...register('contributorName', { required: 'Name is required' })}
            />
            {errors.contributorName && (
              <p className="mt-1 text-xs text-[#1A1A1A]">{errors.contributorName.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Amount <span aria-hidden="true">*</span>
            </label>
            <input
              id="amount"
              type="number"
              min="1"
              max="1000000"
              placeholder="e.g. 50000"
              className={`w-full px-3 py-2.5 border rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition ${
                errors.amount ? 'border-[#1A1A1A]' : 'border-[#E0E0E0]'
              }`}
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Minimum is 1' },
                max: { value: 1000000, message: 'Maximum is 1,000,000' },
                valueAsNumber: true,
              })}
            />
            {errors.amount && <p className="mt-1 text-xs text-[#1A1A1A]">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Date <span aria-hidden="true">*</span>
            </label>
            <input
              id="date"
              type="date"
              className={`w-full px-3 py-2.5 border rounded-md text-[#1A1A1A] text-base bg-white outline-none focus:ring-2 focus:ring-[#1A1A1A] transition ${
                errors.date ? 'border-[#1A1A1A]' : 'border-[#E0E0E0]'
              }`}
              {...register('date', { required: 'Date is required' })}
            />
            {errors.date && <p className="mt-1 text-xs text-[#1A1A1A]">{errors.date.message}</p>}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Note <span className="text-[#555555] font-normal">(optional)</span>
            </label>
            <input
              id="note"
              type="text"
              placeholder="e.g. Sent via Orange Money"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('note')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-sm font-medium hover:bg-[#F9F9F9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-[#3A3A3A] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
