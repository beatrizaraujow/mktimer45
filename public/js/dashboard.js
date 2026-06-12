// ── SVG icon set (Lucide style) ──────────────────────────────────────
const IC = {
  trophy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  gem:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>`,
  bell:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  lock:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  clock:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  warn:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  starOn: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  check:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  xMark:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  medal:  (n) => `<span class="ic-medal ic-medal-${n}">${n}</span>`,
  pencil: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  trash:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
};

let weekLineChart;
let dailyWeekChart;
let donutChart;
let lastDailyItems = [];
let mustChangePassword = false;

let _isAdminUser = false;

// ── Histórico panel state ─────────────────────────────────────────────
let histFilter = 'semana';
let histCustomFrom = null;
let histCustomTo = null;
let histBarChart = null;

// ── ADM panel state ───────────────────────────────────────────────────
let admFilter = 'mes';
let admCustomFrom = null;
let admCustomTo = null;
let admBarChart = null;
let admHistoryChartInst = null;
let admHistoryByUserChartInst = null;
let admSelectedUser = '';
let admMonthlyData = [];
let admLastData = null;
let activeSession = null;
let userProfile = null;
let currentMonth = new Date().toISOString().slice(0, 7);
let overviewWeeks = 14;
let overviewCalendarIn = new Date().toISOString().slice(0, 7);
let lastCompanyMinutes = { onevo: 0, seubone: 0, carbone: 0 };
let calendarSelectedDays = [];
const defaultPanel = 'painel-daily';

let taskCalStart = null;
let taskCalEnd = null;
let taskCalPoints = 0;
let taskCalCursor = null;

let companyTimerState = {};
let manualTimerTarget = null;
let entriesPanelCompany = null;
let wpdCursor = null;
let wpdSelectedWeek = null;

const DAILY_COMPANIES = [
  { key: 'onevo',   aliases: ['onevo'] },
  { key: 'seubone', aliases: ['seubone', 'seu bone', 'seubon', 'seu bon'] },
  { key: 'carbone', aliases: ['carbone', 'carbone educacao', 'carbone educao'] },
];

const CAL_MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const COMPANY_DISPLAY_NAMES = {
  onevo:   'ONEVO',
  seubone: 'SeuBoné',
  carbone: 'CARBONE EDUCAÇÃO',
};
const TASK_POINTS_DEF = [
  { value: 1, label: '1 · Trivial' },
  { value: 2, label: '2 · Fácil' },
  { value: 3, label: '3 · Média' },
  { value: 5, label: '5 · Difícil' },
  { value: 8, label: '8 · Épica' },
];

// Cargos que têm acesso à visão de membro no painel de Rotinas (apenas preencher a própria rotina)
const ROUTINE_MEMBER_CARGOS = ['storymaker', 'ugc', 'publisher'];
// Nomes adicionais com acesso à visão de membro em Rotinas (independente do cargo)
const ROUTINE_MEMBER_NAMES = ['gustavo'];
function isRoutineMemberCargo(cargo, name) {
  const c = (cargo || '').toLowerCase();
  if (ROUTINE_MEMBER_CARGOS.some(k => c.includes(k))) return true;
  const n = (name || '').toLowerCase();
  return ROUTINE_MEMBER_NAMES.some(k => n.startsWith(k));
}

function getToken() {
  return localStorage.getItem('mktimer_token');
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

function logout() {
  localStorage.removeItem('mktimer_token');
  localStorage.removeItem('mktimer_user');
  window.location.href = '/';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${pad(hours)}:${pad(mins)}`;
}

function formatDurationShort(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h${pad(mins)}m`;
}

function formatCountdown(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

function formatDateLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
  });
}

function formatWeekLabel(index, total) {
  return `Semana ${index + 1}/${total}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[^\w\s-]|[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getTaskStatuses() {
  try {
    return JSON.parse(localStorage.getItem('mktimer_task_status') || '{}');
  } catch {
    return {};
  }
}

function setTaskStatus(taskId, status) {
  const statuses = getTaskStatuses();
  statuses[String(taskId)] = status;
  localStorage.setItem('mktimer_task_status', JSON.stringify(statuses));
}

function getTaskStatus(task) {
  if (task.is_done) return 'done';
  const statuses = getTaskStatuses();
  return statuses[String(task.id)] || 'pending';
}

function getTaskCompany(task) {
  const cat = normalizeText(task.category || '');
  for (const company of DAILY_COMPANIES) {
    if (company.aliases.some((alias) => cat === alias || cat.startsWith(alias))) {
      return company.key;
    }
  }
  return null;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (networkErr) {
    // Erro de rede/socket antes de receber resposta
    throw new Error('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Erro inesperado na API.');
  }
  return payload;
}

function toggleAppLock(isLocked) {
  document.querySelectorAll('[data-lockable="true"]').forEach((section) => {
    section.querySelectorAll('button, input, select, textarea').forEach((element) => {
      if (element.id === 'openPasswordBtn' || element.id === 'logoutBtn') {
        return;
      }
      element.disabled = isLocked;
    });
  });

  const notice = document.getElementById('forcePasswordNotice');
  notice.hidden = !isLocked;
}

function renderTimerStats(overview) {
  const gaugeEl = document.getElementById('gaugePercent');
  const focusEl = document.getElementById('focusGauge');
  const countdownEl = document.getElementById('countdownValue');
  if (gaugeEl) gaugeEl.textContent = `${overview.gaugePercent}%`;
  if (focusEl) focusEl.style.setProperty('--progress', overview.gaugePercent);
  if (countdownEl) countdownEl.textContent = formatCountdown(overview.countdownSeconds);
}

function renderCompanyCards(summary) {
  const wantedCompanies = [
    { key: 'onevo',   aliases: ['onevo'],                                              valueId: 'onevoTimeUsedValue',   barId: 'onevoProgress' },
    { key: 'seubone', aliases: ['seubone', 'seu bone', 'seubon', 'seu bon'],           valueId: 'seuboneTimeUsedValue', barId: 'seuboneProgress' },
    { key: 'carbone', aliases: ['carbone', 'carbone educacao', 'carbone educao'],      valueId: 'carboneTimeUsedValue', barId: 'carboneProgress' },
  ];

  const totalsByCompany = new Map();
  (summary.companyTotals || []).forEach((item) => {
    const normalized = normalizeText(item.company_name);
    const minutes = Math.max(0, Math.round(Number(item.total_hours || 0) * 60));
    totalsByCompany.set(normalized, minutes);
  });

  const values = wantedCompanies.map((company) => {
    const minutes = company.aliases.reduce((result, alias) => {
      if (result > 0) return result;
      return totalsByCompany.get(alias) || 0;
    }, 0);
    return { ...company, minutes };
  });

  const maxMinutes = values.reduce((max, item) => Math.max(max, item.minutes), 0);

  values.forEach((item) => {
    const percent = maxMinutes > 0 ? Math.round((item.minutes / maxMinutes) * 100) : 0;
    document.getElementById(item.valueId).textContent = formatDurationShort(item.minutes);
    document.getElementById(item.barId).style.width = `${percent}%`;
    lastCompanyMinutes[item.key] = item.minutes;
  });

  updateDailyTimeBadges();
  updateCompanyTaskCounts();
  renderDonutChart(values);

  const [cymYear, cymMonth] = overviewCalendarIn.split('-').map(Number);
  const cymNow = new Date();
  const cymMonthEnd = new Date(cymYear, cymMonth, 0);
  const cymEnd = cymMonthEnd < cymNow ? cymMonthEnd : cymNow;
  let workDays = 0;
  for (let d = new Date(cymYear, cymMonth - 1, 1); d <= cymEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) workDays++;
  }
  const totalMin = Object.values(lastCompanyMinutes).reduce((s, m) => s + m, 0);
  const avgMin = workDays > 0 ? Math.round(totalMin / workDays) : 0;
  const infoEl = document.getElementById('activeSessionInfo');
  if (infoEl) infoEl.innerHTML = `Tempo médio diário: <strong>${formatDurationShort(avgMin)}</strong>`;
}

function updateDailyTimeBadges() {
  ['onevo', 'seubone', 'carbone'].forEach((company) => {
    const el = document.getElementById(`dailyTime-${company}`);
    if (el) el.textContent = formatDurationShort(lastCompanyMinutes[company] || 0);
  });
}

function renderWeekLineChart(dailyHours) {
  const ctx = document.getElementById('weekLineChart');
  if (!ctx) return;
  if (weekLineChart) weekLineChart.destroy();

  weekLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
      datasets: [{
        data: dailyHours,
        borderColor: '#f6c200',
        pointBackgroundColor: '#f6c200',
        pointBorderColor: '#f6c200',
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${Number(c.raw).toFixed(1)}h` } },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#666', font: { size: 12, family: 'Inter' } },
        },
        y: { display: false },
      },
    },
  });
}

function renderDonutChart(companyValues) {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  if (donutChart) donutChart.destroy();

  const total = companyValues.reduce((sum, c) => sum + c.minutes, 0);
  if (total === 0) return;

  const pct = (min) => (Math.round((min / total) * 1000) / 10).toString().replace('.', ',');
  const onevoMin   = (companyValues.find((c) => c.key === 'onevo')   || {}).minutes || 0;
  const seuboneMin = (companyValues.find((c) => c.key === 'seubone') || {}).minutes || 0;
  const carboneMin = (companyValues.find((c) => c.key === 'carbone') || {}).minutes || 0;

  const setLabel = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = `${pct(val)}%`; };
  setLabel('donutLabelLeft',   seuboneMin);
  setLabel('donutLabelRight',  carboneMin);
  setLabel('donutLabelBottom', onevoMin);

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [carboneMin, seuboneMin, onevoMin],
        backgroundColor: ['#ccc8b8', '#f6c200', '#1e3a4a'],
        borderWidth: 0,
        hoverBorderWidth: 0,
      }],
    },
    options: {
      responsive: false,
      cutout: '66%',
      rotation: -90,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

function updateCompanyTaskCounts() {
  ['onevo', 'seubone', 'carbone'].forEach((key) => {
    const el = document.getElementById(`${key}TaskCount`);
    if (!el) return;
    const count = lastDailyItems.filter((task) => getTaskCompany(task) === key).length;
    el.textContent = `${count} tarefas`;
  });
}

function updateChartPeriodLabel(weekDays) {
  const el = document.getElementById('chartPeriodLabel');
  if (!el || !weekDays || weekDays.length < 6) return;
  const mon = weekDays[1];
  const fri = weekDays[5];
  const [y, m] = mon.split('-').map(Number);
  const d0   = Number(mon.split('-')[2]);
  const dEnd = Number(fri.split('-')[2]);
  const monthName = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  el.textContent = `${d0} à ${dEnd} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
}

async function loadDailyChartData() {
  try {
    const response = await api(`/api/time-entries?month=${overviewCalendarIn}`);
    const now = new Date();
    const dow = now.getDay();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - dow + i);
      const y  = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    });
    const dailyHours = weekDays.map((dayStr) =>
      (response.items || [])
        .filter((e) => (e.work_date || '').slice(0, 10) === dayStr)
        .reduce((sum, e) => sum + Number(e.hours || 0), 0)
    );
    updateChartPeriodLabel(weekDays);
    renderWeekLineChart(dailyHours);
  } catch {
    renderWeekLineChart([0, 0, 0, 0, 0, 0, 0]);
  }
}

function renderDailyPanel(items) {
  // Painel Daily: mostrar apenas tarefas do dia atual
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = items.filter((task) => {
    if (task.start_date) {
      const end = task.end_date || task.start_date;
      return task.start_date <= today && today <= end;
    }
    return (task.created_at || '').slice(0, 10) === today;
  });

  const grouped = { onevo: [], seubone: [], carbone: [] };

  todayItems.forEach((task) => {
    const company = getTaskCompany(task);
    if (company && grouped[company]) grouped[company].push(task);
  });

  DAILY_COMPANIES.forEach(({ key }) => {
    const listEl = document.getElementById(`dailyTaskList-${key}`);
    if (!listEl) return;
    listEl.innerHTML = '';

    const tasks = grouped[key];
    if (!tasks.length) {
      const empty = document.createElement('li');
      empty.className = 'daily-task-empty';
      empty.textContent = 'Sem tarefas';
      listEl.appendChild(empty);
      return;
    }

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'daily-task-item';
      const status = getTaskStatus(task);
      const titleClass = task.is_done ? 'daily-task-title done' : 'daily-task-title';

      li.innerHTML = `
        <span class="daily-status-dot status-${status}" title="Clique para alterar status"></span>
        <span class="${titleClass}">${task.title}</span>
      `;

      li.querySelector('.daily-status-dot').addEventListener('click', async (e) => {
        e.stopPropagation();
        await cycleTaskStatus(task);
      });

      listEl.appendChild(li);
    });
  });

  updateDailySummary(todayItems);
  updateCompanyTaskCounts();
}

async function cycleTaskStatus(task) {
  const STATUS_CYCLE = ['pending', 'in-progress', 'blocked', 'done'];
  const currentStatus = getTaskStatus(task);
  const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
  const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

  try {
    if (nextStatus === STATUS_CAT.DONE) {
      await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ isDone: true }) });
    } else if (currentStatus === STATUS_CAT.DONE) {
      await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ isDone: false }) });
    }
    setTaskStatus(task.id, nextStatus);
    await loadTaskPanel();
    await loadLeaderboard();
  } catch (error) {
    console.error('Erro ao atualizar status:', error.message);
  }
}

function updateDailySummary(items) {
  let pending = 0;
  let inProgress = 0;
  let done = 0;

  items.forEach((task) => {
    const status = getTaskStatus(task);
    if (status === ROUTINE_STATUS.DONE) done++;
    else if (status === ROUTINE_STATUS.IN_PROGRESS) inProgress++;
    else pending++;
  });

  const pendingEl = document.getElementById('dailyCountPending');
  const progressEl = document.getElementById('dailyCountProgress');
  const doneEl = document.getElementById('dailyCountDone');

  if (pendingEl) pendingEl.textContent = String(pending).padStart(2, '0');
  if (progressEl) progressEl.textContent = String(inProgress).padStart(2, '0');
  if (doneEl) doneEl.textContent = String(done).padStart(2, '0');
}

function renderDailyWeekChart(items) {
  const ctx = document.getElementById('dailyWeekChart');
  if (!ctx) return;
  if (dailyWeekChart) dailyWeekChart.destroy();

  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dayLabels = days.map((d) =>
    d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  );

  // usa getTaskStatus em vez de completed_at
  const completedPerDay = days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10);
    return items.filter((t) => {
      const status = getTaskStatus(t);
      if (status !== STATUS_CAT.DONE) return false;
      // tenta updated_at, completed_at ou created_at como fallback
      const dateRef = (t.updated_at || t.completed_at || t.created_at || '').slice(0, 10);
      return dateRef === dayStr;
    }).length;
  });

  dailyWeekChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [
        {
          data: completedPerDay,
          borderColor: '#42d58a',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 8,
          pointBackgroundColor: '#42d58a',
          pointBorderColor: '#10141b',
          pointBorderWidth: 4,
          pointStyle: 'circle',
          hoverRadius: 11,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24, bottom: 0, left: 4, right: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => `${c.raw} concluída(s)` },
        },
      },
      elements: {
        line: { borderJoinStyle: 'round', borderCapStyle: 'round' },
      },
      scales: {
        x: {
          ticks: { color: '#9fa8b8', font: { size: 15, weight: '700' }, padding: 8 },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          display: false,
          min: 0,
          max: Math.max(...completedPerDay, 1),
        },
      },
    },
  });
}

function getWorkWeekForDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const mon = new Date(y, m - 1, d - daysFromMonday);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    const dd = String(day.getDate()).padStart(2, '0');
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    days.push(`${day.getFullYear()}-${mm}-${dd}`);
  }
  return days;
}

function getCurrentWorkWeek() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return getWorkWeekForDay(`${y}-${m}-${d}`);
}

function updateCalPeriodLabel() {
  const label = document.getElementById('calPeriodLabel');
  if (!label || !calendarSelectedDays.length) return;
  const sorted = [...calendarSelectedDays].sort();
  const [y0, m0, d0] = sorted[0].split('-').map(Number);
  const d1 = sorted[sorted.length - 1].split('-').map(Number)[2];
  const monthName = new Date(y0, m0 - 1, d0).toLocaleDateString('pt-BR', { month: 'long' });
  const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  label.innerHTML = `Período: <strong>${d0} - ${d1} de ${cap}</strong>`;
}

function renderCalendar(consistency) {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const yearLabel = document.getElementById('calYearLabel');
  const monthLabel = document.getElementById('calMonthName');
  const [year, month] = currentMonth.split('-').map(Number);

  if (yearLabel) yearLabel.textContent = year;
  if (monthLabel) {
    const name = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    monthLabel.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  }

  if (!calendarSelectedDays.length) {
    calendarSelectedDays = getCurrentWorkWeek();
  }

  const consistencyMap = {};
  if (consistency && consistency.days) {
    consistency.days.forEach((d) => {
      consistencyMap[String(d.day).slice(0, 10)] = d.status;
    });
  }

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay();

  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoDate = `${year}-${mm}-${dd}`;
    const isSelected = calendarSelectedDays.includes(isoDate);
    const consistStatus = consistencyMap[isoDate];

    let cellClass = `cal-day${isSelected ? ' selected' : ''}`;
    if (!isSelected && consistStatus === 'full') cellClass += ' cal-full';
    else if (!isSelected && consistStatus === 'partial') cellClass += ' cal-partial';

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = cellClass;
    cell.textContent = day;

    cell.addEventListener('click', () => {
      calendarSelectedDays = getWorkWeekForDay(isoDate);
      renderCalendar(consistency);
    });

    grid.appendChild(cell);
  }

  updateCalPeriodLabel();

  if (consistency && consistency.countdownSeconds !== undefined) {
    const cd = document.getElementById('countdownValue');
    if (cd) cd.textContent = formatCountdown(consistency.countdownSeconds);
  }
}

function renderCalendarTasks() {
  const list = document.getElementById('calendarTaskList');
  if (!list) return;
  list.innerHTML = '';

  const tasks = lastDailyItems || [];
  if (!tasks.length) {
    const empty = document.createElement('li');
    empty.className = 'cal-task-empty';
    empty.textContent = 'Sem tarefas';
    list.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const status = getTaskStatus(task);
    const li = document.createElement('li');
    li.className = 'cal-task-item';
    li.innerHTML = `
      <span class="cal-task-dot ${status}"></span>
      <span class="cal-task-title">${task.title}</span>
    `;
    list.appendChild(li);
  });
}

function makeSegBar(progressPercent, isTop) {
  const TOTAL = 30;
  const filled = Math.round((progressPercent / 100) * TOTAL);
  const segClass = isTop ? 'seg filled-top' : 'seg filled';
  let html = '';
  for (let i = 0; i < TOTAL; i++) {
    html += `<span class="${i < filled ? segClass : 'seg'}"></span>`;
  }
  return html;
}

function updateRankPeriodLabel(weeks) {
  const pill = document.getElementById('rankPeriodPill');
  if (!pill) return;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  pill.textContent = `${fmt(start)} – ${fmt(end)}`;
}

function renderLeaderboard(data) {
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';

  const weeks = Number(document.getElementById('leaderboardWeeks').value);
  updateRankPeriodLabel(weeks);

  data.items.forEach((item) => {
    const isTop = item.rank === 1;
    const avClass = item.category === 'onevo' ? ' onevo-av' : item.category === 'carbone' ? ' carbone-av' : '';
    const li = document.createElement('li');
    li.className = `rank-item${isTop ? ' rank-1' : ''}`;
    li.innerHTML = `
      <div class="rank-av${avClass}">
        ${item.avatar}
        ${isTop ? '<span class="rank-trophy">' + IC.trophy + '</span>' : ''}
      </div>
      <div class="rank-mid">
        <span class="rank-name">${item.name}</span>
        <div class="seg-bar">${makeSegBar(item.progressPercent, isTop)}</div>
      </div>
      <div class="rank-score">
        <span class="score-num">${item.score}</span>
        <span class="score-unit">pts</span>
      </div>
    `;
    list.appendChild(li);
  });
}

async function loadOverview() {
  const calendarDate = `${overviewCalendarIn}-01`;
  const overview = await api(`/api/focus?action=overview&date=${calendarDate}&weeks=${overviewWeeks}&calendarIn=${overviewCalendarIn}`);
  renderTimerStats(overview);
  activeSession = overview.activeSession;
}

async function loadCompanyCards() {
  const summary = await api(`/api/reports/summary?month=${overviewCalendarIn}`);
  renderCompanyCards(summary);
}

async function loadTaskPanel() {
  const response = await api('/api/tasks');
  lastDailyItems = response.items;
  renderDailyPanel(response.items);
  renderDailyWeekChart(response.items);
}

async function loadConsistency() {
  const response = await api(`/api/focus?action=consistency&month=${currentMonth}`);
  const monthInput = document.getElementById('calendarMonth');
  if (monthInput) monthInput.value = currentMonth;
  renderCalendar(response);
  renderCalendarTasks();
}

async function loadLeaderboard() {
  const el = document.getElementById('leaderboardWeeks');
  if (!el) return;
  const response = await api(`/api/focus?action=leaderboard&weeks=${el.value}`);
  renderLeaderboard(response);
}

async function refreshAll() {
  const tasks = [loadTaskPanel(), loadConsistency()];
  if (document.getElementById('leaderboardWeeks')) tasks.push(loadLeaderboard());
  await Promise.all(tasks);
}

function toYmd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtCalDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${pad(d)}/${pad(m)}/${y}`;
}

function calcTaskDuration(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.round((b - a) / 86400000) + 1;
}

function updateTaskFootInfo() {
  const el = document.getElementById('taskFootInfo');
  if (!el) return;
  const days = calcTaskDuration(taskCalStart, taskCalEnd);
  const ptsStr = taskCalPoints ? `<b>${taskCalPoints}</b> pts` : '— pts';
  const daysStr = days > 0 ? `<b>${days}</b> ${days === 1 ? 'dia' : 'dias'}` : '— dias';
  el.innerHTML = `${ptsStr} · ${daysStr}`;
}

function renderTaskPoints() {
  const container = document.getElementById('pointChips');
  if (!container) return;
  container.innerHTML = TASK_POINTS_DEF.map(p =>
    `<button type="button" class="tm-chip${taskCalPoints === p.value ? ' active' : ''}" data-pts="${p.value}">${p.label}</button>`
  ).join('');
  container.querySelectorAll('.tm-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      taskCalPoints = taskCalPoints === Number(btn.dataset.pts) ? 0 : Number(btn.dataset.pts);
      renderTaskPoints();
      updateTaskFootInfo();
    });
  });
}

function renderTaskCalendar() {
  const container = document.getElementById('taskCalendar');
  if (!container) return;
  if (!taskCalCursor) {
    const now = new Date();
    taskCalCursor = { year: now.getFullYear(), month: now.getMonth() };
  }
  const { year, month } = taskCalCursor;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekDayLabels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  let html = `<div class="tm-cal">
    <div class="tm-cal-header">
      <button type="button" class="tm-cal-nav" data-cal-nav="prev">‹</button>
      <span class="tm-cal-month">${CAL_MONTH_NAMES[month]} ${year}</span>
      <button type="button" class="tm-cal-nav" data-cal-nav="next">›</button>
    </div>
    <div class="tm-cal-grid">`;

  for (const wd of weekDayLabels) {
    html += `<span class="tm-cal-cell wday-label">${wd}</span>`;
  }
  for (let i = 0; i < firstDay; i++) {
    html += `<span class="tm-cal-cell empty"></span>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${pad(month + 1)}-${pad(d)}`;
    let cls = 'tm-cal-cell';
    if (ymd === taskCalStart) cls += ' range-start';
    if (ymd === taskCalEnd) cls += ' range-end';
    if (taskCalStart && taskCalEnd && ymd > taskCalStart && ymd < taskCalEnd) cls += ' in-range';
    html += `<button type="button" class="${cls}" data-ymd="${ymd}">${d}</button>`;
  }

  html += `</div>`;

  if (taskCalStart) {
    html += `<div class="tm-cal-readout">`;
    html += `<span class="tm-cal-pill">${fmtCalDate(taskCalStart)}</span>`;
    if (taskCalEnd && taskCalEnd !== taskCalStart) {
      const days = calcTaskDuration(taskCalStart, taskCalEnd);
      html += `<span class="tm-cal-arrow">→</span>`;
      html += `<span class="tm-cal-pill">${fmtCalDate(taskCalEnd)}</span>`;
      html += `<span class="tm-cal-dur">${days} ${days === 1 ? 'dia' : 'dias'}</span>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  container.querySelector('[data-cal-nav="prev"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    taskCalCursor = taskCalCursor.month === 0
      ? { year: taskCalCursor.year - 1, month: 11 }
      : { year: taskCalCursor.year, month: taskCalCursor.month - 1 };
    renderTaskCalendar();
  });

  container.querySelector('[data-cal-nav="next"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    taskCalCursor = taskCalCursor.month === 11
      ? { year: taskCalCursor.year + 1, month: 0 }
      : { year: taskCalCursor.year, month: taskCalCursor.month + 1 };
    renderTaskCalendar();
  });

  container.querySelectorAll('.tm-cal-cell[data-ymd]').forEach(cell => {
    cell.addEventListener('click', () => {
      const ymd = cell.dataset.ymd;
      if (!taskCalStart || (taskCalStart && taskCalEnd)) {
        taskCalStart = ymd;
        taskCalEnd = null;
      } else if (ymd < taskCalStart) {
        taskCalEnd = taskCalStart;
        taskCalStart = ymd;
      } else {
        taskCalEnd = ymd;
      }
      renderTaskCalendar();
      updateTaskFootInfo();
    });
  });
}

async function submitDailyTask(event) {
  event.preventDefault();
  const message = document.getElementById('dailyAddMessage');
  message.textContent = '';

  const company = document.getElementById('dailyAddCompany').value;
  const title = document.getElementById('dailyAddTaskTitle').value.trim();
  const descEl = document.getElementById('dailyAddDesc');
  const description = descEl ? descEl.value.trim() : '';

  if (!title) {
    message.textContent = 'Preencha o nome da tarefa.';
    return;
  }

  try {
    const body = { title, category: company };
    if (description) body.description = description;
    if (taskCalPoints) body.points = taskCalPoints;
    if (taskCalStart) body.startDate = taskCalStart;
    if (taskCalEnd) body.endDate = taskCalEnd;

    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    document.getElementById('dailyAddDialog').close();
    await loadTaskPanel();
    await loadLeaderboard();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function submitPasswordChange(event) {
  event.preventDefault();
  const message = document.getElementById('passwordMessage');
  message.textContent = '';

  const currentPassword = document.getElementById('currentPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();

  if (!currentPassword || !newPassword) {
    message.textContent = 'Preencha senha atual e nova senha.';
    return;
  }

  try {
    await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    message.textContent = 'Senha alterada com sucesso.';
    document.getElementById('passwordForm').reset();
    mustChangePassword = false;
    toggleAppLock(false);
    document.getElementById('passwordDialog').close();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function startSession() {
  await api('/api/focus?action=start', { method: 'POST' });
  await refreshAll();
}

async function stopSession() {
  await api('/api/focus?action=stop', { method: 'POST' });
  await refreshAll();
}

function loadTimerState() {
  const blank = () => ({ running: false, startedAt: null, elapsed: 0 });
  try {
    const saved = JSON.parse(localStorage.getItem('mktimer_timers') || '{}');
    companyTimerState = {
      onevo:   { ...blank(), ...saved.onevo },
      seubone: { ...blank(), ...saved.seubone },
      carbone: { ...blank(), ...saved.carbone },
    };
  } catch {
    companyTimerState = { onevo: blank(), seubone: blank(), carbone: blank() };
  }
}

function saveTimerState() {
  localStorage.setItem('mktimer_timers', JSON.stringify(companyTimerState));
}

function getTimerSeconds(company) {
  const state = companyTimerState[company];
  if (!state) return 0;
  let secs = state.elapsed || 0;
  if (state.running && state.startedAt) {
    secs += Math.floor((Date.now() - state.startedAt) / 1000);
  }
  return secs;
}

function formatTimerDisplay(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function updateTimerDisplays() {
  ['onevo', 'seubone', 'carbone'].forEach((company) => {
    const dispEl   = document.getElementById(`tcDisp-${company}`);
    const rowEl    = document.getElementById(`tcRow-${company}`);
    const toggleEl = document.getElementById(`tcToggle-${company}`);
    if (!dispEl) return;

    dispEl.textContent = formatTimerDisplay(getTimerSeconds(company));

    const isRunning = companyTimerState[company]?.running;
    rowEl?.classList.toggle('running', !!isRunning);

    if (toggleEl) {
      const play = toggleEl.querySelector('.tc-icon-play');
      const stop = toggleEl.querySelector('.tc-icon-stop');
      if (play) play.style.display = isRunning ? 'none' : '';
      if (stop) stop.style.display = isRunning ? '' : 'none';
    }
  });
}

async function toggleCompanyTimer(company) {
  const state = companyTimerState[company];
  if (!state) return;

  if (state.running) {
    const elapsed = getTimerSeconds(company);
    state.running = false;
    state.elapsed = 0;
    state.startedAt = null;
    saveTimerState();
    updateTimerDisplays();

    const hours = elapsed / 3600;
    if (hours > 0.0005) {
      try {
        await api('/api/time-entries', {
          method: 'POST',
          body: JSON.stringify({
            workDate:    new Date().toISOString().slice(0, 10),
            hours,
            companyName: COMPANY_DISPLAY_NAMES[company],
            companyKey:  company,
            description: 'Cronômetro',
          }),
        });
        await refreshAll();
      } catch (e) {
        console.error('Erro ao registrar tempo:', e);
      }
    }
  } else {
    state.running   = true;
    state.startedAt = Date.now();
    state.elapsed   = 0;
    saveTimerState();
    updateTimerDisplays();
  }
}

function openManualEntry(company) {
  const panel   = document.getElementById('tcManual');
  const forEl   = document.getElementById('tcManualFor');
  const hInput  = document.getElementById('tcManualH');
  const mInput  = document.getElementById('tcManualM');
  const dateEl  = document.getElementById('tcManualDate');
  const msgEl   = document.getElementById('tcManualMsg');
  if (!panel) return;

  manualTimerTarget = company;
  if (forEl)  forEl.textContent = COMPANY_DISPLAY_NAMES[company] || company;
  if (hInput) hInput.value = '0';
  if (mInput) mInput.value = '0';
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  if (msgEl)  msgEl.textContent = '';
  panel.hidden = false;
}

async function saveManualEntry() {
  const h    = parseInt(document.getElementById('tcManualH')?.value || '0', 10);
  const m    = parseInt(document.getElementById('tcManualM')?.value || '0', 10);
  const date = document.getElementById('tcManualDate')?.value;
  const msgEl = document.getElementById('tcManualMsg');

  if (!manualTimerTarget || (!h && !m)) {
    if (msgEl) msgEl.textContent = 'Informe pelo menos 1 minuto.';
    return;
  }

  const hours = h + m / 60;
  try {
    await api('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify({
        workDate:    date || new Date().toISOString().slice(0, 10),
        hours,
        companyName: COMPANY_DISPLAY_NAMES[manualTimerTarget],
        companyKey:  manualTimerTarget,
        description: 'Entrada manual',
      }),
    });
    document.getElementById('tcManual').hidden = true;
    manualTimerTarget = null;
    await refreshAll();
  } catch (e) {
    if (msgEl) msgEl.textContent = e.message || 'Erro ao salvar.';
  }
}

function loadGoals() {
  try {
    const goals = JSON.parse(localStorage.getItem('mktimer_goals') || '{}');
    const weekEl = document.getElementById('tcGoalWeek');
    const dayEl  = document.getElementById('tcGoalDay');
    if (weekEl && goals.week != null) weekEl.value = goals.week;
    if (dayEl  && goals.day  != null) dayEl.value  = goals.day;
  } catch {}
}

function saveGoals() {
  const week = parseInt(document.getElementById('tcGoalWeek')?.value || '40', 10);
  const day  = parseInt(document.getElementById('tcGoalDay')?.value  || '8',  10);
  localStorage.setItem('mktimer_goals', JSON.stringify({ week, day }));
}

function applyAvatarImage(dataUrl) {
  const btn = document.getElementById('profileAvatarBtn');
  if (!btn) return;
  btn.style.backgroundImage = `url(${dataUrl})`;
  btn.classList.add('has-image');
}

function initProfileAvatar() {
  const btn = document.getElementById('profileAvatarBtn');
  if (!btn) return;
  const saved = localStorage.getItem('mktimer_avatar');
  if (saved) applyAvatarImage(saved);
}

function getEntryCompanyKey(entry) {
  const norm = normalizeText(entry.company_name || '');
  for (const company of DAILY_COMPANIES) {
    if (company.aliases.some((alias) => norm === alias || norm.startsWith(alias))) {
      return company.key;
    }
  }
  return null;
}

async function openEntriesPanel(company) {
  const panel = document.getElementById('tcEntries');
  const forEl = document.getElementById('tcEntriesFor');
  const listEl = document.getElementById('tcEntryList');
  if (!panel || !listEl) return;

  document.getElementById('tcManual').hidden = true;
  manualTimerTarget = null;

  entriesPanelCompany = company;
  if (forEl) forEl.textContent = COMPANY_DISPLAY_NAMES[company] || company;
  listEl.innerHTML = '<li class="tc-entry-loading">Carregando...</li>';
  panel.hidden = false;

  try {
    const response = await api(`/api/time-entries?month=${overviewCalendarIn}`);
    const entries = (response.items || []).filter((e) => getEntryCompanyKey(e) === company);
    renderEntriesList(entries);
  } catch {
    listEl.innerHTML = '<li class="tc-entry-loading">Erro ao carregar.</li>';
  }
}

function renderEntriesList(entries) {
  const listEl = document.getElementById('tcEntryList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'tc-entry-loading';
    li.textContent = 'Nenhuma entrada neste mês.';
    listEl.appendChild(li);
    return;
  }

  entries.forEach((entry) => {
    const parts = (entry.work_date || '').slice(0, 10).split('-');
    const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : '—';
    const hoursVal = Number(entry.hours || 0).toFixed(2);

    const li = document.createElement('li');
    li.className = 'tc-entry-item';
    li.innerHTML = `
      <span class="tc-entry-date">${dateLabel}</span>
      <input type="number" class="tc-entry-h" value="${hoursVal}" min="0.1" max="24" step="0.25" aria-label="Horas" />
      <span class="tc-entry-unit">h</span>
      <span class="tc-entry-desc">${entry.description || ''}</span>
      <button type="button" class="tc-entry-save" aria-label="Salvar">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button type="button" class="tc-entry-del" aria-label="Excluir">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    li.querySelector('.tc-entry-save').addEventListener('click', async () => {
      const input = li.querySelector('.tc-entry-h');
      const h = parseFloat(input.value);
      if (!h || h <= 0 || h > 24) {
        input.style.borderColor = '#cc3333';
        return;
      }
      input.style.borderColor = '';
      await saveEntryEdit(entry.id, h, (entry.work_date || '').slice(0, 10));
    });

    li.querySelector('.tc-entry-del').addEventListener('click', async () => {
      if (!confirm('Excluir esta entrada de horas?')) return;
      await deleteTimeEntry(entry.id);
    });

    listEl.appendChild(li);
  });
}

async function saveEntryEdit(id, hours, workDate) {
  try {
    await api(`/api/time-entries?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ hours, workDate }),
    });
    await Promise.all([loadCompanyCards(), openEntriesPanel(entriesPanelCompany)]);
  } catch (e) {
    console.error('Erro ao atualizar entrada:', e.message);
  }
}

