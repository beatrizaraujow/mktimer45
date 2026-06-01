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
let histCompChart = null;
let histCompData = [];
let histActiveMonths = new Set();

// ── ADM panel state ───────────────────────────────────────────────────
let admFilter = 'mes';
let admCustomFrom = null;
let admCustomTo = null;
let admBarChart = null;
let admSelectedUser = '';
let admMonthlyData = [];
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
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

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
        ${isTop ? '<span class="rank-trophy">🏆</span>' : ''}
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
  daily: { from: null, to: null, preset: 'hoje' }, // 'hoje' = today view (default)
  hist:  { from: null, to: null, preset: '30d' },
};

function dfbPresetToRange(preset, days) {
  const today = todayISO();
  const now   = new Date();
  if (days) {
    const start = new Date(now);
    start.setDate(now.getDate() - Number(days) + 1);
    return { from: start.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'hoje')    return { from: today, to: today };
  if (preset === 'semana') {
    const dow = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + 1);
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    return { from: mon.toISOString().slice(0, 10), to: sat.toISOString().slice(0, 10) };
  }
  if (preset === 'mes') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: first.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'mes-ant') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  return { from: today, to: today };
}

function dfbSetInputs(target, from, to) {
  const fromEl = document.getElementById(target === 'daily' ? 'dailyDFBFrom' : 'histDFBFrom');
  const toEl   = document.getElementById(target === 'daily' ? 'dailyDFBTo'   : 'histDFBTo');
  if (fromEl) fromEl.value = from || '';
  if (toEl)   toEl.value   = to   || '';
}

