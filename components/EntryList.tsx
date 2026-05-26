'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { formatDuration, formatDate } from '@/lib/utils'

interface Entry {
  id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  note: string | null
}

interface Props {
  userId: string
  refreshKey: number
}

export default function EntryList({ userId, refreshKey }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('time_entries')
        .select('id, started_at, ended_at, duration_seconds, note')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(30)
      setEntries(data ?? [])
      setLoading(false)
    }
    load()
  }, [userId, refreshKey])

  const totalSeconds = entries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

  if (loading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-600 text-sm mono text-center">
      Carregando registros...
    </div>
  )

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header com total */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h2 className="font-semibold text-sm text-zinc-300 uppercase tracking-wider mono">Histórico</h2>
        <div className="text-[#E8FF47] text-sm mono font-bold">
          Total: {formatDuration(totalSeconds)}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="px-6 py-10 text-center text-zinc-600 text-sm mono">
          Nenhuma sessão registrada ainda.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {entries.map(entry => (
            <div key={entry.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mono">{formatDate(entry.started_at)}</p>
                {entry.note && (
                  <p className="text-sm text-zinc-300 mt-0.5 truncate">{entry.note}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-white font-bold mono text-sm">
                  {formatDuration(entry.duration_seconds ?? 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