async function deleteTimeEntry(id) {
  try {
    await api(`/api/time-entries?id=${id}`, { method: 'DELETE' });
    await Promise.all([loadCompanyCards(), openEntriesPanel(entriesPanelCompany)]);
  } catch (e) {
    console.error('Erro ao excluir entrada:', e.message);
  }
}

async function resetWeek() {
  const now = new Date();
  const dow = now.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  const weekStart = monday.toISOString().slice(0, 10);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const confirmed = confirm(`Zerar todas as horas de ${fmt(monday)} até ${fmt(sunday)}?\nEsta ação não pode ser desfeita.`);
  if (!confirmed) return;

  try {
    await api(`/api/time-entries?weekStart=${weekStart}`, { method: 'DELETE' });
    await refreshAll();
  } catch (e) {
    console.error('Erro ao zerar semana:', e.message);
  }
}

function initTimerSection() {
  loadTimerState();
  loadGoals();
  updateTimerDisplays();

  document.querySelectorAll('[data-tc-company]').forEach((btn) => {
    btn.addEventListener('click', () => toggleCompanyTimer(btn.dataset.tcCompany));
  });

  document.querySelectorAll('[data-tc-add]').forEach((btn) => {
    btn.addEventListener('click', () => openManualEntry(btn.dataset.tcAdd));
  });

  document.getElementById('tcManualCancel')?.addEventListener('click', () => {
    document.getElementById('tcManual').hidden = true;
    manualTimerTarget = null;
  });

  document.querySelectorAll('[data-tc-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEntriesPanel(btn.dataset.tcEdit));
  });

  document.getElementById('tcEntriesClose')?.addEventListener('click', () => {
    document.getElementById('tcEntries').hidden = true;
    entriesPanelCompany = null;
  });

  document.getElementById('tcResetWeek')?.addEventListener('click', resetWeek);

  document.getElementById('tcManualSave')?.addEventListener('click', saveManualEntry);

  document.getElementById('tcGoalWeek')?.addEventListener('change', saveGoals);
  document.getElementById('tcGoalDay')?.addEventListener('change',  saveGoals);

  setInterval(updateTimerDisplays, 1000);
}

function initSidebarPanels() {
  const navButtons = Array.from(document.querySelectorAll('.nav-tab[data-panel]'));
  const panels     = Array.from(document.querySelectorAll('[data-panel-view]'));
  const histBtn    = document.getElementById('navHistBtn');
  const admBtn     = document.getElementById('admNavBtn');

  if (!navButtons.length || !panels.length) return;

  const ANALYTICS = ['historico', 'adm'];

  function setActionBtns(panel) {
    if (histBtn) histBtn.classList.toggle('is-active', panel === 'historico');
    if (admBtn)  admBtn.classList.toggle('is-active',  panel === 'adm');
  }

  const showPanel = async (panelName) => {
    navButtons.forEach((b) => b.classList.toggle('active', b.dataset.panel === panelName));
    panels.forEach((p)     => { p.hidden = p.dataset.panelView !== panelName; });
    setActionBtns(panelName);

    if (!ANALYTICS.includes(panelName) && _tdIsLive) {
      _stopTdTimers();
      _setLiveBadge(false);
    }
    if (panelName === 'painel-daily') { loadDailyBrief(); await loadTeamDaily(); }
    if (panelName === 'calendario')   renderCalendarTasks();
    if (panelName === 'historico')    await loadHistoricoPanel();
    if (panelName === 'adm')          await loadAdmPanel();
    if (panelName === 'rotina')       await loadRoutinePanel();
    if (panelName === 'rituais')      await loadRituaisPanel();
    if (panelName === 'ranking')      await loadRankingPanel();
    if (panelName === 'tabela-pts')   renderPtsTable();
  };

  navButtons.forEach((b) => {
    b.addEventListener('click', () => showPanel(b.dataset.panel || defaultPanel));
  });

  histBtn?.addEventListener('click', () => showPanel('historico'));
  admBtn?.addEventListener('click',  () => showPanel('adm'));

  showPanel(defaultPanel);
}

function initDailyPanel() {
  document.querySelectorAll('[data-add-company]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const company = btn.dataset.addCompany;
      document.getElementById('dailyAddCompany').value = company;
      document.getElementById('dailyAddTaskTitle').value = '';
      document.getElementById('dailyAddMessage').textContent = '';

      const descEl = document.getElementById('dailyAddDesc');
      if (descEl) descEl.value = '';
      const countEl = document.getElementById('descCharCount');
      if (countEl) countEl.textContent = '0';

      taskCalStart = null;
      taskCalEnd = null;
      taskCalPoints = 0;
      const now = new Date();
      taskCalCursor = { year: now.getFullYear(), month: now.getMonth() };

      renderTaskPoints();
      renderTaskCalendar();
      updateTaskFootInfo();

      document.getElementById('dailyAddDialog').showModal();
    });
  });

  document.getElementById('dailyAddCloseBtn')?.addEventListener('click', () => {
    document.getElementById('dailyAddDialog').close();
  });

  document.getElementById('dailyAddCancelBtn').addEventListener('click', () => {
    document.getElementById('dailyAddDialog').close();
  });

  const descEl = document.getElementById('dailyAddDesc');
  if (descEl) {
    descEl.addEventListener('input', () => {
      const countEl = document.getElementById('descCharCount');
      if (countEl) countEl.textContent = descEl.value.length;
    });
  }

  document.getElementById('dailyAddForm').addEventListener('submit', submitDailyTask);
}

function renderWpdCalendar() {
  const { year, month } = wpdCursor;
  document.getElementById('wpdYear').textContent = year;
  document.getElementById('wpdMonth').textContent = CAL_MONTH_NAMES[month];

  const grid = document.getElementById('wpdGrid');
  grid.innerHTML = '';

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'wpd-cell wpd-empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${pad(month + 1)}-${pad(d)}`;
    let cls = 'wpd-cell';
    if (wpdSelectedWeek) {
      if (ymd === wpdSelectedWeek.start)                                         cls += ' wpd-range-start';
      else if (ymd === wpdSelectedWeek.end)                                      cls += ' wpd-range-end';
      else if (ymd > wpdSelectedWeek.start && ymd < wpdSelectedWeek.end)        cls += ' wpd-in-range';
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.textContent = d;
    btn.addEventListener('click', () => {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      const daysFromMon = dow === 0 ? 6 : dow - 1;
      const mon = new Date(year, month, d - daysFromMon);
      const fri = new Date(mon);
      fri.setDate(fri.getDate() + 4);
      wpdSelectedWeek = { start: toYmd(mon), end: toYmd(fri) };
      renderWpdCalendar();
    });
    grid.appendChild(btn);
  }

  const labelEl = document.getElementById('wpdPeriodLabel');
  const confirmBtn = document.getElementById('wpdConfirm');
  const resetBtn = document.getElementById('wpdResetScore');

  if (!wpdSelectedWeek) {
    if (labelEl) labelEl.innerHTML = 'Selecione uma semana';
    if (confirmBtn) confirmBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    return;
  }

  const [, sm, sd] = wpdSelectedWeek.start.split('-').map(Number);
  const [, em, ed] = wpdSelectedWeek.end.split('-').map(Number);
  const sameMon = sm === em;
  const periodText = sameMon
    ? `${sd} - ${ed} de ${CAL_MONTH_NAMES[sm - 1]}`
    : `${sd} de ${CAL_MONTH_NAMES[sm - 1]} - ${ed} de ${CAL_MONTH_NAMES[em - 1]}`;

  if (labelEl) labelEl.innerHTML = `Período: <strong>${periodText}</strong>`;
  if (confirmBtn) confirmBtn.disabled = false;
  if (resetBtn) resetBtn.disabled = false;
}

function openWeekPicker() {
  const now = new Date();
  wpdCursor = { year: now.getFullYear(), month: now.getMonth() };
  wpdSelectedWeek = null;
  renderWpdCalendar();
  document.getElementById('weekPickerDialog').showModal();
}

async function confirmWeekPicker() {
  if (!wpdSelectedWeek) return;
  const { start, end } = wpdSelectedWeek;
  document.getElementById('weekPickerDialog').close();
  try {
    const response = await api(`/api/focus?action=leaderboard&from=${start}&to=${end}`);
    renderLeaderboard(response);
    const [, sm, sd] = start.split('-').map(Number);
    const [, em, ed] = end.split('-').map(Number);
    const fmt = (d, m) => `${d} de ${CAL_MONTH_NAMES[m - 1]}`;
    const pill = document.getElementById('rankPeriodPill');
    if (pill) pill.textContent = `${fmt(sd, sm)} – ${fmt(ed, em)}`;
  } catch (e) {
    console.error('Erro ao carregar leaderboard:', e.message);
  }
}

