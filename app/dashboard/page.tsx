'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

interface Profile {
  id: string
  name: string
  role: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
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

      // Fallback para nao travar em "Carregando..." quando profile ainda nao existe.
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
      <div className="loading-wrap">
        <div className="loading-text">Carregando...</div>
        <style jsx>{`
          .loading-wrap {
            min-height: 100vh;
            background: #050608;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loading-text {
            color: #71717a;
            font-size: 14px;
            font-family: 'IBM Plex Mono', monospace;
          }
        `}</style>
      </div>
    )
  }

  return (
    <main className="dashboard-root">
      <div className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-row">
            <div className="logo-dots" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="user-avatar">{profile.name.slice(0, 2).toUpperCase()}</div>
          </div>

          <nav className="menu">
            <button type="button" className="menu-item menu-item-active">Time cheat</button>
            <button type="button" className="menu-item">Painel Daily</button>
            <button type="button" className="menu-item">Calendario</button>
            <button type="button" className="menu-item">Time</button>
          </nav>

          <div className="sidebar-footer">
            {profile.role === 'admin' && (
              <button type="button" className="admin-link" onClick={() => router.push('/admin')}>
                Ir para Admin
              </button>
            )}
            <button type="button" className="logout-link" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </aside>

        <section className="panel">
          <div className="kpi-row">
            <article className="kpi-card">
              <p className="kpi-brand kpi-brand-green">ONEVO</p>
              <p className="kpi-time">3h12m</p>
              <p className="kpi-sub">8 tarefas</p>
              <div className="progress-track"><span className="progress-fill progress-green" /></div>
            </article>

            <article className="kpi-card">
              <p className="kpi-brand kpi-brand-yellow">SeuBone</p>
              <p className="kpi-time">7h18m</p>
              <p className="kpi-sub">45 tarefas</p>
              <div className="progress-track"><span className="progress-fill progress-yellow" /></div>
            </article>

            <article className="kpi-card">
              <p className="kpi-brand kpi-brand-muted">CARBONE EDUCACAO</p>
              <p className="kpi-time">32h00m</p>
              <p className="kpi-sub">64 tarefas</p>
              <div className="progress-track"><span className="progress-fill progress-orange" /></div>
            </article>
          </div>

          <div className="chart-row">
            <article className="chart-card">
              <p className="chart-title">10 a 15 de Maio</p>
              <svg viewBox="0 0 420 170" className="line-chart" aria-label="grafico semanal">
                <polyline
                  points="20,120 92,66 160,82 228,72 296,63 356,86 404,120"
                  fill="none"
                  stroke="#f3c501"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <g fill="#f3c501">
                  <circle cx="20" cy="120" r="4" />
                  <circle cx="92" cy="66" r="4" />
                  <circle cx="160" cy="82" r="4" />
                  <circle cx="228" cy="72" r="4" />
                  <circle cx="296" cy="63" r="4" />
                  <circle cx="356" cy="86" r="4" />
                  <circle cx="404" cy="120" r="4" />
                </g>
              </svg>
              <div className="week-days">
                <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span>
              </div>
              <p className="chart-foot">Tempo medio diario: <strong>4h32min</strong></p>
            </article>

            <article className="donut-card">
              <p className="donut-title">Tempo total</p>
              <div className="donut" aria-hidden="true">
                <div className="donut-hole" />
              </div>
              <div className="donut-legend">
                <span>75%</span>
                <span>17.5%</span>
                <span>7.5%</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <style jsx>{`
        .dashboard-root {
          min-height: 100vh;
          background: #050608;
          padding: 8px;
          overflow: hidden;
        }

        .dashboard-shell {
          min-height: calc(100vh - 16px);
          border: 1px solid #27272a;
          background: #000;
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 0;
          overflow: hidden;
        }

        .sidebar {
          border-right: 1px solid #1f2023;
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          background: #050608;
        }

        .brand-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-dots {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .logo-dots span {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #f3c501;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #111318;
          border: 1px solid #2b2d32;
          color: #f4f4f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .menu {
          margin-top: 56px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .menu-item {
          border: 0;
          background: transparent;
          color: #6f7178;
          font-size: 31px;
          font-family: 'Syne', sans-serif;
          text-align: left;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transition: color .2s;
        }

        .menu-item:hover,
        .menu-item-active {
          color: #f4f4f5;
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-link,
        .logout-link {
          border: 0;
          background: transparent;
          color: #81838b;
          text-align: left;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }

        .admin-link:hover,
        .logout-link:hover {
          color: #f3c501;
        }

        .panel {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #08090c;
          border-radius: 18px;
          margin: 18px;
          border: 1px solid #17181c;
        }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .kpi-card {
          background: #020304;
          border: 1px solid #17181c;
          border-radius: 14px;
          padding: 14px;
          min-height: 155px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .kpi-brand { margin: 0; font-size: 12px; font-weight: 700; }
        .kpi-brand-green { color: #5bf7c5; }
        .kpi-brand-yellow { color: #f3c501; }
        .kpi-brand-muted { color: #d4d4d8; font-size: 10px; }

        .kpi-time {
          margin: 12px 0 4px;
          color: #f4f4f5;
          font-size: 44px;
          font-family: 'Syne', sans-serif;
          line-height: 1;
        }

        .kpi-sub { margin: 0; color: #6f7178; font-size: 14px; }

        .progress-track {
          margin-top: 14px;
          width: 100%;
          height: 10px;
          border-radius: 999px;
          background: #101115;
          overflow: hidden;
        }

        .progress-fill {
          display: block;
          height: 100%;
          border-radius: 999px;
        }

        .progress-green { width: 20%; background: #43ddae; }
        .progress-yellow { width: 58%; background: #53df9b; }
        .progress-orange { width: 90%; background: #ff4b00; }

        .chart-row {
          display: grid;
          grid-template-columns: 2.2fr 0.9fr;
          gap: 12px;
        }

        .chart-card,
        .donut-card {
          background: #020304;
          border: 1px solid #17181c;
          border-radius: 14px;
          padding: 18px;
        }

        .chart-title,
        .donut-title {
          margin: 0 0 12px;
          color: #d4d4d8;
          font-size: 26px;
          font-family: 'Syne', sans-serif;
          line-height: 1;
        }

        .line-chart {
          width: 100%;
          height: 190px;
          display: block;
        }

        .week-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          color: #7a7c83;
          font-size: 12px;
          text-align: center;
        }

        .chart-foot {
          margin: 16px 0 0;
          color: #b7b9c0;
          font-size: 22px;
          font-family: 'Syne', sans-serif;
        }

        .chart-foot strong { color: #fff; font-weight: 700; }

        .donut {
          width: 180px;
          height: 180px;
          margin: 8px auto 0;
          border-radius: 999px;
          background: conic-gradient(#f3c501 0 75%, #f4f4f5 75% 92.5%, #173646 92.5% 100%);
          position: relative;
        }

        .donut-hole {
          position: absolute;
          inset: 28%;
          border-radius: 999px;
          background: #020304;
          border: 1px solid #17181c;
        }

        .donut-legend {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          color: #b7b9c0;
          font-size: 13px;
        }

        @media (max-width: 1200px) {
          .kpi-time { font-size: 36px; }
          .chart-foot { font-size: 18px; }
        }

        @media (max-width: 980px) {
          .dashboard-root {
            padding: 0;
            overflow: auto;
          }

          .dashboard-shell {
            min-height: 100vh;
            grid-template-columns: 1fr;
          }

          .sidebar {
            border-right: 0;
            border-bottom: 1px solid #1f2023;
            gap: 20px;
          }

          .menu {
            margin-top: 0;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .menu-item { font-size: 24px; }
          .panel { margin: 0; border-radius: 0; }
          .kpi-row,
          .chart-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  )
}
