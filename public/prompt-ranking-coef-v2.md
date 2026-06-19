# Implementar Novo Coeficiente de Ranking (COR v2)

## Contexto

O ranking atual usa:
```js
coef = (ptsRate×0.50 + taskRate×0.35 + horaRate×0.15) × 100
// horaRate = horas / 16 (sem cap)
```

Esse cálculo não diferencia quem tem rotina, usa referência de horas errada (16h) e não inclui tasks concluídas de forma justa.

---

## Regra fundamental de rotina

> A rotina entra no cálculo **somente** para membros que possuem rotinas configuradas no sistema (`routineTotal > 0`). Quem não tem rotinas atribuídas usa a fórmula Tipo A, sem peso de rotina nenhum.
>
> A % de rotina é sempre **por contagem de slots**: `routineDone / routineTotal`. Não importa se há 10 ou 100 rotinas — o que conta é a porcentagem concluída.
>
> Todo membro que tem rotina também tem meta de pontos. Não existe membro com rotina e sem meta.

---

## Fórmulas

### Tipo A — Sem rotina (`routineTotal === 0`)

| Fator | Peso | Cálculo | Cap |
|---|---|---|---|
| % da meta de pontos | 55% | `pts / metaPeriodo` | Sem cap — 150% da meta = 150% nesse fator |
| % de tasks concluídas | 30% | `tasksDone / tasksTotal` | 100% |
| % de horas trabalhadas | 15% | `horas / 40` | 100% |

```
rawScore = (pts/meta)×0.55 + min(done/total, 1)×0.30 + min(horas/40, 1)×0.15
coef     = round(rawScore × 100)
```

---

### Tipo B — Com rotina (`routineTotal > 0`)

| Fator | Peso | Cálculo | Cap |
|---|---|---|---|
| % de rotina concluída | 40% | `routineDone / routineTotal` | 100% |
| % de tasks concluídas | 30% | `tasksDone / tasksTotal` | 100% |
| % da meta de pontos | 15% | `pts / metaPeriodo` | Sem cap |
| % de horas trabalhadas | 15% | `horas / 40` | 100% |

```
rawScore = min(routineDone/routineTotal, 1)×0.40
         + (pts/meta)×0.15
         + min(done/total, 1)×0.30
         + min(horas/40, 1)×0.15
coef     = round(rawScore × 100)
```

> A meta de pontos tem peso menor aqui porque a rotina já é a métrica principal de comprometimento.

---

### Sem bônus artificial acima de 100%

O coef é o rawScore × 100, sem multiplicador. Quem faz 150% da meta naturalmente pontua mais — não há fórmula especial para acima de 100%.

---

## Melhorias adicionais ao COR

Aplicar **após** calcular o `rawPct` (rawScore × 100), **antes** de arredondar.

```js
let adjPct = rawScore * 100;

adjPct -= Math.min(missingFieldsCount * 1, 10);  // [1] penalidade de campos faltando
adjPct -= Math.min(atrasadasCount * 2, 15);       // [2] penalidade de tasks atrasadas
adjPct  = Math.max(0, adjPct);                    // floor em 0
adjPct += clientDiversityBonus;                   // [3] bônus de diversidade de clientes

const coef = Math.round(adjPct);
```

---

### [1] Penalidade por tasks sem campos obrigatórios

Tasks sem pontuação, sem empresa ou sem data de entrega prejudicam a gestão do board.

**Regra:** `-1%` por task com campo faltando, cap em `-10%`.

O campo `missingFieldsCount` já é calculado no bloco `clickup-live`. No bloco `team-daily`, calcular inline:

```js
// team-daily path:
const missingFieldsCount = (tasksPerUser.get(uid) || []).filter(t =>
  !t.points || !t.empresa || !t.due_date
).length;

// adjPct:
adjPct -= Math.min(missingFieldsCount * 1, 10);
```

---

### [2] Penalidade por tasks atrasadas

Tasks com `due_date` vencida e não concluídas revelam acúmulo não resolvido.

**Regra:** `-2%` por task atrasada, cap em `-15%`.