async function resetWeekScore() {
  if (!wpdSelectedWeek) return;
  const { start, end } = wpdSelectedWeek;
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  const fmtD = (d, m) => `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
  if (!confirm(`Zerar seu score de ${fmtD(sd,sm)} a ${fmtD(ed,em)}?\nSuas horas registradas nesse período serão excluídas.`)) return;
  try {
    await api(`/api/time-entries?weekStart=${start}`, { method: 'DELETE' });
    document.getElementById('weekPickerDialog').close();
    await refreshAll();
  } catch (e) {
    console.error('Erro ao zerar score:', e.message);
  }
}

function initWeekPicker() {
  document.getElementById('rankCalBtn')?.addEventListener('click', openWeekPicker);
  document.getElementById('wpdConfirm')?.addEventListener('click', confirmWeekPicker);
  document.getElementById('wpdResetScore')?.addEventListener('click', resetWeekScore);
  document.getElementById('wpdPrev')?.addEventListener('click', () => {
    wpdCursor = wpdCursor.month === 0
      ? { year: wpdCursor.year - 1, month: 11 }
      : { year: wpdCursor.year, month: wpdCursor.month - 1 };
    renderWpdCalendar();
  });
  document.getElementById('wpdNext')?.addEventListener('click', () => {
    wpdCursor = wpdCursor.month === 11
      ? { year: wpdCursor.year + 1, month: 0 }
      : { year: wpdCursor.year, month: wpdCursor.month + 1 };
    renderWpdCalendar();
  });
  document.getElementById('weekPickerDialog')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });
}

async function init() {
  if (!getToken()) {
    window.location.href = '/';
    return;
  }

  try {
    userProfile = await api('/api/users/me');
    const profileInitial = (userProfile.name || 'U').trim().charAt(0).toUpperCase();
    document.getElementById('profileInitial').textContent = profileInitial || 'U';
    mustChangePassword = Boolean(userProfile.mustChangePassword);
  } catch {
    logout();
    return;
  }

  document.getElementById('logoutBtn').addEventListener('click', logout);
  initProfileAvatar();
  document.getElementById('openPasswordBtn').addEventListener('click', () => document.getElementById('passwordDialog').showModal());
  document.getElementById('passwordForm').addEventListener('submit', submitPasswordChange);
  const startBtn = document.getElementById('startSessionBtn');
  const stopBtn  = document.getElementById('stopSessionBtn');
  if (startBtn) startBtn.addEventListener('click', startSession);
  if (stopBtn)  stopBtn.addEventListener('click', stopSession);
  document.getElementById('leaderboardWeeks')?.addEventListener('change', loadLeaderboard);
  const weeksEl = document.getElementById('overviewWeeks');
  if (weeksEl) weeksEl.addEventListener('change', async (event) => {
    overviewWeeks = Number(event.target.value);
    await loadOverview();
  });
  const calInEl = document.getElementById('overviewCalendarIn');
  if (calInEl) calInEl.addEventListener('change', async (event) => {
    overviewCalendarIn = event.target.value;
    currentMonth = event.target.value;
    await Promise.all([loadOverview(), loadCompanyCards(), loadConsistency(), loadDailyChartData()]);
  });
  document.getElementById('calendarMonth').addEventListener('change', async (event) => {
    currentMonth = event.target.value;
    await loadConsistency();
  });

  const dialog = document.getElementById('passwordDialog');
  dialog.addEventListener('cancel', (event) => {
    if (mustChangePassword) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    document.getElementById('passwordMessage').textContent = '';
    if (mustChangePassword) dialog.showModal();
  });

  toggleAppLock(mustChangePassword);
  if (mustChangePassword) {
    document.getElementById('passwordMessage').textContent = 'Troca obrigatoria: use a senha atual do login e defina uma nova senha pessoal.';
    dialog.showModal();
  }

  const weeksInitEl = document.getElementById('overviewWeeks');
  if (weeksInitEl) weeksInitEl.value = String(overviewWeeks);
  const calInInitEl = document.getElementById('overviewCalendarIn');
  if (calInInitEl) calInInitEl.value = overviewCalendarIn;
  // Show admin-only UI
  if (userProfile && userProfile.role === 'admin') {
    _isAdminUser = true;
    const admNavTab = document.getElementById('admNavTab');
    if (admNavTab) admNavTab.style.display = '';
    const syncBtn = document.getElementById('clickupSyncBtn');
    if (syncBtn) syncBtn.style.display = '';
  }

  // Aba Rotina: admins + usuários com cargo de conclusão (storymaker/ugc/publisher)
  if (userProfile) {
    const canSeeRotina = userProfile.role === 'admin' || isRoutineMemberCargo(userProfile.cargo, userProfile.name);
    const rotinaTab = document.getElementById('rotinaNavTab');
    if (rotinaTab) rotinaTab.style.display = canSeeRotina ? '' : 'none';

    // Aba Rituais: visível apenas para Anny Beatriz
    const canSeeRituais = userProfile.email === 'anny.beatriz@grupoquatro5.com';
    const rituaisTab = document.getElementById('rituaisNavTab');
    if (rituaisTab) rituaisTab.style.display = canSeeRituais ? '' : 'none';
  }

  initSidebarPanels();
  initDailyPanel();
  initTimerSection();
  initWeekPicker();
  initDateFilterBars();
  initCalPopup();
  initSnapshotWeekDialog();
  initHistoricoFilters();
  initAdmFilters();
  initTeamDaily();

  hideLoadingOverlay();
  await refreshAll();
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// DATE FILTER BAR  (shared — Daily + Histórico)
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

const _dfb = {
  daily: { from: null, to: null, preset: 'semana' },
  hist:  { from: null, to: null, preset: 'mes' },
};

function dfbPresetToRange(preset, days) {
  const today = todayISO();
  const now   = new Date();
  if (days) {
    const start = new Date(now);
    start.setDate(now.getDate() - Number(days) + 1);
    return { from: start.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'hoje') return { from: today, to: today };
  if (preset === 'semana') {
    // Segunda-feira até domingo da semana atual
    const dow = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
  }
  if (preset === 'ultima-semana') {
    // Segunda-domingo da semana anterior (fechada)
    const dow = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + 1 - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
  }
  if (preset === 'mes') {
    // Dia 01 do mês atual até hoje
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: first.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'mes-ant') {
    // Mês anterior completo
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  return { from: today, to: today };
}

// Retorna meta ajustada ao período selecionado no Painel Daily (conta dias úteis seg–sex)
function getDailyAdjustedGoal(weeklyGoal) {
  const from = _dfb.daily.from;
  const to   = _dfb.daily.to;
  if (!from || !to || !weeklyGoal) return weeklyGoal || 0;
  let workdays = 0;
  const end = new Date(to + 'T00:00:00');
  for (let c = new Date(from + 'T00:00:00'); c <= end; c.setDate(c.getDate() + 1)) {
    const dow = c.getDay();
    if (dow >= 1 && dow <= 5) workdays++;
  }
  if (workdays < 1) workdays = 1;
  return Math.round(weeklyGoal * workdays / 5);
}

function getMetaPeriodLabel(weeklyGoal) {
  const from = _dfb.daily.from;
  const to   = _dfb.daily.to;
  if (!from || !to) return `Meta semanal: ${weeklyGoal} pts`;
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  if (days <= 1)                return `Meta do dia: ${Math.round(weeklyGoal / 5)} pts`;
  if (days <= 7)                return `Meta semanal: ${weeklyGoal} pts`;
  if (days >= 28 && days <= 31) return `Meta mensal: ${weeklyGoal * 4} pts`;
  const adj = Math.round((days / 7) * weeklyGoal);
  return `Meta (${days}d): ${adj} pts`;
}

function dfbFormatPeriodLabel(from, to) {
  if (!from || !to) return '';
  const fmt = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  return `${fmt(from)} — ${fmt(to)}`;
}

function dfbSetInputs(target, from, to) {
  const fromEl = document.getElementById(target === 'daily' ? 'dailyDFBFrom' : 'histDFBFrom');
  const toEl   = document.getElementById(target === 'daily' ? 'dailyDFBTo'   : 'histDFBTo');
  if (fromEl) fromEl.value = from || '';
  if (toEl)   toEl.value   = to   || '';
}

// Recalcula from/to do preset armazenado. Presets baseados em dias ficam como '7d', '30d' etc.
function dfbRecalcPreset(target) {
  const stored = _dfb[target].preset;
  if (!stored || stored === 'custom') return;
  const daysMatch = /^(\d+)d$/.exec(stored);
  const range = daysMatch
    ? dfbPresetToRange(null, Number(daysMatch[1]))
    : dfbPresetToRange(stored, null);
  _dfb[target].from = range.from;
  _dfb[target].to   = range.to;
  dfbSetInputs(target, range.from, range.to);
}

function dfbUpdatePeriodLabel(target) {
  if (target !== 'daily') return;
  const el = document.getElementById('dailyDFBPeriodLabel');
  if (el) el.textContent = dfbFormatPeriodLabel(_dfb.daily.from, _dfb.daily.to);
}

function initDateFilterBars() {
  // ── Initialize defaults ──────────────────────────────────────────
  const dailyRange = dfbPresetToRange('semana', null);
  _dfb.daily.from   = dailyRange.from;
  _dfb.daily.to     = dailyRange.to;
  _dfb.daily.preset = 'semana';
  dfbSetInputs('daily', dailyRange.from, dailyRange.to);
  dfbUpdatePeriodLabel('daily');

  const histRange = dfbPresetToRange('mes', null);
  _dfb.hist.from   = histRange.from;
  _dfb.hist.to     = histRange.to;
  _dfb.hist.preset = 'mes';
  dfbSetInputs('hist', histRange.from, histRange.to);
  document.querySelector('.dfb-pill[data-dfb="hist"][data-preset="mes"]')?.classList.add('active');

  // ── Pill clicks ──────────────────────────────────────────────────
  document.querySelectorAll('.dfb-pill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.dfb;
      const days   = btn.dataset.days;
      const preset = btn.dataset.preset;

      // Personalizado — abre dialog de seleção, não aplica ainda
      if (preset === 'custom' && target === 'daily') {
        const fromEl = document.getElementById('dailyCustomFromInput');
        const toEl   = document.getElementById('dailyCustomToInput');
        if (fromEl) fromEl.value = _dfb.daily.from || '';
        if (toEl)   toEl.value   = _dfb.daily.to   || '';
        document.getElementById('dailyCustomDialog').showModal();
        return;
      }

      const range = dfbPresetToRange(preset, days);

      // Update state
      _dfb[target].from   = range.from;
      _dfb[target].to     = range.to;
      _dfb[target].preset = preset || `${days}d`;

      // Update active pill
      document.querySelectorAll(`.dfb-pill[data-dfb="${target}"]`).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update inputs
      dfbSetInputs(target, range.from, range.to);
      dfbUpdatePeriodLabel(target);

      // Reload
      if (target === 'daily') await loadTeamDaily();
      else                    await loadHistoricoPanel();
    });
  });

  // ── Manual date input changes ────────────────────────────────────
  ['daily', 'hist'].forEach((target) => {
    const prefix = target === 'daily' ? 'daily' : 'hist';
    const fromEl = document.getElementById(`${prefix}DFBFrom`);
    const toEl   = document.getElementById(`${prefix}DFBTo`);
    const onManual = async () => {
      const f = fromEl?.value;
      const t = toEl?.value;
      if (!f || !t) return;
      _dfb[target].from   = f;
      _dfb[target].to     = t;
      _dfb[target].preset = 'custom';
      document.querySelectorAll(`.dfb-pill[data-dfb="${target}"]`).forEach((b) => b.classList.remove('active'));
      dfbUpdatePeriodLabel(target);
      if (target === 'daily') await loadTeamDaily();
      else                    await loadHistoricoPanel();
    };
    fromEl?.addEventListener('change', onManual);
    toEl?.addEventListener('change',   onManual);
  });

  // ── Daily custom range dialog ────────────────────────────────────
  document.getElementById('dailyCustomCancel')?.addEventListener('click', () =>
    document.getElementById('dailyCustomDialog').close()
  );
  document.getElementById('dailyCustomApply')?.addEventListener('click', async () => {
    const from = document.getElementById('dailyCustomFromInput')?.value;
    const to   = document.getElementById('dailyCustomToInput')?.value;
    if (!from || !to) return;
    _dfb.daily.from   = from;
    _dfb.daily.to     = to;
    _dfb.daily.preset = 'custom';
    document.querySelectorAll('.dfb-pill[data-dfb="daily"]').forEach(b => b.classList.remove('active'));
    document.querySelector('.dfb-pill[data-dfb="daily"][data-preset="custom"]')?.classList.add('active');
    dfbSetInputs('daily', from, to);
    dfbUpdatePeriodLabel('daily');
    document.getElementById('dailyCustomDialog').close();
    await loadTeamDaily();
  });

  // ── Calendar button ──────────────────────────────────────────────
  document.getElementById('tdCalBtn')?.addEventListener('click', () => openCalPopup());

  // Pré-carrega histórico em background para que já esteja pronto ao abrir a aba
  loadHistoricoPanel().catch(() => {});
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// CALENDAR POPUP
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

let _cpCursor   = null;
let _cpDays     = {};   // { 'YYYY-MM-DD': count }
let _cpSel      = null; // { from, to }
let _cpLoading  = false;

function _cpGetMonSat(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow  = date.getDay(); // 0=Sun…6=Sat
  // Monday of this week
  const mon = new Date(date);
  mon.setDate(d - (dow === 0 ? 6 : dow - 1));
  // Saturday = mon + 5
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  return {
    from: `${mon.getFullYear()}-${pad(mon.getMonth()+1)}-${pad(mon.getDate())}`,
    to:   `${sat.getFullYear()}-${pad(sat.getMonth()+1)}-${pad(sat.getDate())}`,
  };
}

function renderCalPopup() {
  const { year, month } = _cpCursor;
  document.getElementById('cpYear').textContent  = year;
  document.getElementById('cpMonth').textContent = CAL_MONTH_NAMES[month];

  const grid        = document.getElementById('cpGrid');
  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mon=0…Sat=5; Sun is skipped
  const firstDow    = firstDay.getDay(); // 0=Sun,1=Mon,…,6=Sat
  const offset      = firstDow === 0 ? -1 : firstDow - 1; // cells before day 1 (Sun gets -1 = skip)

  let html = '';

  // Empty prefix cells
  for (let i = 0; i < Math.max(0, offset); i++) {
    html += `<div class="cp-cell cp-empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(year, month, d);
    const dow     = date.getDay();
    if (dow === 0) continue; // skip Sundays

    const iso     = `${year}-${pad(month + 1)}-${pad(d)}`;
    const count   = _cpDays[iso] || 0;
    let cls       = 'cp-cell';

    if (_cpSel) {
      if      (iso === _cpSel.from && iso === _cpSel.to) cls += ' cp-selected cp-range-start cp-range-end';
      else if (iso === _cpSel.from)                       cls += ' cp-selected cp-range-start';
      else if (iso === _cpSel.to)                         cls += ' cp-selected cp-range-end';
      else if (iso > _cpSel.from && iso < _cpSel.to)     cls += ' cp-in-range';
    }

    if (count > 0 && !cls.includes('cp-selected') && !cls.includes('cp-in-range')) {
      cls += ' cp-has-tasks';
    }

    html += `<button type="button" class="${cls}" data-iso="${iso}">${d}</button>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.cp-cell[data-iso]').forEach((cell) => {
    cell.addEventListener('click', () => {
      _cpSel = _cpGetMonSat(cell.dataset.iso);
      renderCalPopup();
    });
  });

  // Period label
  const lbl = document.getElementById('cpPeriodLabel');
  if (lbl && _cpSel) {
    const [, sm, sd] = _cpSel.from.split('-').map(Number);
    const [, em, ed] = _cpSel.to.split('-').map(Number);
    lbl.textContent = sm === em
      ? `Período: ${sd} – ${ed} de ${CAL_MONTH_NAMES[sm-1]}`
      : `Período: ${sd} de ${CAL_MONTH_NAMES[sm-1]} – ${ed} de ${CAL_MONTH_NAMES[em-1]}`;
  } else if (lbl) {
    lbl.textContent = 'Selecione uma semana';
  }

  const confirmBtn = document.getElementById('cpConfirm');
  if (confirmBtn) confirmBtn.disabled = !_cpSel;
}

async function openCalPopup() {
  const now    = new Date();
  _cpCursor    = { year: now.getFullYear(), month: now.getMonth() };
  _cpSel       = null;
  _cpDays      = {};

  document.getElementById('calPopupDlg').showModal();
  renderCalPopup();

  // Fetch task history from ClickUp
  if (!_cpLoading) {
    _cpLoading = true;
    try {
      const data = await api('/api/focus?action=clickup-calendar');
      _cpDays    = data.days || {};
      renderCalPopup();
    } catch (err) {
      console.warn('[cal-popup]', err.message);
    } finally {
      _cpLoading = false;
    }
  }
}

function initCalPopup() {
  document.getElementById('cpPrev')?.addEventListener('click', () => {
    _cpCursor = _cpCursor.month === 0
      ? { year: _cpCursor.year - 1, month: 11 }
      : { year: _cpCursor.year, month: _cpCursor.month - 1 };
    renderCalPopup();
  });

  document.getElementById('cpNext')?.addEventListener('click', () => {
    _cpCursor = _cpCursor.month === 11
      ? { year: _cpCursor.year + 1, month: 0 }
      : { year: _cpCursor.year, month: _cpCursor.month + 1 };
    renderCalPopup();
  });

  document.getElementById('cpCancel')?.addEventListener('click', () => {
    document.getElementById('calPopupDlg').close();
  });

  document.getElementById('cpConfirm')?.addEventListener('click', async () => {
    if (!_cpSel) return;
    document.getElementById('calPopupDlg').close();

    // Apply selection to Daily filter
    _dfb.daily.from   = _cpSel.from;
    _dfb.daily.to     = _cpSel.to;
    _dfb.daily.preset = 'custom';
    dfbSetInputs('daily', _cpSel.from, _cpSel.to);
    document.querySelectorAll('.dfb-pill[data-dfb="daily"]').forEach((b) => b.classList.remove('active'));
    await loadTeamDaily();
  });

  document.getElementById('calPopupDlg')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// TEAM DAILY PANEL
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

let _tdRefreshTimer   = null;
let _tdCountInterval  = null;
let _tdIsLive         = false;
let _tdLastMembers    = [];
let _tdSelectedPerson = null;
let _rankingWeekOffset = 0;
const _rankingCache    = {}; // null = all members (grid view)
const _tdGroupExpanded = {}; // { [`${memberId}_${cat}`]: boolean } — collapsed by default

// Cache do painel daily — evita re-fetch ao trocar de filtro e ao voltar ao painel
const _tdCache      = new Map(); // cacheKey → { data, ts }
const TD_CACHE_TTL  = 60_000;   // 60 s — alinha com o countdown de auto-refresh
let   _tdFetchVer   = 0;        // "latest wins" — descarta respostas de chamadas obsoletas

function getCategoryColor(cat) {
  if (!cat) return '#8b5cf6';
  const n = normalizeText(cat);
  if (n.includes('seubon') || n.includes('seub')) return '#f6c200';
  if (n.includes('onevo')) return '#22d3a3';
  if (n.includes('carb')) return '#94a3b8';
  return '#8b5cf6';
}

function weekPctColor(pct) {
  if (pct >= 100) return '#f6c200';
  return '#8892a4';
}

// ── Person filter + table view ───────────────────────────────────────

function renderPersonFilter(members) {
  const bar = document.getElementById('tdPersonBar');
  if (!bar) return;

  let html = `<button class="td-ppill${!_tdSelectedPerson ? ' active' : ''}" data-uid="all">Todos</button>`;
  members.forEach((m) => {
    html += `<button class="td-ppill${_tdSelectedPerson === m.id ? ' active' : ''}" data-uid="${m.id}">${m.name}</button>`;
  });
  bar.innerHTML = html;
  bar.style.display = '';

  bar.querySelectorAll('.td-ppill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      _tdSelectedPerson = uid === 'all' ? null : Number(uid);
      renderTdView(_tdLastMembers);
    });
  });
}

function renderTdView(members) {
  const grid = document.getElementById('teamDailyGrid');
  if (!grid) return;

  renderPersonFilter(members);

  if (_tdSelectedPerson) {
    const member = members.find((m) => m.id === _tdSelectedPerson);
    if (member) {
      grid.classList.add('td-grid-full');
      grid.innerHTML = renderPersonTable(member);
      // Se a pessoa selecionada é o usuário logado e tem acesso a rotinas, injeta tabela de rotina
      if (member.id === userProfile?.id && isRoutineMemberCargo(userProfile?.cargo, userProfile?.name)) {
        _injectPersonRoutineSection();
      }
      return;
    }
  }

  grid.classList.remove('td-grid-full');
  grid.innerHTML = members.map(renderMemberCard).join('');
}

function renderPersonTable(member) {
  const weekPts      = member.ptsSemana || member.ptsToday || 0;
  const adjustedGoal = member.metaForPeriod != null ? member.metaForPeriod : getDailyAdjustedGoal(member.weeklyGoal);

  const doneCount  = member.doneSemana  != null ? member.doneSemana  : (member.doneToday  || 0);
  const totalCount = member.totalSemana != null ? member.totalSemana : (member.totalToday || 0);

  const adjustedPct  = member.isCompletionBased
    ? (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)
    : (adjustedGoal > 0 ? Math.round((weekPts / adjustedGoal) * 100) : member.weekPct);
  const barW = Math.min(adjustedPct, 100);
  const barColor = adjustedPct >= 100 ? '#f6c200'
                 : adjustedPct >= 70  ? '#22d3a3'
                 : adjustedPct >= 40  ? '#f6a623'
                 : '#f04444';

  const metaText = member.isCompletionBased
    ? `Conclusão: ${doneCount}/${totalCount} itens`
    : `Em andamento: ${weekPts} / ${adjustedGoal} pts`;

  const dot = (active, color) => active
    ? `<span class="pt-dot" style="background:${color}"></span>`
    : `<span class="pt-dot-empty"></span>`;

  const rows = member.tasks.length
    ? member.tasks.map((task) => {
        const cat     = task.statusCat || 'todo';
        const title   = task.title.length > 56 ? `${task.title.slice(0, 56)}…` : task.title;
        const pts     = task.points
          ? `<span class="pt-pts">${task.points}p</span>`
          : (cat !== STATUS_CAT.DONE ? `<span class="pt-no-pts" title="Sem pontuação">${IC.bell}</span>` : '');
        const coBadge = taskEmpresaBadge(task.empresa);
        return `<tr class="pt-row${cat === STATUS_CAT.DONE ? ' pt-row-done' : ''}">
          <td class="pt-task-name">${title}${pts}${coBadge}</td>
          <td class="pt-col">${dot(cat === STATUS_CAT.DOING,    '#3b82f6')}</td>
          <td class="pt-col">${dot(cat === STATUS_CAT.DONE,     '#22d3a3')}</td>
          <td class="pt-col">${dot(cat === STATUS_CAT.REVISION, '#f59e0b')}</td>
          <td class="pt-col">${dot(cat === STATUS_CAT.APPROVAL, '#f6a623')}</td>
          <td class="pt-col">${dot(cat === 'leader',   '#9b59b6')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" class="pt-empty">Sem tasks no período</td></tr>`;

  return `<div class="person-table-wrap">
    <div class="pt-head">
      <div>
        <span class="pt-name">${member.name}</span>
        <span class="pt-role">${member.cargo}</span>
      </div>
      <div class="pt-head-stats">
        <span class="pt-hstat">${doneCount}/${totalCount} concluídas</span>
        <span class="pt-hstat accent">${weekPts} pts</span>
        <span class="pt-hstat" style="color:${barColor}">${adjustedPct}%</span>
      </div>
    </div>
    <div class="pt-progress-row">
      <div class="pt-progress-track">
        <div class="pt-progress-fill" style="width:${barW}%;background:${barColor}"></div>
      </div>
      <span class="pt-meta-label">${metaText} · ${getMetaPeriodLabel(member.weeklyGoal)}</span>
    </div>
    <div class="pt-table-wrap">
      <table class="person-table">
        <thead>
          <tr>
            <th class="pt-th-task"></th>
            <th class="pt-th">Andamento</th>
            <th class="pt-th">Completo</th>
            <th class="pt-th">Alteração</th>
            <th class="pt-th">Aprovar</th>
            <th class="pt-th">Aprov. Líder</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pt-routine-section" id="pt-routine-section" style="display:none">
      <div class="pt-routine-header">Rotina da Semana</div>
      <div id="pt-routine-body"></div>
    </div>
  </div>`;
}

async function _injectPersonRoutineSection() {
  const section = document.getElementById('pt-routine-section');
  const body    = document.getElementById('pt-routine-body');
  if (!section || !body) return;
  section.style.display = '';
  body.innerHTML = '<p class="rp-loading" style="font-size:13px;padding:8px 0">Carregando rotinas…</p>';

  try {
    const w = routineWeekOf(todayISO());
    const data = await api(`/api/routines?action=week-grid&from=${w.from}&to=${w.to}`);
    const { routines = [], dates = [] } = data;

    if (!routines.length) {
      body.innerHTML = '<p class="rp-loading" style="font-size:13px;padding:8px 0">Nenhuma rotina atribuída.</p>';
      return;
    }

    const DOW_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const today = todayISO();
    const nowMs = Date.now();

    let html = `<table class="ptr-table"><thead><tr><th class="ptr-th-title">Rotina</th>`;
    for (const d of dates) {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      html += `<th class="ptr-th-day${d === today ? ' ptr-today' : ''}">${DOW_SHORT[dow]}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (const r of routines) {
      const coColor = r.company === 'SeuBoné' ? '#f6c200' : r.company === 'Onevo' ? '#22d3a3' : '#94a3b8';
      const coAbbr  = r.company === 'SeuBoné' ? 'SB' : r.company === 'Onevo' ? 'ON' : r.company ? 'CB' : '';
      const coBadge = coAbbr ? `<span class="mc-task-co" style="background:${coColor}22;color:${coColor}">${coAbbr}</span>` : '';
      html += `<tr class="ptr-row"><td class="ptr-td-title">${escHtml(r.title)}${coBadge}</td>`;
      for (const d of dates) {
        if (!(d in r.days)) {
          html += `<td class="ptr-td ptr-na">—</td>`;
        } else {
          const entry  = r.days[d];
          const status = entry?.status ?? null;
          if (status === ROUTINE_STATUS.DONE) {
            html += `<td class="ptr-td ptr-done" title="Concluída">✓</td>`;
          } else if (status === ROUTINE_STATUS.SKIP) {
            html += `<td class="ptr-td ptr-skip" title="${escHtml(entry?.reason || 'Não feita')}">✗</td>`;
          } else {
            const isFuture = new Date(`${d}T23:59:59Z`).getTime() > nowMs;
            html += `<td class="ptr-td${isFuture ? ' ptr-future' : ' ptr-pending'}" title="${isFuture ? 'Ainda não chegou' : 'Pendente'}">·</td>`;
          }
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<p style="color:#e05252;font-size:13px;padding:8px 0">Erro: ${err.message}</p>`;
  }
}

// Retorna badge HTML para a empresa de uma task
// Só exibe quando a empresa é reconhecida — tarefas sem empresa ficam sem badge
function taskEmpresaBadge(empresa) {
  const CO = {
    'SeuBoné':  { abbr: 'SB', color: '#f6c200' },
    'Onevo':    { abbr: 'ON', color: '#22d3a3' },
    'Carbone':  { abbr: 'CB', color: '#94a3b8' },
  };
  if (empresa && CO[empresa]) {
    const { abbr, color } = CO[empresa];
    return `<span class="mc-task-co" style="background:${color}22;color:${color}">${abbr}</span>`;
  }
  return '';
}

// Renderiza uma linha de task (pai)
function _mcTaskLi(task, color, isDone, isOverdue = false) {
  const pts     = task.points ? `${task.points}p` : '';
  const noPtsIcon = !task.points && !isDone ? `<span class="mc-no-pts" title="Sem pontuação">${IC.bell}</span>` : '';
  const title   = task.title.length > 40 ? `${task.title.slice(0, 40)}…` : task.title;
  const doneClass = isDone ? ' done' : '';
  const overdueClass = isOverdue ? ' mc-task-overdue' : '';
  const dotColor  = isOverdue ? '#f04444' : (task.statusColor || color);
  const coBadge   = taskEmpresaBadge(task.empresa || '');
  return `<li class="mc-task${overdueClass}">
    <span class="mc-task-dot" style="background:${dotColor}"></span>
    <span class="mc-task-name${doneClass}">${title}</span>
    ${pts ? `<span class="mc-task-pts">${pts}</span>` : noPtsIcon}
    ${coBadge}
  </li>`;
}

// Renderiza uma linha de subtask (filha, indentada)
function _mcSubtaskLi(sub) {
  const pts     = sub.points ? `${sub.points}p` : '';
  const title   = sub.title.length > 36 ? `${sub.title.slice(0, 36)}…` : sub.title;
  const doneClass = sub.is_done ? ' done' : '';
  const dotColor  = sub.statusColor || (sub.is_done ? '#22d3a3' : '#4a5568');
  return `<li class="mc-subtask">
    <span class="mc-subtask-line"></span>
    <span class="mc-task-dot" style="background:${dotColor};width:5px;height:5px"></span>
    <span class="mc-task-name${doneClass}">${title}</span>
    ${pts ? `<span class="mc-task-pts">${pts}</span>` : ''}
  </li>`;
}

function renderMemberCard(member) {
  const weekPts      = member.ptsSemana || member.ptsToday || 0;
  const adjustedGoal = member.metaForPeriod != null ? member.metaForPeriod : getDailyAdjustedGoal(member.weeklyGoal);

  const doneCount  = member.doneSemana  != null ? member.doneSemana  : (member.doneToday  || 0);
  const totalCount = member.totalSemana != null ? member.totalSemana : (member.totalToday || 0);

  // isCompletionBased (Malu/Zion): progresso = rotinas+tasks concluídas / total esperado
  // pts-based: progresso = ptsSemana / meta semanal
  const adjustedPct  = member.isCompletionBased
    ? (totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0)
    : (adjustedGoal > 0 ? Math.round((weekPts / adjustedGoal) * 100) : member.weekPct);
  const wColor   = weekPctColor(adjustedPct);
  const barW     = Math.min(adjustedPct, 100);
  const barColor = adjustedPct >= 100 ? '#f6c200'
                 : adjustedPct >= 70  ? '#22d3a3'
                 : adjustedPct >= 40  ? '#f6a623'
                 : '#f04444';

  const overdueChip = '';

  // Validação inline — warnings no console sem bloquear UI
  if (!member.isRoutineBased && !(member.weeklyGoal > 0)) console.warn(`[meta] meta zero para ${member.name}`);
  if (member.metaForPeriod < 0)   console.warn(`[meta] metaForPeriod negativo: ${member.name}`);
  if (member.horas < 0 || member.horas > 200) console.warn(`[horas] fora do range: ${member.name} = ${member.horas}h`);
  if (member.coef < 0 || member.coef > 300)   console.warn(`[coef] fora do range: ${member.name} = ${member.coef}`);

  const periodLbl = member.periodLabel || 'semana';
  const metaText  = member.isRoutineBased
    ? `meta rotinas · ${periodLbl}`
    : adjustedGoal > 0
      ? `${weekPts} / ${adjustedGoal} pts · meta ${periodLbl}`
      : 'sem meta definida';

  // Período do filtro ativo (YYYY-MM-DD)
  const periodFrom = _dfb.daily.from || todayISO();
  const periodTo   = _dfb.daily.to   || todayISO();

  // Atribuição por prioridade: status especiais reclamam overdue antes do catch-all
  const claimed = new Set();
  const take = (pred) => {
    const r = member.tasks.filter(t => !claimed.has(t.id) && pred(t));
    r.forEach(t => claimed.add(t.id));
    return r;
  };

  // 1ª rodada — status ativos sem prazo OU com prazo <= fim do período
  const alteracaoTasks = take(t => !t.is_done && t.statusCat === STATUS_CAT.REVISION && (!t.due_date || t.due_date <= periodTo));
  const aprovarTasks   = take(t => !t.is_done && t.statusCat === STATUS_CAT.APPROVAL && (!t.due_date || t.due_date <= periodTo));
  const publicarTasks  = take(t => !t.is_done && t.statusCat === STATUS_CAT.PUBLISH  && (!t.due_date || t.due_date <= periodTo));
  // 2ª rodada — atrasadas: apenas TODO/DOING com due_date antes do período (não concluídas)
  const atrasadasTasks = take(t =>
    !t.is_done && t.due_date && t.due_date < periodFrom &&
    (t.statusCat === STATUS_CAT.TODO || t.statusCat === STATUS_CAT.DOING)
  );
  // 3ª rodada — pendentes: due_date no período OU DOING sem prazo (em andamento sem data)
  const pendenteTasks  = take(t =>
    !t.is_done &&
    (t.statusCat === STATUS_CAT.TODO || t.statusCat === STATUS_CAT.DOING) &&
    (
      (t.due_date && t.due_date >= periodFrom && t.due_date <= periodTo) ||
      (!t.due_date && t.statusCat === STATUS_CAT.DOING)
    )
  );
  // 4ª rodada — concluídas: closed_date no período OU due_date no período
  const completasTasks = take(t => {
    if (!t.is_done) return false;
    if (t.closed_date && t.closed_date >= periodFrom && t.closed_date <= periodTo) return true;
    return Boolean(t.due_date && t.due_date >= periodFrom && t.due_date <= periodTo);
  });

  // Stat de concluídas = tasks exibidas completas + subtasks done; fallback para doneSemana da API
  const doneSubs = member.tasks.reduce((n, t) =>
    n + (t.subtasks || []).filter(s => s.is_done).length, 0);
  const tDone = (completasTasks.length + doneSubs) || doneCount;

  // Helper: renderiza seção (colapsável ou não)
  const renderSection = (label, color, tasks, collapsible, catKey) => {
    if (!tasks.length) return '';
    if (collapsible) {
      const key = `${member.id}_${catKey}`;
      const expanded = _tdGroupExpanded[key] === true;
      let html = `<li class="mc-status-header mc-group-header" style="color:${color}">
        <span>${label} (${tasks.length})</span>
        <button class="mc-group-toggle" data-uid="${member.id}" data-cat="${catKey}" aria-label="Expandir ${label}" aria-expanded="${expanded}">
          <span class="mc-group-arrow${expanded ? ' mc-group-arrow-open' : ''}">›</span>
        </button>
      </li>`;
      if (expanded) {
        tasks.forEach(task => {
          html += _mcTaskLi(task, color, catKey === STATUS_CAT.DONE);
          (task.subtasks || []).forEach(sub => { html += _mcSubtaskLi(sub); });
        });
      }
      return html;
    }
    let html = `<li class="mc-status-header" style="color:${color}">${label} (${tasks.length})</li>`;
    tasks.forEach(task => {
      html += _mcTaskLi(task, color, false);
      (task.subtasks || []).forEach(sub => { html += _mcSubtaskLi(sub); });
    });
    return html;
  };

  // Montagem na ordem de exibição
  let taskRows = '';
  if (atrasadasTasks.length) {
    taskRows += `<li class="mc-status-header mc-overdue-header">${IC.warn} ATRASADAS (${atrasadasTasks.length})</li>`;
    atrasadasTasks.forEach(task => {
      taskRows += _mcTaskLi(task, '#f04444', false, true);
      (task.subtasks || []).forEach(sub => { taskRows += _mcSubtaskLi(sub); });
    });
  }
  taskRows += renderSection('EM ALTERAÇÃO', '#f59e0b', alteracaoTasks, false, STATUS_CAT.REVISION);
  taskRows += renderSection('PENDENTE',     '#6b7585', pendenteTasks,  false, STATUS_CAT.TODO);
  taskRows += renderSection('APROVAR',      '#f6a623', aprovarTasks,   true,  STATUS_CAT.APPROVAL);
  taskRows += renderSection('PUBLICAR',     '#7c3aed', publicarTasks,  true,  STATUS_CAT.PUBLISH);
  taskRows += renderSection('COMPLETAS',    '#22d3a3', completasTasks, true,  STATUS_CAT.DONE);
  if (!taskRows) taskRows = '<li class="mc-no-tasks">Sem tasks no período</li>';

  const metaStatus  = member.metaStatus || '';
  const metaBadgeHtml = metaStatus === 'above_120'
    ? `<span class="mc-meta-badge mc-badge-120">120% ${IC.starOn}</span>`
    : metaStatus === 'above_100'
    ? `<span class="mc-meta-badge mc-badge-100">Meta ✓</span>`
    : '';

  return `<div class="member-card">
    <div class="mc-head">
      <div class="mc-info">
        <span class="mc-name">${member.name} ${metaBadgeHtml}</span>
        <span class="mc-role">${member.cargo || '—'}</span>
      </div>
      <span class="mc-status-dot${tDone > 0 ? ' active' : ''}"></span>
    </div>

    <div class="mc-stats">
      <div class="mc-stat">
        <span class="mc-stat-val">${tDone}</span>
        <span class="mc-stat-lbl">Concluídas${overdueChip}</span>
      </div>
      <div class="mc-stat-sep"></div>
      <div class="mc-stat">
        <span class="mc-stat-val">${weekPts}</span>
        <span class="mc-stat-lbl">PTS ${periodLbl}</span>
      </div>
      <div class="mc-stat-sep"></div>
      <div class="mc-stat">
        <span class="mc-stat-val" style="color:${weekPctColor(member.coef)}">${member.coef}%</span>
        <span class="mc-stat-lbl">Coeficiente</span>
      </div>
    </div>

    <div class="mc-meta-row">
      <span class="mc-meta-text">${metaText}</span>
    </div>

    <div class="mc-progress-wrap">
      <div class="mc-progress-track">
        <div class="mc-progress-fill" style="width:${barW}%;background:${barColor}"></div>
      </div>
      <span class="mc-progress-pct">${adjustedPct}%</span>
    </div>
    <div class="mc-meta-label">${adjustedGoal > 0 ? `meta ${adjustedGoal} pts · ${periodLbl}` : member.isRoutineBased ? `meta rotinas · ${periodLbl}` : 'sem meta'}</div>

    <div class="mc-coef-row">
      <span class="mc-horas">${member.horasStr}</span>
    </div>

    <ul class="mc-task-list">
      ${taskRows || '<li class="mc-no-tasks">Sem tasks no período</li>'}
      ${member.tasksTruncated ? `<li class="mc-tasks-truncated">+ ${member.tasksTotal - member.tasksShown} tasks ocultas — exibindo as ${member.tasksShown} mais recentes</li>` : ''}
    </ul>
  </div>`;
}

function renderDailyRanking(members) {
  const rankEl  = document.getElementById('tdRanking');
  const listEl  = document.getElementById('tdRankList');
  if (!rankEl || !listEl || !members || !members.length) {
    if (rankEl) rankEl.style.display = 'none';
    return;
  }

  const sorted = [...members].sort((a, b) => {
    const ca = a.coef != null ? a.coef : (a.weekPct || 0);
    const cb = b.coef != null ? b.coef : (b.weekPct || 0);
    if (cb !== ca) return cb - ca;
    return (b.ptsSemana || b.ptsToday || 0) - (a.ptsSemana || a.ptsToday || 0);
  });

  const MEDALS = [IC.medal(1), IC.medal(2), IC.medal(3)];

  listEl.innerHTML = sorted.map((m, i) => {
    const pts     = m.ptsSemana || m.ptsToday || 0;
    const coef    = m.coef != null ? m.coef : (m.weekPct || 0);
    const isPodium = i < 3 && coef >= 100;
    const coefColor = coef >= 100 ? '#f6c200' : coef >= 70 ? '#22d3a3' : coef >= 40 ? '#f6a623' : '#f04444';
    const podiumClass = isPodium ? ` rank-podium-${i + 1}` : '';
    const posCell = isPodium
      ? `<span class="td-rank-medal">${MEDALS[i]}</span>`
      : `<span class="td-rank-pos">#${i + 1}</span>`;

    return `<li class="td-rank-item${podiumClass}">
      ${posCell}
      <div class="td-rank-info">
        <span class="td-rank-name">${m.name}</span>
        <span class="td-rank-cargo">${m.cargo || '—'} · ${pts} pts</span>
      </div>
      <span class="td-rank-coef" style="color:${coefColor}">${coef}%</span>
    </li>`;
  }).join('');

  rankEl.style.display = '';
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// RANKING PANEL — seção dedicada
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

async function loadRankingPanel() {
  const wrap = document.getElementById('rankingContent');
  if (!wrap) return;

  // Cache hit para semanas já carregadas
  if (_rankingCache[_rankingWeekOffset]) {
    renderRankingFromMembers(_rankingCache[_rankingWeekOffset], _rankingWeekOffset);
    return;
  }

  wrap.innerHTML = '<p style="padding:32px;color:#5a6280;font-size:13px">Carregando ranking...</p>';
  try {
    // Semana atual: sem from/to → servidor usa weekStart..todayStr (semana completa, sem filtro de dia)
    // Semanas passadas: passa from/to → servidor usa a semana correta para todos os cálculos
    let qs = '&showOpen=1';
    if (_rankingWeekOffset !== 0) {
      const { from, to } = getRankingWeekRange(_rankingWeekOffset);
      qs += `&from=${from}&to=${to}`;
    }
    const data = await api(`/api/focus?action=clickup-live${qs}`);
    const members = data.members || [];
    _rankingCache[_rankingWeekOffset] = members;
    renderRankingFromMembers(members, _rankingWeekOffset);
  } catch (err) {
    wrap.innerHTML = `<p style="padding:32px;color:#e05252;font-size:13px">Erro ao carregar ranking: ${err.message}</p>`;
  }
}

function renderRankingFromMembers(members, weekOffset) {
  if (weekOffset === undefined) weekOffset = _rankingWeekOffset;
  const wrap = document.getElementById('rankingContent');
  if (!wrap) return;

  if (!members || !members.length) {
    wrap.innerHTML = '<p style="padding:32px;color:#5a6280;font-size:13px">Nenhum dado disponível.</p>';
    return;
  }

  // Ordena por coeficiente/% meta desc; desempate por pts
  const sorted = [...members].sort((a, b) => {
    const ca = a.coef != null ? a.coef : (a.weekPct || 0);
    const cb = b.coef != null ? b.coef : (b.weekPct || 0);
    if (cb !== ca) return cb - ca;
    return (b.ptsSemana || b.ptsToday || 0) - (a.ptsSemana || a.ptsToday || 0);
  });

  const MEDALS    = [IC.medal(1), IC.medal(2), IC.medal(3)];
  const coefColor = (pct) =>
    pct >= 100 ? '#f6c200' : pct >= 70 ? '#22d3a3' : pct >= 40 ? '#f6a623' : '#f04444';

  const rows = sorted.map((m, i) => {
    const pts           = m.ptsSemana || m.ptsToday || 0;
    const coef          = m.coef != null ? m.coef : (m.weekPct || 0);
    const done          = m.doneSemana != null ? m.doneSemana : (m.doneToday || 0);
    const total         = m.totalSemana != null ? m.totalSemana : (m.totalToday || 0);
    const metaForPeriod = m.metaForPeriod != null ? m.metaForPeriod : (m.weeklyGoal || 0);
    const goal120       = m.metaForPeriod120 != null ? m.metaForPeriod120 : (m.weeklyGoal120 || Math.round(metaForPeriod * 1.2));
    const metaStatus    = m.metaStatus || (pts >= goal120 ? 'above_120' : pts >= metaForPeriod ? 'above_100' : 'below_100');
    const isPodium    = i < 3 && coef >= 100;
    const posLabel    = isPodium
      ? `<span class="rk-medal">${MEDALS[i]}</span>`
      : `<span class="rk-pos">#${i + 1}</span>`;
    const bColor      = coefColor(coef);
    const barW        = Math.min(coef, 100);
    const metaBadge   = metaStatus === 'above_120'
      ? `<span class="rk-meta-badge rk-badge-120">120% ${IC.starOn}</span>`
      : metaStatus === 'above_100'
      ? `<span class="rk-meta-badge rk-badge-100">Meta ✓</span>`
      : '';
    const metaGoalTxt = !m.isRoutineBased && metaForPeriod > 0
      ? ` · meta ${metaForPeriod} pts` : '';

    return `<div class="rk-row${isPodium ? ` rk-podium-${i + 1}` : ''}">
      <div class="rk-left">
        ${posLabel}
        <div class="rk-info">
          <span class="rk-name">${m.name || '—'} ${metaBadge}</span>
          <span class="rk-meta">${m.cargo || '—'} · ${done}/${total} tasks · ${pts} pts${metaGoalTxt} · ${m.horasStr || '0h'}</span>
        </div>
      </div>
      <div class="rk-right">
        <div class="rk-bar-wrap">
          <div class="rk-bar-track">
            <div class="rk-bar-fill" style="width:${barW}%;background:${bColor}"></div>
          </div>
          <span class="rk-pct" style="color:${bColor}">${coef}%</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const { from, to } = getRankingWeekRange(weekOffset);
  const periodLabel   = `${formatDateBR(from)} — ${formatDateBR(to)}`;
  const weekNavLabel  = weekOffset === 0 ? 'Esta semana'
    : weekOffset === -1 ? 'Semana passada'
    : `${Math.abs(weekOffset)} semanas atrás`;
  const MIN_OFFSET = -12;

  wrap.innerHTML = `
    <div class="rk-panel">
      <div class="rk-header">
        <div>
          <div class="rk-title">${IC.trophy} Ranking Semanal</div>
          <div class="rk-subtitle">${periodLabel} · Ordenado por % meta · Pódio para coef ≥ 100%</div>
        </div>
        <div class="rk-header-right">
          <div class="rk-week-nav">
            <button class="rk-week-btn" id="rkWeekPrev" title="Semana anterior"${weekOffset <= MIN_OFFSET ? ' disabled' : ''}>‹</button>
            <span class="rk-week-nav-label">${weekNavLabel}</span>
            <button class="rk-week-btn" id="rkWeekNext" title="Próxima semana"${weekOffset >= 0 ? ' disabled' : ''}>›</button>
          </div>
          <button class="rk-refresh-btn" id="rkRefreshBtn">↺ Atualizar</button>
        </div>
      </div>
      <div class="rk-list">${rows}</div>
    </div>`;

  document.getElementById('rkRefreshBtn')?.addEventListener('click', async () => {
    delete _rankingCache[_rankingWeekOffset];
    if (_rankingWeekOffset === 0) _tdLastMembers = [];
    const btn = document.getElementById('rkRefreshBtn');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    await loadRankingPanel();
  });
  document.getElementById('rkWeekPrev')?.addEventListener('click', () => {
    if (_rankingWeekOffset <= MIN_OFFSET) return;
    _rankingWeekOffset -= 1;
    loadRankingPanel();
  });
  document.getElementById('rkWeekNext')?.addEventListener('click', () => {
    if (_rankingWeekOffset >= 0) return;
    _rankingWeekOffset += 1;
    loadRankingPanel();
  });
}

function _stopTdTimers() {
  if (_tdRefreshTimer)  { clearTimeout(_tdRefreshTimer);   _tdRefreshTimer  = null; }
  if (_tdCountInterval) { clearInterval(_tdCountInterval); _tdCountInterval = null; }
}

function _startTdCountdown(seconds, onDone) {
  _stopTdTimers();
  let remaining = seconds;
  const countEl = document.getElementById('tdCountdown');
  if (countEl) countEl.textContent = remaining;

  _tdCountInterval = setInterval(() => {
    remaining -= 1;
    if (countEl) countEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(_tdCountInterval);
      _tdCountInterval = null;
    }
  }, 1000);

  _tdRefreshTimer = setTimeout(onDone, seconds * 1000);
}

function _setLiveBadge(visible) {
  const badge = document.getElementById('tdLiveBadge');
  if (badge) badge.style.display = visible ? '' : 'none';
  _tdIsLive = visible;
}

function _renderTeamGrid(data) {
  const grid = document.getElementById('teamDailyGrid');
  if (!grid) return;

  const dateEl = document.getElementById('tdDate');
  if (dateEl && data.date) {
    const [, mo, d] = data.date.split('-').map(Number);
    dateEl.textContent = `${d} de ${CAL_MONTH_NAMES[mo - 1]}`;
  }

  if (!data.members || !data.members.length) {
    grid.innerHTML = '<p class="td-loading">Sem membros ativos.</p>';
    return;
  }

  _tdLastMembers = data.members;
  renderTdView(data.members);
}

async function loadDailyBrief() {
  const wrap = document.getElementById('dailyBriefWrap');
  if (!wrap) return;
  const user = _currentUser;
  if (!user || !user.name || !user.name.toLowerCase().includes('anny')) return;

  wrap.hidden = false;
  try {
    const resp = await fetch('/api/focus?action=daily-brief', { headers: authHeaders() });
    const data = resp.ok ? await resp.json() : null;
    if (!data || !data.brief) {
      wrap.querySelector('.daily-brief').innerHTML = `
        <div class="daily-brief-icon">☀️</div>
        <div class="daily-brief-body">
          <div class="daily-brief-header"><span class="daily-brief-title">Daily do Dia</span></div>
          <p class="daily-brief-empty">Nenhuma daily publicada hoje ainda.</p>
        </div>`;
      return;
    }
    const b = data.brief;
    const d = new Date(`${b.brief_date}T00:00:00Z`);
    const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' });
    const html = escHtml(b.content)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    wrap.querySelector('.daily-brief').innerHTML = `
      <div class="daily-brief-icon">☀️</div>
      <div class="daily-brief-body">
        <div class="daily-brief-header">
          <span class="daily-brief-title">Daily do Dia</span>
          <span class="daily-brief-date">${dateStr}</span>
        </div>
        <div class="daily-brief-text">${html}</div>
      </div>`;
  } catch (_) { wrap.hidden = true; }
}

async function loadTeamDaily({ force = false } = {}) {
  const grid = document.getElementById('teamDailyGrid');
  if (!grid) return;

  dfbRecalcPreset('daily');
  const { from, to, preset } = _dfb.daily;
  const cKey = `${from || '_'}_${to || '_'}`;
  const now  = Date.now();
  const hit  = _tdCache.get(cKey);

  // Cache hit — render imediato, reinicia countdown com tempo restante
  if (!force && hit && now - hit.ts < TD_CACHE_TTL) {
    _renderTeamGrid(hit.data);
    _setLiveBadge(true);
    _startTdCountdown(Math.max(1, Math.round((TD_CACHE_TTL - (now - hit.ts)) / 1000)), loadTeamDaily);
    return;
  }

  // Cache miss / force — apaga entrada stale e busca dados frescos
  if (force) _tdCache.delete(cKey);

  const ver = ++_tdFetchVer;
  let qs = '';
  if (preset === 'custom') {
    if (from && to) qs = `&from=${from}&to=${to}`;
  } else if (preset) {
    qs = `&filter=${encodeURIComponent(preset)}`;
  }

  // Grid vazio → spinner de primeira carga; com conteúdo → refresh silencioso (sem dimming)
  const hasContent = Boolean(grid.querySelector('.td-card, .td-grid-full, .td-member-col'));
  if (!hasContent) {
    grid.innerHTML = '<p class="td-loading">Carregando...</p>';
  }

  const _restore = () => { grid.style.opacity = ''; grid.style.pointerEvents = ''; };

  try {
    const data = await api(`/api/focus?action=clickup-live${qs}`);
    if (ver !== _tdFetchVer) { _restore(); return; } // chamada obsoleta
    _tdCache.set(cKey, { data, ts: Date.now() });
    _setLiveBadge(true);
    _restore();
    _renderTeamGrid(data);
    _startTdCountdown(60, loadTeamDaily);
  } catch (err) {
    if (ver !== _tdFetchVer) { _restore(); return; }
    _restore();
    _setLiveBadge(false);
    _stopTdTimers();
    console.warn('[clickup-live] sem acesso, usando banco:', err.message);
    try {
      const data = await api(`/api/focus?action=team-daily${qs}`);
      if (ver !== _tdFetchVer) return;
      _renderTeamGrid(data);
    } catch (err2) {
      console.error('[team-daily]', err2.message);
      if (grid) grid.innerHTML = `<p class="td-loading" style="color:#f04444">Erro: ${err2.message}</p>`;
    }
  }
}

async function handleClickupSync() {
  const btn = document.getElementById('clickupSyncBtn');
  if (!btn) return;

  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Sincronizando...';

  try {
    const result = await api('/api/focus?action=clickup-sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    btn.textContent = `✓ ${result.created} criadas`;
    await loadTeamDaily({ force: true });
  } catch (err) {
    btn.textContent = `Erro: ${(err.message || '').slice(0, 28)}`;
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = orig;
    }, 3500);
  }
}

// ── Modal universal de motivo de rotina não feita ───────────────────
function initSkipReasonModal() {
  if (document.getElementById('rpSkipOverlay')) return; // já existe
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="rp-modal-overlay" id="rpSkipOverlay" style="display:none">
      <div class="rp-modal">
        <h3 class="rp-modal-title">Por que não foi realizada?</h3>
        <p class="rp-modal-routine" id="rpSkipRoutineTitle"></p>
        <textarea class="rp-modal-reason" id="rpSkipReason"
          placeholder="Descreva o motivo (mínimo 10 caracteres)…"
          rows="4" maxlength="500"></textarea>
        <p class="rp-modal-chars"><span id="rpSkipChars">0</span>/500 · mínimo 10</p>
        <div class="rp-modal-btns">
          <button class="rp-modal-cancel" id="rpSkipCancel">Cancelar</button>
          <button class="rp-modal-confirm" id="rpSkipConfirm" disabled>Confirmar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);

  document.getElementById('rpSkipReason').addEventListener('input', (e) => {
    const len = e.target.value.trim().length;
    document.getElementById('rpSkipChars').textContent = len;
    document.getElementById('rpSkipConfirm').disabled = len < 10;
  });

  document.getElementById('rpSkipCancel').addEventListener('click', _closeSkipModal);
}

function _closeSkipModal() {
  const overlay = document.getElementById('rpSkipOverlay');
  const reasonEl = document.getElementById('rpSkipReason');
  if (overlay)  overlay.style.display = 'none';
  if (reasonEl) reasonEl.value = '';
  const chars = document.getElementById('rpSkipChars');
  const btn   = document.getElementById('rpSkipConfirm');
  if (chars) chars.textContent = '0';
  if (btn)   { btn.disabled = true; btn.onclick = null; }
}

// ── Modal de edição de rotina (Adm / Adm Master) ─────────────────────
function initRoutineEditModal() {
  if (document.getElementById('rpEditOverlay')) return;
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="rp-edit-overlay" id="rpEditOverlay" style="display:none">
      <div class="rp-edit-modal">
        <h3 class="rp-edit-modal-title">Editar Rotina</h3>
        <div class="rp-edit-field">
          <label class="rp-edit-label">Responsável</label>
          <select id="rpEditUser" class="rp-edit-select"></select>
        </div>
        <div class="rp-edit-field">
          <label class="rp-edit-label">Título</label>
          <input id="rpEditTitle" class="rp-edit-input" type="text" maxlength="120" />
        </div>
        <div class="rp-edit-field">
          <label class="rp-edit-label">Frequência</label>
          <select id="rpEditFreq" class="rp-edit-select">
            <option value="daily">Diária (Seg–Dom)</option>
            <option value="daily-weekdays">Diária (Dias úteis — Seg a Sex)</option>
            <option value="weekly">Semanal (1x/semana)</option>
            <option value="3x_week">3x na semana</option>
            <option value="custom">Personalizado (dias da semana)</option>
            <option value="monthly">Mensal (dia do mês)</option>
          </select>
        </div>
        <div id="rpEditDayWrap" style="display:none;margin:4px 0 8px">
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0 0 6px">Dias da semana:</p>
          <div class="rp-day-checkboxes" id="rpEditDayCheckboxes">
            <label class="rp-day-cb"><input type="checkbox" value="1" /> Seg</label>
            <label class="rp-day-cb"><input type="checkbox" value="2" /> Ter</label>
            <label class="rp-day-cb"><input type="checkbox" value="3" /> Qua</label>
            <label class="rp-day-cb"><input type="checkbox" value="4" /> Qui</label>
            <label class="rp-day-cb"><input type="checkbox" value="5" /> Sex</label>
            <label class="rp-day-cb"><input type="checkbox" value="6" /> Sáb</label>
            <label class="rp-day-cb"><input type="checkbox" value="7" /> Dom</label>
          </div>
        </div>
        <div id="rpEditMonthDayWrap" style="display:none;margin:4px 0 8px">
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0 0 6px">Todo dia:</p>
          <input id="rpEditMonthDay" class="rp-edit-input" type="number" min="1" max="31" placeholder="Ex: 15" style="width:90px" />
        </div>
        <div class="rp-edit-field">
          <label class="rp-edit-label">Empresa</label>
          <select id="rpEditCompany" class="rp-edit-select">
            <option value="">—</option>
            <option value="SeuBoné">SeuBoné</option>
            <option value="Onevo">Onevo</option>
            <option value="Carbone Educação">Carbone Educação</option>
          </select>
        </div>
        <div class="rp-edit-field">
          <label class="rp-edit-label">Pontos</label>
          <input id="rpEditPoints" class="rp-edit-input" type="number" min="0" max="100" />
        </div>
        <div class="rp-edit-actions">
          <button class="rp-edit-cancel" id="rpEditCancel">Cancelar</button>
          <button class="rp-edit-save" id="rpEditSave">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
  document.getElementById('rpEditCancel').addEventListener('click', _closeEditModal);
  document.getElementById('rpEditOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'rpEditOverlay') _closeEditModal();
  });
  // Mostrar/ocultar seletores conforme frequência selecionada
  document.getElementById('rpEditFreq').addEventListener('change', (e) => {
    const val = e.target.value;
    const needsDays     = val === 'weekly' || val === '3x_week' || val === 'custom';
    const needsMonthDay = val === 'monthly';
    document.getElementById('rpEditDayWrap').style.display      = needsDays     ? '' : 'none';
    document.getElementById('rpEditMonthDayWrap').style.display = needsMonthDay ? '' : 'none';
    if (val === '3x_week') {
      document.querySelectorAll('#rpEditDayCheckboxes input').forEach(i => {
        i.checked = [1, 3, 5].includes(Number(i.value));
      });
    }
  });
}

function _closeEditModal() {
  const el = document.getElementById('rpEditOverlay');
  if (el) el.style.display = 'none';
  const saveBtn = document.getElementById('rpEditSave');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; saveBtn.onclick = null; }
}

function openRoutineEditModal(routine) {
  initRoutineEditModal();

  // Preenche responsável — popula opções se ainda vazio
  const userSel = document.getElementById('rpEditUser');
  const _fillUser = () => { if (userSel) userSel.value = String(routine.userId || ''); };
  if (userSel && userSel.options.length === 0) {
    api('/api/users').then(data => {
      (data.users || []).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id; opt.textContent = u.name;
        userSel.appendChild(opt);
      });
      _fillUser();
    }).catch(() => {});
  } else { _fillUser(); }

  document.getElementById('rpEditTitle').value   = routine.title   || '';
  document.getElementById('rpEditCompany').value = routine.company || '';
  document.getElementById('rpEditPoints').value  = routine.points  ?? 1;

  // Mapeia frequency + applies_days → valor do select
  const days = routine.applies_days || [];
  let displayFreq = routine.frequency || 'daily';
  if (displayFreq === 'daily') {
    displayFreq = days.length ? 'daily-weekdays' : 'daily';
  } else if (displayFreq === 'weekly') {
    if      (days.length === 0) displayFreq = 'weekly';
    else if (days.length === 3) displayFreq = '3x_week';
    else                        displayFreq = 'custom';
  }
  // monthly permanece 'monthly'
  document.getElementById('rpEditFreq').value = displayFreq;

  // Mostra/oculta pickers
  const needsDays     = ['weekly', '3x_week', 'custom'].includes(displayFreq);
  const needsMonthDay = displayFreq === 'monthly';
  document.getElementById('rpEditDayWrap').style.display      = needsDays     ? '' : 'none';
  document.getElementById('rpEditMonthDayWrap').style.display = needsMonthDay ? '' : 'none';

  // Pré-preenche checkboxes de dias
  document.querySelectorAll('#rpEditDayCheckboxes input').forEach(i => {
    i.checked = days.includes(Number(i.value));
  });
  // Pré-preenche dia do mês
  if (needsMonthDay && days.length) {
    document.getElementById('rpEditMonthDay').value = days[0];
  }

  document.getElementById('rpEditOverlay').style.display = 'flex';

  const saveBtn = document.getElementById('rpEditSave');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Salvar';
  saveBtn.onclick = async () => {
    const newUserId = Number(document.getElementById('rpEditUser')?.value || 0);
    const title     = document.getElementById('rpEditTitle').value.trim();
    const freqRaw   = document.getElementById('rpEditFreq').value;
    const company   = document.getElementById('rpEditCompany').value || null;
    const points    = Number(document.getElementById('rpEditPoints').value) || 0;
    if (!title)     { document.getElementById('rpEditTitle').focus(); return; }
    if (!newUserId) { document.getElementById('rpEditUser')?.focus(); return; }

    let frequency    = freqRaw;
    let applies_days = null;
    if (freqRaw === 'daily-weekdays') {
      frequency = 'daily'; applies_days = [1, 2, 3, 4, 5];
    } else if (freqRaw === 'daily') {
      frequency = 'daily'; applies_days = [];
    } else if (freqRaw === 'weekly') {
      frequency = 'weekly';
      const checked = [...document.querySelectorAll('#rpEditDayCheckboxes input:checked')].map(i => Number(i.value));
      applies_days = checked.length ? checked : null;
    } else if (freqRaw === '3x_week') {
      frequency = 'weekly';
      const checked = [...document.querySelectorAll('#rpEditDayCheckboxes input:checked')].map(i => Number(i.value));
      applies_days = checked.length ? checked : [1, 3, 5];
    } else if (freqRaw === 'custom') {
      frequency = 'weekly';
      const checked = [...document.querySelectorAll('#rpEditDayCheckboxes input:checked')].map(i => Number(i.value));
      if (!checked.length) { alert('Selecione ao menos um dia da semana.'); return; }
      applies_days = checked;
    } else if (freqRaw === 'monthly') {
      frequency = 'monthly';
      const dom = Number(document.getElementById('rpEditMonthDay').value);
      if (!dom || dom < 1 || dom > 31) { alert('Informe um dia do mês válido (1–31).'); return; }
      applies_days = [dom];
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando…';
    try {
      await api(`/api/routines?action=update&routineId=${routine.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: newUserId, title, frequency, applies_days, company, points }),
      });
      _closeEditModal();
      await fetchAndRenderRoutines();
    } catch (err) {
      alert(`Erro ao salvar: ${err.message}`);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar';
    }
  };
}

