'use client'

// The two editable numeric score inputs + `×` separator, shared by both screens.
// Emits the existing `input-home-<matchId>` / `input-away-<matchId>` test ids and
// calls `onInputChange(matchId, side, value)` exactly as the original cards did.

const SIZE_CLASSES = {
  sm: 'w-9 h-8', //  mobile Palpites / Mata-mata
  md: 'w-10 h-9', // desktop Palpites
} as const

interface ScoreInputsProps {
  matchId: string
  homeInput: string
  awayInput: string
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void
  disabled?: boolean
  homeAriaLabel?: string
  awayAriaLabel?: string
  size?: keyof typeof SIZE_CLASSES
  // Appended to the `input-home-<id>` / `input-away-<id>` test ids. Lets a screen that
  // renders two responsive copies of the same match (e.g. Palpites mobile + desktop)
  // keep both functional without duplicate test ids. Default keeps the bare ids.
  testIdSuffix?: string
}

export default function ScoreInputs({
  matchId,
  homeInput,
  awayInput,
  onInputChange,
  disabled = false,
  homeAriaLabel,
  awayAriaLabel,
  size = 'sm',
  testIdSuffix = '',
}: ScoreInputsProps) {
  const inputClass = `${SIZE_CLASSES[size]} text-center text-sm font-black text-[#244C5A] rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:border-[#0097A9] bg-slate-50`
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        placeholder="–"
        value={homeInput}
        onChange={(e) => onInputChange(matchId, 'home', e.target.value)}
        disabled={disabled}
        className={inputClass}
        aria-label={homeAriaLabel}
        data-testid={`input-home-${matchId}${testIdSuffix}`}
      />
      <span className="text-slate-300 text-xs font-black">×</span>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        placeholder="–"
        value={awayInput}
        onChange={(e) => onInputChange(matchId, 'away', e.target.value)}
        disabled={disabled}
        className={inputClass}
        aria-label={awayAriaLabel}
        data-testid={`input-away-${matchId}${testIdSuffix}`}
      />
    </div>
  )
}
