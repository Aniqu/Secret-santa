import crypto from 'node:crypto';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { read, write, DATA_FILE } from './store.js';
import { pickRecipient } from './draw.js';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024';
const MAX_NAME = 40;
const MAX_WISH = 500;

const app = new Hono();
const fail = (c, status, error) => c.json({ error }, status);
const find = (data, id) => data.participants.find((p) => p.id === id);

function passwordOk(given) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Ką dalyvis mato apie save: savo norą ir (jei jau atplėšė laišką) savo gavėją.
function publicView(data, p) {
  const recipient = p.recipientId ? find(data, p.recipientId) : null;
  return {
    name: p.name,
    wish: p.wish || '',
    recipient: recipient ? { name: recipient.name, wish: recipient.wish || '' } : null,
  };
}

// Asmeninės nuorodos neturi patekti į paieškos sistemas.
app.use('*', async (c, next) => {
  await next();
  c.header('X-Robots-Tag', 'noindex, nofollow');
});
app.get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// ---------- Dalyvis ----------

app.get('/api/me/:id', (c) => {
  const data = read();
  const me = find(data, c.req.param('id'));
  if (!me) return fail(c, 404, 'Dalyvis nerastas');
  return c.json(publicView(data, me));
});

// 1 etapas: noras įrašomas vieną kartą ir nebekeičiamas.
app.post('/api/me/:id/wish', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const wish = String(body.wish ?? '').trim();
  if (!wish) return fail(c, 400, 'Parašyk savo norą!');
  if (wish.length > MAX_WISH) return fail(c, 400, `Noras per ilgas (daugiausia ${MAX_WISH} simbolių).`);

  const data = read();
  const me = find(data, c.req.param('id'));
  if (!me) return fail(c, 404, 'Dalyvis nerastas');
  if (me.wish) return fail(c, 409, 'Laiškas jau užantspauduotas – pakeisti nebegalima.');

  me.wish = wish;
  me.wishAt = new Date().toISOString();
  write(data);
  return c.json(publicView(data, me));
});

// 2 etapas: gavėjas ištraukiamas pirmą kartą atplėšus laišką ir nebesikeičia.
app.post('/api/me/:id/reveal', (c) => {
  const data = read();
  const me = find(data, c.req.param('id'));
  if (!me) return fail(c, 404, 'Dalyvis nerastas');

  if (!me.recipientId) {
    const recipientId = pickRecipient(data.participants, me.id);
    if (!recipientId) {
      return fail(c, 409, 'Burtų ištraukti nepavyko – trūksta dalyvių. Parašyk organizatoriui.');
    }
    me.recipientId = recipientId;
    me.revealedAt = new Date().toISOString();
    write(data);
  }
  return c.json(publicView(data, me));
});

// ---------- Organizatorius ----------

app.use('/api/admin/*', async (c, next) => {
  if (!passwordOk(c.req.header('x-admin-password'))) return fail(c, 401, 'Neteisingas slaptažodis!');
  await next();
});

const adminView = (data) => ({
  participants: data.participants.map((p) => ({
    id: p.id,
    name: p.name,
    wish: p.wish || '',
    revealed: Boolean(p.recipientId),
    recipientName: p.recipientId ? (find(data, p.recipientId)?.name ?? null) : null,
  })),
});

app.get('/api/admin/participants', (c) => c.json(adminView(read())));

app.post('/api/admin/participants', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return fail(c, 400, 'Įveskite vardą!');
  if (name.length > MAX_NAME) return fail(c, 400, `Vardas per ilgas (daugiausia ${MAX_NAME} simbolių).`);

  const data = read();
  if (data.participants.some((p) => p.name.toLocaleLowerCase('lt') === name.toLocaleLowerCase('lt'))) {
    return fail(c, 400, 'Šis asmuo jau pridėtas!');
  }
  data.participants.push({
    id: crypto.randomBytes(9).toString('base64url'),
    name,
    wish: '',
    wishAt: null,
    recipientId: null,
    revealedAt: null,
    createdAt: new Date().toISOString(),
  });
  write(data);
  return c.json(adminView(data));
});

app.delete('/api/admin/participants/:id', (c) => {
  const id = c.req.param('id');
  const data = read();
  data.participants = data.participants.filter((p) => p.id !== id);
  // Kas buvo ištraukęs pašalintąjį, trauks iš naujo.
  for (const p of data.participants) {
    if (p.recipientId === id) {
      p.recipientId = null;
      p.revealedAt = null;
    }
  }
  write(data);
  return c.json(adminView(data));
});

// Atšaukia burtus, bet palieka dalyvius ir jų norus.
app.post('/api/admin/redraw', (c) => {
  const data = read();
  for (const p of data.participants) {
    p.recipientId = null;
    p.revealedAt = null;
  }
  write(data);
  return c.json(adminView(data));
});

app.post('/api/admin/reset', (c) => {
  const data = { participants: [] };
  write(data);
  return c.json(adminView(data));
});

app.all('/api/*', (c) => fail(c, 404, 'Nerasta'));

// ---------- Svetainė (vite build -> dist) ----------

app.use('*', serveStatic({ root: './dist' }));

// HOST=127.0.0.1, kai programėlė stovi už atvirkštinio tarpinio serverio.
serve({ fetch: app.fetch, port: PORT, hostname: process.env.HOST || undefined }, () => {
  console.log(`Slaptasis Kalėdų Senelis: http://localhost:${PORT}`);
  console.log(`Duomenys: ${DATA_FILE}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('ADMIN_PASSWORD nenustatytas – naudojamas numatytasis slaptažodis.');
  }
});
