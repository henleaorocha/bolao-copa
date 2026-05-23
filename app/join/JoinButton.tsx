'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface JoinButtonProps {
  leagueId: string
  token: string
}

export function JoinButton({ leagueId, token }: JoinButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/leagues/${leagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle API error
        if (data.code === 'ALREADY_A_MEMBER') {
          setError('Você já é membro desta liga.')
        } else if (data.code === 'INVALID_TOKEN') {
          setError('Token inválido. Verifique o link e tente novamente.')
        } else if (data.code === 'SESSION_EXPIRED') {
          setError('Sua sessão expirou. Por favor, faça login novamente.')
        } else if (data.code === 'LEAGUE_NOT_FOUND') {
          setError('Liga não encontrada.')
        } else {
          setError(data.error || 'Erro ao entrar na liga. Tente novamente.')
        }
        setIsLoading(false)
        return
      }

      // Success: navigate to the league detail page
      router.push(`/ligas/${leagueId}`)
    } catch (err) {
      console.error('[JoinButton] Error:', err)
      setError('Erro ao entrar na liga. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Entrando...' : 'Entrar na Liga'}
      </button>
    </div>
  )
}
