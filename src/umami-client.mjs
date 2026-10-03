// Minimal client for the Umami v3 REST API endpoints the access sync needs.
// User and admin endpoints refuse API keys, so this logs in with a username and password.

const PAGE_SIZE = 100;

export class UmamiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UmamiError';
    this.status = status;
  }
}

export function createUmamiClient({ baseUrl, fetch = globalThis.fetch }) {
  const root = baseUrl.replace(/\/+$/, '');
  let token = null;

  async function request(method, path, { body, bearer = token } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const res = await fetch(`${root}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const detail = data?.message ?? data?.error?.message ?? data?.code ?? (typeof data === 'string' ? data : '');
      throw new UmamiError(`${method} ${path} failed with ${res.status}${detail ? `: ${detail}` : ''}`, res.status);
    }

    return data;
  }

  async function getAll(path) {
    const items = [];
    for (let page = 1; ; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const result = await request('GET', `${path}${sep}page=${page}&pageSize=${PAGE_SIZE}`);
      const data = result?.data ?? [];
      items.push(...data);
      if (data.length < PAGE_SIZE || items.length >= (result?.count ?? 0)) {
        return items;
      }
    }
  }

  return {
    /** Returns { user } when logged in, or { partialToken } when a 2FA code is needed. */
    async login(username, password) {
      const result = await request('POST', '/api/auth/login', { body: { username, password }, bearer: null });
      if (result?.requiresTwoFactor) {
        return { partialToken: result.partialToken };
      }
      token = result.token;
      return { user: result.user };
    },

    async verifyTwoFactor(partialToken, code) {
      const result = await request('POST', '/api/2fa/verify', { body: { token: code }, bearer: partialToken });
      token = result.token;
      return { user: result.user };
    },

    async listUsers() {
      const users = await getAll('/api/admin/users');
      return users.map(({ id, username, role }) => ({ id, username, role }));
    },

    async findTeam(name) {
      const teams = await getAll(`/api/admin/teams?search=${encodeURIComponent(name)}`);
      const team = teams.find(t => t.name === name);
      return team ? { id: team.id, name: team.name } : null;
    },

    async listTeamMembers(teamId) {
      const members = await getAll(`/api/teams/${teamId}/users`);
      return members.map(m => ({ userId: m.userId, username: m.user?.username ?? '', role: m.role }));
    },

    async createTeam(name) {
      // Umami returns [team, ownerMembership] here.
      const result = await request('POST', '/api/teams', { body: { name } });
      const team = Array.isArray(result) ? result[0] : result;
      return { id: team.id, name: team.name };
    },

    async createUser({ username, password, role }) {
      const user = await request('POST', '/api/users', { body: { username, password, role } });
      return { id: user.id, username: user.username, role: user.role };
    },

    updateUserRole(userId, role) {
      return request('POST', `/api/users/${userId}`, { body: { role } });
    },

    addTeamMember(teamId, userId, role) {
      return request('POST', `/api/teams/${teamId}/users`, { body: { userId, role } });
    },

    updateTeamMember(teamId, userId, role) {
      return request('POST', `/api/teams/${teamId}/users/${userId}`, { body: { role } });
    },

    removeTeamMember(teamId, userId) {
      return request('DELETE', `/api/teams/${teamId}/users/${userId}`);
    },
  };
}
