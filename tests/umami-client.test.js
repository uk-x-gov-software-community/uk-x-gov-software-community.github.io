import { describe, expect, it, vi } from 'vitest';
import { createUmamiClient, UmamiError } from '../src/umami-client.mjs';

function respond(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
}

function setup(...responses) {
  const fetch = vi.fn();
  responses.forEach(r => fetch.mockResolvedValueOnce(r));
  return { fetch, client: createUmamiClient({ baseUrl: 'https://stats.example.org/', fetch }) };
}

describe('createUmamiClient', () => {
  it('logs in and sends the token on later requests', async () => {
    const { fetch, client } = setup(
      respond(200, { token: 'tok', user: { id: 'u1', username: 'root', isAdmin: true } }),
      respond(200, { data: [{ id: 'u1', username: 'root', role: 'admin', createdAt: 'x' }], count: 1 }),
    );

    expect(await client.login('root', 'secret')).toEqual({ user: { id: 'u1', username: 'root', isAdmin: true } });
    const [loginUrl, loginInit] = fetch.mock.calls[0];
    expect(loginUrl).toBe('https://stats.example.org/api/auth/login');
    expect(loginInit.headers.Authorization).toBeUndefined();
    expect(JSON.parse(loginInit.body)).toEqual({ username: 'root', password: 'secret' });

    expect(await client.listUsers()).toEqual([{ id: 'u1', username: 'root', role: 'admin' }]);
    const [usersUrl, usersInit] = fetch.mock.calls[1];
    expect(usersUrl).toBe('https://stats.example.org/api/admin/users?page=1&pageSize=100');
    expect(usersInit.headers.Authorization).toBe('Bearer tok');
  });

  it('completes a two-factor login with the partial token', async () => {
    const { fetch, client } = setup(
      respond(200, { requiresTwoFactor: true, partialToken: 'partial' }),
      respond(200, { token: 'full', user: { id: 'u1' } }),
    );

    expect(await client.login('root', 'secret')).toEqual({ partialToken: 'partial' });
    expect(await client.verifyTwoFactor('partial', '123456')).toEqual({ user: { id: 'u1' } });
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('https://stats.example.org/api/2fa/verify');
    expect(init.headers.Authorization).toBe('Bearer partial');
    expect(JSON.parse(init.body)).toEqual({ token: '123456' });
  });

  it('pages through long lists', async () => {
    const page = (n, offset) => Array.from({ length: n }, (_, i) => ({ id: `u${offset + i}`, username: `u${offset + i}`, role: 'user' }));
    const { fetch, client } = setup(respond(200, { data: page(100, 0), count: 150 }), respond(200, { data: page(50, 100), count: 150 }));

    expect(await client.listUsers()).toHaveLength(150);
    expect(fetch.mock.calls[1][0]).toBe('https://stats.example.org/api/admin/users?page=2&pageSize=100');
  });

  it('finds a team by exact name', async () => {
    const { fetch, client } = setup(respond(200, { data: [{ id: 't0', name: 'Stats old' }, { id: 't1', name: 'Stats' }], count: 2 }));
    expect(await client.findTeam('Stats')).toEqual({ id: 't1', name: 'Stats' });
    expect(fetch.mock.calls[0][0]).toBe('https://stats.example.org/api/admin/teams?search=Stats&page=1&pageSize=100');
  });

  it('returns null when no team has the name', async () => {
    const { client } = setup(respond(200, { data: [{ id: 't0', name: 'Stats old' }], count: 1 }));
    expect(await client.findTeam('Stats')).toBeNull();
  });

  it('flattens team members', async () => {
    const { client } = setup(respond(200, { data: [{ userId: 'u1', role: 'team-owner', user: { id: 'u1', username: 'root' } }], count: 1 }));
    expect(await client.listTeamMembers('t1')).toEqual([{ userId: 'u1', username: 'root', role: 'team-owner' }]);
  });

  it('calls the right endpoints to change access', async () => {
    const { fetch, client } = setup(
      respond(200, [{ id: 't1', name: 'Stats', accessCode: 'x' }, { id: 'tu1', role: 'team-owner' }]),
      respond(200, { id: 'u2', username: 'val', role: 'view-only', password: 'hash' }),
      respond(200, {}),
      respond(200, {}),
      respond(200, {}),
      respond(200),
    );

    expect(await client.createTeam('Stats')).toEqual({ id: 't1', name: 'Stats' });
    expect(await client.createUser({ username: 'val', password: 'p', role: 'view-only' })).toEqual({ id: 'u2', username: 'val', role: 'view-only' });
    await client.updateUserRole('u2', 'user');
    await client.addTeamMember('t1', 'u2', 'team-view-only');
    await client.updateTeamMember('t1', 'u2', 'team-manager');
    await client.removeTeamMember('t1', 'u2');

    expect(fetch.mock.calls.map(([url, init]) => `${init.method} ${url.replace('https://stats.example.org', '')}`)).toEqual([
      'POST /api/teams',
      'POST /api/users',
      'POST /api/users/u2',
      'POST /api/teams/t1/users',
      'POST /api/teams/t1/users/u2',
      'DELETE /api/teams/t1/users/u2',
    ]);
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ userId: 'u2', role: 'team-view-only' });
  });

  it('also accepts a plain team object from createTeam', async () => {
    const { client } = setup(respond(200, { id: 't1', name: 'Stats' }));
    expect(await client.createTeam('Stats')).toEqual({ id: 't1', name: 'Stats' });
  });

  it('turns error responses into UmamiError', async () => {
    const { client } = setup(respond(401, { message: 'incorrect-username-password' }));
    const error = await client.login('root', 'bad').catch(e => e);
    expect(error).toBeInstanceOf(UmamiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('POST /api/auth/login failed with 401: incorrect-username-password');
  });

  it('copes with non-JSON error bodies', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => 'Bad gateway' });
    const client = createUmamiClient({ baseUrl: 'https://stats.example.org', fetch });
    await expect(client.listUsers()).rejects.toThrow('GET /api/admin/users?page=1&pageSize=100 failed with 502: Bad gateway');
  });
});
