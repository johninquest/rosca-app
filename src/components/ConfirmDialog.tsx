interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">{title}</h2>
        {message && <p className="text-text-secondary text-sm mb-6 whitespace-pre-line">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-primary border border-border rounded-md hover:bg-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              danger
                ? 'bg-text-primary text-white hover:bg-ink-mid'
                : 'bg-text-primary text-white hover:bg-ink-mid'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