function initDateFilterBars() {
  // ── Initialize defaults ──────────────────────────────────────────
  const todayStr = todayISO();
  _dfb.daily.from = _dfb.daily.to = todayStr;
  dfbSetInputs('daily', todayStr, todayStr);

  const histRange = dfbPresetToRange('mes', null);
  _dfb.hist.from = histRange.from;
  _dfb.hist.to   = histRange.to;
  dfbSetInputs('hist', histRange.from, histRange.to);
  document.querySelector('.dfb-pill[data-dfb="hist"][data-preset="mes"]')?.classList.add('active');
  document.querySelector('.dfb-pill[data-dfb="hist"][data-days="30"]')?.classList.remove('active');

  // ── Pill clicks ──────────────────────────────────────────────────
  document.querySelectorAll('.dfb-pill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.dfb;
      const days   = btn.dataset.days;
      const preset = btn.dataset.preset;

      // Toggle: clicking active non-Hoje pill → return to Hoje
      if (btn.classList.contains('active') && target === 'daily' && preset !== 'hoje') {
        const t = todayISO();
        document.querySelectorAll('.dfb-pill[data-dfb="daily"]').forEach((b) => b.classList.remove('active'));
        document.querySelector('.dfb-pill[data-dfb="daily"][data-preset="hoje"]')?.classList.add('active');
        _dfb.daily.from   = t;
        _dfb.daily.to     = t;
        _dfb.daily.preset = 'hoje';
        dfbSetInputs('daily', t, t);
        await loadTeamDaily();
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
  const barW = Math.min(member.dailyPct, 100);
  const barColor = member.dailyPct >= 100 ? '#f6c200'
                 : member.dailyPct >= 70  ? '#22d3a3'
                 : member.dailyPct >= 40  ? '#f6a623'
                 : '#f04444';

  const metaText = member.isCompletionBased
    ? `Conclusão: ${member.doneToday}/${member.totalToday} tasks`
    : `Meta: ${member.ptsToday} / ${member.dailyGoal} pts`;

  const dot = (active, color) => active
    ? `<span class="pt-dot" style="background:${color}"></span>`
    : `<span class="pt-dot-empty"></span>`;

  const rows = member.tasks.length
    ? member.tasks.map((task) => {
        const cat   = task.statusCat || 'todo';
        const title = task.title.length > 60 ? `${task.title.slice(0, 60)}…` : task.title;
        const pts   = task.points ? `<span class="pt-pts">${task.points}p</span>` : '';
        return `<tr class="pt-row${cat === 'done' ? ' pt-row-done' : ''}">
          <td class="pt-task-name">${title}${pts}</td>
          <td class="pt-col">${dot(cat === 'done',     '#22d3a3')}</td>
          <td class="pt-col">${dot(cat === 'revision', '#4f8ef7')}</td>
          <td class="pt-col">${dot(cat === 'approval', '#f6a623')}</td>
          <td class="pt-col">${dot(cat === 'leader',   '#9b59b6')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" class="pt-empty">Sem tasks no período</td></tr>`;

  return `<div class="person-table-wrap">
    <div class="pt-head">
      <div>
        <span class="pt-name">${member.name}</span>
        <span class="pt-role">${member.cargo}</span>
      </div>
      <div class="pt-head-stats">
        <span class="pt-hstat">${member.doneToday}/${member.totalToday} tasks</span>
        <span class="pt-hstat accent">${member.ptsToday} pts</span>
        <span class="pt-hstat" style="color:${barColor}">${member.dailyPct}%</span>
      </div>
    </div>
    <div class="pt-progress-row">
      <div class="pt-progress-track">
        <div class="pt-progress-fill" style="width:${barW}%;background:${barColor}"></div>
      </div>
      <span class="pt-meta-label">${metaText}</span>
    </div>
    <div class="pt-table-wrap">
      <table class="person-table">
        <thead>
          <tr>
            <th class="pt-th-task"></th>
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

function renderMemberCard(member) {
  const wColor  = weekPctColor(member.weekPct);
  const barW    = Math.min(member.dailyPct, 100);
  const barColor = member.dailyPct >= 100 ? '#f6c200'
                 : member.dailyPct >= 70  ? '#22d3a3'
                 : member.dailyPct >= 40  ? '#f6a623'
                 : '#f04444';
  const metaText = member.isCompletionBased
    ? `Conclusão: ${member.doneToday}/${member.totalToday} tasks`
    : `Meta: ${member.ptsToday} / ${member.dailyGoal} pts`;

  // Group tasks by status category
  const STATUS_GROUPS = [
    { cat: 'todo',     label: 'Para fazer',          color: '#6b7585' },
    { cat: 'approval', label: 'Em aprovação',        color: '#f6a623' },
    { cat: 'leader',   label: 'Aprovação do Líder',  color: '#9b59b6' },
    { cat: 'revision', label: 'Em alteração',        color: '#4f8ef7' },
    { cat: 'done',     label: 'Completas',           color: '#22d3a3' },
  ];

  // "Hoje" = show all tasks by status (open + today's done)
  // Other filters = show only completed tasks in the period
  const isFiltered = _dfb.daily.preset !== null && _dfb.daily.preset !== 'hoje';

  let taskRows = '';
  if (isFiltered) {
    // Filtered view: only completed tasks
    const done = member.tasks.filter((t) => t.statusCat === 'done' || t.is_done);
    if (!done.length) {
      taskRows = '<li class="mc-no-tasks">Nenhuma task concluída no período</li>';
    } else {
      taskRows = done.map((task) => {
        const pts   = task.points ? `${task.points}p` : '';
        const title = task.title.length > 48 ? `${task.title.slice(0, 48)}…` : task.title;
        return `<li class="mc-task">
          <span class="mc-task-dot" style="background:#22d3a3"></span>
          <span class="mc-task-name done">${title}</span>
          ${pts ? `<span class="mc-task-pts">${pts}</span>` : ''}
        </li>`;
      }).join('');
    }
  } else {
    // Current view: tasks grouped by status
    STATUS_GROUPS.forEach(({ cat, label, color }) => {
      const group = member.tasks.filter((t) => t.statusCat === cat);
      if (!group.length) return;
      taskRows += `<li class="mc-status-header" style="color:${color}">${label} (${group.length})</li>`;
      group.forEach((task) => {
        const pts   = task.points ? `${task.points}p` : '';
        const title = task.title.length > 44 ? `${task.title.slice(0, 44)}…` : task.title;
        const done  = cat === 'done' ? ' done' : '';
        taskRows += `<li class="mc-task">
          <span class="mc-task-dot" style="background:${task.statusColor || color}"></span>
          <span class="mc-task-name${done}">${title}</span>
          ${pts ? `<span class="mc-task-pts">${pts}</span>` : ''}
        </li>`;
      });
    });
    if (!taskRows) taskRows = '<li class="mc-no-tasks">Sem tasks hoje</li>';
  }

  return `<div class="member-card">
    <div class="mc-head">
      <div class="mc-info">
        <span class="mc-name">${member.name}</span>
        <span class="mc-role">${member.cargo || '—'}</span>
      </div>
      <span class="mc-status-dot${member.totalToday > 0 ? ' active' : ''}"></span>
    </div>

    <div class="mc-stats">
      <div class="mc-stat">
        <span class="mc-stat-val">${member.doneToday}/${member.totalToday}</span>
        <span class="mc-stat-lbl">Tasks hoje</span>
      </div>
      <div class="mc-stat-sep"></div>
      <div class="mc-stat">
        <span class="mc-stat-val">${member.ptsToday}</span>
        <span class="mc-stat-lbl">Pts hoje</span>
      </div>
      <div class="mc-stat-sep"></div>
      <div class="mc-stat">
        <span class="mc-stat-val" style="color:${wColor}">${member.weekPct}%</span>
        <span class="mc-stat-lbl">${member.weekLabel}</span>
      </div>
    </div>

    <div class="mc-meta-row">
      <span class="mc-meta-text">${metaText}</span>
    </div>

    <div class="mc-progress-wrap">
      <div class="mc-progress-track">
        <div class="mc-progress-fill" style="width:${barW}%;background:${barColor}"></div>
      </div>
      <span class="mc-progress-pct">${member.dailyPct}%</span>
    </div>

    <div class="mc-coef-row">
      <span class="mc-horas">${member.horasStr}</span>
      <span class="mc-coef-badge">COEF: ${member.coef}%</span>
    </div>

    <ul class="mc-task-list">
      ${taskRows || '<li class="mc-no-tasks">Sem tarefas hoje</li>'}
    </ul>
  </div>`;
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

  // Try ClickUp live first
  try {
    // Only pass date range when a historical filter is active
    const { from, to, preset } = _dfb.daily;
    const qs   = (preset !== null && from && to) ? `&from=${from}&to=${to}` : '';
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

function initTeamDaily() {
  document.getElementById('clickupSyncBtn')?.addEventListener('click', handleClickupSync);
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
  // Garante datas válidas — padrão: mês corrente
  if (!_dfb.hist.from) {
    const r = dfbPresetToRange('mes', null);
    _dfb.hist.from = r.from;
    _dfb.hist.to   = r.to;
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

    renderHistoricoWeeklyTable(histData.weeks || [], histData.users || []);
    loadHistoricoComparativo();
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

function renderHistoricoWeeklyTable(weekLabels, users) {
  const wrap = document.getElementById('histWeeklyWrap');
  if (!wrap) return;

  if (!weekLabels.length || !users.length) {
    wrap.innerHTML = '';
    return;
  }

  function starsHtml(n) {
    return Array.from({ length: 3 }, (_, i) =>
      `<span class="${i < n ? 'hwt-star-on' : 'hwt-star-off'}">★</span>`
    ).join('');
  }

  const firstWeek = weekLabels[0];
  const monthIdx  = firstWeek ? Number(firstWeek.weekStart.slice(5, 7)) - 1 : -1;
  const monthName = monthIdx >= 0 ? CAL_MONTH_NAMES[monthIdx] : '';

  const theadCells = weekLabels.map(w => {
    const liveTag = w.isLive
      ? ' <span style="color:#e8b844;font-size:9px">(ao vivo)</span>'
      : '';
    return `<th class="hwt-week-th">Semana ${w.index}${liveTag}</th>`;
  }).join('');

  // Nome sempre visível (coluna fixa)
  const thead = `<thead><tr>
    <th style="min-width:130px">Pessoa</th>
    ${theadCells}
  </tr></thead>`;

  const tbody = users.map(u => {
    const cells = u.weeks.map(w => {
      if (w.pts === 0 && !w.isLive) {
        return `<td class="hwt-week-cell"><span class="hwt-empty">—</span></td>`;
      }

      const pctClass = w.isLive && w.pct < 100
        ? 'live'
        : w.pct >= 100 ? 'green' : w.pct >= 60 ? 'yellow' : 'gray';

      // % além de 100
      const overshoot = w.pct > 100 && !w.isLive
        ? `<div class="hwt-overshoot">+${w.pct - 100}% além da meta</div>`
        : '';

      // % faltante
      const missing = w.pct < 100 && !w.isLive
        ? `<div class="hwt-missing">faltou ${100 - w.pct}%</div>`
        : '';

      // Coins ganhas (só quando bate >= 60%)
      const coinsRow = w.stars > 0
        ? `<div class="hwt-coins">
            <div class="hwt-stars">${starsHtml(w.stars)}</div>
            <span class="hwt-coins-label">+${w.stars} moeda${w.stars > 1 ? 's' : ''}</span>
           </div>`
        : '';

      const liveBadge = w.isLive
        ? `<div class="hwt-live-badge">em andamento</div>`
        : '';

      return `<td class="hwt-week-cell">
        <div class="hwt-pct ${pctClass}">${w.pct}%</div>
        <div class="hwt-pts">${w.pts} pts</div>
        ${overshoot}${missing}${coinsRow}${liveBadge}
      </td>`;
    }).join('');

    // Nome sempre visível para todos
    const personCell = `<td><div class="hwt-person">${u.name}</div><div class="hwt-cargo">${u.cargo || ''}</div></td>`;

    return `<tr>${personCell}${cells}</tr>`;
  }).join('');

  const titleText = monthName
    ? `▪ Histórico ${monthName} — Semana a Semana`
    : '▪ Histórico — Semana a Semana';

  wrap.innerHTML = `
    <div class="hist-weekly-wrap">
      <div class="hist-weekly-title">${titleText}</div>
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

function renderHistMonthFilter() {
  const container = document.getElementById('histMonthFilter');
  if (!container) return;
  container.innerHTML = histCompData.map(m =>
    `<button class="adm-month-btn${histActiveMonths.has(m.ym) ? ' active' : ''}" data-hym="${m.ym}">${m.label}</button>`
  ).join('');
  container.querySelectorAll('.adm-month-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ym = btn.dataset.hym;
      if (histActiveMonths.has(ym)) {
        if (histActiveMonths.size === 1) return;
        histActiveMonths.delete(ym);
        btn.classList.remove('active');
      } else {
        histActiveMonths.add(ym);
        btn.classList.add('active');
      }
      renderHistCompChart();
    });
  });
}

function renderHistCompChart() {
  const ctx = document.getElementById('histCompChart');
  if (!ctx) return;
  if (histCompChart) { histCompChart.destroy(); histCompChart = null; }

  const visible = histCompData.filter(m => histActiveMonths.has(m.ym));
  if (!visible.length) return;

  const dl = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];
  const DL = {
    anchor: 'end', align: 'top',
    font: { size: 10, weight: '700', family: 'Inter' },
    formatter: (v) => v > 0 ? v : '',
    color: '#c8d0dc',
  };

  histCompChart = new Chart(ctx, {
    type: 'bar',
    plugins: dl,
    data: {
      labels: visible.map(m => m.label),
      datasets: [
        {
          label: 'Tasks', data: visible.map(m => m.tasksDone),
          backgroundColor: 'rgba(42,213,138,0.85)', borderRadius: 5,
          yAxisID: 'y', order: 2,
          datalabels: { ...DL, color: '#2ad58a' },
        },
        {
          label: 'Horas', data: visible.map(m => m.horas),
          backgroundColor: 'rgba(79,142,247,0.75)', borderRadius: 5,
          yAxisID: 'y', order: 3,
          datalabels: { ...DL, color: '#4f8ef7', formatter: v => v > 0 ? v.toFixed(1) + 'h' : '' },
        },
        {
          label: 'Pontos', data: visible.map(m => m.pts > 0 ? m.pts : null),
          type: 'line', borderColor: '#f6c200', backgroundColor: 'transparent',
          pointBackgroundColor: '#f6c200',
          pointRadius: visible.map(m => m.pts > 0 ? 5 : 0),
          pointHoverRadius: visible.map(m => m.pts > 0 ? 7 : 0),
          tension: 0.35, spanGaps: false,
          yAxisID: 'y2', order: 1,
          datalabels: { ...DL, color: '#f6c200', formatter: v => (v && v > 0) ? v : '' },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color: '#8e98a7', font: { size: 11, family: 'Inter' }, boxWidth: 10, boxHeight: 10 } },
        tooltip: { backgroundColor: '#1a2030', titleColor: '#c8d0dc', bodyColor: '#8e98a7', borderColor: '#252d39', borderWidth: 1 },
        datalabels: { display: true },
      },
      scales: {
        x: { ticks: { color: '#666', font: { size: 10 } }, grid: { display: false }, border: { display: false } },
        y: { display: false, min: 0 },
        y2: { display: false, min: 0 },
      },
    },
  });
}