function openSkipReasonModal(routineTitle, onConfirm) {
  initSkipReasonModal(); // garante que existe
  const overlay  = document.getElementById('rpSkipOverlay');
  const titleEl  = document.getElementById('rpSkipRoutineTitle');
  const reasonEl = document.getElementById('rpSkipReason');
  const btn      = document.getElementById('rpSkipConfirm');
  const chars    = document.getElementById('rpSkipChars');

  if (titleEl)  titleEl.textContent = routineTitle || '';
  if (reasonEl) { reasonEl.value = ''; }
  if (chars)    chars.textContent = '0';
  if (btn) {
    btn.disabled = true;
    btn.onclick = async () => {
      const reason = reasonEl?.value?.trim();
      if (!reason || reason.length < 10) return;
      btn.disabled = true;
      try {
        await onConfirm(reason);
        _closeSkipModal();
      } catch { btn.disabled = false; }
    };
  }
  if (overlay) overlay.style.display = 'flex';
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// TABELA DE PONTUAÇÃO POR TIPO DE TAREFA
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

function renderPtsTable() {
  const section = document.querySelector('.pts-table-panel');
  if (!section) return;
  section.innerHTML = ''; // sempre re-renderiza com dados atualizados

  const ROLES = [
    {
      role: 'Direção de Arte',
      members: ['Samuel'],
      color: '#e8b844',
      groups: [
        {
          label: 'Peças Curtas',
          items: [
            ['Criativo derivado de padrão', 1],
            ['Criativo feito do zero', 2],
            ['Estático', 2],
            ['Lettering para vídeo', 2],
            ['Carrossel até 5 páginas', 5],
            ['Carrossel 6–12 páginas', 8],
          ],
        },
        {
          label: 'Avulsos / Off',
          items: [
            ['Carta / Windbanner / Placa', 1],
            ['Crachá', 2],
            ['Convite', 3],
            ['Animações / Backdrop / Voucher', 4],
          ],
        },
        {
          label: 'Peças Longas',
          items: [
            ['Apresentação até 30 páginas', 15],
            ['Apresentação 31–60 páginas', 20],
            ['Apresentação acima de 60 páginas', 30],
            ['Identidade visual (logo + base)', 15],
            ['Catálogo simples até 10 páginas', 12],
            ['Catálogo complexo +10 páginas', 16],
          ],
        },
        {
          label: 'Alterações',
          note: '50% da pontuação da peça original',
          items: [],
        },
      ],
    },
    {
      role: 'Audiovisual',
      members: ['Thiago', 'Klenio'],
      color: '#3b82f6',
      groups: [
        {
          label: 'Edição',
          items: [
            ['Corte podcast complexo', 0.5],
            ['Vídeo simples (FAQ / ADS / até 1min30)', 2],
            ['Vídeo médio (entrevista / até 5 min)', 4],
            ['Vídeo complexo (ADS / Aftermovie / efeitos)', 15],
          ],
        },
        {
          label: 'Captação',
          items: [
            ['Até 1h', 3],
            ['Até 2h', 6],
            ['Até 4h', 12],
          ],
        },
      ],
    },
    {
      role: 'Landing Page & IA',
      members: ['Bia'],
      color: '#a78bfa',
      groups: [
        {
          label: 'Entregas',
          items: [
            ['Landing page do zero', '6', '~2 a 3h'],
            ['Sistema IA', '15–20', '~1 semana ou mais'],
            ['Ajuste LP — textos', '1', '2 a 5 min'],
            ['Ajuste LP — imagem', '1', '2 a 5 min'],
            ['Post Blog', '4–6', '1 a 2h (varia por qtd.)'],
            ['Ajuste Sistema IA', '8–10', '3 a 6h, ou mais se complexo'],
          ],
        },
      ],
    },
    {
      role: 'Storymaker',
      members: ['Malu'],
      color: '#22d3a3',
      groups: [
        {
          label: 'Referência',
          note: 'Usa as tabelas de Audiovisual e Geral conforme o tipo de entrega.',
          items: [],
        },
      ],
    },
    {
      role: 'Publisher / UGC',
      members: ['Zion'],
      color: '#f97316',
      groups: [
        {
          label: 'Entregas',
          items: [
            ['1 UGC (meta por volume)', 1],
            ['Vídeo simples', 2],
            ['Arte', 2],
            ['Criação / execução de processo novo', 15],
          ],
        },
        {
          label: 'Bônus de Taxa UGC',
          items: [
            ['Taxa UGC > 20% na semana', 20],
            ['Taxa UGC > 25% na semana', 30],
            ['Taxa UGC > 30% na semana', 40],
          ],
        },
      ],
    },
    {
      role: 'Válido para todos',
      members: [],
      color: '#7882a4',
      groups: [
        {
          label: 'Eventos',
          items: [
            ['1 turno (até 6h)', 10],
            ['Dia inteiro (até 12h)', 20],
            ['Fora da Grande Natal com pernoite', 30],
          ],
        },
        {
          label: 'Treinamento',
          items: [
            ['A cada 1 hora completa', 6],
            ['Projeto aprovado pela liderança', 10],
          ],
        },
      ],
    },
  ];

  function card(role) {
    const badge = role.members.length
      ? role.members.map(m => `<span class="ptc-member">${m}</span>`).join('')
      : '';
    const groups = role.groups.map(g => {
      const rows = g.items.map(([label, pts, timeNote]) => {
        // pts pode ser número (1, 2, 0.5) ou string com faixa ('15–20', '4–6')
        const ptsStr = typeof pts === 'number'
          ? `${pts % 1 === 0 ? pts : pts.toFixed(1)} pt${pts !== 1 ? 's' : ''}`
          : `${pts} pts`;
        const timeEl = timeNote
          ? `<span class="ptc-time">${timeNote}</span>`
          : '';
        return `<tr>
          <td class="ptc-label">${label}${timeEl}</td>
          <td class="ptc-pts" style="color:${role.color}">${ptsStr}</td>
        </tr>`;
      }).join('');
      const note = g.note ? `<p class="ptc-note">${g.note}</p>` : '';
      const table = rows ? `<table class="ptc-table"><tbody>${rows}</tbody></table>` : '';
      return `<div class="ptc-group">
        <div class="ptc-group-label">${g.label}</div>
        ${note}${table}
      </div>`;
    }).join('');

    return `<div class="ptc-card" style="--role-color:${role.color}">
      <div class="ptc-card-header">
        <div>
          <div class="ptc-role">${role.role}</div>
          <div class="ptc-members">${badge}</div>
        </div>
      </div>
      <div class="ptc-groups">${groups}</div>
    </div>`;
  }

  section.innerHTML = `
    <div class="ptc-wrap">
      <div class="ptc-title-row">
        <h2 class="ptc-title">Tabela de Pontuação por Tipo de Tarefa</h2>
        <p class="ptc-subtitle">Referência de pontos por cargo e tipo de entrega.</p>
      </div>
      <div class="ptc-grid">
        ${ROLES.map(card).join('')}
      </div>
    </div>`;
}

function initTeamDaily() {
  document.getElementById('clickupSyncBtn')?.addEventListener('click', handleClickupSync);

  const refreshBtn = document.getElementById('tdRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const orig = refreshBtn.innerHTML;
      refreshBtn.disabled = true;
      refreshBtn.textContent = '…';
      _stopTdTimers();
      await loadTeamDaily({ force: true });
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = orig;
    });
  }

  // Delegação: toggle de grupos colapsáveis por card de membro
  const grid = document.getElementById('teamDailyGrid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.mc-group-toggle');
      if (!btn) return;
      const uid = Number(btn.dataset.uid);
      const cat = btn.dataset.cat;
      const key = `${uid}_${cat}`;
      _tdGroupExpanded[key] = !_tdGroupExpanded[key];
      if (_tdLastMembers && _tdLastMembers.length) renderTdView(_tdLastMembers);
    });
  }
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// SHARED HELPERS — date ranges & formatting
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getDateRange(filter, customFrom, customTo) {
  const today = todayISO();
  const now   = new Date();
  if (filter === 'semana') {
    const dow = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + 1);
    return { from: mon.toISOString().slice(0, 10), to: today };
  }
  if (filter === 'mes') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: first.toISOString().slice(0, 10), to: today };
  }
  if (filter === '90d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 89);
    return { from: start.toISOString().slice(0, 10), to: today };
  }
  if (filter === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  // fallback: current week
  const dow = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - dow + 1);
  return { from: mon.toISOString().slice(0, 10), to: today };
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getRankingWeekRange(offset) {
  const now = new Date();
  const dow = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - dow + 1 + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(mon), to: fmt(sun) };
}

function monthShortBR(isoMonth) {
  const [y, m] = isoMonth.split('-').map(Number);
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[m - 1]}/${String(y).slice(2)}`;
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// HISTÓRICO MKT PANEL
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

async function loadHistoricoPanel() {
  // Recalcula datas do preset (garante 1º e último dia do mês/semana automaticamente)
  dfbRecalcPreset('hist');
  if (!_dfb.hist.from) {
    const r = dfbPresetToRange('mes', null);
    _dfb.hist.from = r.from;
    _dfb.hist.to   = r.to;
    dfbSetInputs('hist', r.from, r.to);
  }
  const from = _dfb.hist.from;
  const to   = _dfb.hist.to;
  updateHistPeriodBadge(from, to);

  const wrap = document.getElementById('histWeeklyWrap');
  if (wrap) wrap.innerHTML = '<p style="padding:24px;color:#5a6280;font-size:13px">Carregando...</p>';

  try {
    const authHeaders = { Authorization: `Bearer ${getToken()}` };

    // Busca em paralelo: dados de rotina (DB) + dados ClickUp (API direta) + snapshots
    const [histResp, cuHistResp, sResp] = await Promise.all([
      fetch(`/api/reports/history?from=${from}&to=${to}`, { headers: authHeaders }),
      fetch(`/api/focus?action=clickup-history&from=${from}&to=${to}`, { headers: authHeaders }),
      fetch('/api/focus?action=snapshot-list', { headers: authHeaders }).catch(() => null),
    ]);

    const histText = await histResp.text();
    let histData;
    try { histData = JSON.parse(histText); } catch (_) {
      throw new Error(`HTTP ${histResp.status} — resposta não-JSON: ${histText.slice(0, 300)}`);
    }
    if (!histResp.ok) {
      throw new Error(`HTTP ${histResp.status}: ${histData.error || histText.slice(0, 200)}`);
    }
    if (!histData || !histData.users || !histData.users.length) {
      if (wrap) wrap.innerHTML = '<p style="padding:24px;color:#5a6280;font-size:13px">Nenhum dado encontrado para o período.</p>';
      return;
    }

    // Mescla dados ClickUp para usuários não-rotina (focus_tasks pode estar desatualizada)
    let cuUserMap = new Map();
    if (cuHistResp && cuHistResp.ok) {
      try {
        const cuData = await cuHistResp.json();
        (cuData.users || []).forEach(u => cuUserMap.set(u.id, u));
      } catch (_) { /* ignora erro do clickup-history */ }
    }

    const mergedUsers = histData.users.map(u => {
      if (u.isRoutineBased) return u; // rotina: dados de routine_completions já corretos
      const cu = cuUserMap.get(u.id);
      if (!cu) return u;
      // substitui semanas e metas pelos dados ao vivo do ClickUp
      return {
        ...u,
        weeks:      cu.weeks,
        weeklyGoal: cu.weeklyGoal,
        meta100:    cu.meta100,
        meta120:    cu.meta120,
      };
    });

    // Snapshots para marcar semanas FECHADO / PENDENTE
    let snapshotMap = {};
    try {
      if (sResp && sResp.ok) {
        const sData = await sResp.json();
        (sData.snapshots || []).forEach(s => { snapshotMap[s.week_start] = s; });
      }
    } catch (_) { /* snapshot API pode não existir ainda — ignora */ }

    renderHistoricoWeeklyTable(histData.weeks || [], mergedUsers, snapshotMap);
  } catch (err) {
    console.error('[historico] erro:', err.message);
    if (wrap) wrap.innerHTML = `<p style="padding:24px;color:#e05252;font-size:13px">Erro: ${err.message}</p>`;
  }
}

function updateHistPeriodBadge(from, to) {
  const el = document.getElementById('histPeriodBadge');
  if (el) el.textContent = `${formatDateBR(from)} – ${formatDateBR(to)}`;
}

function renderHistoricoStats({ totalDone, totalPoints, totalHours }) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('histStatTasks',  totalDone);
  set('histStatHours',  `${Number(totalHours).toFixed(1)}h`);
  set('histStatPoints', totalPoints);
}

function renderHistoricoWeeklyTable(weekLabels, users, snapshotMap = {}) {
  const wrap = document.getElementById('histWeeklyWrap');
  if (!wrap) return;

  if (!weekLabels.length || !users.length) {
    wrap.innerHTML = '';
    return;
  }

  // Coins: 0=nenhum 1-6 escala meta (max 6)
  const COIN_CFG = [
    null,
    { label: '1 Coin',  cls: 'hwt-coin-1', icon: IC.medal(1) },
    { label: '2 Coins', cls: 'hwt-coin-2', icon: IC.medal(1) },
    { label: '3 Coins', cls: 'hwt-coin-3', icon: IC.medal(2) },
    { label: '4 Coins', cls: 'hwt-coin-4', icon: IC.medal(2) },
    { label: '5 Coins', cls: 'hwt-coin-5', icon: IC.medal(3) },
    { label: '6 Coins', cls: 'hwt-coin-6', icon: IC.gem },
  ];

  const firstWeek = weekLabels[0];
  const monthIdx  = firstWeek ? Number(firstWeek.weekStart.slice(5, 7)) - 1 : -1;
  const monthName = monthIdx >= 0 ? CAL_MONTH_NAMES[monthIdx] : '';

  const theadCells = weekLabels.map(w => {
    const [, mo, d] = w.weekStart.split('-');
    const liveTag   = w.isLive ? ' <span class="hwt-live-tag">ao vivo</span>' : '';
    const snap      = snapshotMap[w.weekStart];
    const lockTag   = snap?.status === SNAPSHOT_STATUS.FECHADO  ? `<br><span class="hwt-lock-badge">${IC.lock} encerrada</span>` : '';
    const pendTag   = snap?.status === SNAPSHOT_STATUS.PENDENTE && _isAdminUser ? `<br><span class="hwt-pending-badge">${IC.clock} pendente</span>` : '';
    return `<th class="hwt-week-th">Sem ${w.index}<br><span class="hwt-week-date">${d}/${mo}</span>${liveTag}${lockTag}${pendTag}</th>`;
  }).join('');

  const thead = `<thead><tr>
    <th class="hwt-person-th">Pessoa</th>
    ${theadCells}
  </tr></thead>`;

  const tbody = users.map(u => {
    const userMeta100 = u.meta100 || u.weeklyGoal || 0;
    const userMeta120 = u.meta120 || Math.round(userMeta100 * 1.2);

    const cells = u.weeks.map(w => {
      // isRoutineBased: meta varia por semana (w.weeklyGoal); demais: usa meta do usuário
      const meta100 = (u.isRoutineBased && w.weeklyGoal != null) ? w.weeklyGoal : userMeta100;
      const meta120 = (u.isRoutineBased && w.meta120    != null) ? w.meta120    : userMeta120;

      if (w.pts === 0 && !w.isLive) {
        return `<td class="hwt-week-cell hwt-empty-cell"><span class="hwt-empty">—</span></td>`;
      }

      // Calcula coins da semana: usa w.coins se disponível (history.js),
      // senão deriva do pct (clickup-history não envia coins)
      const pct6 = w.pct || 0;
      const coins = w.coins != null ? w.coins
        : pct6 >= 120 ? 6 : pct6 >= 100 ? 5 : pct6 >= 80 ? 4
        : pct6 >= 60  ? 3 : pct6 >= 40  ? 2 : pct6 >= 20 ? 1 : 0;
      // Badge só aparece para quem bateu a meta (≥100% = 5 coins)
      const coinCfg = coins >= 5 ? COIN_CFG[coins] : null;
      const above120 = w.metaStatus === 'above_120' || w.pts >= meta120;
      const above100 = w.metaStatus === 'above_100' || w.pts >= meta100;

      const pctClass = w.isLive && !above100 ? 'live'
                     : above120              ? 'diamond'
                     : above100              ? 'green'
                     : w.pct >= 60           ? 'yellow'
                     : 'gray';

      // Barra de progresso visual (até 120%)
      const barPct   = Math.min(Math.round((w.pts / meta120) * 100), 100);
      const barColor = above120 ? '#818cf8' : above100 ? '#f6c200' : w.pct >= 60 ? '#22d3a3' : '#f59e0b';

      // Linha de progresso em relação à meta
      let progressRow = '';
      if (above120) {
        const extra = w.pts - meta120;
        progressRow = `<div class="hwt-overshoot diamond">+${extra} pts acima de 120%</div>`;
      } else if (above100) {
        const falta120 = w.faltouPara120 != null ? w.faltouPara120 : Math.max(0, meta120 - w.pts);
        progressRow = `<div class="hwt-overshoot">Meta ✓ · faltou ${falta120} pts p/ 120%</div>`;
      } else {
        const falta   = w.faltouPara100 != null ? w.faltouPara100 : Math.max(0, meta100 - w.pts);
        const verb    = w.isLive ? 'falta' : 'faltou';
        progressRow = `<div class="hwt-missing${w.isLive ? ' live' : ''}">${verb} <strong>${falta} pts</strong> p/ meta · ${100 - w.pct}%</div>`;
      }

      const coinsRow = coinCfg
        ? `<div class="hwt-coins ${coinCfg.cls}">
             <span class="hwt-coin-icon">${coinCfg.icon}</span>
             <span class="hwt-coins-label">${coinCfg.label}</span>
           </div>`
        : '';

      const liveBadge    = w.isLive ? `<div class="hwt-live-badge">em andamento</div>` : '';
      const snapWeek     = snapshotMap[w.weekStart];
      const validadoNote = snapWeek?.status === SNAPSHOT_STATUS.FECHADO
        ? `<div class="hwt-coins-validated">${IC.lock} coins validadas</div>`
        : (snapWeek?.status === SNAPSHOT_STATUS.PENDENTE && _isAdminUser
            ? `<div class="hwt-coins-validated" style="color:#f59e0b">${IC.clock} aguarda validação</div>`
            : '');

      return `<td class="hwt-week-cell">
        <div class="hwt-pct ${pctClass}">${w.pct}%</div>
        <div class="hwt-pts">${w.pts} pts</div>
        <div class="hwt-meta-line">meta ${meta100} · 120% ${meta120}</div>
        <div class="hwt-bar-wrap"><div class="hwt-bar-fill" style="width:${barPct}%;background:${barColor}"></div></div>
        ${progressRow}${coinsRow}${validadoNote}${liveBadge}
      </td>`;
    }).join('');

    const metaInfo = u.isRoutineBased
      ? `<div class="hwt-cargo">${u.cargo || ''} · meta: rotinas</div>`
      : `<div class="hwt-cargo">${u.cargo || ''}</div><div class="hwt-meta-goals">100%: ${userMeta100}p · 120%: ${userMeta120}p</div>`;

    const personCell = `<td class="hwt-person-cell">
      <div class="hwt-person">${u.name}</div>
      ${metaInfo}
    </td>`;

    return `<tr>${personCell}${cells}</tr>`;
  }).join('');

  const titleText = monthName
    ? `Histórico ${monthName} — Metas Semanais`
    : 'Histórico — Metas Semanais';

  wrap.innerHTML = `
    <div class="hist-weekly-wrap">
      <div class="hist-weekly-title">${titleText}</div>
      <div class="hwt-legend">
        <span class="hwt-leg-item">${IC.medal(1)} 1–2 = ≥20–40%</span>
        <span class="hwt-leg-item">${IC.medal(2)} 3–4 = ≥60–80%</span>
        <span class="hwt-leg-item">${IC.medal(3)} 5 Coins = meta 100%</span>
        <span class="hwt-leg-item">${IC.gem} 6 Coins = 120%</span>
      </div>
      <table class="hwt-table">
        ${thead}
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
}

