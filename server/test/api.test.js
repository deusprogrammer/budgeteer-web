import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { ConflictError, NotFoundError } from '../src/repository.js';
import jwt from 'jsonwebtoken';

class InMemoryRepository {
  docs = new Map();
  seq = 0;
  users = new Map();
  async createUser(username, passwordHash) {
    if (await this.findUserByUsername(username)) throw new ConflictError('Username is already registered');
    const user = { id: `user-${++this.seq}`, username, passwordHash };
    this.users.set(user.id, user);
    return user;
  }
  async findUserByUsername(username) {
    return [...this.users.values()].find((user) => user.username === username);
  }
  async findUserById(id) {
    return this.users.get(id);
  }
  async list(type, userId) {
    return [...this.docs.entries()]
      .filter(([id, doc]) => id.startsWith(`${type}::`) && doc.userId === userId)
      .map(([id, { userId: _userId, ...data }]) => ({ id, ...data }));
  }
  async create(type, userId, data) {
    const id = `${type}::${++this.seq}`;
    this.docs.set(id, { ...data, userId });
    return { id, ...data };
  }
  async update(type, userId, id, data) {
    if (!id.startsWith(`${type}::`) || this.docs.get(id)?.userId !== userId) throw new NotFoundError(id);
    this.docs.set(id, { ...data, userId });
    return { id, ...data };
  }
  async remove(type, userId, id) {
    if (!id.startsWith(`${type}::`) || this.docs.get(id)?.userId !== userId) throw new NotFoundError(id);
    this.docs.delete(id);
  }
}

let server;
let base;
let token;
const jwtSecret = 'test-secret-with-at-least-32-bytes-long';
const password = 'correct horse battery staple';

