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
    <main className="login-root">
      <div className="shell">
        <section className="layout-grid">
          <aside className="quote-panel">
            <div className="quote-glow" />
            <div className="quote-lines" />

            <div className="quote-content">
              <div className="quote-text-wrap">
                <h1 className="quote-title">
                  O prazer
                  <br />
                  no trabalho
                  <br />
                  aperfeiçoa
                  <br />
                  a obra.
                </h1>
                <p className="quote-mark">”</p>
              </div>

              <p className="quote-author">- Aristóteles</p>
            </div>
          </aside>

          <section className="form-panel">
            <div className="logo-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>

            <h2 className="form-title">
              Pronto para
              <br />
              começar?
            </h2>

            <div className="form-block">
              <div className="field-wrap">
                <label className="field-label">ID do usuário</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="field-input"
                />
              </div>

              <div className="field-wrap">
                <label className="field-label">Senha</label>
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••"
                    className="field-input field-input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="password-toggle"
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
                <p className="error-box">
                  {error}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !name || !password}
                className="submit-btn"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button type="button" className="forgot-btn">
                Esqueci minha senha
              </button>
            </div>
          </section>
        </section>
      </div>

      <style jsx>{`
        .login-root {
          min-height: 100vh;
          background: #050608;
          padding: 8px;
        }
        .shell {
          max-width: 1500px;
          min-height: calc(100vh - 16px);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #27272a;
          background: #000;
          padding: 8px;
        }
        .layout-grid {
          width: 100%;
          display: grid;
          gap: 20px;
          grid-template-columns: 0.95fr 1fr;
        }
        .quote-panel {
          position: relative;
          min-height: 760px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #27272a;
          background: #09090b;
          padding: 24px;
        }
        .quote-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 78% 56%, rgba(255, 241, 171, 0.88) 0%, rgba(255, 214, 72, 0.62) 24%, rgba(13, 11, 5, 0.88) 56%, rgba(0, 0, 0, 1) 74%);
        }
        .quote-lines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0px, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 32px);
          opacity: 0.3;
        }
        .quote-content {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 12px;
        }
        .quote-text-wrap {
          max-width: 280px;
        }
        .quote-title {
          font-family: 'Syne', sans-serif;
          font-size: 56px;
          font-weight: 600;
          line-height: 0.93;
          letter-spacing: -0.03em;
          color: #f4f4f5;
          margin: 0;
        }
        .quote-mark {
          margin: 24px 0 0;
          font-family: 'Syne', sans-serif;
          font-size: 72px;
          line-height: 1;
          color: #f3c501;
        }
        .quote-author {
          margin: 0;
          font-family: 'Syne', sans-serif;
          font-size: 38px;
          line-height: 1;
          color: #f4f4f5;
        }
        .form-panel {
          min-height: 760px;
          border-radius: 16px;
          border: 1px solid #18181b;
          background: #000;
          padding: 32px 64px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .logo-dots {
          margin-bottom: 32px;
          width: fit-content;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .dot {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #f3c501;
        }
        .form-title {
          margin: 0;
          font-family: 'Syne', sans-serif;
          font-size: 64px;
          font-weight: 600;
          line-height: 0.9;
          letter-spacing: -0.03em;
          color: #f4f4f5;
        }
        .form-block {
          margin-top: 48px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-label {
          font-size: 24px;
          line-height: 1;
          color: #d4d4d8;
        }
        .field-input {
          height: 56px;
          width: 100%;
          border-radius: 8px;
          border: 1px solid #18181b;
          background: #09090b;
          color: #f4f4f5;
          padding: 0 16px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }
        .field-input::placeholder {
          color: #52525b;
        }
        .field-input:focus {
          border-color: #f3c501;
        }
        .password-wrap {
          position: relative;
        }
        .field-input-password {
          padding-right: 48px;
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
        }
        .password-toggle:hover {
          color: #e4e4e7;
        }
        .error-box {
          margin: 0;
          border-radius: 8px;
          border: 1px solid rgba(127, 29, 29, 0.6);
          background: rgba(69, 10, 10, 0.3);
          padding: 8px 12px;
          font-size: 14px;
          color: #fca5a5;
        }
        .submit-btn {
          margin-top: 8px;
          height: 56px;
          width: 100%;
          border: 0;
          border-radius: 8px;
          background: #f3c501;
          color: #000;
          font-size: 18px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s, opacity 0.2s;
        }
        .submit-btn:hover {
          background: #ffd233;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .forgot-btn {
          border: 0;
          background: transparent;
          color: #71717a;
          text-align: left;
          font-size: 14px;
          cursor: pointer;
          padding: 0;
        }
        .forgot-btn:hover {
          color: #d4d4d8;
        }

        @media (max-width: 1023px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
          .quote-panel {
            display: none;
          }
          .form-panel {
            min-height: calc(100vh - 32px);
            padding: 24px;
          }
          .form-title {
            font-size: 48px;
          }
          .field-label {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  )
}
