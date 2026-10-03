import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeAction, parseAccess, planChanges } from '../src/access.mjs';

const yaml = lines => lines.join('\n');

describe('parseAccess', () => {
  it('accepts the committed access.yml', () => {
    const { config, errors } = parseAccess(readFileSync(new URL('../access.yml', import.meta.url), 'utf8'));
    expect(errors).toEqual([]);
    expect(config.team).toBe('X-Gov Software Community');
  });

  it('parses all three lists', () => {
    const { config, errors, warnings } = parseAccess(
      yaml(['team: Stats', 'admins: [a, b]', 'managers: [c]', 'viewers: [d, e]']),
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(config).toEqual({ team: 'Stats', admins: ['a', 'b'], managers: ['c'], viewers: ['d', 'e'] });
  });

  it('treats missing or empty lists as empty', () => {
    const { config } = parseAccess(yaml(['team: Stats', 'admins: [a, b]', 'managers:']));
    expect(config.managers).toEqual([]);
    expect(config.viewers).toEqual([]);
  });

  it('warns when there are fewer than two admins', () => {
    const { config, warnings } = parseAccess(yaml(['team: Stats', 'admins: [a]']));
    expect(config).not.toBeNull();
    expect(warnings).toEqual(['Fewer than 2 admins: access depends on a single person']);
  });

  it('rejects a person in more than one list', () => {
    const { config, errors } = parseAccess(yaml(['team: Stats', 'admins: [a, b]', 'viewers: [a]']));
    expect(config).toBeNull();
    expect(errors).toEqual(['"a" is listed in both "admins" and "viewers"']);
  });

  it('rejects invalid usernames, unknown keys, bad lists and a missing team', () => {
    const { config, errors } = parseAccess(yaml(['admins: [Alice, "", 3]', 'viewers: bob', 'owners: [x]']));
    expect(config).toBeNull();
    expect(errors).toEqual([
      'Unknown key "owners"',
      '"team" must be a non-empty string',
      '"admins" has an invalid username: "Alice" (use lower case letters, numbers, . _ -)',
      '"admins" has an invalid username: "" (use lower case letters, numbers, . _ -)',
      '"admins" has an invalid username: 3 (use lower case letters, numbers, . _ -)',
      '"viewers" must be a list',
    ]);
  });

  it('rejects a team name longer than Umami allows', () => {
    const { errors } = parseAccess(`team: ${'x'.repeat(51)}`);
    expect(errors).toContain('"team" must be 50 characters or fewer');
  });

  it('rejects YAML that is not a mapping or does not parse', () => {
    expect(parseAccess('- a').errors).toEqual(['access.yml must be a mapping']);
    expect(parseAccess('team: [').errors[0]).toMatch(/^access.yml is not valid YAML/);
  });
});

const config = { team: 'Stats', admins: ['root', 'ann'], managers: ['mo'], viewers: ['val'] };
const self = { id: 'u-root', username: 'root' };
const root = { id: 'u-root', username: 'root', role: 'admin' };
const team = { id: 't1', name: 'Stats' };

describe('planChanges', () => {
  it('builds everything from an empty install', () => {
    const { actions } = planChanges(config, { self, users: [root], team: null, members: [] });
    expect(actions).toEqual([
      { type: 'createTeam', name: 'Stats' },
      { type: 'createUser', username: 'ann', role: 'admin' },
      { type: 'createUser', username: 'mo', role: 'user' },
      { type: 'addTeamMember', username: 'mo', userId: undefined, role: 'team-manager' },
      { type: 'createUser', username: 'val', role: 'view-only' },
      { type: 'addTeamMember', username: 'val', userId: undefined, role: 'team-view-only' },
    ]);
  });

  it('does nothing when Umami already matches', () => {
    const current = {
      self,
      team,
      users: [root, { id: 'u-ann', username: 'ann', role: 'admin' }, { id: 'u-mo', username: 'mo', role: 'user' }, { id: 'u-val', username: 'val', role: 'view-only' }],
      members: [
        { userId: 'u-root', username: 'root', role: 'team-owner' },
        { userId: 'u-mo', username: 'mo', role: 'team-manager' },
        { userId: 'u-val', username: 'val', role: 'team-view-only' },
      ],
    };
    expect(planChanges(config, current)).toEqual({ actions: [], notes: [] });
  });

  it('promotes a viewer to manager in both global and team roles', () => {
    const current = {
      self,
      team,
      users: [root, { id: 'u-ann', username: 'ann', role: 'admin' }, { id: 'u-mo', username: 'mo', role: 'view-only' }, { id: 'u-val', username: 'val', role: 'view-only' }],
      members: [
        { userId: 'u-mo', username: 'mo', role: 'team-view-only' },
        { userId: 'u-val', username: 'val', role: 'team-view-only' },
      ],
    };
    expect(planChanges(config, current).actions).toEqual([
      { type: 'updateUserRole', username: 'mo', userId: 'u-mo', from: 'view-only', role: 'user' },
      { type: 'updateTeamMember', username: 'mo', userId: 'u-mo', from: 'team-view-only', role: 'team-manager' },
    ]);
  });

  it('never changes the role of the admin running the sync', () => {
    const current = { self, team, users: [{ ...root, role: 'user' }], members: [] };
    const { actions, notes } = planChanges({ ...config, managers: [], viewers: [], admins: ['root'] }, current);
    expect(actions).toEqual([]);
    expect(notes).toEqual(['Not changing your own role (user -> admin); ask another admin to do it']);
  });

  it('leaves a team owner listed as a manager alone', () => {
    const current = { self, team, users: [root, { id: 'u-mo', username: 'mo', role: 'user' }], members: [{ userId: 'u-mo', username: 'mo', role: 'team-owner' }] };
    const { actions, notes } = planChanges({ ...config, admins: ['root'], viewers: [] }, current);
    expect(actions).toEqual([]);
    expect(notes).toEqual(['mo owns the team; leaving their team role as team-owner']);
  });

  it('reports leavers and only removes them with prune', () => {
    const current = {
      self,
      team,
      users: [root, { id: 'u-old', username: 'old', role: 'view-only' }],
      members: [
        { userId: 'u-root', username: 'root', role: 'team-owner' },
        { userId: 'u-old', username: 'old', role: 'team-view-only' },
      ],
    };
    const desired = { team: 'Stats', admins: ['root'], managers: [], viewers: [] };

    const report = planChanges(desired, current);
    expect(report.actions).toEqual([]);
    expect(report.notes).toEqual([
      'old is a team team-view-only but not in access.yml (run with --prune to remove)',
      'Umami user old (view-only) is not in access.yml; delete them in the Umami UI if they have left',
    ]);

    const pruned = planChanges(desired, current, { prune: true });
    expect(pruned.actions).toEqual([{ type: 'removeTeamMember', username: 'old', userId: 'u-old', from: 'team-view-only' }]);
  });

  it('never prunes a team owner', () => {
    const current = { self, team, users: [root], members: [{ userId: 'u-x', username: 'x', role: 'team-owner' }] };
    const { actions, notes } = planChanges({ team: 'Stats', admins: ['root'], managers: [], viewers: [] }, current, { prune: true });
    expect(actions).toEqual([]);
    expect(notes).toEqual(['x owns the team but is not in access.yml; transfer or remove them in the Umami UI']);
  });

  it('matches existing usernames case-insensitively', () => {
    const current = { self, team, users: [root, { id: 'u-val', username: 'Val', role: 'view-only' }], members: [{ userId: 'u-val', username: 'Val', role: 'team-view-only' }] };
    const { actions } = planChanges({ team: 'Stats', admins: ['root'], managers: [], viewers: ['val'] }, current);
    expect(actions).toEqual([]);
  });
});

describe('describeAction', () => {
  it('describes every action type', () => {
    expect(describeAction({ type: 'createTeam', name: 'Stats' })).toBe('create team "Stats"');
    expect(describeAction({ type: 'createUser', username: 'a', role: 'user' })).toBe('create user a (user)');
    expect(describeAction({ type: 'updateUserRole', username: 'a', from: 'user', role: 'admin' })).toBe('change a from user to admin');
    expect(describeAction({ type: 'addTeamMember', username: 'a', role: 'team-view-only' })).toBe('add a to the team as team-view-only');
    expect(describeAction({ type: 'updateTeamMember', username: 'a', from: 'team-view-only', role: 'team-manager' })).toBe("change a's team role from team-view-only to team-manager");
    expect(describeAction({ type: 'removeTeamMember', username: 'a', from: 'team-manager' })).toBe('remove a (team-manager) from the team');
    expect(() => describeAction({ type: 'nope' })).toThrow('Unknown action type: nope');
  });
});
