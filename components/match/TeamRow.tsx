'use client'

import Image from 'next/image'
import { useState } from 'react'

// Shared flag + team/label row. Reuses the existing flagcdn `<Image>` pattern with a
// gray fallback box (missing code or load error), and supports a placeholder rendering
// (italic slate text + lighter empty flag box) for unconfirmed bracket slots.

function Flag({ name, code, size }: { name: string; code: string | null; size: number }) {
  const [imgError, setImgError] = useState(false)
  if (!code || imgError) {
    return (
      <div
        className="rounded bg-slate-200 shrink-0"
        style={{ width: size, height: Math.round(size * 0.75) }}
        aria-hidden="true"
      />
    )
  }
  return (
    <Image
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded object-cover shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

interface TeamRowProps {
  // Display text: a team name, or a placeholder label ("Vencedor de …").
  name: string
  flag?: string | null
  // Placeholder slot with no confirmed matchup: italic slate name, empty flag box.
  placeholder?: boolean
  size?: number
  nameTestId?: string
}

export default function TeamRow({
  name,
  flag = null,
  placeholder = false,
  size = 28,
  nameTestId,
}: TeamRowProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {placeholder ? (
        <div
          className="rounded bg-slate-100 shrink-0"
          style={{ width: size, height: Math.round(size * 0.75) }}
          aria-hidden="true"
        />
      ) : (
        <Flag name={name} code={flag} size={size} />
      )}
      <span
        className={[
          'text-sm font-bold truncate min-w-0',
          placeholder ? 'text-slate-400 italic' : 'text-[#244C5A]',
        ].join(' ')}
        {...(nameTestId ? { 'data-testid': nameTestId } : {})}
      >
        {name}
      </span>
    </div>
  )
}