function renderMetasSummary(weekLabels, users) {
  if (!weekLabels.length || !users.length) return '';

  const rows = users.map(u => {
    const userMeta100 = u.meta100 || u.weeklyGoal || 0;
    const userMeta120 = u.meta120 || Math.round(userMeta100 * 1.2);

    let hitCount    = 0;
    let totalClosed = 0;

    const chips = u.weeks.map((w, wi) => {
      const wl      = weekLabels[wi] || {};
      const semLbl  = `Sem ${wl.index != null ? wl.index : wi + 1}`;
      const meta100 = (u.isRoutineBased && w.weeklyGoal != null) ? w.weeklyGoal : userMeta100;
      const meta120 = (u.isRoutineBased && w.meta120    != null) ? w.meta120    : userMeta120;

      if (w.pts === 0 && !w.isLive) {
        return `<span class="hms-chip hms-empty" title="${semLbl} · sem dados">
          <span class="hms-chip-icon">—</span>
          <span class="hms-chip-label">${semLbl}</span>
        </span>`;
      }

      if (w.isLive) {
        return `<span class="hms-chip hms-live" title="${semLbl} · em andamento · ${w.pts} pts até agora">
          <span class="hms-chip-icon">•</span>
          <span class="hms-chip-pct">${w.pct}%</span>
          <span class="hms-chip-label">${semLbl}</span>
        </span>`;
      }

      totalClosed++;
      const above120 = w.metaStatus === 'above_120' || w.pts >= meta120;
      const above100 = above120 || w.metaStatus === 'above_100' || w.pts >= meta100;
      if (above100) hitCount++;

      if (above120) {
        return `<span class="hms-chip hms-hit hms-diamond" title="${semLbl} · ${w.pts} pts · meta ${meta100} pts · 120%+ ◆">
          <span class="hms-chip-icon">◆</span>
          <span class="hms-chip-pct">${w.pct}%</span>
          <span class="hms-chip-label">${semLbl}</span>
        </span>`;
      }
      if (above100) {
        return `<span class="hms-chip hms-hit" title="${semLbl} · ${w.pts} pts · meta ${meta100} pts · Meta ✓">
          <span class="hms-chip-icon">✓</span>
          <span class="hms-chip-pct">${w.pct}%</span>
          <span class="hms-chip-label">${semLbl}</span>
        </span>`;
      }
      const falta = Math.max(0, meta100 - w.pts);
      return `<span class="hms-chip hms-miss" title="${semLbl} · ${w.pts} pts · faltou ${falta} pts para meta">
        <span class="hms-chip-icon">✗</span>
        <span class="hms-chip-pct">${w.pct}%</span>
        <span class="hms-chip-label">${semLbl}</span>
      </span>`;
    }).join('');

    const countCls   = totalClosed === 0 ? '' : hitCount === totalClosed ? 'hms-all' : hitCount === 0 ? 'hms-none' : 'hms-partial';
    const countLabel = totalClosed > 0 ? `${hitCount}/${totalClosed} ✓` : '—';

    return `<div class="hms-row">
      <div class="hms-person">
        <div class="hms-name">${u.name}</div>
        <div class="hms-cargo">${u.cargo || ''}</div>
      </div>
      <div class="hms-chips">${chips}</div>
      <div class="hms-count ${countCls}">${countLabel}</div>
    </div>`;
  }).join('');

  return `<div class="hms-wrap">
    <div class="hms-header">
      <span class="hms-title">Resumo de Metas Semanais</span>
      <span class="hms-legend">
        <span class="hms-leg hms-hit-leg">Meta batida</span>
        <span class="hms-leg hms-diamond-leg">120%+</span>
        <span class="hms-leg hms-miss-leg">Não batida</span>
        <span class="hms-leg hms-live-leg">Em andamento</span>
      </span>
    </div>
    <div class="hms-rows">${rows}</div>
  </div>`;
}

function renderHistoricoWeeksChart(weekLabels, userWeeks) {
  const ctx = document.getElementById('histBarChart');
  if (!ctx) return;
  if (histBarChart) { histBarChart.destroy(); histBarChart = null; }
  if (!weekLabels.length) return;

  const labels = weekLabels.map((w) => {
    const [, mo, d0] = w.weekStart.split('-');
    const [,, d1]    = w.weekEnd.split('-');
    const monName    = CAL_MONTH_NAMES[Number(mo) - 1].slice(0, 3);
    return `${d0}-${d1}/${monName}`;
  });

  const doneData   = userWeeks.map((w) => w.tasksDone);
  const pointsData = userWeeks.map((w) => w.pts);
  const hoursData  = userWeeks.map((w) => Math.round(w.horas * 10) / 10);

  const dl = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];

  histBarChart = new Chart(ctx, {
    type: 'bar',
    plugins: dl,
    data: {
      labels,
      datasets: [
        { label: 'Tasks', data: doneData,   backgroundColor: 'rgba(42, 213, 138, 0.85)', borderRadius: 5 },
        { label: 'Pontos', data: pointsData, backgroundColor: 'rgba(246, 194, 0, 0.85)',   borderRadius: 5 },
        { label: 'Horas',  data: hoursData,  backgroundColor: 'rgba(79, 142, 247, 0.75)',  borderRadius: 5 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#8e98a7', font: { size: 11, family: 'Inter' }, boxWidth: 10, boxHeight: 10 },
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#c8d0dc',
          font: { size: 10, weight: '700', family: 'Inter' },
          formatter: (val) => (val > 0 ? val : ''),
        },
      },
      scales: {
        x: { ticks: { color: '#666', font: { size: 10 } }, grid: { display: false }, border: { display: false } },
        y: { display: false, min: 0 },
      },
    },
  });
}

function renderHistoricoTaskList(tasks) {
  const list = document.getElementById('histTaskList');
  if (!list) return;
  list.innerHTML = '';
  if (!tasks.length) {
    list.innerHTML = '<li class="hist-task-empty">Nenhuma tarefa no período</li>';
    return;
  }
  tasks.slice(0, 80).forEach((task) => {
    const li   = document.createElement('li');
    li.className = 'hist-task-item';
    const pts  = task.points ? `<span class="hist-task-pts">${task.points}pts</span>` : '';
    const cat  = task.category ? `<span class="hist-task-cat">${task.category}</span>` : '';
    const date = task.created_at
      ? new Date(task.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '';
    li.innerHTML = `
      <span class="hist-task-dot ${task.is_done ? 'done' : 'pending'}"></span>
      <span class="hist-task-title${task.is_done ? ' done' : ''}">${task.title}</span>
      ${cat}${pts}
      <span class="hist-task-date">${date}</span>
    `;
    list.appendChild(li);
  });
}


function initHistoricoFilters() {
  document.querySelectorAll('[data-hist-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const f = btn.dataset.histFilter;
      if (f === 'custom') {
        const fromEl = document.getElementById('histCustomFromInput');
        const toEl   = document.getElementById('histCustomToInput');
        if (fromEl) fromEl.value = histCustomFrom || '';
        if (toEl)   toEl.value   = histCustomTo   || '';
        document.getElementById('histCustomDialog').showModal();
        return;
      }
      histFilter = f;
      document.querySelectorAll('[data-hist-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await loadHistoricoPanel();
    });
  });

  document.getElementById('histCustomCancel')?.addEventListener('click', () =>
    document.getElementById('histCustomDialog').close()
  );

  document.getElementById('histCustomApply')?.addEventListener('click', async () => {
    const from = document.getElementById('histCustomFromInput')?.value;
    const to   = document.getElementById('histCustomToInput')?.value;
    if (!from || !to) return;
    histCustomFrom = from;
    histCustomTo   = to;
    histFilter = 'custom';
    document.querySelectorAll('[data-hist-filter]').forEach((b) => b.classList.remove('active'));
    document.querySelector('[data-hist-filter="custom"]')?.classList.add('active');
    document.getElementById('histCustomDialog').close();
    await loadHistoricoPanel();
  });
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// VERSÃO ADM PANEL
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

let admActiveMetric        = 'all';
let admActiveMonths        = null; // null = all
let admCurrentPreset       = '6m';
let admUserBreakdownData   = [];
let admCompanyBreakdownData = [];
let admUserFilter          = '';
let admCompanyFilter       = '';

const ADM_MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function admPresetToRange(preset) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = fmt(now);
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: today };
  }
  if (preset === '3m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return { from: fmt(from), to: today };
  }
  if (preset === '6m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return { from: fmt(from), to: today };
  }
  if (preset === '1a') {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  return null;
}

function getAdmDateRange() {
  if (admCurrentPreset === 'custom') {
    const from = document.getElementById('admDateFrom')?.value;
    const to   = document.getElementById('admDateTo')?.value;
    return (from && to) ? { from, to } : null;
  }
  return admPresetToRange(admCurrentPreset);
}

async function loadAdmPanel() {
  if (!_isAdminUser) return;
  await loadAdmHistory();
  await loadSnapshotValidation();
}

async function loadAdmUsersIfNeeded() {
  const select = document.getElementById('admUserSelect');
  if (!select || select.options.length > 1) return;
  try {
    const data = await api('/api/users');
    (data.users || []).forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id; opt.textContent = u.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('[adm] erro ao carregar usuários:', err.message);
  }
}

async function loadAdmData() {
  const range = getAdmDateRange();
  if (!range) return;

  const personName = document.getElementById('admUserSelect')?.selectedOptions[0]?.text || 'Toda a equipe';
  const subtitle   = document.getElementById('admChartSubtitle');
  const presetLbl  = { '30d': 'Últimos 30 dias', '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '1a': 'Este ano', 'custom': 'Período personalizado' };
  if (subtitle) subtitle.textContent = `${personName} · ${presetLbl[admCurrentPreset] || ''}`;

  const chartWrap = document.querySelector('.adm-chart-wrap');
  if (chartWrap) chartWrap.style.opacity = '0.4';

  const qs = admSelectedUser ? `&userId=${admSelectedUser}` : '';

  try {
    const resp = await fetch(`/api/reports/adm?from=${range.from}&to=${range.to}${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (_) {
      throw new Error(`HTTP ${resp.status} — resposta inválida`);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${data.error || text.slice(0, 150)}`);

    admLastData = data;
    renderAdmStats(data.stats || {});
    const rawMonths  = data.months || [];
    admMonthlyData   = rawMonths; // sempre mostra todos os meses do range
    admActiveMonths  = null;
    admUserFilter    = '';
    admCompanyFilter = '';
    // chips só quando há 2+ meses com dados (para filtrar)
    const monthsWithData = rawMonths.filter(m => m.tasksDone > 0 || m.pts > 0 || m.horas > 0);
    renderAdmMonthChips(monthsWithData.length > 1 ? monthsWithData : []);
    renderAdmChart(admMonthlyData, null, admActiveMetric);
    renderAdmUserBreakdown(data.userBreakdown || []);
    renderAdmCompanyBreakdown(data.companyBreakdown || []);
  } catch (err) {
    console.error('[adm] erro:', err.message);
    const chartEl = document.getElementById('admBarChart');
    if (chartEl) {
      const ctx = chartEl.getContext('2d');
      ctx.clearRect(0, 0, chartEl.width, chartEl.height);
    }
    if (subtitle) subtitle.textContent = `Erro: ${err.message}`;
    if (subtitle) subtitle.style.color = '#e05252';
  } finally {
    if (chartWrap) chartWrap.style.opacity = '';
  }
}

function renderAdmStats(stats) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('admStatDone',   stats.totalDone   ?? '—');
  set('admStatHours',  stats.totalHours  != null ? `${Number(stats.totalHours).toFixed(1)}h` : '—');
  set('admStatPoints', stats.totalPoints ?? '—');
}

function renderAdmMonthChips(months) {
  const container = document.getElementById('admMonthFilter');
  if (!container) return;
  container.innerHTML = months.map(m =>
    `<span class="adm-chip active" data-ym="${m.ym}">${m.label}</span>`
  ).join('');
  const div = document.getElementById('admChipDivider');
  if (div) div.style.display = months.length ? '' : 'none';

  container.querySelectorAll('.adm-chip').forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle('active');
      const active = Array.from(container.querySelectorAll('.adm-chip.active')).map(c => c.dataset.ym);
      admActiveMonths = active.length && active.length < months.length ? active : null;
      renderAdmChart(admMonthlyData, admActiveMonths, admActiveMetric);
    };
  });
}

