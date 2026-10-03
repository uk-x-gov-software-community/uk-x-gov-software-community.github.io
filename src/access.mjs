import { parse } from 'yaml';

// Umami role names (see src/lib/constants.ts in umami-software/umami).
export const GLOBAL_ROLE = {
  admins: 'admin',
  managers: 'user',
  viewers: 'view-only',
};

export const TEAM_ROLE = {
  managers: 'team-manager',
  viewers: 'team-view-only',
};

export const TEAM_OWNER = 'team-owner';

const LISTS = Object.keys(GLOBAL_ROLE);
const USERNAME = /^[a-z0-9][a-z0-9._-]{0,254}$/;

/**
 * Parse and validate access.yml.
 * Returns { config, errors, warnings }; config is null when there are errors.
 */
export function parseAccess(text) {
  const errors = [];
  const warnings = [];
  let raw;

  try {
    raw = parse(text);
  } catch (e) {
    return { config: null, errors: [`access.yml is not valid YAML: ${e.message}`], warnings };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { config: null, errors: ['access.yml must be a mapping'], warnings };
  }

  const known = new Set(['team', ...LISTS]);
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      errors.push(`Unknown key "${key}"`);
    }
  }

  const team = typeof raw.team === 'string' ? raw.team.trim() : '';
  if (!team) {
    errors.push('"team" must be a non-empty string');
  } else if (team.length > 50) {
    errors.push('"team" must be 50 characters or fewer');
  }

  const config = { team };
  const seen = new Map();

  for (const list of LISTS) {
    const value = raw[list] ?? [];
    if (!Array.isArray(value)) {
      errors.push(`"${list}" must be a list`);
      config[list] = [];
      continue;
    }

    config[list] = [];
    for (const entry of value) {
      if (typeof entry !== 'string' || !USERNAME.test(entry)) {
        errors.push(`"${list}" has an invalid username: ${JSON.stringify(entry)} (use lower case letters, numbers, . _ -)`);
        continue;
      }
      if (seen.has(entry)) {
        errors.push(`"${entry}" is listed in both "${seen.get(entry)}" and "${list}"`);
        continue;
      }
      seen.set(entry, list);
      config[list].push(entry);
    }
  }

  if (config.admins.length < 2) {
    warnings.push('Fewer than 2 admins: access depends on a single person');
  }

  return { config: errors.length ? null : config, errors, warnings };
}

/**
 * Work out the changes needed to make Umami match the desired config.
 *
 * current = {
 *   self: { id, username },                       // the admin running the sync
 *   users: [{ id, username, role }],              // every Umami user
 *   team: { id, name } | null,
 *   members: [{ userId, username, role }],        // members of that team
 * }
 *
 * Returns { actions, notes }. Actions are plain objects the client executes in order.
 */
export function planChanges(config, current, { prune = false } = {}) {
  const actions = [];
  const notes = [];
  const usersByName = new Map(current.users.map(u => [u.username.toLowerCase(), u]));
  const membersById = new Map(current.members.map(m => [m.userId, m]));
  const wanted = new Set();

  if (!current.team) {
    actions.push({ type: 'createTeam', name: config.team });
  }

  for (const list of LISTS) {
    for (const username of config[list]) {
      wanted.add(username);
      const user = usersByName.get(username);
      const role = GLOBAL_ROLE[list];

      if (!user) {
        actions.push({ type: 'createUser', username, role });
      } else if (user.role !== role) {
        if (user.id === current.self.id) {
          notes.push(`Not changing your own role (${user.role} -> ${role}); ask another admin to do it`);
        } else {
          actions.push({ type: 'updateUserRole', username, userId: user.id, from: user.role, role });
        }
      }

      const teamRole = TEAM_ROLE[list];
      if (!teamRole) {
        continue;
      }

      const member = user ? membersById.get(user.id) : undefined;
      if (!member) {
        actions.push({ type: 'addTeamMember', username, userId: user?.id, role: teamRole });
      } else if (member.role === TEAM_OWNER) {
        notes.push(`${username} owns the team; leaving their team role as ${TEAM_OWNER}`);
      } else if (member.role !== teamRole) {
        actions.push({ type: 'updateTeamMember', username, userId: user.id, from: member.role, role: teamRole });
      }
    }
  }

  for (const member of current.members) {
    const username = member.username.toLowerCase();
    // Admins can see everything without team membership, so any membership they have is left alone.
    if (wanted.has(username)) {
      continue;
    }
    if (member.role === TEAM_OWNER) {
      notes.push(`${username} owns the team but is not in access.yml; transfer or remove them in the Umami UI`);
    } else if (prune) {
      actions.push({ type: 'removeTeamMember', username, userId: member.userId, from: member.role });
    } else {
      notes.push(`${username} is a team ${member.role} but not in access.yml (run with --prune to remove)`);
    }
  }

  for (const user of current.users) {
    const username = user.username.toLowerCase();
    if (!wanted.has(username) && user.id !== current.self.id) {
      notes.push(`Umami user ${username} (${user.role}) is not in access.yml; delete them in the Umami UI if they have left`);
    }
  }

  return { actions, notes };
}

export function describeAction(action) {
  switch (action.type) {
    case 'createTeam':
      return `create team "${action.name}"`;
    case 'createUser':
      return `create user ${action.username} (${action.role})`;
    case 'updateUserRole':
      return `change ${action.username} from ${action.from} to ${action.role}`;
    case 'addTeamMember':
      return `add ${action.username} to the team as ${action.role}`;
    case 'updateTeamMember':
      return `change ${action.username}'s team role from ${action.from} to ${action.role}`;
    case 'removeTeamMember':
      return `remove ${action.username} (${action.from}) from the team`;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
