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
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="min-h-screen bg-[#050608] p-1 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-0.5rem)] max-w-[1500px] items-center justify-center border border-zinc-800 bg-black p-2 md:min-h-[calc(100vh-2rem)] md:p-4">
        <section className="grid h-full w-full gap-5 md:grid-cols-[0.95fr_1fr]">
          <aside className="relative hidden min-h-[680px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:block lg:min-h-[760px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_56%,rgba(255,241,171,0.88)_0%,rgba(255,214,72,0.62)_24%,rgba(13,11,5,0.88)_56%,rgba(0,0,0,1)_74%)]" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_32px)] opacity-30" />

            <div className="relative flex h-full flex-col justify-between px-3 py-6">
              <div className="max-w-[280px]">
                <h1 className="font-['Syne'] text-[56px] font-semibold leading-[0.93] tracking-[-0.03em] text-zinc-100">
                  O prazer
                  <br />
                  no trabalho
                  <br />
                  aperfeiçoa
                  <br />
                  a obra.
                </h1>
                <p className="mt-6 font-['Syne'] text-7xl leading-none text-[#f3c501]">”</p>
              </div>

              <p className="font-['Syne'] text-[38px] leading-none text-zinc-100">- Aristóteles</p>
            </div>
          </aside>

          <section className="flex min-h-[680px] flex-col justify-center rounded-2xl border border-zinc-900 bg-black px-6 py-8 md:px-16 lg:min-h-[760px]">
            <div className="mb-8 inline-grid w-fit grid-cols-2 gap-1.5">
              <span className="h-5 w-5 rounded-full bg-[#f3c501]" />
              <span className="h-5 w-5 rounded-full bg-[#f3c501]" />
              <span className="h-5 w-5 rounded-full bg-[#f3c501]" />
              <span className="h-5 w-5 rounded-full bg-[#f3c501]" />
            </div>

            <h2 className="font-['Syne'] text-[58px] font-semibold leading-[0.9] tracking-[-0.03em] text-zinc-100 md:text-[64px]">
              Pronto para
              <br />
              começar?
            </h2>

            <div className="mt-12 space-y-5">
              <div className="space-y-2">
                <label className="text-[24px] leading-none text-zinc-300">ID do usuário</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="h-14 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-4 text-base text-zinc-100 outline-none transition-colors focus:border-[#f3c501]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[24px] leading-none text-zinc-300">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••"
                    className="h-14 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-4 pr-12 text-base text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-[#f3c501]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-zinc-200"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12C3.8 8.3 7.5 6 12 6C16.5 6 20.2 8.3 22 12C20.2 15.7 16.5 18 12 18C7.5 18 3.8 15.7 2 12Z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !name || !password}
                className="mt-2 h-14 w-full rounded-lg bg-[#f3c501] text-lg font-medium text-black transition-colors hover:bg-[#ffd233] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button type="button" className="text-left text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                Esqueci minha senha
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
