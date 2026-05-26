'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { formatDuration } from '@/lib/utils'

interface UserSummary {
  user_id: string
  name: string
  role: string
  total_sessions: number
  total_seconds: number
  total_hours: number
  last_session: string | null
}

interface DetailEntry {
  id: string
  started_at: string
  ended_at: string
  duration_seconds: number
  note: string | null
}

export default function AdminPage() {
  const [summaries, setSummaries] = useState<UserSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [entries, setEntries] = useState<DetailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Verifica se é admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const { data } = await supabase.from('hours_summary').select('*')
      setSummaries(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function loadUserEntries(userId: string) {
    if (selected === userId) { setSelected(null); setEntries([]); return }
    setSelected(userId)
    const { data } = await supabase
      .from('time_entries')
      .select('id, started_at, ended_at, duration_seconds, note')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20)
    setEntries(data ?? [])
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-600 mono text-sm">Carregando...</div>
    </div>
  )

  const teamTotal = summaries.reduce((a, s) => a + s.total_seconds, 0)

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#E8FF47] rounded-sm flex items-center justify-center">
            <span className="text-zinc-950 font-black text-xs">Q5</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Painel Admin</p>
            <p className="text-zinc-600 text-xs mono">Visão geral do time</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-zinc-500 hover:text-zinc-300 mono transition-colors"
        >
          ← Voltar
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">

        {/* Card total geral */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs mono uppercase tracking-wider">Total acumulado do time</p>
            <p className="text-[#E8FF47] text-4xl font-bold mono mt-1">{formatDuration(teamTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs mono">{summaries.length} membros</p>
          </div>
        </div>

        {/* Tabela do time */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300 mono uppercase tracking-wider">Time</h2>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {summaries.map(user => (
              <>
                <div
                  key={user.user_id}
                  onClick={() => loadUserEntries(user.user_id)}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  {/* Avatar inicial */}
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-zinc-300 text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className="text-zinc-600 text-xs mono capitalize">{user.role}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-white font-bold mono text-sm">{formatDuration(user.total_seconds)}</p>
                    <p className="text-zinc-600 text-xs mono">{user.total_sessions} sessões</p>
                  </div>

                  <span className={`text-zinc-500 text-xs mono transition-transform ${selected === user.user_id ? 'rotate-90' : ''}`}>▶</span>
                </div>

                {/* Detalhe expandido */}
                {selected === user.user_id && entries.length > 0 && (
                  <div className="bg-zinc-950 px-6 py-4 space-y-2">
                    {entries.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-900 last:border-0">
                        <div>
                          <span className="text-zinc-400 mono">
                            {new Date(e.started_at).toLocaleDateString('pt-BR')} —{' '}
                            {new Date(e.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {e.note && <span className="text-zinc-500 ml-2">· {e.note}</span>}
                        </div>
                        <span className="text-zinc-300 mono font-medium">{formatDuration(e.duration_seconds)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
