import { useForm } from 'react-hook-form'

const CURRENCIES = ['XAF', 'USD', 'EUR']

/**
 * Shared event form used by CreateEventPage and EditEventPage.
 * @param {{ defaultValues?: object, onSubmit: (data: object) => Promise<void>, submitLabel?: string }} props
 */
export default function EventForm({ defaultValues, onSubmit, submitLabel = 'Save' }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          placeholder="e.g. Funeral for Uncle Paul"
          className={`w-full px-3 py-2.5 border rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition ${
            errors.title ? 'border-[#1A1A1A]' : 'border-[#E0E0E0]'
          }`}
          {...register('title', { required: 'Title is required' })}
        />
        {errors.title && <p className="mt-1 text-xs text-[#1A1A1A]">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="Optional details about this collection"
          className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition resize-none"
          {...register('description')}
        />
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          Currency <span aria-hidden="true">*</span>
        </label>
        <select
          id="currency"
          className={`w-full px-3 py-2.5 border rounded-md text-[#1A1A1A] text-base bg-white outline-none focus:ring-2 focus:ring-[#1A1A1A] transition ${
            errors.currency ? 'border-[#1A1A1A]' : 'border-[#E0E0E0]'
          }`}
          {...register('currency', { required: 'Currency is required' })}
        >
          <option value="">Select currency</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.currency && <p className="mt-1 text-xs text-[#1A1A1A]">{errors.currency.message}</p>}
      </div>

      {/* Target Amount */}
      <div>
        <label htmlFor="targetAmount" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          Target Amount <span className="text-[#555555] font-normal">(optional)</span>
        </label>
        <input
          id="targetAmount"
          type="number"
          min="1"
          max="1000000000"
          placeholder="e.g. 500000"
          className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
          {...register('targetAmount', {
            min: { value: 1, message: 'Must be at least 1' },
            valueAsNumber: true,
          })}
        />
        {errors.targetAmount && (
          <p className="mt-1 text-xs text-[#1A1A1A]">{errors.targetAmount.message}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          Deadline <span className="text-[#555555] font-normal">(optional)</span>
        </label>
        <input
          id="deadline"
          type="date"
          className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
          {...register('deadline')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-[#1A1A1A] text-white font-medium rounded-md hover:bg-[#3A3A3A] disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
