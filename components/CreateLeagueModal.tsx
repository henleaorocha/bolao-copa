'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Lock, Award, X } from 'lucide-react'

// 2.1 — state variables
interface FormState {
  name: string
  access: 'open' | 'private'
  hasPrize: boolean
  prize: string
}

const INITIAL_FORM: FormState = {
  name: '',
  access: 'private',
  hasPrize: false,
  prize: '',
}

export default function CreateLeagueModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  function openModal() {
    setForm(INITIAL_FORM)
    setError(null)
    setNameError(null)
    setIsOpen(true)
  }

  function closeModal() {
    if (loading) return
    setIsOpen(false)
    setForm(INITIAL_FORM)
    setError(null)
    setNameError(null)
  }

  // 2.4 — client-side validation + 2.5 — form submission
  async function handleSubmit() {
    if (!form.name || form.name.trim().length < 2) {
      setNameError('O nome da liga deve ter pelo menos 2 caracteres.')
      return
    }
    setNameError(null)
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          access_type: form.access,
          prize_pool: form.hasPrize ? form.prize : null,
        }),
      })

      if (res.status === 201) {
        const json = await res.json()
        router.push(`/ligas/${json.data.id}`)
        return
      }

      const json = await res.json().catch(() => null)
      setError(json?.error ?? 'Erro ao criar liga. Tente novamente.')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 2.2 — dashed trigger card, full-card click target */}
      <button
        data-testid="create-league-card"
        onClick={openModal}
        className="rounded-[28px] p-6 border-2 border-dashed flex flex-col items-center justify-center min-h-[200px] w-full transition-all duration-200 hover:scale-[1.02]"
        style={{ borderColor: 'rgba(0,151,169,0.25)', background: 'rgba(0,151,169,0.03)' }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-[#0097A9] text-white">
          <Plus size={28} strokeWidth={3} />
        </div>
        <h3 className="text-base font-black text-[#244C5A]">Criar nova liga</h3>
        <p className="text-xs text-slate-500 mt-1 text-center">Convide amigos de fora também</p>
      </button>

      {/* 2.3 — modal overlay */}
      {isOpen && (
        <div
          data-testid="modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: 'rgba(36,76,90,0.8)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[36px] shadow-2xl max-w-md w-full overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-[#244C5A]">Nova Liga</h3>
                <p className="text-xs text-slate-500">Configure sua liga para começar</p>
              </div>
              <button
                onClick={closeModal}
                aria-label="Fechar"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Error toast */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Name input */}
              <div>
                <label
                  htmlFor="league-name"
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5"
                >
                  Nome da liga
                </label>
                <input
                  id="league-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }))
                    if (nameError) setNameError(null)
                  }}
                  placeholder="ex.: Liga da TI"
                  maxLength={50}
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-[#0097A9] focus:outline-none transition font-bold text-sm text-[#244C5A]"
                />
                {nameError && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {nameError}
                  </p>
                )}
              </div>

              {/* Access type selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                  Acesso à liga
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForm((f) => ({ ...f, access: 'open' }))}
                    aria-pressed={form.access === 'open'}
                    className="p-4 rounded-2xl border-2 text-left transition"
                    style={
                      form.access === 'open'
                        ? { background: 'rgba(0,151,169,0.08)', borderColor: '#0097A9' }
                        : { background: '#F8FAFC', borderColor: 'transparent' }
                    }
                  >
                    <Users
                      size={16}
                      style={{ color: form.access === 'open' ? '#0097A9' : '#94a3b8' }}
                    />
                    <div className="text-sm font-black mt-1.5 text-[#244C5A]">Aberta</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Qualquer um pode encontrar e entrar
                    </div>
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, access: 'private' }))}
                    aria-pressed={form.access === 'private'}
                    className="p-4 rounded-2xl border-2 text-left transition"
                    style={
                      form.access === 'private'
                        ? { background: 'rgba(0,151,169,0.08)', borderColor: '#0097A9' }
                        : { background: '#F8FAFC', borderColor: 'transparent' }
                    }
                  >
                    <Lock
                      size={16}
                      style={{ color: form.access === 'private' ? '#0097A9' : '#94a3b8' }}
                    />
                    <div className="text-sm font-black mt-1.5 text-[#244C5A]">Privada</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Só entra quem tem o link de convite
                    </div>
                  </button>
                </div>
              </div>

              {/* Prize section */}
              <div>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasPrize}
                    onChange={(e) => setForm((f) => ({ ...f, hasPrize: e.target.checked }))}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: '#0097A9' }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold flex items-center gap-2 text-[#244C5A]">
                      <Award size={14} style={{ color: '#FFC72C' }} />
                      Tem prêmio para os campeões?
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Descreva o que está em jogo (rola incentivo extra 😏)
                    </div>
                  </div>
                </label>
                {form.hasPrize && (
                  <textarea
                    value={form.prize}
                    onChange={(e) => setForm((f) => ({ ...f, prize: e.target.value }))}
                    placeholder="ex.: 1º — Almoço pago pela equipe · 2º — Caneca personalizada · 3º — Mousepad"
                    rows={3}
                    maxLength={300}
                    className="w-full mt-2 p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-[#0097A9] focus:outline-none transition text-sm resize-none text-[#244C5A]"
                  />
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 pt-2 flex gap-3 border-t border-slate-100 shrink-0">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:scale-100"
                style={{ background: '#FFC72C', color: '#244C5A' }}
              >
                {loading ? 'Criando...' : 'Criar liga'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
