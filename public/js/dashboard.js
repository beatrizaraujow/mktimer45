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
    .replace(/[^\w\s-]|[̀-ͯ]/g, '')
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
    if (nextStatus === 'done') {
      await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ isDone: true }) });
    } else if (currentStatus === 'done') {
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
    if (status === 'done') done++;
    else if (status === 'in-progress') inProgress++;
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
      if (status !== 'done') return false;
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
  const btn       = document.getElementById('profileAvatarBtn');
  const fileInput = document.getElementById('avatarFileInput');
  if (!btn || !fileInput) return;

  const saved = localStorage.getItem('mktimer_avatar');
  if (saved) applyAvatarImage(saved);

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem('mktimer_avatar', dataUrl);
      applyAvatarImage(dataUrl);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
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
    if (panelName === 'painel-daily') await loadTeamDaily();
    if (panelName === 'calendario')   renderCalendarTasks();
    if (panelName === 'historico')    await loadHistoricoPanel();
    if (panelName === 'adm')          await loadAdmPanel();
    if (panelName === 'rotina')       await loadRoutinePanel();
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

  // Aba Rotina: visível apenas para bia, maria clara (admins) + malu, zion
  if (userProfile) {
    const rotinaUsers = ['bia', 'maria clara', 'malu', 'zion'];
    const userName = (userProfile.name || '').toLowerCase().trim();
    const canSeeRotina = userProfile.role === 'admin' || rotinaUsers.includes(userName);
    const rotinaTab = document.getElementById('rotinaNavTab');
    if (rotinaTab) rotinaTab.style.display = canSeeRotina ? '' : 'none';
  }

  initSidebarPanels();
  initDailyPanel();
  initTimerSection();
  initWeekPicker();
  initDateFilterBars();
  initCalPopup();
  initHistoricoFilters();
  initAdmFilters();
  initTeamDaily();

  // Revelar o app e remover loading overlay
  const appShell = document.querySelector('.app-shell');
  if (appShell) appShell.style.visibility = '';
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 300);
  }

  await refreshAll();
}

// ═══════════════════════════════════════════════════════════════════════
// DATE FILTER BAR  (shared — Daily + Histórico)
// ═══════════════════════════════════════════════════════════════════════

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

// Retorna meta ajustada ao período selecionado no Painel Daily
function getDailyAdjustedGoal(weeklyGoal) {
  const from = _dfb.daily.from;
  const to   = _dfb.daily.to;
  if (!from || !to || !weeklyGoal) return weeklyGoal || 0;
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  if (days <= 7)              return weeklyGoal;
  if (days >= 28 && days <= 31) return weeklyGoal * 4;
  return Math.round((days / 7) * weeklyGoal);
}

function getMetaPeriodLabel(weeklyGoal) {
  const from = _dfb.daily.from;
  const to   = _dfb.daily.to;
  if (!from || !to) return `Meta semanal: ${weeklyGoal} pts`;
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  if (days <= 7)              return `Meta semanal: ${weeklyGoal} pts`;
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

  // ── Calendar button ──────────────────────────────────────────────
  document.getElementById('tdCalBtn')?.addEventListener('click', () => openCalPopup());

  // Pré-carrega histórico em background para que já esteja pronto ao abrir a aba
  loadHistoricoPanel().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
// CALENDAR POPUP
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// TEAM DAILY PANEL
// ═══════════════════════════════════════════════════════════════════════

let _tdRefreshTimer   = null;
let _tdCountInterval  = null;
let _tdIsLive         = false;
let _tdLastMembers    = [];
let _tdSelectedPerson = null; // null = all members (grid view)
const _tdGroupExpanded = {}; // { [`${memberId}_${cat}`]: boolean } — collapsed by default

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
      return;
    }
  }

  grid.classList.remove('td-grid-full');
  grid.innerHTML = members.map(renderMemberCard).join('');
}

