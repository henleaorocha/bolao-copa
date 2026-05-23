'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLeague } from '@/lib/league-context'
import type { LeagueDetail } from '@/lib/api/types'

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
    lg: 'w-20 h-20 text-3xl',
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

function UserAvatar({
  full_name,
  avatar_url,
  avatar_color,
}: {
  full_name: string | null
  avatar_url: string | null
  avatar_color: string
}) {
  if (avatar_url) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={avatar_url}
          alt={full_name || 'User'}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
      style={{ backgroundColor: avatar_color }}
    >
      {(full_name || 'U').charAt(0).toUpperCase()}
    </div>
  )
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

function Toast({ message, type }: Toast) {
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white font-semibold z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`}>
      {message}
    </div>
  )
}

interface ConfigureModalProps {
  isOpen: boolean
  leagueName: string
  accessType: 'open' | 'private'
  onClose: () => void
  onSubmit: (data: { name: string; access_type: 'open' | 'private' }) => Promise<void>
  isLoading?: boolean
}

function ConfigureModal({
  isOpen,
  leagueName,
  accessType,
  onClose,
  onSubmit,
  isLoading = false,
}: ConfigureModalProps) {
  const [name, setName] = useState(leagueName)
  const [type, setType] = useState(accessType)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ name, access_type: type })
    setName(leagueName)
    setType(accessType)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-40">
      <div className="w-full bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Configurações da Liga</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Nome da Liga
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da liga"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
              minLength={2}
              maxLength={50}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-1">2-50 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Tipo de Acesso
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="access_type"
                  value="open"
                  checked={type === 'open'}
                  onChange={() => setType('open')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-slate-900">Aberta</div>
                  <div className="text-xs text-slate-500">Qualquer um com o link pode entrar</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="access_type"
                  value="private"
                  checked={type === 'private'}
                  onChange={() => setType('private')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-slate-900">Privada</div>
                  <div className="text-xs text-slate-500">Apenas com link de convite</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-yellow-400 rounded-xl font-semibold text-slate-900 hover:bg-yellow-500 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  inputLabel?: string
  inputPlaceholder?: string
  confirmValue?: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  isDangerous?: boolean
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  inputLabel,
  inputPlaceholder,
  confirmValue,
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
}: ConfirmDialogProps) {
  const [input, setInput] = useState('')

  if (!isOpen) return null

  const isValid = confirmValue ? input === confirmValue : true

  const handleConfirm = async () => {
    await onConfirm()
    setInput('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-slate-600 mb-4">{message}</p>

        {inputLabel && (
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              {inputLabel}
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={isLoading}
            />
            {confirmValue && (
              <p className="text-xs text-slate-500 mt-1">
                Digite "{confirmValue}" para confirmar
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white disabled:opacity-50 ${
              isDangerous ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500 text-slate-900'
            }`}
          >
            {isLoading ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeagueDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leagueId = params.id as string
  useLeague()

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const meRes = await fetch('/api/auth/me')
        if (!meRes.ok) throw new Error('Failed to get user')
        const meData = await meRes.json()
        setCurrentUserId(meData.data.user.id)

        const res = await fetch(`/api/leagues/${leagueId}`)
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to load league')
        }
        const data = await res.json()
        setLeague(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [leagueId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error || !league || !currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-semibold mb-4">{error || 'Liga não encontrada'}</p>
          <button
            onClick={() => router.push('/ligas')}
            className="px-6 py-3 bg-yellow-400 rounded-xl font-semibold text-slate-900 hover:bg-yellow-500"
          >
            Voltar para Ligas
          </button>
        </div>
      </div>
    )
  }

  const isAdmin = league.created_by === currentUserId
  const accessBadge = league.access_type === 'open' ? 'Aberta' : 'Privada'

  const handleInvite = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/invite-link`)
      if (!res.ok) throw new Error('Failed to get invite link')
      const data = await res.json()

      await navigator.clipboard.writeText(data.data.invite_url)
      setToast({ message: 'Link copiado para a área de transferência!', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao copiar link',
        type: 'error',
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleConfigure = async (data: { name: string; access_type: 'open' | 'private' }) => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update league')
      const resData = await res.json()

      setLeague({
        ...league,
        name: resData.data.name,
        access_type: resData.data.access_type,
      })

      setShowConfigureModal(false)
      setToast({ message: 'Liga atualizada com sucesso!', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao atualizar',
        type: 'error',
      })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/leagues/${leagueId}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to remove member')

      setLeague({
        ...league,
        members: league.members.filter((m) => m.user_id !== userId),
        member_count: league.member_count - 1,
      })

      setShowRemoveConfirm(null)
      setToast({ message: 'Membro removido com sucesso!', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao remover',
        type: 'error',
      })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLeague = async () => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_name: league.name }),
      })

      if (!res.ok) throw new Error('Failed to delete league')

      setShowDeleteConfirm(false)
      setToast({ message: 'Liga excluída com sucesso!', type: 'success' })
      setTimeout(() => router.push('/ligas'), 1000)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao excluir',
        type: 'error',
      })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const memberToRemove = showRemoveConfirm
    ? league.members.find((m) => m.user_id === showRemoveConfirm)
    : null

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/ligas')}
            className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-2"
          >
            ← Voltar
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowConfigureModal(true)}
              className="px-4 py-2 bg-slate-100 rounded-lg font-semibold text-slate-700 hover:bg-slate-200"
            >
              Configurações
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* League Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <InitialAvatar
              name={league.name}
              logo_url={league.logo_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{league.name}</h1>
              {league.description && (
                <p className="text-slate-600 text-sm mb-3">{league.description}</p>
              )}
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  league.access_type === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {accessBadge}
                </span>
                <span className="text-sm text-slate-500">
                  👥 {league.member_count} participante{league.member_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <button
              onClick={handleInvite}
              className="flex-1 px-4 py-3 bg-yellow-400 rounded-xl font-semibold text-slate-900 hover:bg-yellow-500 transition"
            >
              Convidar
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 bg-red-100 rounded-xl font-semibold text-red-600 hover:bg-red-200 transition"
              >
                Excluir Liga
              </button>
            )}
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Membros</h2>
          </div>

          <div className="divide-y divide-slate-200">
            {league.members.map((member) => (
              <div key={member.user_id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserAvatar
                    full_name={member.full_name}
                    avatar_url={member.avatar_url}
                    avatar_color={member.avatar_color}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {member.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.role === 'admin' ? 'Admin' : 'Membro'} · Entrou{' '}
                      {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    member.role === 'admin'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {member.role === 'admin' ? 'Admin' : 'Membro'}
                  </span>

                  {isAdmin && member.user_id !== currentUserId && (
                    <button
                      onClick={() => setShowRemoveConfirm(member.user_id)}
                      className="px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 rounded transition"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ConfigureModal
        isOpen={showConfigureModal}
        leagueName={league.name}
        accessType={league.access_type}
        onClose={() => setShowConfigureModal(false)}
        onSubmit={handleConfigure}
        isLoading={isSaving}
      />

      <ConfirmDialog
        isOpen={showRemoveConfirm !== null}
        title="Remover membro"
        message={`Tem certeza que deseja remover ${memberToRemove?.full_name || 'este membro'}?`}
        onConfirm={() => handleRemoveMember(showRemoveConfirm!)}
        onCancel={() => setShowRemoveConfirm(null)}
        isLoading={isSaving}
        isDangerous
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir liga"
        message={`Digite "${league.name}" para confirmar a exclusão da liga. Esta ação não pode ser desfeita.`}
        inputLabel="Nome da liga"
        inputPlaceholder="Digite o nome da liga"
        confirmValue={league.name}
        onConfirm={handleDeleteLeague}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isSaving}
        isDangerous
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