function renderAdmChart(months, selectedYMs, metric = 'all') {
  const canvas = document.getElementById('admBarChart');
  if (!canvas) return;
  if (admBarChart) { admBarChart.destroy(); admBarChart = null; }

  const visible = selectedYMs
    ? months.filter(m => selectedYMs.includes(m.ym))
    : months;

  const hasAnyData = visible.some(m => m.pts > 0 || m.horas > 0 || m.tasksDone > 0);
  if (!visible.length || !hasAnyData) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5a6478';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados no período selecionado', canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = visible.map(m => m.label);
  const pts    = visible.map(m => m.pts    || 0);
  const tasks  = visible.map(m => m.tasksDone || 0);
  const horas  = visible.map(m => m.horas  || 0);

  const hasDL  = typeof ChartDataLabels !== 'undefined';
  const dlPlugins = hasDL ? [ChartDataLabels] : [];
  const DL = {
    anchor: 'end', align: 'top',
    font: { size: 10, weight: '700', family: 'Inter' },
  };

  let datasets, scales;

  const MBT = 54; // maxBarThickness
  const xScale = { grid: { color: '#1a1e2e', drawBorder: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } };

  // cores dinâmicas: meses com dados = destaque, meses zerados = fundo
  const ptsBg    = pts.map(v  => v  > 0 ? '#2d3554' : '#191d2b');
  const ptsBrd   = pts.map(v  => v  > 0 ? '#4a5580' : '#1e2235');
  const horasBg  = horas.map(v => v  > 0 ? '#e8b84428' : 'transparent');
  const horasBrd = horas.map(v => v  > 0 ? '#e8b844'   : 'transparent');
  const tasksBg  = tasks.map(v => v  > 0 ? '#2d3554' : '#191d2b');
  const tasksBrd = tasks.map(v => v  > 0 ? '#4a5580' : '#1e2235');

  if (metric === 'pts') {
    datasets = [
      { label: 'Pontos', data: pts, type: 'bar', maxBarThickness: MBT,
        backgroundColor: ptsBg, borderColor: ptsBrd, borderWidth: 1, borderRadius: 4,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
      { label: 'Pontos (linha)', data: pts.map(v => v > 0 ? v : null), type: 'line',
        borderColor: '#3dba6f', backgroundColor: 'transparent',
        pointBackgroundColor: '#3dba6f', pointRadius: 5, pointHoverRadius: 7,
        tension: 0.35, spanGaps: false, datalabels: { display: false } },
    ];
    scales = { x: xScale, y: { display: false, min: 0 } };
  } else if (metric === 'tasks') {
    datasets = [
      { label: 'Tasks', data: tasks, type: 'bar', maxBarThickness: MBT,
        backgroundColor: tasksBg, borderColor: tasksBrd, borderWidth: 1, borderRadius: 4,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
    ];
    scales = { x: xScale, y: { display: false, min: 0 } };
  } else if (metric === 'horas') {
    datasets = [
      { label: 'Horas', data: horas, type: 'bar', maxBarThickness: MBT,
        backgroundColor: horasBg, borderColor: horasBrd, borderWidth: 2, borderRadius: 4,
        datalabels: { ...DL, color: '#e8b844', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' } },
    ];
    scales = { x: xScale, y: { display: false, min: 0 } };
  } else {
    // Todos — barras (Pontos) + barras (Horas) + linha verde (Tasks)
    datasets = [
      { label: 'Pontos', data: pts, type: 'bar', maxBarThickness: MBT,
        backgroundColor: ptsBg, borderColor: ptsBrd, borderWidth: 1,
        borderRadius: 4, yAxisID: 'y1', order: 2,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
      { label: 'Horas', data: horas, type: 'bar', maxBarThickness: MBT,
        backgroundColor: horasBg, borderColor: horasBrd, borderWidth: 1.5,
        borderRadius: 4, yAxisID: 'y1', order: 3,
        datalabels: { ...DL, color: '#e8b844', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' } },
      { label: 'Tasks', data: tasks.map(v => v > 0 ? v : null), type: 'line',
        borderColor: '#3dba6f', backgroundColor: 'transparent',
        pointBackgroundColor: '#3dba6f', pointRadius: 5, pointHoverRadius: 7,
        tension: 0.35, spanGaps: false, yAxisID: 'y2', order: 1,
        datalabels: { ...DL, display: true, color: '#3dba6f', formatter: v => (v && v > 0) ? v : '' } },
    ];
    scales = {
      x:  xScale,
      y1: { display: false, min: 0, position: 'left' },
      y2: { display: false, min: 0, position: 'right' },
    };
  }

  admBarChart = new Chart(canvas, {
    type: 'bar',
    plugins: dlPlugins,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8e98a7', font: { size: 11, family: 'Inter' }, boxWidth: 10, boxHeight: 10 } },
        tooltip: { backgroundColor: '#1c1e32', titleColor: '#c8d0e7', bodyColor: '#8892b4', borderColor: '#252840', borderWidth: 1 },
        datalabels: hasDL ? { display: true } : {},
      },
      scales,
    },
  });
}

function initAdmFilters() {
  document.getElementById('admUserSelect')?.addEventListener('change', async (e) => {
    admSelectedUser = e.target.value;
    await loadAdmData();
  });

  document.getElementById('admDatePresets')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    admCurrentPreset = btn.dataset.preset;
    document.querySelectorAll('.adm-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const customRange = document.getElementById('admCustomRange');
    if (customRange) customRange.style.display = admCurrentPreset === 'custom' ? 'flex' : 'none';
    if (admCurrentPreset !== 'custom') { admActiveMonths = null; await loadAdmData(); }
  });

  document.getElementById('admDateFrom')?.addEventListener('change', async () => {
    if (admCurrentPreset === 'custom') { admActiveMonths = null; await loadAdmData(); }
  });
  document.getElementById('admDateTo')?.addEventListener('change', async () => {
    if (admCurrentPreset === 'custom') { admActiveMonths = null; await loadAdmData(); }
  });

  document.getElementById('admMetricTabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-metric]');
    if (!tab) return;
    document.querySelectorAll('.adm-metric-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    admActiveMetric = tab.dataset.metric;
    renderAdmChart(admMonthlyData, admActiveMonths, admActiveMetric);
  });

  document.getElementById('admExportExcel')?.addEventListener('click', exportAdmExcel);
  document.getElementById('admExportPDF')?.addEventListener('click', exportAdmPrint);
}

// ── ADM Breakdown tables ─────────────────────────────────────────────

function renderAdmUserBreakdown(rows) {
  if (rows.length) admUserBreakdownData = rows;
  const el = document.getElementById('admUserBreakdown');
  if (!el) return;

  const all      = admUserBreakdownData.filter(r => r.doneCount > 0 || r.totalHours > 0);
  const filtered = admUserFilter ? all.filter(r => r.name === admUserFilter) : all;
  const maxPts   = Math.max(...all.map(r => r.totalPoints), 1);

  const filterOpts = all.map(r =>
    `<option value="${escHtml(r.name)}" ${admUserFilter === r.name ? 'selected' : ''}>${escHtml(r.name)}</option>`
  ).join('');

  const tbody = filtered.map(r => {
    const gi       = all.indexOf(r);
    const barPct   = Math.round(r.totalPoints / maxPts * 100);
    const barColor = gi === 0 ? '#3dba6f' : '#e8b844';
    const pos      = gi === 0 ? IC.medal(1) : gi === 1 ? IC.medal(2) : gi === 2 ? IC.medal(3)
      : `<span class="adm-bd-pos">${gi + 1}</span>`;
    return `<tr>
      <td class="adm-bd-name-cell">${pos} <span>${escHtml(r.name)}</span></td>
      <td class="adm-bd-num">${r.doneCount}</td>
      <td class="adm-bd-num adm-bd-pts">${r.totalPoints}</td>
      <td class="adm-bd-num">${r.totalHours.toFixed(1)}h</td>
      <td class="adm-bd-bar-cell">
        <div class="adm-bd-bar-track"><div class="adm-bd-bar-fill" style="width:${barPct}%;background:${barColor}"></div></div>
        <span class="adm-bd-pct-label" style="color:${barColor}">${barPct}%</span>
      </td></tr>`;
  }).join('');

  const body = !all.length
    ? `<p style="color:#5a6478;padding:12px 0;font-size:12px">Sem dados no período</p>`
    : `<table class="adm-bd-table">
        <thead><tr><th>Nome</th><th>Concluídas</th><th>Pontos</th><th>Horas</th><th>Relativo</th></tr></thead>
        <tbody>${tbody || '<tr><td colspan="5" style="color:#5a6478;padding:10px 0;font-size:12px">Nenhum resultado</td></tr>'}</tbody>
       </table>`;

  el.innerHTML = `
    <div class="adm-bd-header">
      <span>Por Colaborador</span>
      ${all.length > 1 ? `<select class="adm-bd-select" id="admCollabFilter">
        <option value="">Todos os membros</option>${filterOpts}</select>` : ''}
    </div>${body}`;

  document.getElementById('admCollabFilter')?.addEventListener('change', e => {
    admUserFilter = e.target.value;
    renderAdmUserBreakdown([]);
  });
}

function renderAdmCompanyBreakdown(rows) {
  if (rows.length) admCompanyBreakdownData = rows;
  const el = document.getElementById('admCompanyBreakdown');
  if (!el) return;

  const all      = admCompanyBreakdownData.filter(r => r.doneCount > 0 || r.totalHours > 0);
  const filtered = all;
  const maxVal   = Math.max(...all.map(r => r.totalPoints || r.doneCount), 1);

  const tbody = filtered.map(r => {
    const pct      = Math.round((r.totalPoints || r.doneCount) / maxVal * 100);
    return `<tr>
      <td class="adm-bd-name-cell"><span>${escHtml(r.company)}</span></td>
      <td class="adm-bd-num">${r.doneCount}</td>
      <td class="adm-bd-num adm-bd-pts">${r.totalPoints}</td>
      <td class="adm-bd-num">${r.totalHours.toFixed(1)}h</td>
      <td class="adm-bd-bar-cell">
        <div class="adm-bd-bar-track"><div class="adm-bd-bar-fill" style="width:${Math.min(pct,100)}%;background:#e8b844"></div></div>
        <span class="adm-bd-pct-label" style="color:#e8b844">${pct}%</span>
      </td></tr>`;
  }).join('');

  const body = !all.length
    ? `<p style="color:#5a6478;padding:12px 0;font-size:12px">Sem dados no período</p>`
    : `<table class="adm-bd-table">
        <thead><tr><th>Empresa</th><th>Concluídas</th><th>Pontos</th><th>Horas</th><th>Relativo</th></tr></thead>
        <tbody>${tbody || '<tr><td colspan="5" style="color:#5a6478;padding:10px 0;font-size:12px">Nenhum resultado</td></tr>'}</tbody>
       </table>`;

  el.innerHTML = `
    <div class="adm-bd-header">
      <span>Por Empresa / Cliente</span>
    </div>${body}`;
}

// ── ADM Export ────────────────────────────────────────────────────────

function exportAdmExcel() {
  if (typeof XLSX === 'undefined') { alert('Biblioteca de exportação não carregada. Verifique sua conexão.'); return; }
  if (!admLastData) { alert('Carregue os dados do painel primeiro.'); return; }
  const d = admLastData;
  const range      = getAdmDateRange();
  const fromLabel  = range?.from || '';
  const toLabel    = range?.to   || '';
  const personName = document.getElementById('admUserSelect')?.selectedOptions[0]?.text || 'Toda a equipe';

  const WB = XLSX.utils.book_new();

  // ── Resumo ──
  const resumo = [
    ['Relatório ADM — MKT Hub'],
    [],
    ['Período',      `${fromLabel} → ${toLabel}`],
    ['Colaborador',  personName],
    [],
    ['Métrica',              'Valor'],
    ['Tasks Concluídas',     d.stats.totalDone],
    ['Pontuação Total',      d.stats.totalPoints],
    ['Horas Registradas',    d.stats.totalHours],
  ];
  XLSX.utils.book_append_sheet(WB, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');

  // ── Por Mês ──
  const mesData = [
    ['Mês', 'Tasks Concluídas', 'Pontos', 'Horas'],
    ...d.months.map(m => [m.label, m.tasksDone, m.pts, m.horas]),
  ];
  XLSX.utils.book_append_sheet(WB, XLSX.utils.aoa_to_sheet(mesData), 'Por Mês');

  // ── Por Colaborador ──
  if (d.userBreakdown && d.userBreakdown.length) {
    const colData = [
      ['Colaborador', 'Tasks Total', 'Concluídas', '% Conclusão', 'Pontos', 'Horas'],
      ...d.userBreakdown.map(r => [
        r.name,
        r.taskCount,
        r.doneCount,
        r.taskCount > 0 ? Math.round(r.doneCount / r.taskCount * 100) + '%' : '0%',
        r.totalPoints,
        r.totalHours,
      ]),
    ];
    XLSX.utils.book_append_sheet(WB, XLSX.utils.aoa_to_sheet(colData), 'Por Colaborador');
  }

  // ── Por Empresa ──
  if (d.companyBreakdown && d.companyBreakdown.length) {
    const empData = [
      ['Empresa / Cliente', 'Tasks Total', 'Concluídas', '% Conclusão', 'Pontos', 'Horas'],
      ...d.companyBreakdown.map(r => [
        r.company,
        r.taskCount,
        r.doneCount,
        r.taskCount > 0 ? Math.round(r.doneCount / r.taskCount * 100) + '%' : '0%',
        r.totalPoints,
        r.totalHours,
      ]),
    ];
    XLSX.utils.book_append_sheet(WB, XLSX.utils.aoa_to_sheet(empData), 'Por Empresa');
  }

  const fileName = `mktimer-adm-${(fromSel?.value || 'relatorio').replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(WB, fileName);
}

function exportAdmPrint() {
  document.body.classList.add('print-adm');
  window.print();
  setTimeout(() => document.body.classList.remove('print-adm'), 500);
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// ROTINA PANEL
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

let _routineWeekFrom = null; // YYYY-MM-DD (Monday of current week)
let _routineWeekTo   = null; // YYYY-MM-DD (Sunday of current week)
let _routineFilterUser = null; // null = all (admin) or self (member)
let _routineFilterCompany = null;
let _routineOnlyMine = false;
let _routineData = null;
let _routineFilterDay = null; // null = todos os dias; 1=Seg..7=Dom (convenção DB)

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// ROTINA PANEL — Weekly grid view
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

const ROUTINE_DOW_LABELS = ['DOM','SEG','TER','QUA','QUI','SEX','S�?B'];
const ROUTINE_DOW_FULL   = ['dom','seg','ter','qua','qui','sex','sáb'];

function routineWeekOf(isoDate) {
  // Returns Mon..Sun of the week containing isoDate
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - dow + 1);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    from: mon.toISOString().slice(0, 10),
    to:   sun.toISOString().slice(0, 10),
  };
}

function routineWeekLabel(from, to) {
  const fmt = (d) => {
    const [,m,day] = d.split('-');
    return `${day}/${m}`;
  };
  const yr = to.slice(0, 4);
  return `${fmt(from)}/${yr} — ${fmt(to)}/${yr}`;
}

function routineIsCurrentWeek(from) {
  const { from: wf } = routineWeekOf(todayISO());
  return from === wf;
}

async function loadRoutinePanel() {
  const today = todayISO();

  // Acesso: admins + cargo storymaker/ugc/publisher
  const canAccess = userProfile?.role === 'admin' || isRoutineMemberCargo(userProfile?.cargo, userProfile?.name);
  if (!canAccess) {
    const section = document.querySelector('.routine-panel');
    if (section) section.innerHTML = '<div style="padding:48px;text-align:center;color:#3a3e5a">Acesso não disponível.</div>';
    return;
  }

  if (!_routineWeekFrom) {
    const w = routineWeekOf(today);
    _routineWeekFrom = w.from;
    _routineWeekTo   = w.to;
  }

  const isAdmin = userProfile?.role === 'admin';

  if (isAdmin) {
    // admins: visão de gestão completa (grid semanal + editar/excluir + histórico)
    renderRoutineShell();
    await Promise.all([fetchAndRenderRoutines(), fetchAndRenderRoutineHistory()]);
  } else {
    // membros (Malu/Zion): mesmo grid, sem Editar/Excluir, feito é imutável
    renderRoutineShell();
    const filtersEl = document.getElementById('rpFilters');
    if (filtersEl) filtersEl.style.display = 'none';
    await Promise.all([fetchAndRenderRoutines(), fetchAndRenderRoutineHistory()]);
  }
}

// ── Member daily view (Malu / Zion) ─────────────────────────────────

function renderMemberRoutineShell() {
  const section = document.querySelector('.routine-panel');
  if (!section) return;

  const today = todayISO();
  const dt = new Date(`${today}T00:00:00Z`);
  const DOW_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dateLabel = `${DOW_PT[dt.getUTCDay()]}, ${dt.getUTCDate()} de ${MONTH_PT[dt.getUTCMonth()]}`;

  section.innerHTML = `
    <h2 class="rp-title">Minha Rotina</h2>
    <p class="rp-date-label">${dateLabel}</p>
    <div class="rp-member-stats" id="rpMemberStats"></div>
    <div class="rp-member-list" id="rpMemberList">
      <p class="rp-loading">Carregando…</p>
    </div>
  `;

  initSkipReasonModal(); // garante que o modal está no body
}

async function fetchAndRenderMemberRoutines(date) {
  const list = document.getElementById('rpMemberList');
  if (!list) return;
  list.innerHTML = '<p class="rp-loading">Carregando…</p>';

  try {
    const data = await api(`/api/routines?action=today-list&date=${date}`);
    renderMemberRoutineList(data.routines || [], date);
  } catch (err) {
    list.innerHTML = `<p class="rp-loading" style="color:#e05252">Erro: ${err.message}</p>`;
  }
}

function renderMemberRoutineList(routines, date) {
  const list  = document.getElementById('rpMemberList');
  const stats = document.getElementById('rpMemberStats');
  if (!list) return;

  const done    = routines.filter(r => r.status === ROUTINE_STATUS.DONE).length;
  const skipped = routines.filter(r => r.status === ROUTINE_STATUS.SKIP).length;
  const total   = routines.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (stats) {
    stats.innerHTML = `
      <div class="rpm-stat"><span class="rpm-val">${done}/${total}</span><span class="rpm-lbl">Feitas</span></div>
      <div class="rpm-stat"><span class="rpm-val" style="color:#e05252">${skipped}</span><span class="rpm-lbl">Não feitas</span></div>
      <div class="rpm-stat"><span class="rpm-val" style="color:${pct>=100?'#3dba6f':'#e8b844'}">${pct}%</span><span class="rpm-lbl">Da rotina</span></div>
    `;
  }

  if (!routines.length) {
    list.innerHTML = '<div class="rp-empty">Nenhuma rotina para hoje.</div>';
    return;
  }

  list.innerHTML = routines.map(r => {
    const isDone = r.status === ROUTINE_STATUS.DONE;
    const isSkip = r.status === ROUTINE_STATUS.SKIP;
    const CO_COLOR = { 'SeuBoné': '#e8b844', 'Onevo': '#3b82f6', 'Carbone Educação': '#22d3a3' };
    const coColor = r.company ? (CO_COLOR[r.company] || '#7882a4') : '#7882a4';
    const coAbbr = r.company ? (r.company === 'SeuBoné' ? 'SB' : r.company === 'Onevo' ? 'ON' : 'CB') : '';
    const coTag = coAbbr ? `<span class="rp-co-tag" style="background:${coColor}22;color:${coColor}">${coAbbr}</span>` : '';
    const obs = r.observation ? `<p class="rpm-obs">${escHtml(r.observation)}</p>` : '';
    const skipNote = r.status === ROUTINE_STATUS.SKIP && r.reason ? `<p class="rpm-skip-reason">Motivo: ${escHtml(r.reason)}</p>` : '';

    return `<div class="rpm-item${isDone ? ' rpm-done' : isSkip ? ' rpm-skip' : ''}" data-rid="${r.id}">
      <div class="rpm-left">
        ${coTag}
        <div class="rpm-info">
          <span class="rpm-title">${escHtml(r.title)}</span>
          ${obs}${skipNote}
        </div>
      </div>
      <div class="rpm-actions">
        <button class="rpm-btn rpm-btn-done${isDone ? ' active' : ''}"
          data-rid="${r.id}" data-date="${date}" data-act="done"
          title="Feita">${IC.check}</button>
        <button class="rpm-btn rpm-btn-skip${isSkip ? ' active' : ''}"
          data-rid="${r.id}" data-date="${date}" data-act="skip"
          title="Não feita">${IC.xMark}</button>
      </div>
    </div>`;
  }).join('');

  // Wire buttons
  list.querySelectorAll('.rpm-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rid  = btn.dataset.rid;
      const date = btn.dataset.date;
      const act  = btn.dataset.act;
      const routine = routines.find(r => String(r.id) === String(rid));

      if (act === ROUTINE_STATUS.DONE) {
        // Toggle done
        const currentlyDone = btn.classList.contains('active');
        btn.disabled = true;
        try {
          await api('/api/routines?action=toggle', {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: currentlyDone ? 'remove' : ROUTINE_STATUS.DONE }),
          });
          if (routine) routine.status = currentlyDone ? null : ROUTINE_STATUS.DONE;
          renderMemberRoutineList(routines, date);
        } finally { btn.disabled = false; }
      } else if (act === ROUTINE_STATUS.SKIP) {
        openSkipReasonModal(routine?.title || '', async (reason) => {
          await api('/api/routines?action=toggle', {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: ROUTINE_STATUS.SKIP, reason }),
          });
          if (routine) { routine.status = ROUTINE_STATUS.SKIP; routine.reason = reason; }
          renderMemberRoutineList(routines, date);
        });
      }
    });
  });
}

function renderRoutineShell() {
  const section = document.querySelector('.routine-panel');
  if (!section) return;
  section.innerHTML = `
    <div class="rp-breadcrumb">
      <span class="rp-bc-home">⌂</span>
      <span class="rp-bc-sep">›</span>
      <span class="rp-bc-item">Rotinas</span>
      <span class="rp-bc-sep">›</span>
      <span class="rp-bc-item rp-bc-active">Check Semanal</span>
    </div>
    <h2 class="rp-title">Check Semanal de Rotinas</h2>
    <p class="rp-subtitle">Marque as rotinas realizadas na semana.</p>

    <div class="rp-week-nav">
      <button class="rp-nav-btn" id="rpPrevWeek">‹</button>
      <div class="rp-week-info">
        <span class="rp-week-range" id="rpWeekRange">—</span>
        <div class="rp-week-badges" id="rpWeekBadges"></div>
      </div>
      <button class="rp-nav-btn" id="rpNextWeek">›</button>
      <div class="rp-progress-wrap">
        <span class="rp-progress-counts" id="rpProgressCounts">0 / 0</span>
        <div class="rp-progress-bar"><div class="rp-progress-fill" id="rpProgressFill" style="width:0%"></div></div>
        <span class="rp-progress-pct" id="rpProgressPct">0%</span>
      </div>
    </div>

    <div class="rp-filters" id="rpFilters">
      <label class="rp-filter-mine">
        <input type="checkbox" id="rpOnlyMine" ${_routineOnlyMine ? 'checked' : ''}/>
        <span>Só minhas</span>
      </label>
      <label class="rp-filter-label">Empresa</label>
      <select id="rpFilterCompany" class="rp-filter-sel">
        <option value="">Todas</option>
        <option value="SeuBoné">SeuBoné</option>
        <option value="Onevo">Onevo</option>
        <option value="Carbone Educação">Carbone Educação</option>
      </select>
      <label class="rp-filter-label">Responsável</label>
      <select id="rpFilterUser" class="rp-filter-sel" id="rpFilterUser">
        <option value="">Todos</option>
      </select>
      <button class="rp-filter-clear" id="rpFilterClear">Limpar filtros</button>
    </div>

    <div class="rp-day-filter" id="rpDayFilter">
      <span class="rp-day-filter-label">Dia:</span>
      <button class="rp-day-btn rp-day-all" data-dow="">Todos</button>
      <button class="rp-day-btn" data-dow="1">Seg</button>
      <button class="rp-day-btn" data-dow="2">Ter</button>
      <button class="rp-day-btn" data-dow="3">Qua</button>
      <button class="rp-day-btn" data-dow="4">Qui</button>
      <button class="rp-day-btn" data-dow="5">Sex</button>
      <button class="rp-day-btn" data-dow="6">Sáb</button>
      <button class="rp-day-btn" data-dow="7">Dom</button>
    </div>

    <div class="rp-grid-wrap" id="rpGridWrap">
      <p class="rp-loading">Carregando...</p>
    </div>

    <!-- Gráfico histórico de % realização por semana -->
    <div class="rp-history-section" id="rpHistorySection">
      <div class="rp-history-title">Histórico semanal de realização</div>
      <div class="rp-history-chart-wrap">
        <canvas id="rpHistoryChart"></canvas>
      </div>
    </div>

    <!-- Admin: add routines (visível apenas para ADMIN_MASTER) -->
    <div class="rp-admin-section" id="rpAdminSection" style="display:none">
      <div class="rp-admin-title">Gerenciar Rotinas</div>
      <div class="rp-admin-user-row">
        <label class="rp-filter-label">Responsável:</label>
        <select id="rpAdminUserSel" class="rp-filter-sel"></select>
      </div>
      <div id="rpAdminList" class="rp-admin-list"></div>
      <form id="rpAdminAddForm" class="rp-admin-add-form">
        <input id="rpAddTitle" class="rp-add-input" type="text" placeholder="Descrição da atividade…" maxlength="120" required />
        <select id="rpAddCompany" class="rp-filter-sel" required>
          <option value="" disabled selected>Empresa *</option>
          <option value="SeuBoné">SeuBoné</option>
          <option value="Onevo">Onevo</option>
          <option value="Carbone Educação">Carbone Educação</option>
        </select>
        <select id="rpAddFreq" class="rp-filter-sel" required>
          <option value="" disabled selected>Frequência *</option>
          <option value="daily">Diária (Seg–Dom)</option>
          <option value="daily-weekdays">Diária (Dias úteis — Seg a Sex)</option>
          <option value="weekly">Semanal (1x/semana)</option>
          <option value="3x_week">3x na semana</option>
          <option value="custom">Personalizado (dias da semana)</option>
          <option value="monthly">Mensal (dia do mês)</option>
        </select>
        <div id="rpDaySelectorWrap" style="display:none">
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:6px 0 4px">Dias da semana:</p>
          <div class="rp-day-checkboxes" id="rpDayCheckboxes">
            <label class="rp-day-cb"><input type="checkbox" value="1" /> Seg</label>
            <label class="rp-day-cb"><input type="checkbox" value="2" /> Ter</label>
            <label class="rp-day-cb"><input type="checkbox" value="3" /> Qua</label>
            <label class="rp-day-cb"><input type="checkbox" value="4" /> Qui</label>
            <label class="rp-day-cb"><input type="checkbox" value="5" /> Sex</label>
            <label class="rp-day-cb"><input type="checkbox" value="6" /> Sáb</label>
            <label class="rp-day-cb"><input type="checkbox" value="7" /> Dom</label>
          </div>
        </div>
        <div id="rpMonthDaySelectorWrap" style="display:none">
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:6px 0 4px">Todo dia:</p>
          <input id="rpAddMonthDay" class="rp-add-input" type="number" min="1" max="31" placeholder="Ex: 15" style="width:90px" />
        </div>
        <button type="submit" class="rp-add-btn">Adicionar</button>
      </form>

      <!-- Importar via CSV -->
      <div class="rp-csv-section">
        <div class="rp-csv-title">Importar rotinas via CSV</div>
        <p class="rp-csv-hint">Colunas: <code>responsavel, titulo, empresa, frequencia, dias, observacao</code></p>
        <label class="rp-csv-label">
          <input type="file" id="rpCsvInput" accept=".csv,.txt" style="display:none" />
          <span class="rp-csv-btn">Escolher arquivo CSV</span>
        </label>
        <div id="rpCsvPreview" class="rp-csv-preview" style="display:none"></div>
        <button id="rpCsvImportBtn" class="rp-add-btn" style="display:none">Importar rotinas</button>
      </div>
    </div>
  `;

  // Wire week nav
  document.getElementById('rpPrevWeek')?.addEventListener('click', () => {
    const d = new Date(`${_routineWeekFrom}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    const w = routineWeekOf(d.toISOString().slice(0, 10));
    _routineWeekFrom = w.from; _routineWeekTo = w.to;
    fetchAndRenderRoutines();
  });
  document.getElementById('rpNextWeek')?.addEventListener('click', () => {
    const d = new Date(`${_routineWeekFrom}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    const w = routineWeekOf(d.toISOString().slice(0, 10));
    _routineWeekFrom = w.from; _routineWeekTo = w.to;
    fetchAndRenderRoutines();
  });
  document.getElementById('rpOnlyMine')?.addEventListener('change', (e) => {
    _routineOnlyMine = e.target.checked;
    renderRoutineGrid();
  });
  document.getElementById('rpFilterCompany')?.addEventListener('change', (e) => {
    _routineFilterCompany = e.target.value || null;
    renderRoutineGrid();
  });
  document.getElementById('rpFilterUser')?.addEventListener('change', (e) => {
    _routineFilterUser = e.target.value ? Number(e.target.value) : null;
    renderRoutineGrid();
  });
  // Inicializa filtro de dia com o dia atual (BRT), convenção DB: 1=Seg..7=Dom
  const _nowBRT   = new Date(Date.now() - 3 * 3600000);
  const _todayDow = _nowBRT.getUTCDay() || 7; // 0(Dom)→7, 1-6 inalterados
  _routineFilterDay = _todayDow;

  function rpSyncDayButtons() {
    document.querySelectorAll('#rpDayFilter .rp-day-btn').forEach(b => {
      const v = b.dataset.dow === '' ? null : Number(b.dataset.dow);
      b.classList.toggle('active', v === _routineFilterDay);
    });
  }
  rpSyncDayButtons();

  document.getElementById('rpDayFilter')?.querySelectorAll('.rp-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _routineFilterDay = btn.dataset.dow !== '' ? Number(btn.dataset.dow) : null;
      rpSyncDayButtons();
      renderRoutineGrid();
    });
  });

  document.getElementById('rpFilterClear')?.addEventListener('click', () => {
    _routineOnlyMine = false; _routineFilterCompany = null; _routineFilterUser = null;
    document.getElementById('rpOnlyMine').checked = false;
    document.getElementById('rpFilterCompany').value = '';
    document.getElementById('rpFilterUser').value = '';
    _routineFilterDay = null;
    rpSyncDayButtons();
    renderRoutineGrid();
  });

  // Admin section — exclusivo para admin
  const user = JSON.parse(localStorage.getItem('mktimer_user') || 'null');
  const isAdmin = user?.role === 'admin';
  const admSec = document.getElementById('rpAdminSection');
  if (admSec) admSec.style.display = isAdmin ? '' : 'none';

  if (isAdmin) {
    initRoutineAdminSection();

    // Mostrar/ocultar seletor de dias/mês conforme frequência
    document.getElementById('rpAddFreq')?.addEventListener('change', (e) => {
      const val         = e.target.value;
      const needsDays   = val === 'weekly' || val === '3x_week' || val === 'custom';
      const needsMonth  = val === 'monthly';
      const wrap        = document.getElementById('rpDaySelectorWrap');
      const monthWrap   = document.getElementById('rpMonthDaySelectorWrap');
      if (wrap)      wrap.style.display      = needsDays  ? '' : 'none';
      if (monthWrap) monthWrap.style.display = needsMonth ? '' : 'none';
      if (val === '3x_week') {
        document.querySelectorAll('#rpDayCheckboxes input').forEach(i => {
          i.checked = [1, 3, 5].includes(Number(i.value));
        });
      }
    });
  }
}

async function fetchAndRenderRoutines() {
  const wrap = document.getElementById('rpGridWrap');
  if (wrap) wrap.innerHTML = '<p class="rp-loading">Carregando...</p>';

  // Update week display
  const rangeEl = document.getElementById('rpWeekRange');
  if (rangeEl) rangeEl.textContent = routineWeekLabel(_routineWeekFrom, _routineWeekTo);

  const badgesEl = document.getElementById('rpWeekBadges');
  if (badgesEl) {
    const isCurrent = routineIsCurrentWeek(_routineWeekFrom);
    const prevW = (() => {
      const d = new Date(`${_routineWeekFrom}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 7);
      return routineWeekOf(d.toISOString().slice(0, 10)).from;
    })();
    const isPrev = _routineWeekFrom === prevW; // won't match, just for future
    badgesEl.innerHTML = isCurrent
      ? '<span class="rp-badge rp-badge-current">Semana atual</span>'
      : `<span class="rp-badge rp-badge-past">Sem. passada</span>`;
  }

  const userId = null; // admin sees all; member sees self — API handles auth
  const qs = userId ? `&userId=${userId}` : '';
  try {
    const data = await api(`/api/routines?action=week-grid&from=${_routineWeekFrom}&to=${_routineWeekTo}${qs}`);
    _routineData = data;

    // Populate user filter
    const userSel = document.getElementById('rpFilterUser');
    if (userSel && data.routines) {
      const existingIds = new Set([...userSel.options].map(o => o.value).filter(Boolean));
      const persons = [...new Map(data.routines.map(r => [String(r.userId), r.personName])).entries()];
      persons.forEach(([id, name]) => {
        if (!existingIds.has(id)) {
          const opt = document.createElement('option');
          opt.value = id; opt.textContent = name;
          userSel.appendChild(opt);
        }
      });
    }

    renderRoutineGrid();
  } catch (err) {
    if (wrap) wrap.innerHTML = `<p class="rp-loading" style="color:#e05252">Erro: ${err.message}</p>`;
  }
}

function renderRoutineGrid() {
  const wrap = document.getElementById('rpGridWrap');
  if (!wrap || !_routineData) return;

  const { routines = [], dates = [], summary = {} } = _routineData;
  const currentUser = JSON.parse(localStorage.getItem('mktimer_user') || 'null');
  const isAdmin = currentUser?.role === 'admin';

  // Filter
  let filtered = routines;
  if (_routineOnlyMine && currentUser) {
    filtered = filtered.filter(r => r.userId === currentUser.id || String(r.userId) === String(currentUser.id));
  }
  if (_routineFilterCompany) {
    filtered = filtered.filter(r => r.company === _routineFilterCompany);
  }
  if (_routineFilterUser) {
    filtered = filtered.filter(r => Number(r.userId) === _routineFilterUser);
  }
  if (_routineFilterDay !== null) {
    filtered = filtered.filter(r => {
      const days = r.applies_days || [];
      if (!days.length) return true;            // sem restrição de dia → sempre aparece
      if (r.frequency === 'monthly') return true; // dias do mês, não da semana
      return days.includes(_routineFilterDay);
    });
  }

  // Recalculate summary for filtered set — entry é { status, reason } ou null
  let totalSlots = 0, doneSlots = 0;
  for (const r of filtered) {
    for (const [, entry] of Object.entries(r.days)) {
      totalSlots++;
      if (entry?.status === ROUTINE_STATUS.DONE) doneSlots++;
    }
  }
  const pct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

  // Update progress
  const cEl = document.getElementById('rpProgressCounts');
  const fEl = document.getElementById('rpProgressFill');
  const pEl = document.getElementById('rpProgressPct');
  if (cEl) cEl.textContent = `${doneSlots} / ${totalSlots}`;
  if (fEl) fEl.style.width = `${Math.min(pct, 100)}%`;
  if (pEl) pEl.textContent = `${pct}%`;

  if (!filtered.length) {
    wrap.innerHTML = '<div class="rp-empty">Nenhuma rotina encontrada.</div>';
    return;
  }

  // Build header dates
  const headerDates = dates.map(d => {
    const dt = new Date(`${d}T00:00:00Z`);
    const dow = dt.getUTCDay(); // 0=Sun..6=Sat
    const label = ROUTINE_DOW_LABELS[dow];
    const dayNum = d.slice(8, 10) + '/' + d.slice(5, 7);
    return { d, label, dayNum };
  });

  const theadCols = headerDates.map(h =>
    `<th class="rp-th-day"><div class="rp-th-dow">${h.label}</div><div class="rp-th-date">${h.dayNum}</div></th>`
  ).join('');

  const CO_ABBR = { 'SeuBoné': 'SB', 'Onevo': 'ON', 'Carbone Educação': 'CB' };
  const CO_COLOR = { 'SeuBoné': '#e8b844', 'Onevo': '#3b82f6', 'Carbone Educação': '#22d3a3' };

  const rows = filtered.map(r => {
    const abbr  = r.company ? (CO_ABBR[r.company] || r.company.slice(0, 2).toUpperCase()) : '';
    const color = r.company ? (CO_COLOR[r.company] || '#7882a4') : '#7882a4';
    const coTag = abbr ? `<span class="rp-co-tag" style="background:${color}22;color:${color}">${abbr}</span>` : '';
    const _days = r.applies_days || [];
    let freqLabel;
    if (r.frequency === 'daily') {
      freqLabel = _days.length === 5 ? 'Diária (Dias úteis)' : _days.length ? `Diária (${_days.length}d)` : 'Diária';
    } else if (r.frequency === 'weekly') {
      if      (_days.length === 0) freqLabel = 'Semanal';
      else if (_days.length === 1) freqLabel = 'Semanal (1x)';
      else if (_days.length === 3) freqLabel = '3x semana';
      else                          freqLabel = `${_days.length}x semana`;
    } else if (r.frequency === 'monthly') {
      freqLabel = _days.length ? `Mensal (dia ${_days[0]})` : 'Mensal';
    } else {
      freqLabel = r.frequency || '—';
    }
    const freqTag = `<span class="rp-freq-tag rp-freq-${r.frequency}">${freqLabel}</span>`;
    const initials = r.personName ? r.personName.split(' ').slice(0,2).map(p=>p[0].toUpperCase()).join('') : '?';

    const cells = headerDates.map(h => {
      const applicable = r.days.hasOwnProperty(h.d);
      if (!applicable) return `<td class="rp-td-day"><span class="rp-cell-na">—</span></td>`;
      const entry  = r.days[h.d]; // null | { status, reason }
      const status = entry?.status || null;
      const reason = entry?.reason || null;

      // Membros: uma vez marcada como feita, a célula fica bloqueada (sem desfazer)
      if (!isAdmin && status === ROUTINE_STATUS.DONE) {
        return `<td class="rp-td-day">
          <div class="rp-cell-btns">
            <button class="rp-cell-btn rp-cell-done active" disabled title="Concluída — não pode ser alterada">✓</button>
          </div>
        </td>`;
      }

      const reasonHtml = status === ROUTINE_STATUS.SKIP && reason
        ? `<div class="rp-cell-reason" title="${escHtml(reason)}">
             <span class="rp-cell-reason-icon">${IC.warn}</span>
             <span class="rp-cell-reason-text">${escHtml(reason.length > 40 ? reason.slice(0,40)+'…' : reason)}</span>
           </div>`
        : '';
      return `<td class="rp-td-day${status === ROUTINE_STATUS.SKIP ? ' rp-td-skip' : ''}">
        <div class="rp-cell-btns">
          <button class="rp-cell-btn rp-cell-done${status === ROUTINE_STATUS.DONE ? ' active' : ''}"
            data-rid="${r.id}" data-date="${h.d}" data-action="done" title="Concluída">✓</button>
          <button class="rp-cell-btn rp-cell-skip${status === ROUTINE_STATUS.SKIP ? ' active' : ''}"
            data-rid="${r.id}" data-date="${h.d}" data-action="skip"
            title="${status === ROUTINE_STATUS.SKIP && reason ? escHtml(reason) : 'Não realizada'}">✕</button>
        </div>
        ${reasonHtml}
      </td>`;
    }).join('');

    const adminActions = isAdmin ? `
      <div class="rp-routine-actions">
        <button class="rp-routine-action-btn rp-routine-edit-btn" data-rid="${r.id}" title="Editar rotina">${IC.pencil} Editar</button>
        <button class="rp-routine-action-btn rp-routine-del-btn"  data-rid="${r.id}" title="Excluir rotina">${IC.trash} Excluir</button>
      </div>` : '';

    return `<tr class="rp-row">
      <td class="rp-td-routine">
        <div class="rp-routine-info">
          ${coTag}
          <div class="rp-routine-text">
            <span class="rp-routine-title">${escHtml(r.title)}</span>
            <div class="rp-routine-meta">
              <span class="rp-avatar" title="${escHtml(r.personName)}">${initials}</span>
              <span class="rp-routine-person">${escHtml(r.personName)}</span>
              ${freqTag}
            </div>
          </div>
        </div>
        ${adminActions}
      </td>
      ${cells}
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="rp-table-scroll">
      <table class="rp-table">
        <thead>
          <tr>
            <th class="rp-th-routine">ROTINA</th>
            ${theadCols}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  // Wire cell buttons
  wrap.querySelectorAll('.rp-cell-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rid    = btn.dataset.rid;
      const date   = btn.dataset.date;
      const action = btn.dataset.action; // 'done' or 'skip'
      const row    = btn.closest('tr');
      const allBtns = row?.querySelectorAll(`.rp-cell-btn[data-rid="${rid}"][data-date="${date}"]`);
      const currentlyActive = btn.classList.contains('active');

      // Desmarcar (toggle off): remove direto sem modal
      if (currentlyActive) {
        btn.disabled = true;
        try {
          await api(`/api/routines?action=toggle`, {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: 'remove' }),
          });
          const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
          if (routine) routine.days[date] = null;
          allBtns?.forEach(b => b.classList.remove('active'));
          renderRoutineGrid();
        } catch (err) { console.error('[routine toggle]', err.message); }
        finally { btn.disabled = false; }
        return;
      }

      // Marcar como feita: direto
      if (action === ROUTINE_STATUS.DONE) {
        btn.disabled = true;
        try {
          await api(`/api/routines?action=toggle`, {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: ROUTINE_STATUS.DONE }),
          });
          const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
          if (routine) routine.days[date] = { status: ROUTINE_STATUS.DONE, reason: null };
          allBtns?.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderRoutineGrid();
        } catch (err) { console.error('[routine toggle]', err.message); }
        finally { btn.disabled = false; }
        return;
      }

      // Marcar como NÃO feita: abre modal de motivo (obrigatório)
      if (action === ROUTINE_STATUS.SKIP) {
        const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
        const routineTitle = routine?.title || '';
        openSkipReasonModal(routineTitle, async (reason) => {
          await api(`/api/routines?action=toggle`, {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: ROUTINE_STATUS.SKIP, reason }),
          });
          if (routine) routine.days[date] = { status: ROUTINE_STATUS.SKIP, reason };
          renderRoutineGrid();
        });
        return;
      }

    });
  });

  // Editar rotina (apenas adm)
  wrap.querySelectorAll('.rp-routine-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.rid;
      const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
      if (routine) openRoutineEditModal(routine);
    });
  });

  // Excluir rotina (apenas adm)
  wrap.querySelectorAll('.rp-routine-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rid = btn.dataset.rid;
      const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
      if (!confirm(`Excluir "${escHtml(routine?.title || 'esta rotina')}"?\nEsta ação não pode ser desfeita.`)) return;
      btn.disabled = true;
      try {
        await api(`/api/routines?action=delete&routineId=${rid}`, { method: 'DELETE' });
        await fetchAndRenderRoutines();
      } catch (err) {
        alert(`Erro ao excluir: ${err.message}`);
        btn.disabled = false;
      }
    });
  });
}

let _rpHistoryChart = null;

async function fetchAndRenderRoutineHistory() {
  const section = document.getElementById('rpHistorySection');
  if (!section) return;

  try {
    const data = await api('/api/routines?action=weekly-history&weeks=8');
    const weeks = data.weeks || [];
    if (!weeks.length || weeks.every(w => w.total === 0)) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    const canvas = document.getElementById('rpHistoryChart');
    if (!canvas) return;

    if (_rpHistoryChart) { _rpHistoryChart.destroy(); _rpHistoryChart = null; }

    const labels = weeks.map(w => w.label);
    const pcts   = weeks.map(w => w.pct ?? 0);
    const colors = pcts.map(p =>
      p === null ? 'rgba(58,62,90,0.4)' :
      p >= 80    ? '#22d3a3' :
      p >= 50    ? '#f59e0b' : '#f04444'
    );

    _rpHistoryChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: pcts,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw ?? 0}% de realização` } },
          datalabels: {
            display: true,
            color: '#c8d0dc',
            font: { size: 10, weight: '700' },
            formatter: v => v != null ? `${v}%` : '—',
            anchor: 'end',
            align: 'end',
            offset: 2,
          },
        },
        scales: {
          x: {
            ticks: { color: '#7882a4', font: { size: 10 } },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            display: false,
            min: 0,
            max: 110,
          },
        },
      },
      plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
    });
  } catch (err) {
    console.warn('[routine-history]', err.message);
    if (section) section.style.display = 'none';
  }
}

async function initRoutineAdminSection() {
  const userSel = document.getElementById('rpAdminUserSel');
  if (!userSel || userSel.options.length > 0) return;

  try {
    const data = await api('/api/users');
    (data.users || []).forEach(u => {
      const opt = document.createElement('option'); opt.value = u.id; opt.textContent = u.name;
      userSel.appendChild(opt);
    });
    userSel.addEventListener('change', () => loadAdminRoutineList(Number(userSel.value)));
    if (userSel.value) loadAdminRoutineList(Number(userSel.value));
  } catch {}

  const form = document.getElementById('rpAdminAddForm');
  if (form && !form._bound) {
    form._bound = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uid     = Number(document.getElementById('rpAdminUserSel')?.value);
      const title   = document.getElementById('rpAddTitle')?.value.trim();
      const company = document.getElementById('rpAddCompany')?.value;
      const freqRaw = document.getElementById('rpAddFreq')?.value;
      const points  = 0;
      if (!uid || !title || !company || !freqRaw) return;

      // Mapeia freq para valores aceitos pelo DB + extrai applies_days
      let frequency   = freqRaw;
      let applies_days = null;

      if (freqRaw === 'daily-weekdays') {
        frequency = 'daily';
        applies_days = [1, 2, 3, 4, 5];
      } else if (freqRaw === '3x_week') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        applies_days = checked.length ? checked : [1, 3, 5];
      } else if (freqRaw === 'custom') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        if (!checked.length) { alert('Selecione ao menos um dia da semana.'); return; }
        applies_days = checked;
      } else if (freqRaw === 'weekly') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        applies_days = checked.length ? checked : null;
      } else if (freqRaw === 'monthly') {
        frequency = 'monthly';
        const dom = Number(document.getElementById('rpAddMonthDay')?.value);
        if (!dom || dom < 1 || dom > 31) { alert('Informe um dia do mês válido (1–31).'); return; }
        applies_days = [dom];
      }

      try {
        await api('/api/routines?action=create', {
          method: 'POST',
          body: JSON.stringify({ userId: uid, title, company, frequency, applies_days, points }),
        });
        document.getElementById('rpAddTitle').value = '';
        document.getElementById('rpAddCompany').value = '';
        document.getElementById('rpAddFreq').value = '';
        document.getElementById('rpDaySelectorWrap').style.display = 'none';
        document.getElementById('rpMonthDaySelectorWrap').style.display = 'none';
        document.querySelectorAll('#rpDayCheckboxes input').forEach(i => { i.checked = false; });
        const monthDayEl = document.getElementById('rpAddMonthDay');
        if (monthDayEl) monthDayEl.value = '';
        await loadAdminRoutineList(uid);
        await fetchAndRenderRoutines();
      } catch (err) {
        console.error('[rotina create]', err.message);
      }
    });
  }

  initRoutineCsvImport();
}

