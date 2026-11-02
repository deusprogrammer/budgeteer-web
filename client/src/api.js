let token = null;
let onUnauthorized = () => {};

export function setSessionToken(value) {
  token = value;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  const requestToken = token;
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401 && requestToken && token === requestToken
        && !['/auth/login', '/auth/register'].includes(path)) {
      token = null;
      onUnauthorized();
    }
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Request failed with status ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function resource(path) {
  return {
    list: () => request('GET', `/${path}`),
    create: (data) => request('POST', `/${path}`, data),
    update: (id, data) => request('PUT', `/${path}/${encodeURIComponent(id)}`, data),
    remove: (id) => request('DELETE', `/${path}/${encodeURIComponent(id)}`),
  };
}

export const api = {
  auth: {
    login: (data) => request('POST', '/auth/login', data),
    register: (data) => request('POST', '/auth/register', data),
  },
  transactions: resource('transactions'),
  bills: resource('bills'),
  paydays: resource('paydays'),
};
