import { randomBytes } from 'node:crypto';
import { describeAction } from './access.mjs';

export function generatePassword() {
  // 24 random bytes -> 32 URL-safe characters; well above Umami's 8 character minimum.
  return randomBytes(24).toString('base64url');
}

/** Read the current Umami state that planChanges() compares against. */
export async function readCurrentState(client, self, teamName) {
  const [users, team] = await Promise.all([client.listUsers(), client.findTeam(teamName)]);
  const members = team ? await client.listTeamMembers(team.id) : [];
  return { self, users, team, members };
}

/**
 * Run the planned actions in order.
 * Returns the one-off passwords of any users it created, so they can be handed over.
 * If an action fails, the error carries those passwords as error.created so none are lost.
 */
export async function applyPlan(client, current, actions, { log = () => {}, makePassword = generatePassword } = {}) {
  let teamId = current.team?.id;
  const userIds = new Map(current.users.map(u => [u.username.toLowerCase(), u.id]));
  const created = [];

  const userIdFor = action => {
    const id = action.userId ?? userIds.get(action.username);
    if (!id) {
      throw new Error(`No Umami user id for ${action.username}`);
    }
    return id;
  };

  try {
    for (const action of actions) {
      await runAction(action);
    }
  } catch (error) {
    error.created = created;
    throw error;
  }

  return created;

  async function runAction(action) {
    log(`- ${describeAction(action)}`);

    switch (action.type) {
      case 'createTeam': {
        const team = await client.createTeam(action.name);
        teamId = team.id;
        break;
      }
      case 'createUser': {
        const password = makePassword();
        const user = await client.createUser({ username: action.username, password, role: action.role });
        userIds.set(action.username, user.id);
        created.push({ username: action.username, password });
        break;
      }
      case 'updateUserRole':
        await client.updateUserRole(userIdFor(action), action.role);
        break;
      case 'addTeamMember':
        await client.addTeamMember(teamId, userIdFor(action), action.role);
        break;
      case 'updateTeamMember':
        await client.updateTeamMember(teamId, userIdFor(action), action.role);
        break;
      case 'removeTeamMember':
        await client.removeTeamMember(teamId, userIdFor(action));
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
}