function renderPersonTable(member) {
  const weekPts      = member.ptsSemana || member.ptsToday || 0;
  const adjustedGoal = getDailyAdjustedGoal(member.weeklyGoal);
  const adjustedPct  = adjustedGoal > 0 ? Math.round((weekPts / adjustedGoal) * 100) : member.weekPct;
  const barW = Math.min(adjustedPct, 100);
  const barColor = adjustedPct >= 100 ? '#f6c200'
                 : adjustedPct >= 70  ? '#22d3a3'
                 : adjustedPct >= 40  ? '#f6a623'
                 : '#f04444';

  const doneCount  = member.doneSemana  != null ? member.doneSemana  : (member.doneToday  || 0);
  const totalCount = member.totalSemana != null ? member.totalSemana : (member.totalToday || 0);
  const metaText = member.isCompletionBased
    ? `Conclusão: ${doneCount}/${totalCount} tasks`
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
          : (cat !== 'done' ? `<span class="pt-no-pts" title="Sem pontuação">${IC.bell}</span>` : '');
        const coBadge = taskEmpresaBadge(task.empresa);
        return `<tr class="pt-row${cat === 'done' ? ' pt-row-done' : ''}">
          <td class="pt-task-name">${title}${pts}${coBadge}</td>
          <td class="pt-col">${dot(cat === 'doing',    '#3b82f6')}</td>
          <td class="pt-col">${dot(cat === 'done',     '#22d3a3')}</td>
          <td class="pt-col">${dot(cat === 'revision', '#f59e0b')}</td>
          <td class="pt-col">${dot(cat === 'approval', '#f6a623')}</td>
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
  </div>`;
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
  const adjustedGoal = getDailyAdjustedGoal(member.weeklyGoal);
  const adjustedPct  = adjustedGoal > 0 ? Math.round((weekPts / adjustedGoal) * 100) : member.weekPct;
  const wColor   = weekPctColor(adjustedPct);
  const barW     = Math.min(adjustedPct, 100);
  const barColor = adjustedPct >= 100 ? '#f6c200'
                 : adjustedPct >= 70  ? '#22d3a3'
                 : adjustedPct >= 40  ? '#f6a623'
                 : '#f04444';

  const doneCount  = member.doneSemana  != null ? member.doneSemana  : (member.doneToday  || 0);
  const totalCount = member.totalSemana != null ? member.totalSemana : (member.totalToday || 0);

  const metaText = member.isCompletionBased
    ? `Conclusão: ${doneCount}/${totalCount} tasks`
    : `Em andamento: ${weekPts} / ${adjustedGoal} pts`;

  // Grupos visíveis: pendente, alteração, aprovar, publicar, completas (colapsável)
  // 'doing' é mapeado para 'todo'; 'leader' é mapeado para 'approval'
  const STATUS_GROUPS = [
    { cat: 'revision', label: 'ALTERAÇÃO',  color: '#f59e0b', extra: [] },
    { cat: 'todo',     label: 'PENDENTE',   color: '#6b7585', extra: ['doing'] },
    { cat: 'approval', label: 'APROVAR',    color: '#f6a623', extra: ['leader'], collapsible: true },
    { cat: 'publish',  label: 'PUBLICAR',   color: '#7c3aed', extra: [],         collapsible: true },
    { cat: 'done',     label: 'COMPLETAS',  color: '#22d3a3', extra: [],         collapsible: true },
  ];

  const isFiltered = _dfb.daily.preset === 'mes';
  const todayStr   = todayISO();

  let taskRows = '';
  if (isFiltered) {
    const done = member.tasks.filter((t) => t.statusCat === 'done' || t.is_done);
    if (!done.length) {
      taskRows = '<li class="mc-no-tasks">Nenhuma task concluída no período</li>';
    } else {
      taskRows = done.map((task) => {
        const pts     = task.points ? `${task.points}p` : '';
        const title   = task.title.length > 44 ? `${task.title.slice(0, 44)}…` : task.title;
        const coBadge = taskEmpresaBadge(task.empresa);
        return `<li class="mc-task">
          <span class="mc-task-dot" style="background:#22d3a3"></span>
          <span class="mc-task-name done">${title}</span>
          ${pts ? `<span class="mc-task-pts">${pts}</span>` : ''}
          ${coBadge}
        </li>`;
      }).join('');
    }
  } else {
    // Tarefas atrasadas: due_date < hoje, não concluídas
    const overdueIds = new Set();
    const overdueTasks = member.tasks.filter((t) =>
      !t.is_done && t.statusCat !== 'done' && t.due_date && t.due_date < todayStr
    );
    if (overdueTasks.length) {
      overdueTasks.forEach((t) => overdueIds.add(t.id));
      taskRows += `<li class="mc-status-header mc-overdue-header">${IC.warn} ATRASADAS (${overdueTasks.length})</li>`;
      overdueTasks.forEach((task) => {
        taskRows += _mcTaskLi(task, '#f04444', false, true /* overdue */);
        (task.subtasks || []).forEach((sub) => { taskRows += _mcSubtaskLi(sub); });
      });
    }

    STATUS_GROUPS.forEach(({ cat, label, color, extra, collapsible }) => {
      const allCats = [cat, ...(extra || [])];
      // Exclui tarefas já listadas em ATRASADAS para não duplicar
      const group   = member.tasks.filter((t) => allCats.includes(t.statusCat) && !overdueIds.has(t.id));
      if (!group.length) return;

      if (collapsible) {
        const key = `${member.id}_${cat}`;
        const expanded = _tdGroupExpanded[key] === true;
        taskRows += `<li class="mc-status-header mc-group-header" style="color:${color}">
          <span>${label} (${group.length})</span>
          <button class="mc-group-toggle" data-uid="${member.id}" data-cat="${cat}" aria-label="Expandir ${label}" aria-expanded="${expanded}">
            <span class="mc-group-arrow${expanded ? ' mc-group-arrow-open' : ''}">›</span>
          </button>
        </li>`;
        if (expanded) {
          group.forEach((task) => {
            taskRows += _mcTaskLi(task, color, cat === 'done');
            (task.subtasks || []).forEach((sub) => { taskRows += _mcSubtaskLi(sub); });
          });
        }
        return;
      }

      taskRows += `<li class="mc-status-header" style="color:${color}">${label} (${group.length})</li>`;
      group.forEach((task) => {
        taskRows += _mcTaskLi(task, color, false);
        (task.subtasks || []).forEach((sub) => { taskRows += _mcSubtaskLi(sub); });
      });
    });
    if (!taskRows) taskRows = '<li class="mc-no-tasks">Sem tasks no período</li>';
  }

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
      <span class="mc-status-dot${doneCount > 0 ? ' active' : ''}"></span>
    </div>

    <div class="mc-stats">
      <div class="mc-stat">
        <span class="mc-stat-val">${doneCount}/${totalCount}</span>
        <span class="mc-stat-lbl">Concluídas</span>
      </div>
      <div class="mc-stat-sep"></div>
      <div class="mc-stat">
        <span class="mc-stat-val">${weekPts}</span>
        <span class="mc-stat-lbl">PTS semana</span>
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
    <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:3px;padding-left:2px">${getMetaPeriodLabel(member.weeklyGoal)}</div>

    <div class="mc-coef-row">
      <span class="mc-horas">${member.horasStr}</span>
    </div>

    <ul class="mc-task-list">
      ${taskRows || '<li class="mc-no-tasks">Sem tasks no período</li>'}
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

// ═══════════════════════════════════════════════════════════════════════
// RANKING PANEL — seção dedicada
// ═══════════════════════════════════════════════════════════════════════

async function loadRankingPanel() {
  const wrap = document.getElementById('rankingContent');
  if (!wrap) return;

  // Usa dados já carregados do Painel Daily se disponíveis (mesma fonte ClickUp ao vivo)
  if (_tdLastMembers && _tdLastMembers.length > 0) {
    renderRankingFromMembers(_tdLastMembers);
    return;
  }

  // Senão, busca do ClickUp ao vivo com filtro da semana atual
  wrap.innerHTML = '<p style="padding:32px;color:#5a6280;font-size:13px">Carregando ranking...</p>';
  try {
    const now  = new Date();
    const dow  = now.getDay() || 7;
    const mon  = new Date(now); mon.setDate(now.getDate() - dow + 1);
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt  = (d) => d.toISOString().slice(0, 10);
    const data = await api(`/api/focus?action=clickup-live&from=${fmt(mon)}&to=${fmt(sun)}&showOpen=1`);
    _tdLastMembers = data.members || [];
    renderRankingFromMembers(_tdLastMembers);
  } catch (err) {
    wrap.innerHTML = `<p style="padding:32px;color:#e05252;font-size:13px">Erro ao carregar ranking: ${err.message}</p>`;
  }
}

function renderRankingFromMembers(members) {
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
    const pts         = m.ptsSemana || m.ptsToday || 0;
    const coef        = m.coef != null ? m.coef : (m.weekPct || 0);
    const done        = m.doneSemana != null ? m.doneSemana : (m.doneToday || 0);
    const total       = m.totalSemana != null ? m.totalSemana : (m.totalToday || 0);
    const weeklyGoal  = m.weeklyGoal || 0;
    const goal120     = m.weeklyGoal120 || Math.round(weeklyGoal * 1.2);
    const metaStatus  = m.metaStatus || (pts >= goal120 ? 'above_120' : pts >= weeklyGoal ? 'above_100' : 'below_100');
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
    const metaGoalTxt = !m.isCompletionBased && weeklyGoal > 0
      ? ` · meta ${weeklyGoal} pts` : '';

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

  const { from, to } = _dfb.daily;
  const periodLabel  = from && to ? `${formatDateBR(from)} — ${formatDateBR(to)}` : 'Esta semana';

  wrap.innerHTML = `
    <div class="rk-panel">
      <div class="rk-header">
        <div>
          <div class="rk-title">${IC.trophy} Ranking Semanal</div>
          <div class="rk-subtitle">${periodLabel} · Ordenado por % meta · Pódio para coef ≥ 100%</div>
        </div>
        <button class="rk-refresh-btn" id="rkRefreshBtn">↺ Atualizar</button>
      </div>
      <div class="rk-list">${rows}</div>
    </div>`;

  document.getElementById('rkRefreshBtn')?.addEventListener('click', async () => {
    _tdLastMembers = [];
    const btn = document.getElementById('rkRefreshBtn');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    await loadRankingPanel();
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

async function loadTeamDaily() {
  const grid = document.getElementById('teamDailyGrid');
  if (!grid) return;

  // Recalcula datas do preset para refletir o dia/semana/mês atual
  dfbRecalcPreset('daily');

  // Try ClickUp live first
  try {
    const { from, to, preset } = _dfb.daily;
    const qs = (preset !== null && from && to) ? `&from=${from}&to=${to}` : '';
    const data = await api(`/api/focus?action=clickup-live${qs}`);
    _setLiveBadge(true);
    _renderTeamGrid(data);
    // Schedule next refresh in 60 seconds
    _startTdCountdown(60, loadTeamDaily);
    return;
  } catch (err) {
    _setLiveBadge(false);
    _stopTdTimers();
    console.warn('[clickup-live] sem acesso, usando banco:', err.message);
  }

  // Fallback: local database
  try {
    const data = await api('/api/focus?action=team-daily');
    _renderTeamGrid(data);
  } catch (err) {
    console.error('[team-daily]', err.message);
    if (grid) grid.innerHTML = `<p class="td-loading" style="color:#f04444">Erro: ${err.message}</p>`;
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
    await loadTeamDaily();
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

// ═══════════════════════════════════════════════════════════════════════
// TABELA DE PONTUAÇÃO POR TIPO DE TAREFA
// ═══════════════════════════════════════════════════════════════════════

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
      await loadTeamDaily();
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

// ═══════════════════════════════════════════════════════════════════════
// SHARED HELPERS — date ranges & formatting
// ═══════════════════════════════════════════════════════════════════════

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

function monthShortBR(isoMonth) {
  const [y, m] = isoMonth.split('-').map(Number);
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[m - 1]}/${String(y).slice(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════
// HISTÓRICO MKT PANEL
// ═══════════════════════════════════════════════════════════════════════

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
    const resp = await fetch(`/api/reports/history?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const text = await resp.text();
    let histData;
    try { histData = JSON.parse(text); } catch (_) {
      throw new Error(`HTTP ${resp.status} — resposta não-JSON: ${text.slice(0, 300)}`);
    }
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${histData.error || text.slice(0, 200)}`);
    }

    if (!histData || !histData.users || !histData.users.length) {
      if (wrap) wrap.innerHTML = '<p style="padding:24px;color:#5a6280;font-size:13px">Nenhum dado encontrado para o período.</p>';
      return;
    }

    // Busca snapshots para marcar semanas FECHADO / PENDENTE
    let snapshotMap = {};
    try {
      const sResp = await fetch('/api/focus?action=snapshot-list', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (sResp.ok) {
        const sData = await sResp.json();
        (sData.snapshots || []).forEach(s => { snapshotMap[s.week_start] = s; });
      }
    } catch (_) { /* snapshot API pode não existir ainda — ignora */ }

    renderHistoricoWeeklyTable(histData.weeks || [], histData.users || [], snapshotMap);
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

  // Coins: 0=nenhum 1=bronze 2=prata 3=ouro 4=diamante(120%)
  const COIN_CFG = [
    null,
    { label: '1 Coin',  cls: 'hwt-coin-1', icon: IC.medal(1) },
    { label: '2 Coins', cls: 'hwt-coin-2', icon: IC.medal(2) },
    { label: '3 Coins', cls: 'hwt-coin-3', icon: IC.medal(3) },
    { label: '4 Coins', cls: 'hwt-coin-4', icon: IC.gem },
  ];

  const firstWeek = weekLabels[0];
  const monthIdx  = firstWeek ? Number(firstWeek.weekStart.slice(5, 7)) - 1 : -1;
  const monthName = monthIdx >= 0 ? CAL_MONTH_NAMES[monthIdx] : '';

  const theadCells = weekLabels.map(w => {
    const [, mo, d] = w.weekStart.split('-');
    const liveTag   = w.isLive ? ' <span class="hwt-live-tag">ao vivo</span>' : '';
    const snap      = snapshotMap[w.weekStart];
    const lockTag   = snap?.status === 'FECHADO'            ? `<br><span class="hwt-lock-badge">${IC.lock} encerrada</span>` : '';
    const pendTag   = snap?.status === 'PENDENTE_VALIDACAO' && _isAdminUser ? `<br><span class="hwt-pending-badge">${IC.clock} pendente</span>` : '';
    return `<th class="hwt-week-th">Sem ${w.index}<br><span class="hwt-week-date">${d}/${mo}</span>${liveTag}${lockTag}${pendTag}</th>`;
  }).join('');

  const thead = `<thead><tr>
    <th class="hwt-person-th">Pessoa</th>
    ${theadCells}
  </tr></thead>`;

  const tbody = users.map(u => {
    const meta100 = u.meta100 || u.weeklyGoal || 0;
    const meta120 = u.meta120 || Math.round(meta100 * 1.2);

    const cells = u.weeks.map(w => {
      if (w.pts === 0 && !w.isLive) {
        return `<td class="hwt-week-cell hwt-empty-cell"><span class="hwt-empty">—</span></td>`;
      }

      const coins    = w.coins != null ? w.coins : 0;
      const coinCfg  = COIN_CFG[coins];
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
        : `<div class="hwt-coins hwt-no-coin">sem coins</div>`;

      const liveBadge    = w.isLive ? `<div class="hwt-live-badge">em andamento</div>` : '';
      const snapWeek     = snapshotMap[w.weekStart];
      const validadoNote = snapWeek?.status === 'FECHADO'
        ? `<div class="hwt-coins-validated">${IC.lock} coins validadas</div>`
        : (snapWeek?.status === 'PENDENTE_VALIDACAO' && _isAdminUser
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

    const metaInfo = u.isCompletionBased
      ? `<div class="hwt-cargo">${u.cargo || ''} · conclusão</div>`
      : `<div class="hwt-cargo">${u.cargo || ''}</div><div class="hwt-meta-goals">100%: ${meta100}p · 120%: ${meta120}p</div>`;

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
        <span class="hwt-leg-item">${IC.medal(1)} 1 Coin = ≥60%</span>
        <span class="hwt-leg-item">${IC.medal(2)} 2 Coins = ≥80%</span>
        <span class="hwt-leg-item">${IC.medal(3)} 3 Coins = meta 100%</span>
        <span class="hwt-leg-item">${IC.gem} 4 Coins = 120%</span>
      </div>
      <table class="hwt-table">
        ${thead}
        <tbody>${tbody}</tbody>
      </table>
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

// ═══════════════════════════════════════════════════════════════════════
// VERSÃO ADM PANEL
// ═══════════════════════════════════════════════════════════════════════

let admActiveMetric   = 'all';
let admActiveMonths   = null; // null = all
let admCurrentPreset  = '6m';

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
  const subtitle = document.getElementById('admChartSubtitle');
  if (subtitle) { subtitle.textContent = 'Carregando...'; subtitle.style.color = ''; }
  await Promise.all([loadAdmUsersIfNeeded(), loadAdmData()]);
  if (admBarChart) admBarChart.resize();
  if (_isAdminUser) loadSnapshotValidation().catch(() => {});
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
  if (subtitle) subtitle.textContent = `${personName} · Tasks Concluídas por mês`;

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
    admMonthlyData  = data.months || [];
    admActiveMonths = null;
    renderAdmMonthChips(admMonthlyData);
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
  if (!visible.length) return;

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

  if (metric === 'pts') {
    datasets = [
      { label: 'Pontos', data: pts, type: 'bar',
        backgroundColor: '#1e2235', borderColor: '#3a4060', borderWidth: 1, borderRadius: 5,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
      { label: 'Pontos (linha)', data: pts.map(v => v > 0 ? v : null), type: 'line',
        borderColor: '#3dba6f', backgroundColor: 'transparent',
        pointBackgroundColor: '#3dba6f', pointRadius: 5, pointHoverRadius: 7,
        tension: 0.35, spanGaps: false, datalabels: { display: false } },
    ];
    scales = {
      x: { grid: { display: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } },
      y: { display: false, min: 0 },
    };
  } else if (metric === 'tasks') {
    datasets = [
      { label: 'Tasks', data: tasks, type: 'bar',
        backgroundColor: '#1e2235', borderColor: '#3a4060', borderWidth: 1, borderRadius: 5,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
    ];
    scales = {
      x: { grid: { display: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } },
      y: { display: false, min: 0 },
    };
  } else if (metric === 'horas') {
    datasets = [
      { label: 'Horas', data: horas, type: 'bar',
        backgroundColor: '#e8b84422', borderColor: '#e8b844', borderWidth: 2, borderRadius: 5,
        datalabels: { ...DL, color: '#e8b844', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' } },
    ];
    scales = {
      x: { grid: { display: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } },
      y: { display: false, min: 0 },
    };
  } else {
    // Todos — barras escuras (Pontos) + barras douradas (Horas) + linha verde (Tasks)
    datasets = [
      { label: 'Pontos', data: pts, type: 'bar',
        backgroundColor: '#1e2235', borderColor: '#3a4060', borderWidth: 1,
        borderRadius: 5, yAxisID: 'y1', order: 2,
        datalabels: { ...DL, color: '#c8d0e7', formatter: v => v > 0 ? v : '' } },
      { label: 'Horas', data: horas, type: 'bar',
        backgroundColor: '#e8b84426', borderColor: '#e8b844', borderWidth: 1.5,
        borderRadius: 5, yAxisID: 'y1', order: 3,
        datalabels: { ...DL, color: '#e8b844', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' } },
      { label: 'Tasks', data: tasks.map(v => v > 0 ? v : null), type: 'line',
        borderColor: '#3dba6f', backgroundColor: 'transparent',
        pointBackgroundColor: '#3dba6f', pointRadius: 5, pointHoverRadius: 7,
        tension: 0.35, spanGaps: false, yAxisID: 'y2', order: 1,
        datalabels: { ...DL, display: true, color: '#3dba6f', formatter: v => (v && v > 0) ? v : '' } },
    ];
    scales = {
      x:  { grid: { display: false }, ticks: { color: '#8e98a7', font: { size: 11 } }, border: { display: false } },
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
  const el = document.getElementById('admUserBreakdown');
  if (!el) return;
  const active = rows.filter(r => r.doneCount > 0 || r.totalHours > 0);
  if (!active.length) { el.innerHTML = `<div class="adm-bd-header">Por Colaborador</div><p style="color:#5a6478;padding:16px;font-size:12px">Sem dados no período</p>`; return; }
  const maxPts = Math.max(...active.map(r => r.totalPoints), 1);
  const tbody = active.map((r, i) => {
    const barPct = Math.round(r.totalPoints / maxPts * 100);
    const barColor = i === 0 ? '#3dba6f' : '#e8b844';
    const pos = i === 0 ? IC.medal(1) : i === 1 ? IC.medal(2) : i === 2 ? IC.medal(3)
      : `<span class="adm-bd-pos">${i + 1}</span>`;
    return `<tr>
      <td class="adm-bd-name-cell">${pos} <span>${escHtml(r.name)}</span></td>
      <td class="adm-bd-num">${r.doneCount}</td>
      <td class="adm-bd-num adm-bd-pts">${r.totalPoints}</td>
      <td class="adm-bd-num">${r.totalHours.toFixed(1)}h</td>
      <td class="adm-bd-bar-cell">
        <div class="adm-bd-bar-track"><div class="adm-bd-bar-fill" style="width:${barPct}%;background:${barColor}"></div></div>
        <span class="adm-bd-pct-label" style="color:${barColor}">${barPct}%</span>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <div class="adm-bd-header">Por Colaborador</div>
    <table class="adm-bd-table">
      <thead><tr>
        <th>Nome</th><th>Concluídas</th><th>Pontos</th><th>Horas</th><th>Relativo</th>
      </tr></thead>
      <tbody>${tbody}</tbody>
    </table>`;
}

function renderAdmCompanyBreakdown(rows) {
  const el = document.getElementById('admCompanyBreakdown');
  if (!el) return;
  const active = rows.filter(r => r.doneCount > 0 || r.totalHours > 0);
  if (!active.length) { el.innerHTML = `<div class="adm-bd-header">Por Empresa / Cliente</div><p style="color:#5a6478;padding:16px;font-size:12px">Sem dados no período</p>`; return; }
  const maxPts = Math.max(...active.map(r => r.totalPoints || r.doneCount), 1);
  const tbody = active.map(r => {
    const pct = Math.round((r.totalPoints || r.doneCount) / maxPts * 100);
    const barColor = '#e8b844';
    return `<tr>
      <td class="adm-bd-name-cell"><span>${escHtml(r.company)}</span></td>
      <td class="adm-bd-num">${r.doneCount}</td>
      <td class="adm-bd-num adm-bd-pts">${r.totalPoints}</td>
      <td class="adm-bd-num">${r.totalHours.toFixed(1)}h</td>
      <td class="adm-bd-bar-cell">
        <div class="adm-bd-bar-track"><div class="adm-bd-bar-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div></div>
        <span class="adm-bd-pct-label" style="color:${barColor}">${pct}%</span>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <div class="adm-bd-header">Por Empresa / Cliente</div>
    <table class="adm-bd-table">
      <thead><tr>
        <th>Empresa</th><th>Concluídas</th><th>Pontos</th><th>Horas</th><th>Relativo</th>
      </tr></thead>
      <tbody>${tbody}</tbody>
    </table>`;
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

// ═══════════════════════════════════════════════════════════════════════
// ROTINA PANEL
// ═══════════════════════════════════════════════════════════════════════

let _routineWeekFrom = null; // YYYY-MM-DD (Monday of current week)
let _routineWeekTo   = null; // YYYY-MM-DD (Sunday of current week)
let _routineFilterUser = null; // null = all (admin) or self (member)
let _routineFilterCompany = null;
let _routineOnlyMine = false;
let _routineData = null;

// ═══════════════════════════════════════════════════════════════════════
// ROTINA PANEL — Weekly grid view
// ═══════════════════════════════════════════════════════════════════════

const ROUTINE_DOW_LABELS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
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
  const currentUser = JSON.parse(localStorage.getItem('mktimer_user') || 'null');

  // Acesso restrito: apenas bia, maria clara, malu e zion
  const rotinaUsers = ['bia', 'maria clara', 'malu', 'zion'];
  const userName = (currentUser?.name || '').toLowerCase().trim();
  const canAccess = currentUser?.role === 'admin' || rotinaUsers.includes(userName);
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

  const isAdmin = currentUser?.role === 'admin';

  if (isAdmin) {
    // bia e maria clara: visão de gestão (grid semanal + adicionar/remover rotinas + motivos)
    renderRoutineShell();
    await Promise.all([fetchAndRenderRoutines(), fetchAndRenderRoutineHistory()]);
  } else {
    // malu e zion: visão diária (marcar feita / não feita)
    renderMemberRoutineShell();
    await fetchAndRenderMemberRoutines(today);
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

  const done    = routines.filter(r => r.status === 'done').length;
  const skipped = routines.filter(r => r.status === 'skip').length;
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
    const isDone = r.status === 'done';
    const isSkip = r.status === 'skip';
    const CO_COLOR = { 'SeuBoné': '#e8b844', 'Onevo': '#3b82f6', 'Carbone Educação': '#22d3a3' };
    const coColor = r.company ? (CO_COLOR[r.company] || '#7882a4') : '#7882a4';
    const coAbbr = r.company ? (r.company === 'SeuBoné' ? 'SB' : r.company === 'Onevo' ? 'ON' : 'CB') : '';
    const coTag = coAbbr ? `<span class="rp-co-tag" style="background:${coColor}22;color:${coColor}">${coAbbr}</span>` : '';
    const obs = r.observation ? `<p class="rpm-obs">${escHtml(r.observation)}</p>` : '';
    const skipNote = r.status === 'skip' && r.reason ? `<p class="rpm-skip-reason">Motivo: ${escHtml(r.reason)}</p>` : '';

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

      if (act === 'done') {
        // Toggle done
        const currentlyDone = btn.classList.contains('active');
        btn.disabled = true;
        try {
          await api('/api/routines?action=toggle', {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: currentlyDone ? 'remove' : 'done' }),
          });
          if (routine) routine.status = currentlyDone ? null : 'done';
          renderMemberRoutineList(routines, date);
        } finally { btn.disabled = false; }
      } else if (act === 'skip') {
        openSkipReasonModal(routine?.title || '', async (reason) => {
          await api('/api/routines?action=toggle', {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: 'skip', reason }),
          });
          if (routine) { routine.status = 'skip'; routine.reason = reason; }
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
          <option value="daily">Diária (todos os dias úteis)</option>
          <option value="weekly">Semanal (1x/semana)</option>
          <option value="3x_week">3x na semana</option>
          <option value="custom">Personalizado</option>
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
          </div>
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
  document.getElementById('rpFilterClear')?.addEventListener('click', () => {
    _routineOnlyMine = false; _routineFilterCompany = null; _routineFilterUser = null;
    document.getElementById('rpOnlyMine').checked = false;
    document.getElementById('rpFilterCompany').value = '';
    document.getElementById('rpFilterUser').value = '';
    renderRoutineGrid();
  });

  // Admin section — exclusivo para admin
  const user = JSON.parse(localStorage.getItem('mktimer_user') || 'null');
  const isAdmin = user?.role === 'admin';
  const admSec = document.getElementById('rpAdminSection');
  if (admSec) admSec.style.display = isAdmin ? '' : 'none';

  if (isAdmin) {
    initRoutineAdminSection();

    // Mostrar/ocultar seletor de dias conforme frequência
    document.getElementById('rpAddFreq')?.addEventListener('change', (e) => {
      const val  = e.target.value;
      const wrap = document.getElementById('rpDaySelectorWrap');
      if (!wrap) return;
      const needsDays = val === 'weekly' || val === '3x_week' || val === 'custom';
      wrap.style.display = needsDays ? '' : 'none';
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

  // Recalculate summary for filtered set — entry é { status, reason } ou null
  let totalSlots = 0, doneSlots = 0;
  for (const r of filtered) {
    for (const [, entry] of Object.entries(r.days)) {
      totalSlots++;
      if (entry?.status === 'done') doneSlots++;
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

  const FREQ_LABELS = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
  const CO_ABBR = { 'SeuBoné': 'SB', 'Onevo': 'ON', 'Carbone Educação': 'CB' };
  const CO_COLOR = { 'SeuBoné': '#e8b844', 'Onevo': '#3b82f6', 'Carbone Educação': '#22d3a3' };

  const rows = filtered.map(r => {
    const abbr  = r.company ? (CO_ABBR[r.company] || r.company.slice(0, 2).toUpperCase()) : '';
    const color = r.company ? (CO_COLOR[r.company] || '#7882a4') : '#7882a4';
    const coTag = abbr ? `<span class="rp-co-tag" style="background:${color}22;color:${color}">${abbr}</span>` : '';
    const freqTag = `<span class="rp-freq-tag rp-freq-${r.frequency}">${FREQ_LABELS[r.frequency] || r.frequency}</span>`;
    const initials = r.personName ? r.personName.split(' ').slice(0,2).map(p=>p[0].toUpperCase()).join('') : '?';

    const cells = headerDates.map(h => {
      const applicable = r.days.hasOwnProperty(h.d);
      if (!applicable) return `<td class="rp-td-day"><span class="rp-cell-na">—</span></td>`;
      const entry  = r.days[h.d]; // null | { status, reason }
      const status = entry?.status || null;
      const reason = entry?.reason || null;
      const reasonHtml = status === 'skip' && reason
        ? `<div class="rp-cell-reason" title="${escHtml(reason)}">
             <span class="rp-cell-reason-icon">${IC.warn}</span>
             <span class="rp-cell-reason-text">${escHtml(reason.length > 40 ? reason.slice(0,40)+'…' : reason)}</span>
           </div>`
        : '';
      return `<td class="rp-td-day${status === 'skip' ? ' rp-td-skip' : ''}">
        <div class="rp-cell-btns">
          <button class="rp-cell-btn rp-cell-done${status === 'done' ? ' active' : ''}"
            data-rid="${r.id}" data-date="${h.d}" data-action="done" title="Concluída">✓</button>
          <button class="rp-cell-btn rp-cell-skip${status === 'skip' ? ' active' : ''}"
            data-rid="${r.id}" data-date="${h.d}" data-action="skip"
            title="${status === 'skip' && reason ? escHtml(reason) : 'Não realizada'}">✕</button>
        </div>
        ${reasonHtml}
      </td>`;
    }).join('');

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
      if (action === 'done') {
        btn.disabled = true;
        try {
          await api(`/api/routines?action=toggle`, {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: 'done' }),
          });
          const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
          if (routine) routine.days[date] = { status: 'done', reason: null };
          allBtns?.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderRoutineGrid();
        } catch (err) { console.error('[routine toggle]', err.message); }
        finally { btn.disabled = false; }
        return;
      }

      // Marcar como NÃO feita: abre modal de motivo (obrigatório)
      if (action === 'skip') {
        const routine = _routineData?.routines?.find(r => String(r.id) === String(rid));
        const routineTitle = routine?.title || '';
        openSkipReasonModal(routineTitle, async (reason) => {
          await api(`/api/routines?action=toggle`, {
            method: 'POST',
            body: JSON.stringify({ routineId: rid, date, status: 'skip', reason }),
          });
          if (routine) routine.days[date] = { status: 'skip', reason };
          renderRoutineGrid();
        });
        return;
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

      if (freqRaw === '3x_week') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        applies_days = checked.length ? checked : [1, 3, 5]; // default: Seg, Qua, Sex
      } else if (freqRaw === 'custom') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        if (!checked.length) {
          alert('Selecione ao menos um dia da semana.');
          return;
        }
        applies_days = checked;
      } else if (freqRaw === 'weekly') {
        frequency = 'weekly';
        const checked = [...document.querySelectorAll('#rpDayCheckboxes input:checked')].map(i => Number(i.value));
        applies_days = checked.length ? checked : null;
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
        document.querySelectorAll('#rpDayCheckboxes input').forEach(i => { i.checked = false; });
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

// ═══════════════════════════════════════════════════════════════════════
// SNAPSHOT VALIDATION — painel de fechamento semanal (admin only)
// ═══════════════════════════════════════════════════════════════════════

async function loadSnapshotValidation() {
  // Encontra ou cria o container dentro do painel ADM
  let wrap = document.getElementById('snapValidationWrap');
  if (!wrap) {
    const admPanel = document.querySelector('[data-panel-view="adm"]');
    if (!admPanel) return;
    wrap = document.createElement('div');
    wrap.id = 'snapValidationWrap';
    admPanel.insertBefore(wrap, admPanel.firstChild);
  }

  wrap.innerHTML = '<div class="snap-validation-section"><p class="snap-val-empty">Carregando fechamentos...</p></div>';

  try {
    const resp = await fetch('/api/focus?action=snapshot-list', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) { wrap.innerHTML = ''; return; }
    const data = await resp.json();
    const pending = (data.snapshots || []).filter(s => s.status === 'PENDENTE_VALIDACAO');
    renderSnapshotValidation(wrap, pending);
  } catch (_) {
    wrap.innerHTML = '';
  }
}

function renderSnapshotValidation(wrap, pendingSnaps) {
  // ── Helpers ───────────────────────────────────────────────────────────
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

  const calcBtn = `
    <button class="snap-calc-btn" id="snapCalcBtn">
      ${IC.clock} Calcular semana anterior
    </button>`;

  const cards = pendingSnaps.length
    ? pendingSnaps.map(s => {
        const { week, year } = fmtWeek(s.semana_id);
        return `
        <div class="snap-val-card" data-semana="${escHtml(s.semana_id)}">
          <div class="snap-val-card-top">
            <div class="snap-val-week-block">
              <span class="snap-val-week-label">${escHtml(week)}</span>
              <span class="snap-val-week-year">${escHtml(year)}</span>
            </div>
            <div class="snap-val-week-meta">
              <span class="snap-val-date-range">${fmtDate(s.week_start)} — ${fmtDate(s.week_end)}</span>
              <span class="snap-val-status-pending">${IC.clock} Aguardando validação</span>
            </div>
          </div>
          <div class="snap-val-entries-wrap">
            <div class="snap-val-loading"><span></span><span></span><span></span></div>
          </div>
          <div class="snap-val-footer">
            <div class="snap-val-summary"></div>
            <div class="snap-val-actions">
              <button class="snap-val-confirm-btn" disabled>Confirmar e Fechar Semana</button>
              <span class="snap-val-msg"></span>
            </div>
          </div>
        </div>`;
      }).join('')
    : `<div class="snap-val-empty-state">${IC.check} Nenhuma semana pendente de validação.</div>`;

  wrap.innerHTML = `
    <div class="snap-validation-section">
      <div class="snap-val-header">
        <span class="snap-val-title">${IC.lock} Fechamento Semanal</span>
        ${calcBtn}
      </div>
      ${cards}
    </div>`;

  // ── Calcular ──────────────────────────────────────────────────────────
  wrap.querySelector('#snapCalcBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `${IC.clock} Calculando...`;
    try {
      const r = await fetch('/api/focus?action=snapshot-calculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao calcular');
      btn.innerHTML = `${IC.check} Calculado — ${fmtWeek(d.semana_id).week}`;
      setTimeout(() => loadSnapshotValidation(), 900);
    } catch (err) {
      btn.textContent = `Erro: ${err.message.slice(0, 36)}`;
      btn.disabled = false;
    }
  });

  // ── Carrega entradas por card ─────────────────────────────────────────
  wrap.querySelectorAll('.snap-val-card').forEach(card => {
    const semanaId = card.dataset.semana;
    fetch(`/api/focus?action=snapshot-get&semana_id=${encodeURIComponent(semanaId)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        const entries = (d.entries || []).sort((a, b) => Number(b.percentual_meta) - Number(a.percentual_meta));
        const entriesWrap = card.querySelector('.snap-val-entries-wrap');

        if (!entries.length) {
          entriesWrap.innerHTML = '<p class="snap-val-empty">Nenhum colaborador no snapshot.</p>';
          return;
        }

        const rows = entries.map(e => {
          const pct    = Number(e.percentual_meta) || 0;
          const tier   = tierInfo(pct);
          const barPct = Math.round((Math.min(pct, 120) / 120) * 100);
          const metaC  = e.coins_sugeridas_meta    || 0;
          const rankC  = e.coins_sugeridas_ranking  || 0;
          const sug    = e.coins_sugeridas_total    || 0;
          const av     = initials(e.nome);
          const avC    = avColor(e.nome);

          return `
            <div class="snap-entry-row" data-uid="${e.user_id}">
              <div class="snap-entry-person">
                <div class="snap-entry-av" style="background:${avC}">${av}</div>
                <div>
                  <div class="snap-entry-name">${escHtml(e.nome)}</div>
                  <div class="snap-entry-cargo">${escHtml(e.cargo || '')}</div>
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
                <div class="snap-entry-sub">${e.pontos} pts &nbsp;·&nbsp; ${Number(e.horas_validadas_total).toFixed(1)}h</div>
              </div>
              <div class="snap-entry-coins">
                <div class="snap-coin-chips">
                  ${metaC > 0 ? `<span class="snap-chip-meta">${metaC} meta</span>` : ''}
                  ${rankC > 0 ? `<span class="snap-chip-rank">${rankC} rank</span>` : ''}
                  ${metaC === 0 && rankC === 0 ? `<span class="snap-chip-zero">sem coins</span>` : ''}
                </div>
                <div class="snap-stepper">
                  <button class="snap-step snap-step-dec" data-uid="${e.user_id}">−</button>
                  <input class="snap-coins-input" type="number" min="0" max="10"
                    value="${sug}" data-uid="${e.user_id}">
                  <button class="snap-step snap-step-inc" data-uid="${e.user_id}">+</button>
                </div>
              </div>
              <div class="snap-entry-obs">
                <input class="snap-obs-input" type="text" placeholder="observação..." data-uid="${e.user_id}">
              </div>
            </div>`;
        }).join('');

        const totalSug = entries.reduce((s, e) => s + (e.coins_sugeridas_total || 0), 0);
        card.querySelector('.snap-val-summary').innerHTML =
          `<span class="snap-summary-text">${entries.length} colaboradores &nbsp;·&nbsp; ${totalSug} coins sugeridas no total</span>`;

        entriesWrap.innerHTML = `
          <div class="snap-entries-head">
            <span>Colaborador</span>
            <span>Performance</span>
            <span>Coins</span>
            <span>Observação</span>
          </div>
          <div class="snap-entries-body">${rows}</div>`;

        // Steppers
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

        // Confirmar
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

init();
