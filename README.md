# MKTimer

Sistema de horas da equipe para 7 pessoas, com autenticao por nome/senha e painel com graficos por empresa:

- SeuBone
- Onevo
- Carbone Educacao

## Stack recomendada

- Frontend: HTML + CSS + JavaScript puro
- Backend: Vercel Serverless Functions (Node.js)
- Banco: Postgres (Neon, Supabase Postgres ou Vercel Postgres)
- Graficos: Chart.js

## Requisitos

- Node.js 20+
- Conta Vercel
- Banco Postgres

## 1) Configurar banco

1. Crie um banco Postgres (Neon recomendado).
2. Execute o script [sql/schema.sql](sql/schema.sql).
3. Esse script cria:
   - 7 usuarios
   - 3 empresas
   - senha padrao inicial `123456` para todos

## 2) Configurar variaveis de ambiente

Copie [.env.example](.env.example) para `.env` localmente e preencha:

- `DATABASE_URL`
- `JWT_SECRET`

No Vercel, configure as mesmas variaveis em Project Settings > Environment Variables.

## 3) Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## 4) Deploy na Vercel

1. Suba este projeto para um repositorio Git.
2. Importe na Vercel.
3. Configure `DATABASE_URL` e `JWT_SECRET`.
4. Deploy.

## Fluxo de uso

- Login com nome e senha.
- Senha inicial padrao: `123456`.
- No primeiro acesso (ou apos reset), a troca de senha e obrigatoria antes de usar o sistema.
- Cada pessoa lanca horas por data e empresa.
- Admin ve consolidado de toda equipe.
- Membro ve apenas os proprios lancamentos.
- Senha pode ser alterada em "Alterar senha".

## Reset de senha padrao para toda a equipe

Se precisar voltar todas as contas para a senha padrao `123456`, execute:

- [sql/reset_default_passwords.sql](sql/reset_default_passwords.sql)

Esse script tambem marca todos com troca obrigatoria de senha no proximo login.

## Usuarios cadastrados

- samuel (admin)
- malu (admin)
- zion
- klenio
- thiago
- maria clara
- bia

## Endpoints principais

- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET /api/users/me`
- `GET /api/time-entries?month=YYYY-MM`
- `POST /api/time-entries`
- `GET /api/reports/summary?month=YYYY-MM`

## Observacoes de seguranca

- Senhas sao armazenadas com hash (`pgcrypto`).
- Troque a senha padrao imediatamente apos subir.
- Use `JWT_SECRET` forte (minimo 32 caracteres).
