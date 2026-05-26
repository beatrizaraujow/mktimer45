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
        <EntryList
          userId={profile.id}
          refreshKey={refreshKey}
        />
      </div>
    </main>
  )
}
