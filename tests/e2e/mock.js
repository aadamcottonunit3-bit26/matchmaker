// Minimal imitation of Supabase Auth (GoTrue) + Storage, in front of a REAL PostgREST. LOCAL TESTING ONLY.
const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

const SECRET = process.env.JWT_SECRET;
const PORT = 54321;
const PGREST = { host: '127.0.0.1', port: 3100 };
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (p) => { const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })); const pl = b64(JSON.stringify(p)); return `${h}.${pl}.${crypto.createHmac('sha256', SECRET).update(h + '.' + pl).digest('base64url')}`; };
const verify = (t) => { try { const [h, p, s] = t.split('.'); if (crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url') !== s) return null; const pl = JSON.parse(Buffer.from(p, 'base64url').toString()); if (pl.exp && pl.exp < Date.now() / 1000) return null; return pl; } catch { return null; } };

const ID = { admin: '00000000-0000-0000-0000-0000000000ad', a: '00000000-0000-0000-0000-00000000000a', b: '00000000-0000-0000-0000-00000000000b', c: '00000000-0000-0000-0000-00000000000c' };
const users = new Map([
  [ID.admin, { id: ID.admin, email: 'admin@test.pk', password: 'AdminPass123' }],
  [ID.a, { id: ID.a, email: 'a@test.pk', password: 'OldPass123' }],
  [ID.b, { id: ID.b, email: 'b@test.pk', password: 'BPass12345' }],
  [ID.c, { id: ID.c, email: 'c@test.pk', password: 'CPass12345' }],
]);
const sessions = new Map(), refresh = new Map(), recov = new Map(), files = new Map();
const mail = [];
const pg = new Client({ connectionString: process.env.E2E_DB_URL });
pg.connect().catch((e) => { console.error('pg connect failed', e.message); process.exit(1); });

const userJson = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() });
function makeSession(u) {
  const sid = crypto.randomUUID(); sessions.set(sid, { user_id: u.id, revoked: false });
  const now = Math.floor(Date.now() / 1000), exp = now + 3600;
  const access = sign({ aud: 'authenticated', exp, iat: now, sub: u.id, email: u.email, role: 'authenticated', aal: 'aal1', session_id: sid });
  const rt = crypto.randomBytes(12).toString('hex'); refresh.set(rt, { user_id: u.id, session_id: sid });
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: rt, user: userJson(u) };
}
function bearer(req) { const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''); return m ? verify(m[1]) : null; }
function sessionUser(req) { const pl = bearer(req); if (!pl || pl.role !== 'authenticated') return null; const s = sessions.get(pl.session_id); if (!s || s.revoked) return null; return users.get(s.user_id) || null; }
const send = (res, code, obj) => { const b = obj === undefined ? '' : JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(b) }); res.end(b); };
const err = (res, code, error_code, msg) => send(res, code, { code, error_code, msg });

