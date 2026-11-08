import React from 'react'

export default function ForceDeleteConfirm({ open, onConfirm, onCancel, entity }: {
  open: boolean; onConfirm: (reason: string) => void; onCancel: () => void; entity: string
}) {
  const [reason, setReason] = React.useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-lg font-bold mb-2">Force delete {entity}</h2>
        <p className="text-sm text-gray-600 mb-4">This is permanent. Documents and payment cases will be preserved.</p>
        <textarea className="w-full border p-2 rounded mb-4" rows={3} placeholder="Provide reason..." value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={() => { if (reason.length >= 3) onConfirm(reason); }} className="px-3 py-1 bg-red-600 text-white rounded">Delete permanently</button>
        </div>
      </div>
    </div>
  )
}
