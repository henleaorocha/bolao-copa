export default function StatusBanner() {
  return (
    <div
      role="status"
      data-testid="status-banner"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6"
    >
      <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <p className="text-sm text-amber-800 leading-snug" data-testid="status-banner-text">
        Mata-mata começa em 28 de junho — Os confrontos são definidos após a fase de grupos. Você poderá palpitar conforme cada fase libera.
      </p>
    </div>
  )
}
