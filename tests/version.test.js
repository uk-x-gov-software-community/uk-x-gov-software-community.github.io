import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('pinned Umami version', () => {
  const tag = read('UMAMI_VERSION').trim();

  it('is a release tag', () => {
    expect(tag).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('matches the image used by docker-compose.yml', () => {
    const image = read('docker-compose.yml').match(/image: umamisoftware\/umami:(\S+)/)?.[1];
    expect(`v${image}`).toBe(tag);
  });
});
