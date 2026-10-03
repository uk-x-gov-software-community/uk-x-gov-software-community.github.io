#!/usr/bin/env node
// Make Umami's users and team match access.yml.
//
//   npm run access:check                  validate access.yml only (no network; runs in CI)
//   npm run access:sync                   show what would change
//   npm run access:sync -- --apply        make the changes
//   npm run access:sync -- --apply --prune  also remove team members not in access.yml
//
// Needs UMAMI_URL and UMAMI_USERNAME (a global admin). UMAMI_PASSWORD and UMAMI_TOTP are
// prompted for when not set. Run it on your own machine, not in CI: it prints one-off
// passwords for any users it creates.

import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { describeAction, parseAccess, planChanges } from '../src/access.mjs';
import { applyPlan, readCurrentState } from '../src/apply.mjs';
import { createUmamiClient } from '../src/umami-client.mjs';

const { values: args } = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    apply: { type: 'boolean', default: false },
    prune: { type: 'boolean', default: false },
    file: { type: 'string', default: 'access.yml' },
  },
});

async function ask(question, { hidden = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    // Echo the prompt but not what is typed.
    rl._writeToOutput = text => {
      if (text.startsWith(question)) {
        process.stdout.write(text);
      }
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) {
    process.stdout.write('\n');
  }
  return answer.trim();
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} first (see docs/access.md)`);
    process.exit(2);
  }
  return value;
}

async function main() {
  const { config, errors, warnings } = parseAccess(await readFile(args.file, 'utf8'));
  warnings.forEach(w => console.warn(`warning: ${w}`));
  if (errors.length) {
    errors.forEach(e => console.error(`error: ${e}`));
    process.exit(1);
  }

  const total = config.admins.length + config.managers.length + config.viewers.length;
  console.log(`${args.file} is valid: ${config.admins.length} admins, ${config.managers.length} managers, ${config.viewers.length} viewers (${total} people)`);
  if (args.check) {
    return;
  }

  const client = createUmamiClient({ baseUrl: requireEnv('UMAMI_URL') });
  const username = requireEnv('UMAMI_USERNAME');
  const password = process.env.UMAMI_PASSWORD || (await ask(`Umami password for ${username}: `, { hidden: true }));

  let { user, partialToken } = await client.login(username, password);
  if (partialToken) {
    const code = process.env.UMAMI_TOTP || (await ask('Two-factor code: '));
    ({ user } = await client.verifyTwoFactor(partialToken, code));
  }
  if (!user.isAdmin) {
    console.error(`${username} is not a global Umami admin`);
    process.exit(2);
  }

  const current = await readCurrentState(client, { id: user.id, username: user.username }, config.team);
  const { actions, notes } = planChanges(config, current, { prune: args.prune });

  notes.forEach(n => console.log(`note: ${n}`));
  if (!actions.length) {
    console.log('Umami already matches access.yml');
    return;
  }

  if (!args.apply) {
    console.log('\nWould make these changes (re-run with --apply):');
    actions.forEach(a => console.log(`- ${describeAction(a)}`));
    return;
  }

  console.log('\nApplying:');
  const created = await applyPlan(client, current, actions, { log: line => console.log(line) });

  printCreated(created);
  console.log('\nDone');
}

function printCreated(created = []) {
  if (!created.length) {
    return;
  }
  console.log('\nNew users. Send each person their password over a private channel and ask them to');
  console.log('change it in their profile and turn on two-factor authentication:');
  created.forEach(c => console.log(`  ${c.username}  ${c.password}`));
}

main().catch(e => {
  console.error(`\n${e.message}`);
  printCreated(e.created);
  if (e.created?.length) {
    console.error('\nFix the problem, then run the sync again to finish the remaining changes.');
  }
  process.exit(1);
});
