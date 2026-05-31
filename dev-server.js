/**
 * Local dev server — substitui o `vercel dev`
 * Serve os arquivos estáticos de /public e roteia /api/* para as funções serverless
 */
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const PORT = 3333;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

// Mapa de rotas da página (cleanUrls)
const PAGE_ROUTES = {
  '/':            '/index.html',
  '/app':         '/app.html',
  '/painel-team': '/painel-team.html',
  '/historico':   '/historico.html',
  '/admin':       '/admin.html',
};

// Mapa de handlers API (valores são caminhos relativos para require)
const API_HANDLERS = {
  '/api/health':               './api/health',
  '/api/auth/login':           './api/auth/login',
  '/api/auth/change-password': './api/auth/change-password',
  '/api/users/me':             './api/users/me',
  '/api/users':                './api/users/index',
  '/api/time-entries':         './api/time-entries',
  '/api/tasks':                './api/tasks/index',
  '/api/focus':                './api/focus/index',
  '/api/reports/summary':      './api/reports/summary',
  '/api/reports/history':      './api/reports/history',
  '/api/reports/monthly':      './api/reports/monthly',
  '/api/team/daily':           './api/team/daily',
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

// Fake res adapter para as funções serverless (que usam Express-style res)
function makeRes(res) {
  const headers = {};
  let statusCode = 200;
  const fake = {
    setHeader: (k, v)  => { headers[k] = v; return fake; },
    status:    (code)  => { statusCode = code; return fake; },
    json:      (data)  => {
      const body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      res.writeHead(statusCode, headers);
      res.end(body);
    },
    end:       (b)     => { res.writeHead(statusCode, headers); res.end(b||''); },
  };
  return fake;
}

const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Tasks com ID: /api/tasks/:id
  const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch) {
    const handler = require('./api/tasks/[id]');
    const body    = await parseBody(req);
    const fakeReq = { method: req.method, headers: req.headers, query: { id: taskMatch[1], ...parsed.query }, body };
    await handler(fakeReq, makeRes(res));
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const modulePath = API_HANDLERS[pathname];
    if (!modulePath) { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); return; }
    // Clear require cache para hot-reload
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
    const handler = require(modulePath);
    const body    = await parseBody(req);
    const fakeReq = { method: req.method, headers: req.headers, query: parsed.query, body };
    await handler(fakeReq, makeRes(res));
    return;
  }

  // Auto-auth preview: /go/painel-team  /go/historico  /go/admin
  if (pathname.startsWith('/go/')) {
    const target = pathname.slice(4) || 'painel-team';
    const targetFile = path.join(PUBLIC, target + '.html');
    if (!fs.existsSync(targetFile)) { res.writeHead(404); res.end('Not found'); return; }
    // Login como samuel para obter token
    const db = require('./api/_lib/db');
    const jwt = require('jsonwebtoken');
    const userRow = await db.query(
      `SELECT id, name, role FROM users WHERE name = 'samuel' AND active = TRUE LIMIT 1`
    );
    if (!userRow.rowCount) { res.writeHead(500); res.end('User not found'); return; }
    const u = userRow.rows[0];
    const token = jwt.sign({ sub: u.id, name: u.name, role: u.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
    const userJson = JSON.stringify({ id: u.id, name: u.name, role: u.role });
    let html = fs.readFileSync(targetFile, 'utf8');
    const inject = `<script>localStorage.setItem('mktimer_token','${token}');localStorage.setItem('mktimer_user',${userJson});</script>`;
    html = html.replace('<head>', '<head>' + inject);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Page routes
  let filePath = PAGE_ROUTES[pathname] || pathname;
  if (!path.extname(filePath)) filePath += '.html';
  const fullPath = path.join(PUBLIC, filePath);

  if (fs.existsSync(fullPath)) {
    const ext  = path.extname(fullPath);
    const mime = MIME[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(fullPath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀  Dev server rodando em  http://localhost:${PORT}\n`);
  console.log('  Páginas:');
  console.log(`    http://localhost:${PORT}/               → Login`);
  console.log(`    http://localhost:${PORT}/app            → Dashboard`);
  console.log(`    http://localhost:${PORT}/painel-team    → Painel Daily`);
  console.log(`    http://localhost:${PORT}/historico      → Histórico`);
  console.log(`    http://localhost:${PORT}/admin          → ADM\n`);
});