```js
// clickup-live path:
const atrasadasCount = tasks.filter(t =>
  !cuTaskDone(t) && t.due_date && t.due_date < todayStr
).length;

// team-daily path:
const atrasadasCount = (tasksPerUser.get(uid) || []).filter(t =>
  !t.is_done && t.due_date && t.due_date < todayStr
).length;

// adjPct:
adjPct -= Math.min(atrasadasCount * 2, 15);
```

---

### [3] Bônus de diversidade de clientes

Entrega para mais de uma empresa na semana indica equilíbrio de demandas.

**Regra:** `+3%` se entregou para 2 empresas, `+6%` se entregou para 3. Só tasks concluídas contam.

```js
// clickup-live path:
const _empresasDone = new Set(
  tasks.filter(t => cuTaskDone(t)).map(t => resolveEmpresa(t)).filter(Boolean)
);

// team-daily path:
const _empresasDone = new Set(
  (tasksPerUser.get(uid) || []).filter(t => t.is_done && t.empresa).map(t => t.empresa)
);

// ambos:
const clientDiversityBonus = _empresasDone.size >= 3 ? 6
  : _empresasDone.size >= 2 ? 3
  : 0;
adjPct += clientDiversityBonus;
```

---

### [4] Fator de tendência semanal — Fase 2

Compara o coef atual com o da semana anterior.

**Regra:** `+5%` se cresceu ≥ 10pp, `-3%` se caiu ≥ 20pp.

Requer tabela `ranking_weekly_snapshots (user_id, week_start, coef)` populada por cron ao final de cada semana.

```js
const prevCoef = prevCoefMap.get(uid) ?? null;
const trendBonus = prevCoef === null ? 0
  : (adjPct - prevCoef) >= 10 ? 5
  : (prevCoef - adjPct) >= 20 ? -3
  : 0;
adjPct += trendBonus;
```

---

### [5] Penalidade por tasks travadas — Fase 2

Se mais de 40% das tasks abertas estão em `revision` ou `approval`, o membro perde 5%.

Aplicar somente se `openTasks.length >= 3` para não penalizar quem tem poucas tasks.

```js
// clickup-live path:
const _openTasks  = tasks.filter(t => !cuTaskDone(t));
const _stuckTasks = _openTasks.filter(t =>
  ['revision', 'approval'].includes(cuTaskStatusCat(t))
);
const stuckPenalty = (_openTasks.length >= 3 && _stuckTasks.length / _openTasks.length > 0.40) ? 5 : 0;
adjPct -= stuckPenalty;
```

---

### [6] Bônus de streak de metas — Fase 2

Semanas consecutivas com `coef >= 100` recebem bônus crescente, cap em 4 semanas.

**Regra:** `+3%` por semana consecutiva acima de 100, cap em `+12%`.

Requer a mesma tabela do item [4].

```js
const streakBonus = Math.min(streakWeeks * 3, 12);
adjPct += streakBonus;
```

---

## Arquivos a alterar

### `api/focus/index.js` — Bloco 1: action `team-daily` (~linha 923)

Variáveis disponíveis nesse bloco:
- `ptsSemana` — pontos de tasks da semana
- `effectiveWeeklyGoal` — meta semanal
- `horas` — horas (banco local)
- `doneSemana`, `totalSemana` — tasks concluídas / total
- `routineData.routine_done` — slots de rotina concluídos
- `routineExpWeekByUid[uid]` — pts esperados de rotina (em pts, não count)

> ⚠️ Nesse bloco `routineExpWeekByUid` é pts-based. Para usar contagem de slots, adicionar `routineCountWeekByUid` no loop de configuração de rotinas (linhas 853–878):
> ```js
> // Adicionar ao lado de routineExpWeekByUid:
> if (applies) routineCountWeekByUid[uid] = (routineCountWeekByUid[uid] || 0) + 1;
> ```
> Declarar `let routineCountWeekByUid = {};` junto com `routineExpWeekByUid`.

**Substituir:**
```js
const _ptsRate  = effectiveWeeklyGoal > 0 ? ptsSemana / effectiveWeeklyGoal : 0;
const _taskRate = totalSemana > 0 ? doneSemana / totalSemana : 0;
const _horaRate = horas / 16;
const coef = Math.round((_ptsRate * 0.50 + _taskRate * 0.35 + _horaRate * 0.15) * 100);
```

