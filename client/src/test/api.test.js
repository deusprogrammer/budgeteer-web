import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, setSessionToken, setUnauthorizedHandler } from '../api.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  setSessionToken(null);
  setUnauthorizedHandler(() => {});
});

test('login and registration use public JSON endpoints', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ user: { id: 'alice', username: 'alice' }, token: 'jwt' });
  };
  const credentials = { username: 'alice', password: 'a long password' };
  await api.auth.login(credentials);
  await api.auth.register(credentials);
  assert.deepEqual(requests.map((request) => request.url), ['/api/auth/login', '/api/auth/register']);
  for (const request of requests) {
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(request.body), credentials);
  }
});

test('budget requests attach tokens; signing out removes them', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json([]);
  };
  setSessionToken('jwt');
  await api.bills.list();
  await api.bills.update('bill::1', { name: 'Rent' });
  setSessionToken(null);
  await api.bills.list();
  assert.equal(requests[0].headers.Authorization, 'Bearer jwt');
  assert.equal(requests[1].url, '/api/bills/bill%3A%3A1');
  assert.equal(requests[2].headers.Authorization, undefined);
});

test('unauthorized budget calls expire the session but failed login does not', async () => {
  let expired = 0;
  setUnauthorizedHandler(() => { expired += 1; });
  setSessionToken('expired');
  globalThis.fetch = async () => Response.json({ error: 'Please sign in again' }, { status: 401 });
  await assert.rejects(api.auth.login({}), /Please sign in again/);
  assert.equal(expired, 0);
  await assert.rejects(api.transactions.list(), /Please sign in again/);
  assert.equal(expired, 1);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return new Response(null, { status: 204 });
  };
  assert.equal(await api.transactions.remove('transaction::1'), null);
});

test('a late unauthorized response from an old session does not sign out a new user', async () => {
  let finish;
  let expired = false;
  setUnauthorizedHandler(() => { expired = true; });
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  setSessionToken('old-user');
  const pending = api.bills.list();
  setSessionToken('new-user');
  finish(Response.json({ error: 'Old session expired' }, { status: 401 }));
  await assert.rejects(pending, /Old session expired/);
  assert.equal(expired, false);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer new-user');
    return Response.json([]);
  };
  await api.bills.list();
});
