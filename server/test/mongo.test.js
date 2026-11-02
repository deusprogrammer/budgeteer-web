import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { MongoRepository } from '../src/repository.js';
import { verifyPassword } from '../src/auth.js';

test('real MongoDB: authenticated CRUD, isolation, indexes and persistence', {
  skip: !process.env.MONGODB_TEST_URL && 'Set MONGODB_TEST_URL to run MongoDB integration tests',
}, async () => {
  // Only this uniquely named test database is created and dropped.
  const config = {
    url: process.env.MONGODB_TEST_URL,
    database: `budgeteer_test_${randomUUID().replaceAll('-', '')}`,
  };
  let repo = await MongoRepository.connect(config);
  let server;
  const password = 'integration test password';
  try {
    server = createApp(repo, { jwtSecret: randomUUID() }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://localhost:${server.address().port}/api`;
    const send = (method, path, body, token) => fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body && JSON.stringify(body),
    });
    const ownerResponse = await send('POST', '/auth/register', { username: 'owner', password });
    assert.equal(ownerResponse.status, 201);
    const owner = await ownerResponse.json();
    const otherResponse = await send('POST', '/auth/register', { username: 'other', password });
    assert.equal(otherResponse.status, 201);
    const other = await otherResponse.json();
    assert.equal((await send('POST', '/auth/register', { username: 'OWNER', password })).status, 409);
    const login = await send('POST', '/auth/login', { username: 'owner', password });
    assert.equal(login.status, 200);
    const rawUser = await repo.users.findOne({ username: 'owner' });
    assert.equal(await verifyPassword(password, rawUser.passwordHash), true);
    assert.notEqual(rawUser.passwordHash, password);
    const saved = [];

    for (const [resource, type, data, update] of [
      ['transactions', 'transaction', { amount: 25 }, { amount: 30 }],
      ['bills', 'bill', { name: 'Rent', amount: 1000, leftToPay: 500, dayOfMonth: 1 },
        { name: 'Rent', amount: 1100, leftToPay: 400, dayOfMonth: 2 }],
      ['paydays', 'payday', { name: 'Work', amount: 2000, exampleDate: '2026-11-01' },
        { name: 'Work', amount: 2100, exampleDate: '2026-11-15' }],
    ]) {
      assert.equal((await send('GET', `/${resource}`)).status, 401);
      const response = await send('POST', `/${resource}`, { ...data, userId: other.user.id }, owner.token);
      assert.equal(response.status, 201);
      const created = await response.json();
      assert.equal(created.userId, undefined);
      assert.equal(created._id, undefined);
      assert.equal(created.type, undefined);
      assert.ok(created.id.startsWith(`${type}::`));
      const path = `/${resource}/${encodeURIComponent(created.id)}`;
      const ownerList = await (await send('GET', `/${resource}`, undefined, owner.token)).json();
      assert.deepEqual(ownerList, [created]);
      assert.deepEqual(await (await send('GET', `/${resource}`, undefined, other.token)).json(), []);
      assert.equal((await send('PUT', path, update, other.token)).status, 404);
      assert.equal((await send('DELETE', path, undefined, other.token)).status, 404);
      assert.equal((await send('DELETE', `/bills/${encodeURIComponent(created.id)}`, undefined,
        resource === 'bills' ? other.token : owner.token)).status, 404);
      const updatedResponse = await send('PUT', path, update, owner.token);
      assert.equal(updatedResponse.status, 200);
      const updated = await updatedResponse.json();
      assert.equal(updated.id, created.id);
      assert.equal(updated.amount, update.amount);
      const disposable = await (await send('POST', `/${resource}`, data, owner.token)).json();
      const disposablePath = `/${resource}/${encodeURIComponent(disposable.id)}`;
      assert.equal((await send('DELETE', disposablePath, undefined, owner.token)).status, 204);
      assert.equal((await send('DELETE', disposablePath, undefined, owner.token)).status, 404);
      saved.push({ type, updated });
    }

    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    server = null;
    await repo.close();
    repo = await MongoRepository.connect(config);
    for (const { type, updated } of saved) {
      assert.deepEqual(await repo.list(type, owner.user.id), [updated]);
    }
    assert.equal((await repo.findUserById(owner.user.id)).username, 'owner');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await repo.client.db(config.database).dropDatabase();
    await repo.close();
  }
});
