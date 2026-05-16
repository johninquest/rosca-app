import { useForm } from 'react-hook-form'

const CURRENCIES = ['XAF', 'USD', 'EUR']

const PAYMENT_METHODS = [
  { value: '', label: 'None' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'paypal', label: 'PayPal / International' },
]

/**
 * Shared event form used by CreateEventPage and EditEventPage.
 * @param {{ defaultValues?: object, onSubmit: (data: object) => Promise<void>, submitLabel?: string }} props
 */
export default function EventForm({ defaultValues, onSubmit, submitLabel = 'Save' }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues })

  const paymentMethod = watch('paymentMethod', '')

  function internalOnSubmit(data) {
    const {
      paymentMethod: method,
      pm_momoName, pm_momoNumber,
      pm_bankAccountName, pm_bankAccountNumber, pm_bankName,
      pm_cashInstructions,
      pm_paypalLink, pm_paypalInstructions,
      ...rest
    } = data

    let paymentDetails = null
    if (method === 'mobile_money') {
      paymentDetails = { name: pm_momoName?.trim() || '', number: pm_momoNumber?.trim() || '' }
    } else if (method === 'bank_transfer') {
      paymentDetails = {
        accountName: pm_bankAccountName?.trim() || '',
        accountNumber: pm_bankAccountNumber?.trim() || '',
        bankName: pm_bankName?.trim() || '',
      }
    } else if (method === 'cash') {
      paymentDetails = { instructions: pm_cashInstructions?.trim() || '' }
    } else if (method === 'paypal') {
      paymentDetails = {
        link: pm_paypalLink?.trim() || '',
        instructions: pm_paypalInstructions?.trim() || '',
      }
    }

    return onSubmit({ ...rest, paymentMethod: method || null, paymentDetails })
  }

  return (
    <form onSubmit={handleSubmit(internalOnSubmit)} noValidate className="flex flex-col gap-5">
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

      {/* How to Contribute */}
      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-[#1A1A1A] mb-1">
          How to Contribute <span className="text-[#555555] font-normal">(optional)</span>
        </label>
        <select
          id="paymentMethod"
          className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
          {...register('paymentMethod')}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Mobile Money fields */}
      {paymentMethod === 'mobile_money' && (
        <div className="flex flex-col gap-4 pl-3 border-l-2 border-[#E0E0E0]">
          <div>
            <label htmlFor="pm_momoName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Recipient Name
            </label>
            <input
              id="pm_momoName"
              type="text"
              placeholder="e.g. Marie Ngo"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_momoName')}
            />
          </div>
          <div>
            <label htmlFor="pm_momoNumber" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Phone Number
            </label>
            <input
              id="pm_momoNumber"
              type="tel"
              placeholder="e.g. +237 6XX XXX XXX"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_momoNumber')}
            />
          </div>
        </div>
      )}

      {/* Bank Transfer fields */}
      {paymentMethod === 'bank_transfer' && (
        <div className="flex flex-col gap-4 pl-3 border-l-2 border-[#E0E0E0]">
          <div>
            <label htmlFor="pm_bankName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Bank Name
            </label>
            <input
              id="pm_bankName"
              type="text"
              placeholder="e.g. Afriland First Bank"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_bankName')}
            />
          </div>
          <div>
            <label htmlFor="pm_bankAccountName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Account Name
            </label>
            <input
              id="pm_bankAccountName"
              type="text"
              placeholder="e.g. Paul Essomba"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_bankAccountName')}
            />
          </div>
          <div>
            <label htmlFor="pm_bankAccountNumber" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Account Number
            </label>
            <input
              id="pm_bankAccountNumber"
              type="text"
              placeholder="e.g. 001234567890"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_bankAccountNumber')}
            />
          </div>
        </div>
      )}

      {/* Cash fields */}
      {paymentMethod === 'cash' && (
        <div className="pl-3 border-l-2 border-[#E0E0E0]">
          <label htmlFor="pm_cashInstructions" className="block text-sm font-medium text-[#1A1A1A] mb-1">
            Instructions
          </label>
          <textarea
            id="pm_cashInstructions"
            rows={3}
            placeholder="e.g. Contact Jean-Pierre at 677 000 000 to hand over cash"
            className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition resize-none"
            {...register('pm_cashInstructions')}
          />
        </div>
      )}

      {/* PayPal / International fields */}
      {paymentMethod === 'paypal' && (
        <div className="flex flex-col gap-4 pl-3 border-l-2 border-[#E0E0E0]">
          <div>
            <label htmlFor="pm_paypalLink" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Email or Payment Link
            </label>
            <input
              id="pm_paypalLink"
              type="text"
              placeholder="e.g. paypal.me/yourname or email@example.com"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition"
              {...register('pm_paypalLink')}
            />
          </div>
          <div>
            <label htmlFor="pm_paypalInstructions" className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Instructions <span className="text-[#555555] font-normal">(optional)</span>
            </label>
            <textarea
              id="pm_paypalInstructions"
              rows={2}
              placeholder="e.g. Add your name in the payment note"
              className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-[#1A1A1A] text-base bg-white placeholder-[#555555]/50 outline-none focus:ring-2 focus:ring-[#1A1A1A] transition resize-none"
              {...register('pm_paypalInstructions')}
            />
          </div>
        </div>
      )}

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
