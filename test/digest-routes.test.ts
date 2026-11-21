import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const night = '2026-10-28';
function event(job: string) {
  return JSON.stringify({ at: night + 'T22:00:00+01:00', job, status: 'ok', owner: null });
}

describe('digest routes', () => {
  let runsDir: string;
  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  });
  afterEach(() => {
    rmSync(runsDir, { recursive: true });
  });

  function requestNight(contents?: string) {
    if (contents !== undefined) writeFileSync(join(runsDir, night + '.jsonl'), contents);
    const app = createApp({ runsDir, adapter: 'shim', installed: night, beatEverySeconds: 60 });
    return Promise.all([app.request('/digest/' + night), app.request('/api/digest/' + night)]);
  }

  it('serves the same jobs in sorted order on the page and API', async () => {
    const [page, api] = await requestNight([event('zebra'), event('alpha')].join('\n'));
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const rows = await api.json() as DigestRow[];
    const jobs = rows.map(row => row.job);
    expect(jobs).toEqual(['alpha', 'zebra']);
    const headings = (await page.text()).matchAll(/<th scope="row">([^<]*)<\/th>/g);
    expect(Array.from(headings, match => match[1])).toEqual(jobs);
  });

  it('returns 404 on both routes for a missing night', async () => {
    const [page, api] = await requestNight();
    expect(page.status).toBe(404);
    expect(api.status).toBe(404);
  });

  it('serves an empty night on both routes', async () => {
    const [page, api] = await requestNight('');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(await api.json()).toEqual([]);
  });

  it('reports a malformed line and serves the valid job after it', async () => {
    const [page, api] = await requestNight(['{broken', event('backup')].join('\n'));
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('1 malformed line');
    expect(html).toContain('<th scope="row">backup</th>');
    expect(await api.json()).toMatchObject([{ job: 'backup' }]);
  });
});
