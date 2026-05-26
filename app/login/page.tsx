'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const NAME_TO_EMAIL: Record<string, string> = {
  bia: 'annybeatrizjpg@gmail.com',
  samuel: 'samuel@timeclock.interno',
  zion: 'zion@timeclock.interno',
  klenio: 'klenio@timeclock.interno',
  thiago: 'thiago@timeclock.interno',
  malu: 'malu@timeclock.interno',
  mariaclara: 'maria@timeclock.interno',
}

export default function LoginPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')

    const firstName = name.trim().toLowerCase().split(/\s+/)[0] || ''
    const resolvedEmail = firstName.includes('@') ? firstName : NAME_TO_EMAIL[firstName]

    if (!resolvedEmail) {
      setError('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password })
    if (authError) {
      setError('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Marca */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#E8FF47] rounded-sm flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="#09090b"/>
                <rect x="9" y="1" width="6" height="6" fill="#09090b"/>
                <rect x="1" y="9" width="6" height="6" fill="#09090b"/>
                <rect x="9" y="9" width="6" height="2" fill="#09090b"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">TimeClock</span>
          </div>
          <p className="text-zinc-500 text-sm mono">Grupo Quatro5 — Controle de horas</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 mono uppercase tracking-wider">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Seu nome"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8FF47] transition-colors mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 mono uppercase tracking-wider">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#E8FF47] transition-colors mono"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs mono bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !name || !password}
            className="w-full bg-[#E8FF47] text-zinc-950 font-bold py-3 rounded-lg text-sm hover:bg-[#c8df30] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

      </div>
    </main>
  )
}