http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks); const url = new URL(req.url, 'http://x'); const p = url.pathname;
    let body = {}; if ((req.headers['content-type'] || '').includes('json') && raw.length) { try { body = JSON.parse(raw.toString()); } catch {} }
    try {
      // ---------- test hooks ----------
      if (p === '/__mail') return send(res, 200, mail.filter((m) => !url.searchParams.get('to') || m.to === url.searchParams.get('to')));
      if (p === '/__expire') { const r = recov.get(body.token_hash); if (r) r.exp = 0; return send(res, 200, { ok: !!r }); }
      if (p === '/__users') return send(res, 200, [...users.values()].map((u) => u.email));
      if (p === '/__files') return send(res, 200, [...files.keys()]);
      if (p === '/__file') { const f = files.get(url.searchParams.get('key')); if (!f) return send(res, 404, {}); res.writeHead(200, { 'content-type': 'application/octet-stream' }); return res.end(f); }
      if (p === '/__token') return send(res, 200, { token: sign({ aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, sub: url.searchParams.get('id'), role: 'authenticated', session_id: (() => { const sid = crypto.randomUUID(); sessions.set(sid, { user_id: url.searchParams.get('id'), revoked: false }); return sid; })() }) });

      // ---------- REST: real PostgREST ----------
      if (p.startsWith('/rest/v1/')) {
        const headers = { ...req.headers, host: `${PGREST.host}:${PGREST.port}` };
        const up = http.request({ ...PGREST, method: req.method, path: p.replace('/rest/v1', '') + url.search, headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
        up.on('error', (e) => err(res, 502, 'bad_gateway', e.message)); up.end(raw); return;
      }

      // ---------- AUTH ----------
      if (p === '/auth/v1/token' && req.method === 'POST') {
        const gt = url.searchParams.get('grant_type');
        if (gt === 'password') {
          const u = [...users.values()].find((x) => x.email === String(body.email).toLowerCase() && x.password === body.password);
          return u ? send(res, 200, makeSession(u)) : err(res, 400, 'invalid_credentials', 'Invalid login credentials');
        }
        if (gt === 'refresh_token') {
          const r = refresh.get(body.refresh_token); const s = r && sessions.get(r.session_id);
          if (!r || !s || s.revoked) return err(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token');
          refresh.delete(body.refresh_token); s.revoked = true;
          return send(res, 200, makeSession(users.get(r.user_id)));
        }
        return err(res, 400, 'validation_failed', 'unsupported grant');
      }
      if (p === '/auth/v1/user' && req.method === 'GET') { const u = sessionUser(req); return u ? send(res, 200, userJson(u)) : err(res, 401, 'bad_jwt', 'invalid or revoked session'); }
      if (p === '/auth/v1/user' && req.method === 'PUT') {
        const u = sessionUser(req); if (!u) return err(res, 401, 'bad_jwt', 'invalid or revoked session');
        if (body.password) { if (body.password === u.password) return err(res, 422, 'same_password', 'New password should be different from the old password.'); u.password = body.password; }
        return send(res, 200, userJson(u));
      }
      if (p === '/auth/v1/recover' && req.method === 'POST') {
        const u = [...users.values()].find((x) => x.email === String(body.email).toLowerCase());
        if (u) {
          const token_hash = crypto.randomBytes(20).toString('hex');
          recov.set(token_hash, { user_id: u.id, exp: Date.now() + 3600e3, used: false });
          const base = url.searchParams.get('redirect_to') || 'http://localhost:3077/auth/confirm';
          mail.push({ to: u.email, link: `${base}?token_hash=${token_hash}&type=recovery`, token_hash });
        }
        return send(res, 200, {}); // identical answer whether or not the account exists
      }
      if (p === '/auth/v1/verify' && req.method === 'POST') {
        const r = recov.get(body.token_hash);
        if (!r || r.used || r.exp < Date.now() || body.type !== 'recovery') return err(res, 403, 'otp_expired', 'Email link is invalid or has expired');
        r.used = true; return send(res, 200, makeSession(users.get(r.user_id)));
      }
      if (p === '/auth/v1/logout' && req.method === 'POST') {
        const pl = bearer(req); if (pl) for (const [sid, s] of sessions) if (s.user_id === pl.sub) s.revoked = true;
        res.writeHead(204); return res.end();
      }
      if (p === '/auth/v1/admin/users' && req.method === 'POST') {
        const pl = bearer(req); if (!pl || pl.role !== 'service_role') return err(res, 403, 'not_admin', 'not admin');
        const email = String(body.email).toLowerCase();
        if ([...users.values()].some((x) => x.email === email)) return err(res, 422, 'email_exists', 'A user with this email address has already been registered');
        const u = { id: crypto.randomUUID(), email, password: body.password }; users.set(u.id, u);
        await pg.query('insert into auth.users(id) values ($1)', [u.id]); return send(res, 200, userJson(u));
      }
      let m;
      if ((m = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(p)) && req.method === 'DELETE') {
        users.delete(m[1]); await pg.query('delete from auth.users where id=$1', [m[1]]); return send(res, 200, {});
      }

      // ---------- STORAGE ----------
      if ((m = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(p))) {
        if (req.method === 'POST') return send(res, 200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=t${Date.now()}` });
        const f = files.get(`${m[1]}/${decodeURIComponent(m[2])}`); if (!f) return send(res, 404, { error: 'not_found' });
        res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(f);
      }
      if ((m = /^\/storage\/v1\/object\/([^/]+)$/.exec(p)) && req.method === 'DELETE') {
        for (const k of body.prefixes || []) files.delete(`${m[1]}/${k}`); return send(res, 200, []);
      }
      if ((m = /^\/storage\/v1\/object\/(?:authenticated\/)?([^/]+)\/(.+)$/.exec(p))) {
        const key = `${m[1]}/${decodeURIComponent(m[2])}`;
        if (req.method === 'POST' || req.method === 'PUT') { files.set(key, raw); return send(res, 200, { Key: key }); }
        if (req.method === 'GET') { const f = files.get(key); if (!f) return send(res, 400, { error: 'not_found', message: 'Object not found' }); res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(f); }
      }
      err(res, 404, 'not_found', `mock: ${req.method} ${p}`);
    } catch (e) { err(res, 500, 'mock_error', e.message); }
  });
}).listen(PORT, () => console.log('mock supabase on', PORT));
