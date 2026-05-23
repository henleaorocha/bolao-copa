'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLeague } from '@/lib/league-context'
import type { LeagueSummary } from '@/lib/api/types'

const DESIGN_COLORS = ['#FFC72C', '#0097A9', '#244C5A', '#7E4FE3', '#16A34A', '#FB923C']

function getColorForLeague(name: string): string {
  const charCode = name.charCodeAt(0) || 0
  return DESIGN_COLORS[charCode % DESIGN_COLORS.length]
}

function InitialAvatar({
  name,
  logo_url,
  size = 'md',
}: {
  name: string
  logo_url: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }

  const bgColor = getColorForLeague(name)

  if (logo_url) {
    return (
      <div className={`${sizeClasses[size]} rounded-2xl overflow-hidden flex-shrink-0`}>
        <img
          src={logo_url}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: bgColor }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function LeagueCard({
  league,
  onClick,
}: {
  league: LeagueSummary
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-[28px] p-6 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-slate-100 group"
    >
      <div className="flex items-start gap-4 mb-4">
        <InitialAvatar
          name={league.name}
          logo_url={league.logo_url}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold leading-tight text-slate-900 truncate">
            {league.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {league.role === 'admin' ? 'Admin' : 'Membro'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>👥 {league.member_count} participante{league.member_count !== 1 ? 's' : ''}</span>
      </div>
    </button>
  )
}

function CreateLeagueModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; access_type: string; description: string }) => Promise<void>
  isLoading: boolean
}) {
  const [name, setName] = useState('')
  const [accessType, setAccessType] = useState('private')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (name.length < 2) {
      newErrors.name = 'Nome deve ter no mínimo 2 caracteres'
    }
    if (name.length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres'
    }
    if (description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        access_type: accessType,
        description: description.trim(),
      })
      setName('')
      setAccessType('private')
      setDescription('')
      setErrors({})
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Criar nova liga</h2>
          <p className="text-sm text-slate-500">Personalize sua liga e comece a jogar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Nome da liga *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) {
                  setErrors({ ...errors, name: '' })
                }
              }}
              placeholder="Ex: Bolão da Família"
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {name.length}/50 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Tipo de acesso
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccessType('private')}
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-all ${
                  accessType === 'private'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Privada
              </button>
              <button
                type="button"
                onClick={() => setAccessType('open')}
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-all ${
                  accessType === 'open'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Aberta
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {accessType === 'private'
                ? 'Pessoas precisam de convite para entrar'
                : 'Qualquer um pode descobrir e entrar'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) {
                  setErrors({ ...errors, description: '' })
                }
              }}
              placeholder="Descreva sua liga..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {description.length}/200 caracteres
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="flex-1 px-4 py-3 rounded-2xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || name.length < 2}
              className="flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function JoinConfirmationDialog({
  league,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: {
  league: LeagueSummary | null
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  if (!isOpen || !league) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Entrar na liga</h2>
          <p className="text-sm text-slate-500">Deseja entrar em &quot;{league.name}&quot;?</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <InitialAvatar
              name={league.name}
              logo_url={league.logo_url}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{league.name}</p>
              <p className="text-xs text-slate-500">👥 {league.member_count} participantes</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LigasPage() {
  const router = useRouter()
  const { setLeague } = useLeague()
  const [activeTab, setActiveTab] = useState<'myLeagues' | 'discover'>('myLeagues')
  const [myLeagues, setMyLeagues] = useState<LeagueSummary[]>([])
  const [discoverLeagues, setDiscoverLeagues] = useState<LeagueSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLeagueForJoin, setSelectedLeagueForJoin] = useState<LeagueSummary | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadLeagues()
  }, [])

  async function loadLeagues() {
    setIsLoading(true)
    try {
      const [myRes, discoverRes] = await Promise.all([
        fetch('/api/leagues'),
        fetch('/api/leagues/discover'),
      ])

      if (!myRes.ok || !discoverRes.ok) {
        console.error('Failed to load leagues')
        return
      }

      const myData = await myRes.json()
      const discoverData = await discoverRes.json()

      setMyLeagues(myData.data || [])
      setDiscoverLeagues(discoverData.data || [])
    } catch (error) {
      console.error('Error loading leagues:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateLeague(data: {
    name: string
    access_type: string
    description: string
  }) {
    setIsCreating(true)
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('Failed to create league:', error)
        return
      }

      const response = await res.json()
      const newLeague = response.data as LeagueSummary

      setMyLeagues((prev) => [newLeague, ...prev])
      setLeague(newLeague)

      if (discoverLeagues.some((l) => l.id === newLeague.id)) {
        setDiscoverLeagues((prev) => prev.filter((l) => l.id !== newLeague.id))
      }
    } catch (error) {
      console.error('Error creating league:', error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleJoinLeague() {
    if (!selectedLeagueForJoin) return

    setIsJoining(true)
    try {
      const res = await fetch(`/api/leagues/${selectedLeagueForJoin.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('Failed to join league:', error)
        return
      }

      const response = await res.json()
      const joinedLeague = response.data as LeagueSummary

      setMyLeagues((prev) => [joinedLeague, ...prev])
      setDiscoverLeagues((prev) => prev.filter((l) => l.id !== selectedLeagueForJoin.id))
      setLeague(joinedLeague)
      setSelectedLeagueForJoin(null)
    } catch (error) {
      console.error('Error joining league:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeagueCardClick = (selectedLeague: LeagueSummary) => {
    router.push(`/ligas/${selectedLeague.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Minhas ligas</h1>
            <p className="text-sm text-slate-500 mt-1">
              Escolha uma liga ou crie uma nova
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('myLeagues')}
              className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'myLeagues'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Minhas Ligas
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'discover'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Descobrir
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Carregando ligas...</div>
        ) : activeTab === 'myLeagues' ? (
          <>
            {myLeagues.length === 0 ? (
              /* Empty state */
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
                  <span className="text-2xl">⚽</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Você ainda não entrou em nenhuma liga
                </h2>
                <p className="text-slate-500 mb-6">
                  Crie sua primeira liga ou descobra ligas públicas
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all"
                >
                  ✨ Criar sua primeira liga
                </button>
              </div>
            ) : (
              /* Leagues grid */
              <div className="space-y-3 mb-6">
                {myLeagues.map((l) => (
                  <LeagueCard
                    key={l.id}
                    league={l}
                    onClick={() => handleLeagueCardClick(l)}
                  />
                ))}
              </div>
            )}

            {/* Create button */}
            {myLeagues.length > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-2xl text-blue-600 font-semibold hover:bg-blue-50 transition-all"
              >
                + Criar nova liga
              </button>
            )}
          </>
        ) : (
          /* Discover tab */
          <>
            {discoverLeagues.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                Nenhuma liga disponível para descobrir no momento
              </div>
            ) : (
              <div className="space-y-3">
                {discoverLeagues.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeagueForJoin(l)}
                    className="w-full bg-white rounded-[28px] p-6 text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-slate-100"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <InitialAvatar
                        name={l.name}
                        logo_url={l.logo_url}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold leading-tight text-slate-900 truncate">
                          {l.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          👥 {l.member_count} participantes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        {l.access_type === 'open' ? 'Aberta' : 'Privada'}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">Entrar →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateLeagueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateLeague}
        isLoading={isCreating}
      />

      <JoinConfirmationDialog
        league={selectedLeagueForJoin}
        isOpen={!!selectedLeagueForJoin}
        isLoading={isJoining}
        onConfirm={handleJoinLeague}
        onCancel={() => setSelectedLeagueForJoin(null)}
      />
    </div>
  )
}
