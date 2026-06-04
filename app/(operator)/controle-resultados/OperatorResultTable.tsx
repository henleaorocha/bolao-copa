'use client'

import { useState } from 'react'

export interface OperatorMatch {
  id: string
  home_team: string
  away_team: string
  match_date: string
  phase: string
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  is_manual: boolean
  manual_updated_at: string | null
}

const STATUSES: OperatorMatch['status'][] = ['scheduled', 'live', 'finished']

function MatchRow({ match }: { match: OperatorMatch }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '')
  const [away, setAway] = useState(match.away_score?.toString() ?? '')
  const [status, setStatus] = useState<OperatorMatch['status']>(match.status)
  const [isManual, setIsManual] = useState(match.is_manual)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function send(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setFeedback(json?.error ?? 'Erro ao salvar')
        return
      }
      setIsManual(Boolean(json?.data?.is_manual))
      setFeedback(successMsg)
    } catch {
      setFeedback('Falha de rede')
    } finally {
      setBusy(false)
    }
  }

  function handleSave() {
    void send(
      {
        home_score: Number(home),
        away_score: Number(away),
        status,
      },
      'Resultado salvo (manual)'
    )
  }

  function handleRelease() {
    void send({ release: true }, 'Liberado para automático')
  }

  return (
    <tr data-testid="operator-match-row" className="border-b border-slate-100">
      <td className="px-3 py-2 text-sm text-slate-700">
        {match.home_team} × {match.away_team}
        <span className="ml-2 text-xs uppercase tracking-wide text-slate-400">
          {match.phase}
        </span>
        {isManual && (
          <span
            data-testid="manual-badge"
            className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700"
          >
            manual
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          aria-label="Placar mandante"
          type="number"
          min={0}
          max={99}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          aria-label="Placar visitante"
          type="number"
          min={0}
          max={99}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OperatorMatch['status'])}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={handleSave}
          disabled={busy}
          className="rounded bg-[#244C5A] px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          Salvar
        </button>
        {isManual && (
          <button
            onClick={handleRelease}
            disabled={busy}
            className="ml-2 rounded border border-slate-300 px-3 py-1 text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            Liberar
          </button>
        )}
        {feedback && (
          <span className="ml-2 text-xs text-slate-500">{feedback}</span>
        )}
      </td>
    </tr>
  )
}

export default function OperatorResultTable({
  matches,
}: {
  matches: OperatorMatch[]
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma partida encontrada.</p>
  }

  return (
    <table className="w-full border-collapse" data-testid="operator-result-table">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
          <th className="px-3 py-2">Partida</th>
          <th className="px-3 py-2">Mandante</th>
          <th className="px-3 py-2">Visitante</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Ações</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </tbody>
    </table>
  )
}