**Por:**
```js
const _routineTotal = routineCountWeekByUid[uid] || 0;
const _routineDone  = routineData.routine_done;
const _hasRoutine   = _routineTotal > 0;

const _metaScore  = effectiveWeeklyGoal > 0 ? ptsSemana / effectiveWeeklyGoal : 0;
const _taskScore  = totalSemana > 0 ? Math.min(doneSemana / totalSemana, 1.0) : 0;
const _horaScore  = Math.min(horas / 40, 1.0);
const _rotScore   = _hasRoutine ? Math.min(_routineDone / _routineTotal, 1.0) : 0;

const _rawScore = _hasRoutine
  ? _rotScore * 0.40 + _metaScore * 0.15 + _taskScore * 0.30 + _horaScore * 0.15
  : _metaScore * 0.55 + _taskScore * 0.30 + _horaScore * 0.15;

// Melhorias adicionais
const missingFieldsCount = (tasksPerUser.get(uid) || []).filter(t =>
  !t.points || !t.empresa || !t.due_date
).length;
const atrasadasCount = (tasksPerUser.get(uid) || []).filter(t =>
  !t.is_done && t.due_date && t.due_date < todayStr
).length;
const _empresasDone = new Set(
  (tasksPerUser.get(uid) || []).filter(t => t.is_done && t.empresa).map(t => t.empresa)
);
const clientDiversityBonus = _empresasDone.size >= 3 ? 6 : _empresasDone.size >= 2 ? 3 : 0;

let adjPct = _rawScore * 100;
adjPct -= Math.min(missingFieldsCount * 1, 10);
adjPct -= Math.min(atrasadasCount * 2, 15);
adjPct  = Math.max(0, adjPct);
adjPct += clientDiversityBonus;

const coef = Math.round(adjPct);
```

---

### `api/focus/index.js` — Bloco 2: action `clickup-live` (~linha 1482)

Variáveis disponíveis nesse bloco:
- `ptsParaBarra` — pts ClickUp ao vivo
- `metaForPeriod` — meta do período
- `horasEfetivas` — horas (ClickUp ou banco)
- `doneSemana`, `totalSemana` — tasks concluídas / total
- `routineDone` — `Number(routineData.routine_done)` (já existe)
- `routineTotal` — `routineTotalByUid[uid] || 0` — count de slots esperados (já existe)
- `missingFieldsCount` — já calculado (já existe)
- `tasks` — array de tasks do membro

**Substituir:**
```js
const _cuTaskRate = totalSemana > 0 ? doneSemana / totalSemana : 0;
const horasRef    = 16;
const _cuHoraRate = horasEfetivas / horasRef;
const _cuPtsRate  = metaForPeriod > 0 ? ptsParaBarra / metaForPeriod : 0;
const coef        = Math.round((_cuPtsRate * 0.50 + _cuTaskRate * 0.35 + _cuHoraRate * 0.15) * 100);
```

**Por:**
```js
const _cuHasRoutine = routineTotal > 0;
const _cuMetaScore  = metaForPeriod > 0 ? ptsParaBarra / metaForPeriod : 0;
const _cuTaskScore  = totalSemana > 0 ? Math.min(doneSemana / totalSemana, 1.0) : 0;
const _cuHoraScore  = Math.min(horasEfetivas / 40, 1.0);
const _cuRotScore   = _cuHasRoutine ? Math.min(routineDone / routineTotal, 1.0) : 0;

const _cuRaw = _cuHasRoutine
  ? _cuRotScore * 0.40 + _cuMetaScore * 0.15 + _cuTaskScore * 0.30 + _cuHoraScore * 0.15
  : _cuMetaScore * 0.55 + _cuTaskScore * 0.30 + _cuHoraScore * 0.15;

// Melhorias adicionais
const atrasadasCount = tasks.filter(t =>
  !cuTaskDone(t) && t.due_date && t.due_date < todayStr
).length;
const _cuEmpresasDone = new Set(
  tasks.filter(t => cuTaskDone(t)).map(t => resolveEmpresa(t)).filter(Boolean)
);
const clientDiversityBonus = _cuEmpresasDone.size >= 3 ? 6
  : _cuEmpresasDone.size >= 2 ? 3
  : 0;

let adjPct = _cuRaw * 100;
adjPct -= Math.min(missingFieldsCount * 1, 10);  // missingFieldsCount já existe
adjPct -= Math.min(atrasadasCount * 2, 15);
adjPct  = Math.max(0, adjPct);
adjPct += clientDiversityBonus;

const coef = Math.round(adjPct);
```

