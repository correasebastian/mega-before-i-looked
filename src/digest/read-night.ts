import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus } from './types.js';

type Run = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

function isRun(value: unknown): value is Run {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.at === 'string' && Number.isFinite(Date.parse(record.at))
    && typeof record.job === 'string'
    && (record.status === 'ok' || record.status === 'retry' || record.status === 'fail')
    && (record.owner === null || typeof record.owner === 'string')
    && (record.error === undefined || typeof record.error === 'string');
}

function parseRun(line: string): Run | null {
  try {
    const record: unknown = JSON.parse(line);
    return isRun(record) ? record : null;
  } catch {
    return null;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let contents: string;
  try {
    contents = readFileSync(join(runsDir, night + '.jsonl'), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }

  const digest: NightDigest = { rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } };
  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const events: Run[] = [];
  for (const line of lines) {
    const event = parseRun(line);
    if (event) events.push(event);
    else digest.badLines++;
  }

  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const jobs = new Map<string, DigestRow>();
  for (const event of events) {
    const row = jobs.get(event.job) ?? {
      job: event.job, owner: null, runs: 0, retries: 0, hasFailure: false,
      lastStatus: event.status, lastError: null, firstAt: event.at, lastAt: event.at,
    };
    row.runs++;
    if (event.status === 'retry') row.retries++;
    if (event.status === 'fail') row.hasFailure = true;
    row.owner = event.owner;
    row.lastAt = event.at;
    row.lastStatus = event.status;
    if (event.error !== undefined) row.lastError = event.error;
    digest.counts[event.status]++;
    jobs.set(event.job, row);
  }

  digest.rows = [...jobs.values()].sort((a, b) => a.job.localeCompare(b.job, 'en'));
  return digest;
};
