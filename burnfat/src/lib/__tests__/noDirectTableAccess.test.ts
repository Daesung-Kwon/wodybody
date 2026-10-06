/**
 * Regression guard for the RLS lockdown (migrations 20261006000001..3).
 * After Migration B the anon key has NO privileges on these tables, so any direct
 * `.from('<table>')` call would silently return nothing / fail in production.
 * All access must go through src/lib/roomApi.ts (room-code RPCs).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');
const LOCKED_TABLES = ['participants', 'submissions', 'weekly_logs', 'challenges', 'challenges_public'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('no direct table access with the anon key', () => {
  const files = walk(SRC);

  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(LOCKED_TABLES)('nobody calls .from(%j)', (table) => {
    const re = new RegExp(`\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)`);
    const offenders = files
      .filter((f) => re.test(readFileSync(f, 'utf8').replace(/^\s*(\*|\/\/).*$/gm, '')))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('inbody uploads never use upsert:true (anon UPDATE on storage is removed)', () => {
    const offenders = files
      .filter((f) => /upsert:\s*true/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