function initRoutineCsvImport() {
  const fileInput   = document.getElementById('rpCsvInput');
  const csvLabel    = fileInput?.closest('label');
  const previewEl   = document.getElementById('rpCsvPreview');
  const importBtn   = document.getElementById('rpCsvImportBtn');
  if (!fileInput || !previewEl || !importBtn) return;

  let _parsedRows = [];

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      _parsedRows = parseCsvRoutines(e.target.result);
      if (!_parsedRows.length) {
        previewEl.style.display = '';
        previewEl.innerHTML = '<p class="rp-csv-err">Nenhuma linha válida encontrada no CSV.</p>';
        importBtn.style.display = 'none';
        return;
      }
      previewEl.style.display = '';
      previewEl.innerHTML = `
        <p class="rp-csv-count">${_parsedRows.length} rotina(s) para importar:</p>
        <ul class="rp-csv-list">${_parsedRows.map(r =>
          `<li><strong>${escHtml(r.titulo)}</strong> — ${escHtml(r.responsavel)} / ${escHtml(r.empresa)} / ${escHtml(r.frequencia)}</li>`
        ).join('')}</ul>`;
      importBtn.style.display = '';
    };
    reader.readAsText(file, 'utf-8');
  });

  importBtn.addEventListener('click', async () => {
    if (!_parsedRows.length) return;
    importBtn.disabled = true;
    importBtn.textContent = 'Importando…';

    try {
      const usersData = await api('/api/users');
      const users = usersData.users || [];
      const findUser = (name) => {
        const n = (name || '').toLowerCase().trim();
        return users.find(u => u.name.toLowerCase().trim().startsWith(n) || n.startsWith(u.name.toLowerCase().trim().split(' ')[0]));
      };

      let ok = 0, fail = 0;
      for (const row of _parsedRows) {
        const user = findUser(row.responsavel);
        if (!user) { fail++; continue; }
        try {
          await api('/api/routines?action=create', {
            method: 'POST',
            body: JSON.stringify({
              userId:       user.id,
              title:        row.titulo,
              observation:  row.observacao || null,
              company:      row.empresa || null,
              frequency:    row.frequency,
              applies_days: row.applies_days,
              points:       0,
            }),
          });
          ok++;
        } catch { fail++; }
      }

      previewEl.innerHTML = `<p class="rp-csv-count" style="color:#22d3a3">${ok} importada(s)${fail ? ` · ${fail} erro(s)` : ''}</p>`;
      importBtn.style.display = 'none';
      _parsedRows = [];
      fileInput.value = '';
      await fetchAndRenderRoutines();
    } catch (err) {
      previewEl.innerHTML = `<p class="rp-csv-err">Erro: ${escHtml(err.message)}</p>`;
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = 'Importar rotinas';
    }
  });
}

function parseCsvRoutines(text) {
  const FREQ_MAP = {
    'diaria': 'daily', 'diária': 'daily', 'daily': 'daily',
    'semanal': 'weekly', 'weekly': 'weekly',
    'mensal': 'monthly', 'monthly': 'monthly',
    '3x': 'weekly', '3x_week': 'weekly',
  };
  const DOW_MAP = { 'seg':1,'ter':2,'qua':3,'qui':4,'sex':5,'sab':6,'sáb':6,'dom':7 };

  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  // Detect separator
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase()
    .replace(/[^a-z]/g, ''));

  const idxOf = (k) => header.findIndex(h => h.includes(k));
  const iResp  = idxOf('responsav');
  const iTit   = idxOf('titul');
  const iEmp   = idxOf('empres');
  const iFreq  = idxOf('freq');
  const iDias  = idxOf('dias');
  const iObs   = idxOf('observ');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const titulo = iTit >= 0 ? cols[iTit] : '';
    if (!titulo) continue;
    const freqRaw = iFreq >= 0 ? (cols[iFreq] || 'daily').toLowerCase().trim() : 'daily';
    const frequency = FREQ_MAP[freqRaw] || 'daily';
    let applies_days = null;
    if (iDias >= 0 && cols[iDias]) {
      applies_days = cols[iDias].split(/[,/|]/).map(d => DOW_MAP[d.trim().toLowerCase()]).filter(Boolean);
      if (!applies_days.length) applies_days = null;
    }
    rows.push({
      responsavel: iResp >= 0 ? cols[iResp] : '',
      titulo,
      empresa:     iEmp  >= 0 ? cols[iEmp]  : '',
      observacao:  iObs  >= 0 ? cols[iObs]  : '',
      frequencia:  freqRaw,
      frequency,
      applies_days,
    });
  }
  return rows;
}

async function loadAdminRoutineList(userId) {
  const list = document.getElementById('rpAdminList');
  if (!list || !userId) return;
  try {
    const data = await api(`/api/routines?action=list&date=${todayISO()}&userId=${userId}`);
    const routines = data.routines || [];
    if (!routines.length) { list.innerHTML = '<p style="font-size:11px;color:#3a3e5a;padding:6px 0">Nenhuma rotina ainda.</p>'; return; }
    list.innerHTML = routines.map(r => `
      <div class="rp-admin-item">
        <span class="rp-admin-item-name">${escHtml(r.title)}</span>
        <span class="rp-admin-item-pts">${r.points}p</span>
        <button class="rp-admin-del" data-del="${r.id}">×</button>
      </div>`).join('');
    list.querySelectorAll('.rp-admin-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover esta rotina?')) return;
        await api(`/api/routines?action=delete&routineId=${btn.dataset.del}`, { method: 'DELETE' });
        await loadAdminRoutineList(userId);
        await fetchAndRenderRoutines();
      });
    });
  } catch {}
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// SNAPSHOT VALIDATION — painel de fechamento semanal (admin only)
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

const snapValidationState = {
  snapshots: [],
  selectedSemanaId: '',
  preset: 'ultima-semana',
};

function snapshotSemanaIdFromDate(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function snapshotSemanaIdForPreset(preset) {
  if (preset !== 'semana' && preset !== 'ultima-semana') return '';
  const date = new Date();
  if (preset === 'ultima-semana') date.setDate(date.getDate() - 7);
  return snapshotSemanaIdFromDate(date);
}

function snapshotRangeFromSemanaId(semanaId) {
  const match = String(semanaId || '').match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const jan4 = new Date(Date.UTC(Number(match[1]), 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mon = new Date(jan4);
  mon.setUTCDate(jan4.getUTCDate() - day + 1 + (Number(match[2]) - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    from: mon.toISOString().slice(0, 10),
    to: sun.toISOString().slice(0, 10),
  };
}

function snapshotStatusMeta(status) {
  if (status === SNAPSHOT_STATUS.FECHADO) {
    return { cls: 'snap-val-status-closed', icon: IC.lock, label: 'Semana fechada' };
  }
  return { cls: 'snap-val-status-pending', icon: IC.clock, label: 'Aguardando validação' };
}

function snapshotResolveSelection() {
  const presetSemanaId = snapshotSemanaIdForPreset(snapValidationState.preset);
  if (presetSemanaId) return presetSemanaId;
  if (snapValidationState.selectedSemanaId) return snapValidationState.selectedSemanaId;
  return snapValidationState.snapshots[0]?.semana_id || '';
}

function snapshotApplyPreset(preset) {
  snapValidationState.preset = preset;
  snapValidationState.selectedSemanaId = snapshotSemanaIdForPreset(preset) || snapValidationState.selectedSemanaId;
  const wrap = document.getElementById('snapValidationWrap');
  if (wrap) renderSnapshotValidation(wrap, snapValidationState.snapshots);
}

function snapshotApplySelection(semanaId) {
  snapValidationState.preset = 'custom';
  snapValidationState.selectedSemanaId = semanaId;
  const wrap = document.getElementById('snapValidationWrap');
  if (wrap) renderSnapshotValidation(wrap, snapValidationState.snapshots);
}

function renderSnapshotWeekDialog() {
  const dlg = document.getElementById('snapWeekDialog');
  const list = document.getElementById('snapWeekList');
  if (!dlg || !list) return;

  const selectedSemanaId = snapshotResolveSelection();
  const range = snapshotRangeFromSemanaId(selectedSemanaId);
  const selectedLabel = range ? `${range.from.slice(8, 10)}/${range.from.slice(5, 7)} — ${range.to.slice(8, 10)}/${range.to.slice(5, 7)}` : 'Selecione uma semana';
  const title = document.getElementById('snapWeekDialogTitle');
  const kicker = document.getElementById('snapWeekDialogYear');
  if (title) title.textContent = selectedLabel;
  if (kicker) kicker.textContent = 'Fechamento semanal';

  document.querySelectorAll('[data-snap-preset-dialog]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.snapPresetDialog === snapValidationState.preset);
  });

  if (!snapValidationState.snapshots.length) {
    list.innerHTML = '<div class="snap-week-item-empty">Nenhuma semana calculada disponível.</div>';
    return;
  }

  list.innerHTML = snapValidationState.snapshots.map((snapshot) => {
    const match = String(snapshot.semana_id || '').match(/^(\d{4})-W(\d{2})$/);
    const week = match ? `Semana ${Number(match[2])}` : snapshot.semana_id;
    const year = match ? match[1] : '';
    const status = snapshotStatusMeta(snapshot.status);
    return `
      <button type="button" class="snap-week-item ${snapshot.semana_id === selectedSemanaId ? 'is-active' : ''}" data-semana-id="${snapshot.semana_id}">
        <div class="snap-week-item-top">
          <div class="snap-week-item-title">
            <span class="snap-week-item-week">${week}</span>
            <span class="snap-week-item-year">${year}</span>
          </div>
          <span class="${status.cls}">${status.icon} ${status.label}</span>
        </div>
        <div class="snap-week-item-range">${snapshot.week_start.slice(8, 10)}/${snapshot.week_start.slice(5, 7)} — ${snapshot.week_end.slice(8, 10)}/${snapshot.week_end.slice(5, 7)}</div>
      </button>`;
  }).join('');
}

let _snapWeekDialogMode = 'view'; // 'view' | 'calc'

function openSnapshotWeekDialog(mode) {
  _snapWeekDialogMode = mode || 'view';
  const dlg = document.getElementById('snapWeekDialog');
  if (!dlg) return;
  // Update dialog title to reflect mode
  const heading = dlg.querySelector('.snap-week-dialog-top span');
  if (heading) heading.textContent = mode === 'calc' ? 'Calcular semana' : 'Selecionar semana';
  renderSnapshotWeekDialog();
  dlg.showModal();
}

function initSnapshotWeekDialog() {
  const dlg = document.getElementById('snapWeekDialog');
  if (!dlg) return;

  dlg.addEventListener('click', (event) => {
    if (event.target === dlg) dlg.close();
  });

  document.getElementById('snapWeekClose')?.addEventListener('click', () => dlg.close());

  document.getElementById('snapWeekDialogPills')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-snap-preset-dialog]');
    if (!btn) return;
    snapshotApplyPreset(btn.dataset.snapPresetDialog);
    renderSnapshotWeekDialog();
    dlg.close();
  });

  document.getElementById('snapWeekList')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-semana-id]');
    if (!btn) return;
    if (_snapWeekDialogMode === 'calc') {
      dlg.close();
      // Find the runSnapCalc fn in closure via wrap
      const wrap = document.getElementById('snapValidationWrap');
      const opt = wrap?.querySelector(`.snap-calc-opt[data-calc-week="escolher"]`);
      // Trigger calc directly
      (async () => {
        const calcMainBtn = wrap?.querySelector('#snapCalcBtn');
        if (!calcMainBtn) return;
        calcMainBtn.disabled = true;
        calcMainBtn.innerHTML = `${IC.clock} Calculando...`;
        try {
          const r = await fetch('/api/focus?action=snapshot-calculate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ semana_id: btn.dataset.semanaId }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Erro ao calcular');
          snapValidationState.preset = 'custom';
          snapValidationState.selectedSemanaId = d.semana_id;
          calcMainBtn.innerHTML = `${IC.check} Calculado — ${fmtWeek(d.semana_id).week}`;
          setTimeout(() => loadSnapshotValidation(), 900);
        } catch (err) {
          calcMainBtn.innerHTML = `${IC.warn} Erro: ${escHtml(err.message.slice(0, 40))}`;
          calcMainBtn.disabled = false;
        }
      })();
    } else {
      snapshotApplySelection(btn.dataset.semanaId);
      dlg.close();
    }
  });
}

async function loadSnapshotValidation() {
  const wrap = document.getElementById('snapValidationWrap');
  if (!wrap) return;

  wrap.innerHTML = '<div class="snap-validation-section"><p class="snap-val-empty">Carregando fechamentos...</p></div>';

  try {
    const resp = await fetch('/api/focus?action=snapshot-list', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) { wrap.innerHTML = ''; return; }
    const data = await resp.json();
    snapValidationState.snapshots = data.snapshots || [];
    if (!snapValidationState.selectedSemanaId || snapValidationState.preset !== 'custom') {
      snapValidationState.selectedSemanaId = snapshotResolveSelection();
    }
    renderSnapshotValidation(wrap, snapValidationState.snapshots);
    const dlg = document.getElementById('snapWeekDialog');
    if (dlg?.open) renderSnapshotWeekDialog();
  } catch (_) {
    wrap.innerHTML = '';
  }
}

