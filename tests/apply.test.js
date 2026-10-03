import { describe, expect, it, vi } from 'vitest';
import { applyPlan, generatePassword, readCurrentState } from '../src/apply.mjs';

function fakeClient() {
  return {
    listUsers: vi.fn().mockResolvedValue([{ id: 'u-root', username: 'root', role: 'admin' }]),
    findTeam: vi.fn().mockResolvedValue(null),
    listTeamMembers: vi.fn().mockResolvedValue([]),
    createTeam: vi.fn().mockResolvedValue({ id: 't-new', name: 'Stats' }),
    createUser: vi.fn(async ({ username, role }) => ({ id: `u-${username}`, username, role })),
    updateUserRole: vi.fn().mockResolvedValue({}),
    addTeamMember: vi.fn().mockResolvedValue({}),
    updateTeamMember: vi.fn().mockResolvedValue({}),
    removeTeamMember: vi.fn().mockResolvedValue({}),
  };
}

describe('generatePassword', () => {
  it('makes long, distinct, URL-safe passwords', () => {
    const a = generatePassword();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generatePassword()).not.toBe(a);
  });
});

describe('readCurrentState', () => {
  it('skips team members when the team does not exist', async () => {
    const client = fakeClient();
    const state = await readCurrentState(client, { id: 'u-root' }, 'Stats');
    expect(state).toEqual({ self: { id: 'u-root' }, users: [{ id: 'u-root', username: 'root', role: 'admin' }], team: null, members: [] });
    expect(client.listTeamMembers).not.toHaveBeenCalled();
  });

  it('reads the members of an existing team', async () => {
    const client = fakeClient();
    client.findTeam.mockResolvedValue({ id: 't1', name: 'Stats' });
    client.listTeamMembers.mockResolvedValue([{ userId: 'u-root', username: 'root', role: 'team-owner' }]);
    const state = await readCurrentState(client, { id: 'u-root' }, 'Stats');
    expect(client.listTeamMembers).toHaveBeenCalledWith('t1');
    expect(state.members).toHaveLength(1);
  });
});

describe('applyPlan', () => {
  it('creates the team and users, then uses their new ids', async () => {
    const client = fakeClient();
    const log = vi.fn();
    const created = await applyPlan(
      client,
      { users: [{ id: 'u-root', username: 'root' }], team: null },
      [
        { type: 'createTeam', name: 'Stats' },
        { type: 'createUser', username: 'val', role: 'view-only' },
        { type: 'addTeamMember', username: 'val', userId: undefined, role: 'team-view-only' },
      ],
      { log, makePassword: () => 'pw-123456789' },
    );

    expect(client.createTeam).toHaveBeenCalledWith('Stats');
    expect(client.createUser).toHaveBeenCalledWith({ username: 'val', password: 'pw-123456789', role: 'view-only' });
    expect(client.addTeamMember).toHaveBeenCalledWith('t-new', 'u-val', 'team-view-only');
    expect(created).toEqual([{ username: 'val', password: 'pw-123456789' }]);
    expect(log).toHaveBeenCalledWith('- create user val (view-only)');
  });

  it('updates and removes members of an existing team', async () => {
    const client = fakeClient();
    await applyPlan(client, { users: [], team: { id: 't1' } }, [
      { type: 'updateUserRole', username: 'mo', userId: 'u-mo', from: 'view-only', role: 'user' },
      { type: 'updateTeamMember', username: 'mo', userId: 'u-mo', from: 'team-view-only', role: 'team-manager' },
      { type: 'removeTeamMember', username: 'old', userId: 'u-old', from: 'team-view-only' },
    ]);
    expect(client.updateUserRole).toHaveBeenCalledWith('u-mo', 'user');
    expect(client.updateTeamMember).toHaveBeenCalledWith('t1', 'u-mo', 'team-manager');
    expect(client.removeTeamMember).toHaveBeenCalledWith('t1', 'u-old');
  });

  it('stops on the first failure but keeps the passwords already issued', async () => {
    const client = fakeClient();
    client.addTeamMember.mockRejectedValueOnce(new Error('boom'));
    const error = await applyPlan(
      client,
      { users: [], team: { id: 't1' } },
      [
        { type: 'createUser', username: 'a', role: 'user' },
        { type: 'addTeamMember', username: 'a', role: 'team-manager' },
        { type: 'createUser', username: 'b', role: 'user' },
      ],
      { makePassword: () => 'pw-a-123456789' },
    ).catch(e => e);

    expect(error.message).toBe('boom');
    expect(error.created).toEqual([{ username: 'a', password: 'pw-a-123456789' }]);
    expect(client.createUser).toHaveBeenCalledTimes(1);
  });

  it('fails clearly when a user id cannot be found', async () => {
    await expect(
      applyPlan(fakeClient(), { users: [], team: { id: 't1' } }, [{ type: 'addTeamMember', username: 'ghost', role: 'team-manager' }]),
    ).rejects.toThrow('No Umami user id for ghost');
  });

  it('rejects unknown actions', async () => {
    await expect(applyPlan(fakeClient(), { users: [], team: null }, [{ type: 'nope' }])).rejects.toThrow('Unknown action type: nope');
  });
});