async function loadHistoricoComparativo() {
  if (!_isAdminUser) return;
  const from = _dfb.hist.from;
  const to   = _dfb.hist.to;
  if (!from || !to) return;

  const fromMonth = from.slice(0, 7);
  const toMonth   = to.slice(0, 7);

  const section = document.getElementById('histCompSection');
  if (!section) return;

  try {
    const data = await api(`/api/reports/adm?fromMonth=${fromMonth}&toMonth=${toMonth}`);
    if (!data || !data.months || !data.months.length) { section.style.display = 'none'; return; }

    histCompData = data.months;
    histActiveMonths = new Set(histCompData.map(m => m.ym));

    renderHistMonthFilter();
    renderHistCompChart();
    section.style.display = '';
  } catch (err) {
    console.error('[hist-comp] erro:', err.message);
    section.style.display = 'none';
  }
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

let admActiveMetric  = 'all';
let admActiveMonths  = null; // null = all

const ADM_MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function populateAdmMonthSelects() {
  const fromSel = document.getElementById('admFromMonth');
  const toSel   = document.getElementById('admToMonth');
  if (!fromSel || !toSel || fromSel.options.length) return;

  const now = new Date();
  for (let i = 17; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lb = `${ADM_MONTHS_PT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    [fromSel, toSel].forEach(sel => {
      const o = document.createElement('option');
      o.value = ym; o.textContent = lb;
      sel.appendChild(o);
    });
  }

  const curYM  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const d6     = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const sixYM  = `${d6.getFullYear()}-${String(d6.getMonth() + 1).padStart(2, '0')}`;
  fromSel.value = sixYM;
  toSel.value   = curYM;
}

function updateAdmMonthCount() {
  const fromSel = document.getElementById('admFromMonth');
  const toSel   = document.getElementById('admToMonth');
  const el      = document.getElementById('admMonthCount');
  if (!fromSel || !toSel || !el) return;
  const [fy, fm] = fromSel.value.split('-').map(Number);
  const [ty, tm] = toSel.value.split('-').map(Number);
  const n = Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
  el.textContent = `${n} mês${n > 1 ? 'es' : ''}`;
}

async function loadAdmPanel() {
  populateAdmMonthSelects();
  const subtitle = document.getElementById('admChartSubtitle');
  if (subtitle) { subtitle.textContent = 'Carregando...'; subtitle.style.color = ''; }
  await Promise.all([loadAdmUsersIfNeeded(), loadAdmData()]);
  // Força re-render do chart se dimensões estavam zero (painel estava hidden)
  if (admBarChart) admBarChart.resize();
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
  const fromSel   = document.getElementById('admFromMonth');
  const toSel     = document.getElementById('admToMonth');
  const fromMonth = fromSel?.value;
  const toMonth   = toSel?.value;
  if (!fromMonth || !toMonth) return;

  updateAdmMonthCount();

  const personName = document.getElementById('admUserSelect')?.selectedOptions[0]?.text || 'Toda a equipe';
  const subtitle   = document.getElementById('admChartSubtitle');
  if (subtitle) subtitle.textContent = `${personName} · Tasks, Horas e Pontos por mês`;

  const chartWrap = document.querySelector('.adm-chart-wrap');
  if (chartWrap) chartWrap.style.opacity = '0.4';

  const qs = admSelectedUser ? `&userId=${admSelectedUser}` : '';

  try {
    const resp = await fetch(`/api/reports/adm?fromMonth=${fromMonth}&toMonth=${toMonth}${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (_) {
      throw new Error(`HTTP ${resp.status} — resposta inválida`);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${data.error || text.slice(0, 150)}`);

    renderAdmStats(data.stats || {});
    admMonthlyData  = data.months || [];
    admActiveMonths = null;
    renderAdmMonthChips(admMonthlyData);
    renderAdmChart(admMonthlyData, null, admActiveMetric);
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
  set('admStatTasks',  stats.totalTasks  ?? '—');
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

  document.getElementById('admFromMonth')?.addEventListener('change', async () => {
    admActiveMonths = null;
    await loadAdmData();
  });

  document.getElementById('admToMonth')?.addEventListener('change', async () => {
    admActiveMonths = null;
    await loadAdmData();
  });

  document.getElementById('admMetricTabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-metric]');
    if (!tab) return;
    document.querySelectorAll('.adm-metric-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    admActiveMetric = tab.dataset.metric;
    renderAdmChart(admMonthlyData, admActiveMonths, admActiveMetric);
  });
}

init();