function renderSnapshotValidation(wrap, snapshots) {
  const fmtDate = (d) => {
    const s = (d || '').slice(0, 10);
    if (s.length < 10) return '—';
    const [, m, day] = s.split('-');
    return `${day}/${m}`;
  };
  const fmtWeek = (id) => {
    const match = (id || '').match(/(\d{4})-W(\d+)/);
    return match ? { week: `Semana ${Number(match[2])}`, year: match[1] } : { week: id, year: '' };
  };
  const tierInfo = (pct) => {
    const p = Number(pct) || 0;
    if (p >= 120) return { color: '#818cf8', bar: '#818cf8', label: '120%+' };
    if (p >= 100) return { color: '#f6c200', bar: '#f6c200', label: '100%+' };
    if (p >= 80)  return { color: '#22d3a3', bar: '#22d3a3', label: '≥ 80%' };
    if (p >= 60)  return { color: '#f59e0b', bar: '#f59e0b', label: '≥ 60%' };
    return { color: '#f04444', bar: '#f04444', label: '< 60%' };
  };
  const initials  = (n) => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avColor   = (n) => {
    const pal = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#22d3a3','#6366f1','#f04444'];
    let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return pal[h % pal.length];
  };

  const selectedSemanaId = snapshotResolveSelection();
  snapValidationState.selectedSemanaId = selectedSemanaId;
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.semana_id === selectedSemanaId) || null;
  const selectedRange = selectedSnapshot
    ? `${fmtDate(selectedSnapshot.week_start)} — ${fmtDate(selectedSnapshot.week_end)}`
    : (() => {
        const range = snapshotRangeFromSemanaId(selectedSemanaId);
        return range ? `${fmtDate(range.from)} — ${fmtDate(range.to)}` : 'Selecione uma semana';
      })();
  const selectedWeek = fmtWeek(selectedSemanaId);
  const selectedStatus = snapshotStatusMeta(selectedSnapshot?.status);

  const calcBtn = `
    <div class="snap-calc-wrap">
      <button class="snap-calc-btn" id="snapCalcBtn" data-calc-week="ultima-semana">
        ${IC.clock} Calcular semana
      </button>
      <div class="snap-calc-dropdown" id="snapCalcDropdown">
        <button class="snap-calc-opt" data-calc-week="esta-semana">Esta semana (atual)</button>
        <button class="snap-calc-opt" data-calc-week="ultima-semana">Semana anterior</button>
        <button class="snap-calc-opt" data-calc-week="escolher">Escolher semana...</button>
      </div>
    </div>`;

  const filterBar = `
    <div class="dfb-bar snap-val-filter-bar">
      <span class="dfb-label">SEMANA</span>
      <div class="dfb-pills">
        <button type="button" class="dfb-pill ${snapValidationState.preset === 'semana' ? 'active' : ''}" data-snap-preset="semana">Esta semana</button>
        <button type="button" class="dfb-pill ${snapValidationState.preset === 'ultima-semana' ? 'active' : ''}" data-snap-preset="ultima-semana">Última semana</button>
      </div>
      <button type="button" class="snap-week-picker-btn" id="snapWeekPickerBtn">${IC.clock} Selecionar semana</button>
      <span class="dfb-period-label">${selectedRange}</span>
    </div>`;

  const cards = selectedSnapshot
    ? `
        <div class="snap-val-card ${selectedSnapshot.status === SNAPSHOT_STATUS.FECHADO ? 'snap-val-card--closed' : ''}" data-semana="${escHtml(selectedSnapshot.semana_id)}">
          <div class="snap-val-card-top">
            <div class="snap-val-week-block">
              <span class="snap-val-week-label">${escHtml(selectedWeek.week)}</span>
              <span class="snap-val-week-year">${escHtml(selectedWeek.year)}</span>
            </div>
            <div class="snap-val-week-meta">
              <button type="button" class="snap-val-date-trigger" id="snapWeekRangeBtn">${selectedRange}</button>
              <span class="${selectedStatus.cls}">${selectedStatus.icon} ${selectedStatus.label}</span>
            </div>
          </div>
          <div class="snap-val-entries-wrap">
            <div class="snap-val-loading"><span></span><span></span><span></span></div>
          </div>
          <div class="snap-val-footer">
            <div class="snap-val-summary"></div>
            <div class="snap-val-actions">
              <button class="snap-val-confirm-btn" disabled>${selectedSnapshot.status === SNAPSHOT_STATUS.FECHADO ? `${IC.lock} Semana fechada` : 'Confirmar e Fechar Semana'}</button>
              <span class="snap-val-msg"></span>
            </div>
          </div>
        </div>`
    : `<div class="snap-val-empty-state">${IC.clock} Nenhum snapshot calculado para ${escHtml(selectedWeek.week || 'a semana selecionada')}.</div>`;

  wrap.innerHTML = `
    <div class="snap-validation-section">
      <div class="snap-val-header">
        <span class="snap-val-title">${IC.lock} Fechamento Semanal</span>
        ${calcBtn}
      </div>
      ${filterBar}
      ${cards}
    </div>`;

  wrap.querySelectorAll('[data-snap-preset]').forEach((btn) => {
    btn.addEventListener('click', () => snapshotApplyPreset(btn.dataset.snapPreset));
  });
  wrap.querySelector('#snapWeekPickerBtn')?.addEventListener('click', openSnapshotWeekDialog);
  wrap.querySelector('#snapWeekRangeBtn')?.addEventListener('click', openSnapshotWeekDialog);

  // ── Calcular semana: dropdown toggle ─────────────────────────────────
  const calcWrap    = wrap.querySelector('.snap-calc-wrap');
  const calcMainBtn = wrap.querySelector('#snapCalcBtn');
  const calcDrop    = wrap.querySelector('#snapCalcDropdown');

  calcMainBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    calcDrop?.classList.toggle('open');
  });

  document.addEventListener('click', function closeDrop(ev) {
    if (!calcWrap?.contains(ev.target)) {
      calcDrop?.classList.remove('open');
      document.removeEventListener('click', closeDrop);
    }
  });

  async function runSnapCalc(weekArg) {
    calcDrop?.classList.remove('open');
    calcMainBtn.disabled = true;
    calcMainBtn.innerHTML = `${IC.clock} Calculando...`;
    try {
      const body = weekArg === 'ultima-semana' ? {} : { semana_id: weekArg };
      const r = await fetch('/api/focus?action=snapshot-calculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao calcular');
      snapValidationState.preset = 'custom';
      snapValidationState.selectedSemanaId = d.semana_id;
      calcMainBtn.innerHTML = `${IC.check} Calculado — ${fmtWeek(d.semana_id).week}`;
      setTimeout(() => loadSnapshotValidation(), 900);
    } catch (err) {
      calcMainBtn.innerHTML = `${IC.warn} Erro: ${escHtml(err.message.slice(0, 40))}`;
      calcMainBtn.disabled = false;
    }
  }

  wrap.querySelectorAll('.snap-calc-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      const week = opt.dataset.calcWeek;
      if (week === 'escolher') {
        openSnapshotWeekDialog('calc');
      } else {
        runSnapCalc(week);
      }
    });
  });

  if (!selectedSnapshot) return;

  wrap.querySelectorAll('.snap-val-card').forEach((card) => {
    const semanaId = card.dataset.semana;
    const isClosed = selectedSnapshot.status === SNAPSHOT_STATUS.FECHADO;
    fetch(`/api/focus?action=snapshot-get&semana_id=${encodeURIComponent(semanaId)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.entries || []).sort((a, b) => Number(b.percentual_meta) - Number(a.percentual_meta));
        const entriesWrap = card.querySelector('.snap-val-entries-wrap');

        if (!entries.length) {
          entriesWrap.innerHTML = '<p class="snap-val-empty">Nenhum colaborador no snapshot.</p>';
          return;
        }

        const rows = entries.map((entry) => {
          const pct    = Number(entry.percentual_meta) || 0;
          const tier   = tierInfo(pct);
          const barPct = Math.round((Math.min(pct, 120) / 120) * 100);
          const metaC  = entry.coins_sugeridas_meta   || 0;
          const rankC  = entry.coins_sugeridas_ranking || 0;
          const sug    = entry.coins_validadas != null ? entry.coins_validadas : (entry.coins_sugeridas_total || 0);
          const av     = initials(entry.nome);
          const avC    = avColor(entry.nome);
          const lockedAttr = isClosed ? 'disabled' : '';

          return `
            <div class="snap-entry-row" data-uid="${entry.user_id}">
              <div class="snap-entry-person">
                <div class="snap-entry-av" style="background:${avC}">${av}</div>
                <div>
                  <div class="snap-entry-name">${escHtml(entry.nome)}</div>
                  <div class="snap-entry-cargo">${escHtml(entry.cargo || '')}</div>
                </div>
              </div>
              <div class="snap-entry-perf">
                <div class="snap-entry-pct-row">
                  <span class="snap-entry-pct" style="color:${tier.color}">${pct}%</span>
                  <span class="snap-entry-tier" style="color:${tier.color};border-color:${tier.color}40">${tier.label}</span>
                </div>
                <div class="snap-entry-bar-track">
                  <div class="snap-entry-bar-fill" style="width:${barPct}%;background:${tier.bar}"></div>
                </div>
                <div class="snap-entry-sub">${entry.pontos} pts &nbsp;·&nbsp; ${Number(entry.horas_validadas_total).toFixed(1)}h</div>
              </div>
              <div class="snap-entry-coins">
                <div class="snap-coin-chips">
                  ${metaC > 0 ? `<span class="snap-chip-meta">${metaC} meta</span>` : ''}
                  ${rankC > 0 ? `<span class="snap-chip-rank">${rankC} rank</span>` : ''}
                  ${metaC === 0 && rankC === 0 ? `<span class="snap-chip-zero">sem coins</span>` : ''}
                </div>
                <div class="snap-stepper">
                  <button class="snap-step snap-step-dec" data-uid="${entry.user_id}" ${lockedAttr}>−</button>
                  <input class="snap-coins-input" type="number" min="0" max="10"
                    value="${sug}" data-uid="${entry.user_id}" ${lockedAttr}>
                  <button class="snap-step snap-step-inc" data-uid="${entry.user_id}" ${lockedAttr}>+</button>
                </div>
              </div>
              <div class="snap-entry-obs">
                <input class="snap-obs-input" type="text" placeholder="observação..." data-uid="${entry.user_id}" ${lockedAttr}>
              </div>
            </div>`;
        }).join('');

        const totalSug = entries.reduce((sum, entry) => sum + (entry.coins_validadas != null ? entry.coins_validadas : (entry.coins_sugeridas_total || 0)), 0);
        card.querySelector('.snap-val-summary').innerHTML = `<span class="snap-summary-text">${entries.length} colaboradores &nbsp;·&nbsp; ${totalSug} coins ${isClosed ? 'validadas' : 'sugeridas'} no total</span>`;

        entriesWrap.innerHTML = `
          <div class="snap-entries-head">
            <span>Colaborador</span>
            <span>Performance</span>
            <span>Coins</span>
            <span>Observação</span>
          </div>
          <div class="snap-entries-body">${rows}</div>`;

        entries.forEach((entry) => {
          const obsInput = entriesWrap.querySelector(`.snap-obs-input[data-uid="${entry.user_id}"]`);
          if (obsInput) obsInput.value = entry.observacao_admin || '';
        });

        if (isClosed) return;

        entriesWrap.querySelectorAll('.snap-step-dec').forEach(btn => {
          btn.addEventListener('click', () => {
            const inp = entriesWrap.querySelector(`.snap-coins-input[data-uid="${btn.dataset.uid}"]`);
            if (inp) inp.value = Math.max(0, Number(inp.value) - 1);
          });
        });
        entriesWrap.querySelectorAll('.snap-step-inc').forEach(btn => {
          btn.addEventListener('click', () => {
            const inp = entriesWrap.querySelector(`.snap-coins-input[data-uid="${btn.dataset.uid}"]`);
            if (inp) inp.value = Math.min(10, Number(inp.value) + 1);
          });
        });

        const confirmBtn = card.querySelector('.snap-val-confirm-btn');
        confirmBtn.disabled = false;
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Salvando...';
          const msg = card.querySelector('.snap-val-msg');

          const updates = Array.from(card.querySelectorAll('.snap-coins-input')).map(inp => ({
            user_id:          Number(inp.dataset.uid),
            coins_validadas:  Number(inp.value),
            observacao_admin: card.querySelector(`.snap-obs-input[data-uid="${inp.dataset.uid}"]`)?.value || '',
          }));

          try {
            const r = await fetch('/api/focus?action=snapshot-validate', {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ semana_id: semanaId, entries: updates }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro ao validar');
            msg.style.color = '#22c55e';
            msg.textContent = `Semana encerrada com sucesso!`;
            confirmBtn.innerHTML = `${IC.lock} Fechado`;
            card.classList.add('snap-val-card--closed');
            setTimeout(() => loadSnapshotValidation(), 1400);
          } catch (err) {
            msg.style.color = '#f04444';
            msg.textContent = err.message;
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar e Fechar Semana';
          }
        });
      })
      .catch(() => {
        const entriesWrap = card.querySelector('.snap-val-entries-wrap');
        if (entriesWrap) entriesWrap.innerHTML = `<p class="snap-val-empty" style="color:#f04444">Erro ao carregar entradas.</p>`;
      });
  });
}

// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?
// ADM HISTORY — histórico geral (admin only)
// �?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?

const admHistoryState = {
  data: null,
  selectedUserId: null,    // null = equipe toda
  selectedPeriod: 'mes',   // 'hoje' | 'semana' | 'mes' | 'mes-ant' | '90d' | 'semana-custom'
  selectedWeek: null,      // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } quando semana-custom
  metric: 'todos',         // 'todos' | 'pontos' | 'tasks' | 'horas'
  period: 'mes',           // view: 'mes' | 'semana'
};

function weekInputToRange(weekVal) {
  const [yearStr, wStr] = weekVal.split('-W');
  const year = Number(yearStr), week = Number(wStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

function isoDateToWeekInput(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay() || 7;
  const thu = new Date(d); thu.setUTCDate(d.getUTCDate() - dow + 4);
  const jan1 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thu - jan1) / 86400000 + 1) / 7);
  return `${thu.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function currentWeekRange() {
  const now = new Date(Date.now() - 3 * 3600000);
  const dow = now.getUTCDay() || 7;
  const mon = new Date(now); mon.setUTCDate(now.getUTCDate() - dow + 1);
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function admHistMonthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${CAL_MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${String(y).slice(2)}`;
}

function admHistWeekLabel(w) {
  const [, mo, d0] = w.week_start.split('-');
  const [,, d1]    = w.week_end.split('-');
  return `${d0}-${d1}/${CAL_MONTH_NAMES[Number(mo)-1].slice(0,3)}`;
}

// Calcula corte de data para o preset selecionado
function admHistPeriodCutoff() {
  const nowBRT = new Date(Date.now() - 3 * 3600000);
  const todayStr = nowBRT.toISOString().slice(0, 10);
  const [y, mo] = todayStr.split('-').map(Number);
  switch (admHistoryState.selectedPeriod) {
    case 'hoje': return todayStr;
    case 'semana': {
      const dow = nowBRT.getUTCDay() || 7;
      const mon = new Date(nowBRT);
      mon.setUTCDate(mon.getUTCDate() - dow + 1);
      return mon.toISOString().slice(0, 10);
    }
    case 'semana-custom': return admHistoryState.selectedWeek?.start || null;
    case 'mes': return `${y}-${String(mo).padStart(2, '0')}-01`;
    case 'mes-ant': {
      const prev = mo === 1 ? 12 : mo - 1;
      const prevY = mo === 1 ? y - 1 : y;
      return `${prevY}-${String(prev).padStart(2, '0')}-01`;
    }
    case '90d': {
      const d = new Date(nowBRT); d.setUTCDate(d.getUTCDate() - 89);
      return d.toISOString().slice(0, 10);
    }
    default: return null; // 'tudo'
  }
}

function admHistPeriodEnd() {
  const nowBRT = new Date(Date.now() - 3 * 3600000);
  const todayStr = nowBRT.toISOString().slice(0, 10);
  const [y, mo] = todayStr.split('-').map(Number);
  if (admHistoryState.selectedPeriod === 'hoje') return todayStr;
  if (admHistoryState.selectedPeriod === 'mes-ant') {
    const last = new Date(Date.UTC(mo === 1 ? y - 1 : y, mo === 1 ? 11 : mo - 1, 0));
    return last.toISOString().slice(0, 10);
  }
  if (admHistoryState.selectedPeriod === 'semana-custom') {
    return admHistoryState.selectedWeek?.end || null;
  }
  return null;
}

function admHistFilteredItems() {
  const cutoff = admHistPeriodCutoff();
  const endCap = admHistPeriodEnd();
  if (admHistoryState.period === 'semana') {
    const all = admHistoryState.data?.weeks || [];
    return all.filter((w) => {
      if (cutoff && w.week_end < cutoff) return false;
      if (endCap && w.week_start > endCap) return false;
      return true;
    });
  }
  const all = admHistoryState.data?.months || [];
  return all.filter((m) => {
    if (cutoff && m.month < cutoff.slice(0, 7)) return false;
    if (endCap && m.month > endCap.slice(0, 7)) return false;
    return true;
  });
}

async function loadAdmHistory() {
  const wrap = document.getElementById('admHistoryWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="adm-hist-section"><p class="snap-val-empty">Carregando histórico...</p></div>';
  try {
    const uid = admHistoryState.selectedUserId;
    const url = uid
      ? `/api/focus?action=snapshot-monthly&user_id=${encodeURIComponent(uid)}`
      : '/api/focus?action=snapshot-monthly';
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    let data;
    try { data = await resp.json(); } catch (_) { data = {}; }
    if (!resp.ok) {
      wrap.innerHTML = `<div class="adm-hist-section"><p class="snap-val-empty" style="color:#f04444">${IC.warn} Erro ao carregar histórico: ${escHtml(data.error || String(resp.status))}</p></div>`;
      return;
    }
    // Preserve users list across user-filtered reloads
    if (data.users?.length) admHistoryState._users = data.users;
    admHistoryState.data = data;
    try { renderAdmHistory(wrap); }
    catch (renderErr) {
      console.error('[adm-hist] render error:', renderErr);
      wrap.innerHTML = `<div class="adm-hist-section"><p class="snap-val-empty" style="color:#f04444">${IC.warn} ${escHtml(String(renderErr.message || renderErr))}</p></div>`;
    }
  } catch (e) {
    console.error('[adm-hist] load error:', e);
    wrap.innerHTML = `<div class="adm-hist-section"><p class="snap-val-empty" style="color:#f04444">${IC.warn} Erro ao carregar histórico: ${escHtml(String(e.message || e))}</p></div>`;
  }
}

function renderAdmHistory(wrap) {
  const hasData    = (admHistoryState.data?.months?.length || 0) > 0;
  const filtered   = admHistFilteredItems();
  const users      = admHistoryState._users || admHistoryState.data?.users || [];

  const totalTasks  = filtered.reduce((s, r) => s + (Number(r.total_tasks)  || 0), 0);
  const totalHoras  = filtered.reduce((s, r) => s + (Number(r.total_horas)  || 0), 0);
  const totalPontos = filtered.reduce((s, r) => s + (Number(r.total_pontos) || 0), 0);

  const histIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;

  const selectedLabel = admHistoryState.selectedUserId
    ? escHtml(users.find((u) => u.id === admHistoryState.selectedUserId)?.name || 'Equipe toda')
    : 'Equipe toda';
  const memberOpts = users.map((u) =>
    `<li class="adm-hmb-item${admHistoryState.selectedUserId === u.id ? ' active' : ''}" data-hmb-val="${u.id}">${escHtml(u.name)}</li>`
  ).join('');
  const memberSelect = users.length ? `
    <div class="adm-hist-member-wrap">
      <span class="dfb-label">MEMBRO</span>
      <div class="adm-hmb-drop" id="admHmbDrop">
        <button class="adm-hmb-btn" type="button" id="admHmbBtn">
          <span id="admHmbLabel">${selectedLabel}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <ul class="adm-hmb-list" id="admHmbList" hidden>
          <li class="adm-hmb-item${!admHistoryState.selectedUserId ? ' active' : ''}" data-hmb-val="">Equipe toda</li>
          ${memberOpts}
        </ul>
      </div>
    </div>` : '';

  const periodPresets = [
    { key: 'hoje',          label: 'Hoje' },
    { key: 'semana',        label: 'Esta semana' },
    { key: 'mes',           label: 'Este mes' },
    { key: 'mes-ant',       label: 'Ultimo mes' },
    { key: '90d',           label: '90 dias' },
    { key: 'semana-custom', label: 'Selecionar semana' },
  ];
  const presetPills = periodPresets.map((p) =>
    `<button type="button" class="dfb-pill ${admHistoryState.selectedPeriod === p.key ? 'active' : ''}" data-hist-period-preset="${p.key}">${p.label}</button>`
  ).join('');
  const weekPickerHtml = admHistoryState.selectedPeriod === 'semana-custom'
    ? `<input type="week" class="adm-hist-week-input" id="admHistWeekInput" value="${admHistoryState.selectedWeek ? isoDateToWeekInput(admHistoryState.selectedWeek.start) : ''}">`
    : '';

  const metricLabels = { todos: 'Todos', tasks: 'Tasks', pontos: 'Pontos', horas: 'Horas' };
  const metricTabs = ['todos', 'tasks', 'pontos', 'horas'].map((k) =>
    `<button type="button" class="adm-hist-tab ${admHistoryState.metric === k ? 'active' : ''}" data-hist-metric="${k}">${metricLabels[k]}</button>`
  ).join('');

  const viewTabs = ['mes', 'semana'].map((p) => {
    const lbl = p === 'mes' ? 'Mensal' : 'Semanal';
    return `<button type="button" class="adm-hist-tab ${admHistoryState.period === p ? 'active' : ''}" data-hist-period="${p}">${lbl}</button>`;
  }).join('');

  wrap.innerHTML = `
    <div class="adm-hist-section">
      <div class="adm-hist-header">
        <span class="snap-val-title">${histIcon} Historico Geral</span>
        ${memberSelect}
      </div>
      <div class="adm-hist-kpis">
        <div class="adm-hist-kpi adm-hist-kpi--tasks">
          <span class="adm-hist-kpi-value">${totalTasks}</span>
          <span class="adm-hist-kpi-label">Tasks concluidas</span>
        </div>
        <div class="adm-hist-kpi adm-hist-kpi--horas">
          <span class="adm-hist-kpi-value">${totalHoras.toFixed(1)}</span>
          <span class="adm-hist-kpi-label">Horas registradas</span>
        </div>
        <div class="adm-hist-kpi adm-hist-kpi--pontos">
          <span class="adm-hist-kpi-value">${totalPontos}</span>
          <span class="adm-hist-kpi-label">Pontos conquistados</span>
        </div>
      </div>
      ${hasData ? `
      <div class="adm-hist-chart-section">
        <div class="dfb-bar adm-hist-period-filter">
          <span class="dfb-label">PERIODO</span>
          <div class="dfb-pills">${presetPills}</div>
          ${weekPickerHtml}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <div class="adm-hist-metric-tabs" style="margin-bottom:0;">${metricTabs}</div>
          <span style="width:1px;height:18px;background:rgba(255,255,255,0.08);display:inline-block;"></span>
          <div class="adm-hist-metric-tabs" style="margin-bottom:0;">${viewTabs}</div>
        </div>
        <div class="adm-hist-chart-wrap">
          <canvas id="admHistChart"></canvas>
        </div>
        <div class="adm-hist-byuser-section">
          <div class="adm-hist-byuser-title">Por Colaborador</div>
          <div class="adm-hist-chart-wrap" id="admHistByUserWrap" style="height:160px">
            <canvas id="admHistByUserChart"></canvas>
          </div>
        </div>
      </div>` : '<p class="snap-val-empty">Nenhum snapshot calculado ainda.</p>'}
    </div>`;

  const hmbBtn  = wrap.querySelector('#admHmbBtn');
  const hmbList = wrap.querySelector('#admHmbList');
  const hmbDrop = wrap.querySelector('#admHmbDrop');
  if (hmbBtn && hmbList) {
    hmbBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hmbList.hidden = !hmbList.hidden;
    });
    hmbList.querySelectorAll('.adm-hmb-item').forEach((li) => {
      li.addEventListener('click', () => {
        const val = li.dataset.hmbVal;
        admHistoryState.selectedUserId = val ? Number(val) : null;
        wrap.querySelector('#admHmbLabel').textContent = li.textContent;
        hmbList.hidden = true;
        hmbList.querySelectorAll('.adm-hmb-item').forEach((l) => l.classList.toggle('active', l === li));
        loadAdmHistory();
      });
    });
    const closeHmb = (e) => {
      if (!wrap.querySelector('#admHmbDrop')) { document.removeEventListener('click', closeHmb); return; }
      if (!hmbDrop.contains(e.target)) hmbList.hidden = true;
    };
    document.addEventListener('click', closeHmb);
  }

  wrap.querySelectorAll('[data-hist-period-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      admHistoryState.selectedPeriod = btn.dataset.histPeriodPreset;
      if (admHistoryState.selectedPeriod === 'semana') admHistoryState.period = 'semana';
      if (admHistoryState.selectedPeriod === 'semana-custom') {
        admHistoryState.period = 'semana';
        if (!admHistoryState.selectedWeek) admHistoryState.selectedWeek = currentWeekRange();
      }
      renderAdmHistory(wrap);
    });
  });

  wrap.querySelector('#admHistWeekInput')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    admHistoryState.selectedWeek = weekInputToRange(e.target.value);
    renderAdmHistory(wrap);
  });

  wrap.querySelectorAll('[data-hist-metric]').forEach((btn) => {
    btn.addEventListener('click', () => { admHistoryState.metric = btn.dataset.histMetric; renderAdmHistory(wrap); });
  });

  wrap.querySelectorAll('[data-hist-period]').forEach((btn) => {
    btn.addEventListener('click', () => { admHistoryState.period = btn.dataset.histPeriod; renderAdmHistory(wrap); });
  });

  if (hasData) {
    renderAdmHistoryChart(filtered);
    renderAdmHistoryByUserChart(admHistUserTotals());
  }
}

function admHistUserTotals() {
  const cutoff = admHistPeriodCutoff();
  const endCap = admHistPeriodEnd();
  const allUserWeeks = admHistoryState.data?.userWeeks || [];

  const filtered = allUserWeeks.filter(r => {
    if (cutoff && r.week_end < cutoff) return false;
    if (endCap && r.week_start > endCap) return false;
    return true;
  });

  const map = {};
  for (const r of filtered) {
    if (!map[r.user_id]) map[r.user_id] = { name: r.name, total_tasks: 0, total_horas: 0, total_pontos: 0 };
    map[r.user_id].total_tasks  += r.total_tasks;
    map[r.user_id].total_horas   = parseFloat((map[r.user_id].total_horas + r.total_horas).toFixed(1));
    map[r.user_id].total_pontos += r.total_pontos;
  }

  const { metric } = admHistoryState;
  const key = metric === 'tasks' ? 'total_tasks' : metric === 'horas' ? 'total_horas' : 'total_pontos';
  return Object.values(map).sort((a, b) => b[key] - a[key] || b.total_pontos - a.total_pontos);
}

function renderAdmHistoryByUserChart(userTotals) {
  const canvas = document.getElementById('admHistByUserChart');
  const wrap   = document.getElementById('admHistByUserWrap');
  if (!canvas || !wrap) return;
  if (admHistoryByUserChartInst) { admHistoryByUserChartInst.destroy(); admHistoryByUserChartInst = null; }

  const { metric } = admHistoryState;
  const isTodos    = metric === 'todos';
  const key        = metric === 'tasks' ? 'total_tasks' : metric === 'horas' ? 'total_horas' : 'total_pontos';
  const metricLbl  = metric === 'tasks' ? 'Tasks' : metric === 'horas' ? 'Horas' : 'Pontos';

  const labels = userTotals.map(u => u.name);
  const values = userTotals.map(u => u[isTodos ? 'total_pontos' : key] || 0);

  // altura dinâmica: 40px por pessoa + 40px de padding
  const h = Math.max(140, labels.length * 44 + 40);
  wrap.style.height = h + 'px';

  const USER_COLORS = ['#e8b844','#3dba6f','#4a7ff5','#f06a6a','#b87aff','#40c0e0','#ff9050','#70d080'];
  const bg  = labels.map((_, i) => USER_COLORS[i % USER_COLORS.length] + '30');
  const brd = labels.map((_, i) => USER_COLORS[i % USER_COLORS.length]);

  const hasDL     = typeof ChartDataLabels !== 'undefined';
  const dlPlugins = hasDL ? [ChartDataLabels] : [];

  admHistoryByUserChartInst = new Chart(canvas, {
    type: 'bar',
    plugins: dlPlugins,
    data: {
      labels,
      datasets: [{
        label: metricLbl,
        data: values,
        backgroundColor: bg,
        borderColor: brd,
        borderWidth: 2,
        borderRadius: 5,
        datalabels: hasDL ? {
          anchor: 'end', align: 'end',
          color: '#c8d0e7',
          font: { size: 11, weight: '700', family: 'Inter' },
          formatter: (v) => {
            if (!v) return '';
            return metric === 'horas' ? v.toFixed(1) + 'h' : v;
          },
        } : {},
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 50 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c1e32', titleColor: '#c8d0e7',
          bodyColor: '#8892b4', borderColor: '#252840', borderWidth: 1,
        },
        datalabels: hasDL ? { display: true } : {},
      },
      scales: {
        x: {
          display: false,
          beginAtZero: true,
          grid: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#c8d0e7', font: { size: 12, weight: '600', family: 'Inter' } },
          border: { display: false },
        },
      },
    },
  });
}

function renderAdmHistoryChart(filtered) {
  const canvas = document.getElementById('admHistChart');
  if (!canvas) return;
  if (admHistoryChartInst) { admHistoryChartInst.destroy(); admHistoryChartInst = null; }

  const isSemana = admHistoryState.period === 'semana';
  const labels   = filtered.map(r => isSemana ? admHistWeekLabel(r) : admHistMonthLabel(r.month));
  const tasks    = filtered.map(r => Number(r.total_tasks)  || 0);
  const pontos   = filtered.map(r => Number(r.total_pontos) || 0);
  const horas    = filtered.map(r => Number(r.total_horas)  || 0);

  const hasDL     = typeof ChartDataLabels !== 'undefined';
  const dlPlugins = hasDL ? [ChartDataLabels] : [];
  const DL        = { anchor: 'end', align: 'top', font: { size: 10, weight: '700', family: 'Inter' } };
  const xScale    = { grid: { color: '#1a1e2e', drawBorder: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } };
  const MBT       = 48;

  const { metric } = admHistoryState;
  let datasets, scales;

  if (metric === 'todos') {
    // Normaliza cada métrica para 0-100% do próprio máximo → mesmo eixo, sem colisão de escala
    const maxPts   = Math.max(...pontos, 1);
    const maxTasks = Math.max(...tasks,  1);
    const maxHoras = Math.max(...horas,  1);
    const ptsN   = pontos.map(v => +(v / maxPts  * 100).toFixed(1));
    const tasksN = tasks.map( v => +(v / maxTasks * 100).toFixed(1));
    const horasN = horas.map( v => +(v / maxHoras * 100).toFixed(1));

    const rawPts = pontos, rawTasks = tasks, rawHoras = horas;
    datasets = [
      { label: 'Pontos', data: ptsN, type: 'bar', maxBarThickness: MBT, yAxisID: 'yNorm',
        backgroundColor: pontos.map(v => v > 0 ? '#2d3554cc' : '#191d2b'),
        borderColor:     pontos.map(v => v > 0 ? '#4a5580'   : '#1e2235'),
        borderWidth: 1, borderRadius: 4, datalabels: { display: false } },
      { label: 'Tasks', data: tasksN, type: 'line', yAxisID: 'yNorm',
        borderColor: '#3dba6f', backgroundColor: 'rgba(61,186,111,0.10)',
        pointBackgroundColor: '#3dba6f', pointBorderColor: '#0f1117',
        pointRadius: 5, pointHoverRadius: 8, pointBorderWidth: 2,
        borderWidth: 2.5, tension: 0.35, spanGaps: true, fill: false,
        datalabels: { display: false } },
      { label: 'Horas', data: horasN, type: 'line', yAxisID: 'yNorm',
        borderColor: '#e8b844', backgroundColor: 'rgba(232,184,68,0.10)',
        pointBackgroundColor: '#e8b844', pointBorderColor: '#0f1117',
        pointRadius: 5, pointHoverRadius: 8, pointBorderWidth: 2,
        borderWidth: 2.5, tension: 0.35, spanGaps: true, fill: false,
        datalabels: { display: false } },
    ];
    scales = {
      x: xScale,
      yNorm: { display: false, min: 0, max: 115, position: 'left' },
    };

    // Captura closures para o tooltip mostrar valores reais
    const _rawPts = rawPts, _rawTasks = rawTasks, _rawHoras = rawHoras;
    Object.assign(admHistoryState, { _rawPts, _rawTasks, _rawHoras });
  } else if (metric === 'tasks') {
    const bg  = tasks.map(v => v > 0 ? '#2d3554' : '#191d2b');
    const brd = tasks.map(v => v > 0 ? '#4a5580' : '#1e2235');
    datasets = [{ label: 'Tasks', data: tasks, type: 'bar', maxBarThickness: MBT,
      backgroundColor: bg, borderColor: brd, borderWidth: 1, borderRadius: 4,
      datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } }];
    scales = { x: xScale, y: { display: false, min: 0 } };
  } else if (metric === 'horas') {
    const bg  = horas.map(v => v > 0 ? '#e8b84428' : 'transparent');
    const brd = horas.map(v => v > 0 ? '#e8b844'   : 'transparent');
    datasets = [{ label: 'Horas', data: horas, type: 'bar', maxBarThickness: MBT,
      backgroundColor: bg, borderColor: brd, borderWidth: 2, borderRadius: 4,
      datalabels: { ...DL, color: '#e8b844', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' } }];
    scales = { x: xScale, y: { display: false, min: 0 } };
  } else {
    const ptsBg  = pontos.map(v => v > 0 ? '#2d3554' : '#191d2b');
    const ptsBrd = pontos.map(v => v > 0 ? '#4a5580' : '#1e2235');
    datasets = [
      { label: 'Pontos', data: pontos, type: 'bar', maxBarThickness: MBT,
        backgroundColor: ptsBg, borderColor: ptsBrd, borderWidth: 1, borderRadius: 4,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
      { label: 'Pontos (linha)', data: pontos.map(v => v > 0 ? v : null), type: 'line',
        borderColor: '#3dba6f', backgroundColor: 'transparent',
        pointBackgroundColor: '#3dba6f', pointRadius: 5, pointHoverRadius: 7,
        tension: 0.35, spanGaps: false, datalabels: { display: false } },
    ];
    scales = { x: xScale, y: { display: false, min: 0 } };
  }

  admHistoryChartInst = new Chart(canvas, {
    type: 'bar',
    plugins: dlPlugins,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8e98a7', font: { size: 11, family: 'Inter' }, boxWidth: 10, boxHeight: 10 } },
        tooltip: {
          backgroundColor: '#1c1e32', titleColor: '#c8d0e7', bodyColor: '#8892b4',
          borderColor: '#252840', borderWidth: 1,
          callbacks: metric === 'todos' ? {
            label: (ctx) => {
              const i = ctx.dataIndex;
              const s = admHistoryState;
              if (ctx.dataset.label === 'Tasks')  return ` Tasks: ${(s._rawTasks||[])[i] ?? ctx.raw}`;
              if (ctx.dataset.label === 'Horas')  return ` Horas: ${Number((s._rawHoras||[])[i] ?? ctx.raw).toFixed(1)}h`;
              return ` Pontos: ${(s._rawPts||[])[i] ?? ctx.raw}`;
            },
          } : {},
        },
        datalabels: hasDL ? { display: true } : {},
      },
      scales,
    },
  });
}

function hideLoadingOverlay() {
  const appShell = document.querySelector('.app-shell');
  if (appShell) appShell.style.visibility = '';
  const loading = document.getElementById('app-loading');
  if (loading) { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 300); }
}

// ────────────────────────────────────────────────────────────────────────
// RITUAIS DO TIME
// ────────────────────────────────────────────────────────────────────────

let _rituaisWeekOffset = 0;
let _rituaisData       = null;

function getRituaisWeekRange(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset * 7);
  const dow = d.getUTCDay() || 7;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - dow + 1);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    from: mon.toISOString().slice(0, 10),
    to:   sun.toISOString().slice(0, 10),
  };
}

async function loadRituaisPanel() {
  const section = document.querySelector('[data-panel-view="rituais"]');
  if (!section) return;
  renderRituaisShell(section);
  await fetchAndRenderRituais();
}

function renderRituaisShell(section) {
  const isAdmin = userProfile?.role === 'admin';
  section.innerHTML = `
    <div class="rit-panel-wrap">
      <div class="rit-top-bar">
        <div class="rit-week-nav">
          <button id="ritPrevWeek" class="rit-nav-btn" aria-label="Semana anterior">&#8249;</button>
          <span id="ritWeekLabel" class="rit-week-label">—</span>
          <button id="ritNextWeek" class="rit-nav-btn" aria-label="Próxima semana">&#8250;</button>
        </div>
        ${isAdmin ? '<button id="ritAddBtn" class="rit-add-btn">+ Ritual</button>' : ''}
      </div>
      <div id="ritContent" class="rit-content"></div>
    </div>
  `;
  document.getElementById('ritPrevWeek')?.addEventListener('click', () => {
    _rituaisWeekOffset--;
    fetchAndRenderRituais();
  });
  document.getElementById('ritNextWeek')?.addEventListener('click', () => {
    if (_rituaisWeekOffset < 0) { _rituaisWeekOffset++; fetchAndRenderRituais(); }
  });
  if (isAdmin) {
    document.getElementById('ritAddBtn')?.addEventListener('click', () => openRitualEditModal(null));
  }
}

async function fetchAndRenderRituais() {
  const contentEl = document.getElementById('ritContent');
  const labelEl   = document.getElementById('ritWeekLabel');
  const nextBtn   = document.getElementById('ritNextWeek');
  if (!contentEl) return;

  const { from, to } = getRituaisWeekRange(_rituaisWeekOffset);
  if (labelEl) labelEl.textContent = routineWeekLabel(from, to);
  if (nextBtn) nextBtn.disabled = _rituaisWeekOffset >= 0;

  contentEl.innerHTML = '<p class="rit-loading">Carregando rituais...</p>';

  const data = await api(`/api/routines?action=ritual-week&from=${from}&to=${to}`).catch(() => null);
  if (!data) { contentEl.innerHTML = '<p class="rit-empty">Erro ao carregar rituais.</p>'; return; }
  if (data._migrationNeeded) {
    contentEl.innerHTML = '<p class="rit-empty">Execute <code>sql/migration_rituals.sql</code> para habilitar os Rituais.</p>';
    return;
  }

  _rituaisData = data;
  renderRituaisGrid(data, from, to);
}

const _RIT_TYPE_LABEL = { daily: 'Daily', weekly: 'Semanal', monthly: 'Mensal' };
const _RIT_DOW_SHORT  = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function renderRituaisGrid(data, from, to) {
  const contentEl = document.getElementById('ritContent');
  if (!contentEl) return;
  const isAdmin = userProfile?.role === 'admin';
  const today   = todayISO();
  const { rituals, dates } = data;

  if (!rituals.length) {
    contentEl.innerHTML = `<p class="rit-empty">Nenhum ritual cadastrado.${isAdmin ? ' Use "+ Ritual" para criar.' : ''}</p>`;
    return;
  }

  const weekdays = dates.filter(d => { const dw = new Date(`${d}T00:00:00Z`).getUTCDay(); return dw >= 1 && dw <= 5; });

  const html = rituals.map(rit => {
    const typeLabel = _RIT_TYPE_LABEL[rit.type] || rit.type;
    let stripDates;
    if (rit.type === 'daily') {
      stripDates = weekdays;
    } else if (rit.type === 'weekly') {
      const target = rit.day_of_week || 1;
      stripDates = dates.filter(d => (new Date(`${d}T00:00:00Z`).getUTCDay() || 7) === target);
    } else {
      // monthly: existing occurrences + today (if in range) so admin can mark the first one
      const occDates = Object.keys(rit.days || {});
      if (occDates.length) {
        stripDates = occDates;
      } else {
        stripDates = (today >= from && today <= to) ? [today] : [];
      }
    }

    const dayCells = stripDates.map(d => {
      const occ    = rit.days?.[d];
      const status = occ?.status || 'pending';
      const isFuture = d > today;
      const isPast   = d < today;
      const att    = occ?.attendance || [];

      let cls, icon;
      if (status === 'done')      { cls = 'rit-day--done';      icon = '✓'; }
      else if (status === 'cancelled') { cls = 'rit-day--cancelled'; icon = '✗'; }
      else if (isFuture)          { cls = 'rit-day--future';    icon = '·'; }
      else if (isPast)            { cls = 'rit-day--missed';    icon = '·'; }
      else                        { cls = 'rit-day--pending';   icon = '·'; }

      const dowN     = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
      const dayLbl   = _RIT_DOW_SHORT[dowN] || '';
      const isToday  = d === today;
      const clickable = isAdmin && !isFuture;
      const attBadge = occ?.id && att.length > 0
        ? `<span class="rit-day-att" title="${att.map(a => a.name).join(', ')}">${att.length}</span>`
        : '';

      return `<div class="rit-day ${cls}${isToday ? ' rit-day--today' : ''}"
                   data-ritual="${rit.id}" data-date="${d}" data-status="${status}"
                   ${occ?.id ? `data-occ-id="${occ.id}"` : ''}
                   ${clickable ? 'role="button" tabindex="0"' : ''}>
        <span class="rit-day-label">${dayLbl}</span>
        <span class="rit-day-icon">${icon}</span>
        ${attBadge}
      </div>`;
    }).join('');

    const adminActions = isAdmin
      ? `<div class="rit-card-actions">
           <button class="rit-edit-btn" data-ritual="${rit.id}">Editar</button>
           <button class="rit-del-btn"  data-ritual="${rit.id}">Excluir</button>
         </div>`
      : '';

    return `<div class="rit-card" data-ritual="${rit.id}">
      <div class="rit-card-header">
        <div class="rit-card-info">
          <span class="rit-badge rit-badge--${rit.type}">${typeLabel}</span>
          <span class="rit-card-title">${rit.title}</span>
          ${rit.description ? `<span class="rit-card-desc">${rit.description}</span>` : ''}
        </div>
        ${adminActions}
      </div>
      <div class="rit-days-strip">${dayCells || '<span class="rit-empty-strip">—</span>'}</div>
    </div>`;
  }).join('');

  contentEl.innerHTML = html;

  if (isAdmin) {
    contentEl.querySelectorAll('.rit-day[role="button"]').forEach(cell => {
      cell.addEventListener('click', () => onRitualDayClick(cell));
      cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onRitualDayClick(cell); });
    });
    contentEl.querySelectorAll('.rit-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = parseInt(btn.dataset.ritual, 10);
        const rit = _rituaisData?.rituals?.find(r => r.id === rid);
        if (rit) openRitualEditModal(rit);
      });
    });
    contentEl.querySelectorAll('.rit-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rid = parseInt(btn.dataset.ritual, 10);
        if (!confirm('Excluir este ritual?')) return;
        await api(`/api/routines?action=ritual-delete&ritualId=${rid}`, { method: 'DELETE' }).catch(() => null);
        await fetchAndRenderRituais();
      });
    });
  }
}

async function onRitualDayClick(cell) {
  const ritualId = parseInt(cell.dataset.ritual, 10);
  const date     = cell.dataset.date;
  const current  = cell.dataset.status;
  const next     = current === 'pending' ? 'done' : current === 'done' ? 'cancelled' : 'pending';

  cell.style.opacity = '.4';
  const result = await api('/api/routines?action=ritual-toggle-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ritualId, date, status: next }),
  }).catch(() => null);
  cell.style.opacity = '';

  if (!result) return;
  await fetchAndRenderRituais();
  if (next === 'done' && result.occurrenceId && (_rituaisData?.users || []).length > 1) {
    openAttendanceModal(result.occurrenceId, ritualId, date);
  }
}

function openAttendanceModal(occurrenceId, ritualId, date) {
  const users  = _rituaisData?.users || [];
  const rit    = _rituaisData?.rituals?.find(r => r.id === ritualId);
  const occ    = rit?.days?.[date];
  const present = new Set((occ?.attendance || []).map(a => a.userId));

  const rows = users.map(u => `
    <label class="rit-att-row">
      <input type="checkbox" class="rit-att-chk" data-user="${u.id}" ${present.has(u.id) ? 'checked' : ''} />
      <span class="rit-att-name">${u.name}</span>
    </label>`).join('');

  const modal = document.createElement('dialog');
  modal.className = 'rit-att-dialog';
  modal.innerHTML = `
    <div class="rit-att-body">
      <p class="rit-att-title">Presença — ${rit?.title || ''}</p>
      <p class="rit-att-date">${date}</p>
      <div class="rit-att-list">${rows}</div>
      <button class="rit-att-close btn btn-accent">Fechar</button>
    </div>`;
  document.body.appendChild(modal);
  modal.showModal();

  modal.querySelectorAll('.rit-att-chk').forEach(chk => {
    chk.addEventListener('change', async () => {
      const userId = parseInt(chk.dataset.user, 10);
      await api('/api/routines?action=ritual-toggle-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurrenceId, userId }),
      }).catch(() => null);
    });
  });

  modal.querySelector('.rit-att-close').addEventListener('click', async () => {
    modal.close();
    modal.remove();
    await fetchAndRenderRituais();
  });
}

function openRitualEditModal(ritual) {
  const isNew = !ritual;
  const modal = document.createElement('dialog');
  modal.className = 'rit-edit-dialog';
  modal.innerHTML = `
    <div class="rp-edit-modal">
      <p class="rp-edit-modal-title">${isNew ? 'Novo Ritual' : 'Editar Ritual'}</p>
      <div class="rp-edit-field">
        <label class="rp-edit-label">Título</label>
        <input type="text" id="ritEditTitle" class="rp-edit-input" maxlength="80" required />
      </div>
      <div class="rp-edit-field">
        <label class="rp-edit-label">Tipo</label>
        <select id="ritEditType" class="rp-edit-select">
          <option value="daily">Daily (seg–sex)</option>
          <option value="weekly">Semanal (um dia fixo)</option>
          <option value="monthly">Mensal</option>
        </select>
      </div>
      <div class="rp-edit-field" id="ritEditDowWrap">
        <label class="rp-edit-label">Dia da Semana</label>
        <select id="ritEditDow" class="rp-edit-select">
          <option value="1">Segunda</option>
          <option value="2">Terça</option>
          <option value="3">Quarta</option>
          <option value="4">Quinta</option>
          <option value="5">Sexta</option>
        </select>
      </div>
      <div class="rp-edit-field">
        <label class="rp-edit-label">Descrição</label>
        <input type="text" id="ritEditDesc" class="rp-edit-input" maxlength="120" />
      </div>
      <div class="rp-edit-actions">
        <button id="ritEditCancel" class="rp-edit-cancel">Cancelar</button>
        <button id="ritEditSave"   class="rp-edit-save">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.showModal();

  // Set values via JS to avoid HTML-injection from stored text
  modal.querySelector('#ritEditTitle').value = ritual?.title || '';
  modal.querySelector('#ritEditDesc').value  = ritual?.description || '';
  if (ritual?.type) modal.querySelector('#ritEditType').value = ritual.type;
  if (ritual?.day_of_week) modal.querySelector('#ritEditDow').value = String(ritual.day_of_week);

  const typeEl  = modal.querySelector('#ritEditType');
  const dowWrap = modal.querySelector('#ritEditDowWrap');
  const toggleDow = () => { dowWrap.style.display = typeEl.value === 'weekly' ? '' : 'none'; };
  toggleDow();
  typeEl.addEventListener('change', toggleDow);

  modal.querySelector('#ritEditCancel').addEventListener('click', () => { modal.close(); modal.remove(); });
  modal.querySelector('#ritEditSave').addEventListener('click', async () => {
    const title = modal.querySelector('#ritEditTitle').value.trim();
    if (!title) return;
    const type = modal.querySelector('#ritEditType').value;
    const dow  = type === 'weekly' ? parseInt(modal.querySelector('#ritEditDow').value, 10) : null;
    const desc = modal.querySelector('#ritEditDesc').value.trim() || null;
    await api('/api/routines?action=ritual-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ritual?.id || null, title, type, description: desc, day_of_week: dow }),
    }).catch(() => null);
    modal.close();
    modal.remove();
    await fetchAndRenderRituais();
  });
}

init().catch((err) => {
  console.error('[init] erro inesperado:', err);
  hideLoadingOverlay();
});
