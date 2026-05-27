'use client'

interface UnsavedModalProps {
  onSaveAndExit: () => void
  onExitWithoutSaving: () => void
  onDismiss: () => void
  saving?: boolean
}

export default function UnsavedModal({
  onSaveAndExit,
  onExitWithoutSaving,
  onDismiss,
  saving,
}: UnsavedModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="unsaved-modal-overlay"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
        data-testid="unsaved-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-900">Sair sem salvar?</h2>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            data-testid="modal-close-btn"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5">Você tem alterações não salvas no seu palpite.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSaveAndExit}
            disabled={saving}
            className="w-full py-3 rounded-xl font-black text-sm bg-[#244C5A] text-white disabled:opacity-60"
            data-testid="save-and-exit-btn"
          >
            {saving ? 'Salvando...' : 'Salvar e sair'}
          </button>
          <button
            onClick={onExitWithoutSaving}
            className="w-full py-3 rounded-xl font-black text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
            data-testid="exit-without-saving-btn"
          >
            Sair sem salvar
          </button>
        </div>
      </div>
    </div>
  )
}
