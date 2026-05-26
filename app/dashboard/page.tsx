'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Timer from '@/components/Timer'
import EntryList from '@/components/EntryList'

interface Profile {
  id: string
  name: string
  role: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos de senha.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não conferem.')
      return
    }

    setSavingPassword(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setPasswordError('Não foi possível identificar o usuário autenticado.')
      setSavingPassword(false)
      return
    }

    const { error: checkError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (checkError) {
      setPasswordError('Senha atual incorreta.')
      setSavingPassword(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setPasswordError(updateError.message || 'Não foi possível alterar a senha.')
      setSavingPassword(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSuccess('Senha alterada com sucesso.')
    setSavingPassword(false)
  }

  if (!profile) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-600 mono text-sm">Carregando...</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#E8FF47] rounded-sm flex items-center justify-center">
            <span className="text-zinc-950 font-black text-xs">Q5</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{profile.name}</p>
            <p className="text-zinc-600 text-xs mono mt-0.5 capitalize">{profile.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile.role === 'admin' && (
            <button
              onClick={() => router.push('/admin')}
              className="text-xs text-zinc-400 hover:text-[#E8FF47] mono transition-colors px-3 py-1.5 border border-zinc-800 rounded-lg"
            >
              Admin →
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-600 hover:text-zinc-300 mono transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <Timer
          userId={profile.id}
          onEntryCreated={() => setRefreshKey(k => k + 1)}
        />

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 mono uppercase tracking-wider">Alterar senha</h2>
            <p className="text-zinc-500 text-xs mono mt-1">A senha nova será atualizada no Supabase Auth.</p>
          </div>

          <div className="grid gap-3">
            <input
              type="password"
              placeholder="Senha atual"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 mono"
            />
            <input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 mono"
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 mono"
            />
          </div>

          {passwordError && (
            <p className="text-red-400 text-xs mono bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{passwordError}</p>
          )}

          {passwordSuccess && (
            <p className="text-emerald-300 text-xs mono bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2">{passwordSuccess}</p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="w-full bg-zinc-800 text-zinc-100 font-bold py-3 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPassword ? 'Salvando...' : 'Atualizar senha'}
          </button>
        </section>

        <EntryList
          userId={profile.id}
          refreshKey={refreshKey}
        />
      </div>
    </main>
  )
}
