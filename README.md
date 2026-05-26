# TimeClock — Quatro5

Sistema de controle de horas do time. Stack: Next.js 14 + Supabase + Tailwind CSS.

---

## Setup em 5 passos

### 1. Crie o projeto no Supabase
- Acesse: https://supabase.com → New Project
- Salve a `Project URL` e a `anon key` (Settings > API)

### 2. Rode o schema SQL
- No Supabase: vá em **SQL Editor** → **New query**
- Cole o conteúdo de `supabase/schema.sql` e execute

### 3. Configure variáveis de ambiente
Edite o `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 4. Instale e rode
```bash
npm install
npm run dev
```
Acesse: http://localhost:3000

### 5. Crie os usuários
No Supabase: **Authentication → Users → Invite user**

Para criar um admin, após criar o usuário, vá em **Table Editor → profiles**
e altere o campo `role` de `member` para `admin`.

---

## Estrutura de arquivos

```
timeclock/
├── app/
│   ├── login/page.tsx         # Tela de login
│   ├── dashboard/page.tsx     # Dashboard do usuário
│   ├── admin/page.tsx         # Painel admin (visão do time)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Timer.tsx              # Cronômetro com start/stop
│   └── EntryList.tsx          # Histórico de sessões
├── lib/
│   ├── supabase-client.ts     # Cliente Supabase (browser)
│   └── utils.ts               # formatDuration, formatDate
├── supabase/
│   └── schema.sql             # Tabelas + RLS + trigger
├── middleware.ts              # Proteção de rotas
└── .env.local                 # Variáveis de ambiente
```

---

## Funcionalidades

- **Login/logout** via Supabase Auth (email + senha)
- **Cronômetro** com start/stop — persiste sessão se o usuário fechar a aba
- **Nota opcional** por sessão
- **Histórico** das últimas 30 sessões com total acumulado
- **Painel admin** — visão do time com horas totais por membro + detalhe por sessão
- **RLS ativo** — cada usuário só acessa seus próprios dados

---

## Deploy (Vercel)

```bash
npx vercel
```
Adicione as variáveis de ambiente no painel da Vercel.
Domínio gratuito: `seu-projeto.vercel.app`

---

## Custo operacional

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel  | Hobby | R$0   |
| Supabase | Free | R$0  |
| Total   |       | **R$0/mês** |

Suporte até ~50k requests/mês no Supabase free tier — suficiente para 20 usuários.
