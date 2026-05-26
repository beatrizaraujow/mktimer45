'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import { formatDuration } from '@/lib/utils'

interface Props {
  userId: string
  onEntryCreated: () => void
}

export default function Timer({ userId, onEntryCreated }: Props) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [note, setNote] = useState('')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const supabase = createClient()

  // Recupera sessão ativa ao montar (caso o user recarregue a página)
  useEffect(() => {
    async function checkActiveSession() {
      const { data } = await supabase
        .from('time_entries')
        .select('id, started_at')
        .eq('user_id', userId)
        .is('ended_at', null)
        .single()

      if (data) {
        const diff = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
        setEntryId(data.id)
        setElapsed(diff)
        startTimeRef.current = Date.now() - diff * 1000
        setIsRunning(true)
      }
    }
    checkActiveSession()
  }, [userId])

  // Tick do cronômetro
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  async function handleStart() {
    setLoading(true)
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ user_id: userId, started_at: now })
      .select('id')
      .single()

    if (error || !data) { setLoading(false); return }

    setEntryId(data.id)
    startTimeRef.current = Date.now()
    setElapsed(0)
    setIsRunning(true)
    setLoading(false)
  }

  async function handleStop() {
    if (!entryId) return
    setLoading(true)
    const now = new Date().toISOString()

    await supabase
      .from('time_entries')
      .update({ ended_at: now, duration_seconds: elapsed, note: note || null })
      .eq('id', entryId)

    setIsRunning(false)
    setElapsed(0)
    setEntryId(null)
    setNote('')
    setLoading(false)
    onEntryCreated() // atualiza lista
  }

  return (
    <div className={`bg-zinc-900 border rounded-2xl p-6 md:p-8 ${isRunning ? 'border-[#E8FF47]/40 timer-active' : 'border-zinc-800'}`}>

      {/* Display do tempo */}
      <div className="text-center mb-6">
        <div className={`text-6xl md:text-7xl font-bold mono tracking-tight tabular-nums ${isRunning ? 'text-[#E8FF47]' : 'text-zinc-400'}`}>
          {formatDuration(elapsed)}
        </div>
        <p className="text-zinc-600 text-xs mono mt-2 uppercase tracking-widest">
          {isRunning ? 'Sessão em andamento' : 'Pronto para iniciar'}
        </p>
      </div>

      {/* Campo de nota (só quando rodando) */}
      {isRunning && (
        <div className="mb-6">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="O que você está fazendo? (opcional)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 mono"
          />
        </div>
      )}

      {/* Botão start/stop */}
      <button
        onClick={isRunning ? handleStop : handleStart}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50 ${
          isRunning
            ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
            : 'bg-[#E8FF47] text-zinc-950 hover:bg-[#c8df30]'
        }`}
      >
        {loading ? '...' : isRunning ? '⏹ Parar e salvar' : '▶ Iniciar cronômetro'}
      </button>
    </div>
  )
}