---

### `public/js/dashboard.js`

#### Subtitle do painel de ranking (`renderRankingFromMembers`, ~linha 2774)

Trocar:
```js
`Ordenado por % meta · Pódio para coef ≥ 100%`
```
Por:
```js
`COR v2 · Sem rotina: meta 55% + tasks 30% + horas 15% · Com rotina: rotina 40% + tasks 30% + meta 15% + horas 15%`
```

#### Tooltip do coef nos cards (`renderMemberCard`, ~linha 2599)

Trocar `title="Coeficiente da semana atual"` por:
```html
title="COR v2 — inclui meta, tasks, horas e rotina (se atribuída). Penaliza campos faltando e tasks atrasadas."
```

---

## Exemplos de coef esperado

| Perfil | Meta | Tasks | Horas | Rotina | Coef esperado |
|---|---|---|---|---|---|
| Sem rotina, meta 100%, todas tasks, 40h | 100% | 100% | 100% | — | **100** |
| Sem rotina, meta 80%, tasks 70%, 30h | 80% | 70% | 75% | — | **~76** |
| Sem rotina, meta 150% (overachiever) | 150% | 100% | 100% | — | **~143** |
| Com rotina, rotina 100%, meta 100%, tasks 100%, 40h | 100% | 100% | 100% | 100% | **100** |
| Com rotina, rotina 50%, meta 100%, tasks 80%, 30h | 100% | 80% | 75% | 50% | **~72** |
| Com rotina, rotina 100%, meta 150% (over), tasks 100%, 40h | 150% | 100% | 100% | 100% | **~122** |

---

## Regras de edge case

| Situação | Comportamento |
|---|---|
| `metaForPeriod = 0` | `_metaScore = 0` — coef vem de tasks + horas (+ rotina se tiver) |
| `totalSemana = 0` | `_taskScore = 0` |
| `horasEfetivas = 0` | `_horaScore = 0` |
| `routineTotal = 0` | Usa Tipo A (sem rotina) |
| Todos os inputs = 0 | `coef = 0` |
| `adjPct < 0` após penalidades | `coef = 0` (floor) |

---

## Checklist de deploy

### Fase 1 — Implementar agora
- [ ] Declarar `routineCountWeekByUid = {}` junto com `routineExpWeekByUid` no bloco team-daily
- [ ] Adicionar contador de slots ao loop de rotinas (linhas 853–878) no bloco team-daily
- [ ] Substituir cálculo de `coef` no bloco team-daily pela fórmula nova
- [ ] Substituir cálculo de `coef` no bloco clickup-live pela fórmula nova
- [ ] Verificar que `routineTotal` e `routineDone` já estão declarados no bloco clickup-live
- [ ] Adicionar penalidades [1] e [2] e bônus [3] nos dois blocos
- [ ] Atualizar subtitle e tooltip em `public/js/dashboard.js`
- [ ] Testar: membro sem rotina com meta 100% → coef ~100
- [ ] Testar: membro sem rotina com meta 150% → coef ~143 (não 100)
- [ ] Testar: membro com rotina 50% → coef < membro sem rotina com meta 100%
- [ ] Testar: 3 tasks atrasadas → coef cai ~6 pontos
- [ ] Commit no GitHub

### Fase 2 — Requer infraestrutura adicional
- [ ] Criar tabela `ranking_weekly_snapshots (user_id, week_start, coef)` + cron de snapshot
- [ ] Implementar fator de tendência semanal [4]
- [ ] Implementar penalidade tasks travadas [5] (validar threshold com o time)
- [ ] Implementar bônus de streak [6]