before(async () => {
  server = createApp(new InMemoryRepository(), { jwtSecret }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api/budgeteer`;
  const registration = await send('POST', '/auth/register', { username: 'owner', password }, null);
  assert.equal(registration.status, 201);
  token = (await registration.json()).token;
});

after(() => server.close());

const send = (method, path, body, bearer = token) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body && JSON.stringify(body),
  });

test('transactions CRUD with defaults', async () => {
  const created = await send('POST', '/transactions', { amount: 12.5 });
  assert.equal(created.status, 201);
  const tx = await created.json();
  assert.equal(tx.category, 'Uncategorized');
  assert.ok(tx.timestamp);

  const list = await (await send('GET', '/transactions')).json();
  assert.equal(list.length, 1);

  assert.equal((await send('DELETE', `/transactions/${encodeURIComponent(tx.id)}`)).status, 204);
  assert.equal((await (await send('GET', '/transactions')).json()).length, 0);
});

test('bills create, update and validation', async () => {
  const bad = await send('POST', '/bills', { name: '', amount: 'x', leftToPay: 1, dayOfMonth: 40 });
  assert.equal(bad.status, 400);

  const bill = await (
    await send('POST', '/bills', { name: 'Rent', amount: 1000, leftToPay: 0, dayOfMonth: 1 })
  ).json();
  const updated = await send('PUT', `/bills/${encodeURIComponent(bill.id)}`, {
    name: 'Rent',
    amount: 1100,
    leftToPay: 0,
    dayOfMonth: 2,
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).amount, 1100);
});

test('paydays validate date format and 404 on wrong type', async () => {
  assert.equal(
    (await send('POST', '/paydays', { name: 'Job', amount: 2000, exampleDate: '03/14/2024' })).status,
    400,
  );
  const payday = await (
    await send('POST', '/paydays', { name: 'Job', amount: 2000, exampleDate: '2024-03-14' })
  ).json();
  assert.equal((await send('DELETE', `/bills/${encodeURIComponent(payday.id)}`)).status, 404);
});

test('all budget endpoints require authentication', async () => {
  assert.equal((await send('GET', '/health', undefined, null)).status, 200);
  for (const resource of ['transactions', 'bills', 'paydays']) {
    for (const [method, suffix] of [['GET', ''], ['POST', ''], ['PUT', '/missing'], ['DELETE', '/missing']]) {
      assert.equal((await send(method, `/${resource}${suffix}`, undefined, null)).status, 401);
    }
  }
});

test('registration validates input, normalizes usernames, and never exposes hashes', async () => {
  assert.equal((await send('POST', '/auth/register', { username: {}, password })).status, 400);
  assert.equal((await send('POST', '/auth/register', { username: 'short', password: 'short' })).status, 400);
  assert.equal((await send('POST', '/auth/register', { username: 'OWNER', password })).status, 409);
  const response = await send('POST', '/auth/register', { username: ' Alice ', password });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = await response.json();
  assert.deepEqual(Object.keys(session.user).sort(), ['id', 'username']);
  assert.equal(session.user.username, 'alice');
  assert.equal(session.passwordHash, undefined);
  const payload = jwt.verify(session.token, jwtSecret);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal(payload.sub, session.user.id);
  assert.equal(payload.passwordHash, undefined);
});

test('login handles invalid, unknown, and valid credentials', async () => {
  for (const username of ['owner', 'unknown']) {
    const response = await send('POST', '/auth/login', { username, password: 'wrong' });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Invalid username or password' });
  }
  assert.equal((await send('POST', '/auth/login', { username: { $ne: null }, password })).status, 400);
  const response = await send('POST', '/auth/login', { username: 'OWNER', password });
  assert.equal(response.status, 200);
  const session = await response.json();
  const me = await send('GET', '/auth/me', undefined, session.token);
  assert.deepEqual(await me.json(), session.user);
});

test('tampered, expired, wrong-audience and deleted-user tokens are rejected', async () => {
  const options = { subject: 'user-1', issuer: 'budgeteer-api', audience: 'budgeteer-web' };
  for (const bearer of [
    `${token}broken`,
    jwt.sign({}, jwtSecret, { ...options, expiresIn: -1 }),
    jwt.sign({}, jwtSecret, { ...options, audience: 'other' }),
    jwt.sign({}, jwtSecret, { ...options, subject: 'deleted-user' }),
  ]) {
    assert.equal((await send('GET', '/transactions', undefined, bearer)).status, 401);
  }
});

test('users cannot list, update, or delete another users budget or inject ownership', async () => {
  const other = await (await send('POST', '/auth/register', { username: 'other', password })).json();
  for (const [resource, data] of [
    ['transactions', { amount: 25 }],
    ['bills', { name: 'Private bill', amount: 10, leftToPay: 10, dayOfMonth: 1 }],
    ['paydays', { name: 'Private job', amount: 100, exampleDate: '2026-11-01' }],
  ]) {
    const created = await (await send('POST', `/${resource}`, { ...data, userId: other.user.id })).json();
    const path = `/${resource}/${encodeURIComponent(created.id)}`;
    assert.deepEqual(await (await send('GET', `/${resource}`, undefined, other.token)).json(), []);
    assert.equal((await send('PUT', path, data, other.token)).status, 404);
    assert.equal((await send('DELETE', path, undefined, other.token)).status, 404);
    assert.equal((await send('PUT', path, data)).status, 200);
    assert.equal((await send('DELETE', path)).status, 204);
  }
});

test('authentication rate limit allows 30 requests and blocks the 31st across login/register', async () => {
  const limitedServer = createApp(new InMemoryRepository(), { jwtSecret }).listen(0);
  await new Promise((resolve) => limitedServer.once('listening', resolve));
  try {
    const url = `http://localhost:${limitedServer.address().port}/api/budgeteer/auth`;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const path = attempt % 2 ? '/login' : '/register';
      const response = await fetch(`${url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '!', password }),
      });
      assert.equal(response.status, 400, `attempt ${attempt + 1}`);
    }
    const blocked = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password }),
    });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
    assert.deepEqual(await blocked.json(), {
      error: 'Too many authentication attempts; try again in 15 minutes',
    });
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
  }
});
