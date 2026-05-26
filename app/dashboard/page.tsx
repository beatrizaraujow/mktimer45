"use client"

import React, { useEffect, useState } from 'react'
import { CalendarDays, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts'

import { createClient } from '@/lib/supabase-client'

interface Profile {
  id: string
  name: string
  role: string
}

const lineData = [
  { name: 'Dom', value: 18 },
  { name: 'Seg', value: 62 },
  { name: 'Ter', value: 50 },
  { name: 'Qua', value: 57 },
  { name: 'Qui', value: 64 },
  { name: 'Sex', value: 48 },
  { name: 'Sab', value: 18 },
]

const pieData = [
  { name: 'Amarelo', value: 17.5, color: '#F6BE00' },
  { name: 'Azul', value: 7.5, color: '#0D2E3E' },
  { name: 'Branco', value: 75, color: '#F2F2F2' },
]

const cards = [
  {
    brand: 'ONEVO',
    brandColor: 'text-emerald-400',
    time: '3h12m',
    tasks: '8 tarefas',
    progress: 18,
    progressColor: 'bg-emerald-400',
  },
  {
    brand: 'SeuBone',
    brandColor: 'text-yellow-400',
    time: '7h18m',
    tasks: '45 tarefas',
    progress: 58,
    progressColor: 'bg-emerald-400',
  },
  {
    brand: 'CARBONE EDUCACAO',
    brandColor: 'text-zinc-100',
    time: '32h00m',
    tasks: '64 tarefas',
    progress: 90,
    progressColor: 'bg-orange-500',
  },
]

function StatCard({
  brand,
  brandColor,
  time,
  tasks,
  progress,
  progressColor,
}: {
  brand: string
  brandColor: string
  time: string
  tasks: string
  progress: number
  progressColor: string
}) {
  return (
    <div className="bg-black rounded-[24px] px-7 py-4 h-[160px] flex flex-col justify-between shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className={`text-center text-[22px] font-semibold leading-none ${brandColor}`}>
        {brand}
      </div>

      <div className="text-center">
        <div className="text-white text-[42px] leading-none font-light tracking-[-0.04em]">
          {time}
        </div>
        <div className="text-zinc-400 text-[15px] mt-1">{tasks}</div>
      </div>

      <div className="w-full h-[14px] bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`${progressColor} h-full rounded-full`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        return
      }

      setProfile({
        id: user.id,
        name: (user.user_metadata?.name as string) || (user.email?.split('@')[0] ?? 'Usuario'),
        role: (user.user_metadata?.role as string) || 'member',
      })
    }

    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center mono text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      <aside className="w-[250px] px-8 py-9 flex flex-col justify-between border-r border-zinc-900 h-full">
        <div>
          <div className="w-[84px] h-[84px] rounded-full bg-white text-black flex items-center justify-center text-[56px] font-serif font-bold">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>

          <nav className="mt-20 space-y-8">
            <div className="text-white text-[22px] font-medium">Time cheat</div>
            <div className="text-zinc-500 text-[22px] font-normal">Painel Daily</div>
            <div className="text-zinc-500 text-[22px] font-normal">Calendario</div>
            <div className="text-zinc-500 text-[22px] font-normal">Time</div>
          </nav>
        </div>

        <button
          type="button"
          className="text-white/90 hover:text-white transition"
          onClick={handleLogout}
          aria-label="Sair"
        >
          <LogOut size={34} strokeWidth={2} />
        </button>
      </aside>

      <main className="flex-1 p-5 h-full">
        <div className="bg-[#151515] rounded-[30px] p-5 h-full flex flex-col">
          <div className="grid grid-cols-3 gap-4">
            {cards.map((card) => (
              <StatCard key={card.brand} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-[1fr_300px] gap-4 mt-4 flex-1 min-h-0">
            <div className="bg-black rounded-[26px] p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 text-yellow-400">
                <CalendarDays size={24} />
                <span className="text-white text-[26px] leading-none">10 a 15 de Maio</span>
              </div>

              <div className="flex-1 mt-3 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 20, right: 10, left: 10, bottom: 35 }}>
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke="#F6C400"
                      strokeWidth={4}
                      dot={{ r: 7, fill: '#F6C400', stroke: '#F6C400' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-7 text-center text-white text-[15px] leading-none mt-1 px-6">
                {lineData.map((item) => (
                  <span key={item.name}>{item.name}</span>
                ))}
              </div>
            </div>

            <div className="bg-black rounded-[26px] p-6 h-full flex flex-col">
              <h3 className="text-white text-[22px] leading-none mb-3">Tempo total</h3>

              <div className="flex-1 flex items-center justify-center relative">
                <div className="w-[210px] h-[210px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={92}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute left-[14px] top-[64px] text-black text-[13px] font-medium">
                    17,5%
                  </div>
                  <div className="absolute right-[10px] top-[62px] text-black text-[13px] font-medium">
                    75%
                  </div>
                  <div className="absolute left-[82px] bottom-[12px] text-white text-[13px] font-medium">
                    7,5%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[22px] leading-none text-white">
            Tempo medio diario: <span className="font-bold">4h32min</span>
          </div>
        </div>
      </main>
    </div>
  )
}
