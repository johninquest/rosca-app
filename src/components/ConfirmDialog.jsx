/**
 * Reusable confirmation dialog.
 * Usage: <ConfirmDialog open={...} title="..." message="..." onConfirm={...} onCancel={...} danger />
 */
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">{title}</h2>
        {message && <p className="text-[#555555] text-sm mb-6">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#1A1A1A] border border-[#E0E0E0] rounded-md hover:bg-[#F9F9F9] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              danger
                ? 'bg-[#1A1A1A] text-white hover:bg-[#3A3A3A]'
                : 'bg-[#1A1A1A] text-white hover:bg-[#3A3A3A]'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
