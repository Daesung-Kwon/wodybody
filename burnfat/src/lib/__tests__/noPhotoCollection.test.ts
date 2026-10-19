/**
 * 2026-10-19 결정: BurnFat 는 인바디 사진을 받지 않는다 (체지방률 숫자만).
 * docs/validation/week0/G3.md, docs/validation/week0/inbody-deletion.md
 *
 * 소스 어디에서도 Storage 업로드를 하거나 파일 입력을 두지 않는지 확인한다.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('no inbody photo collection', () => {
  const files = walk(SRC);

  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('nobody uploads to Supabase Storage', () => {
    const offenders = files
      .filter((f) => /\.storage\s*\.from\([^)]*\)\s*\.upload\(/.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('no file input in the app', () => {
    const offenders = files
      .filter((f) => /type=["']file["']/.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('submissions are created without an image path', () => {
    const src = stripComments(readFileSync(join(SRC, 'components', 'SubmitModal.tsx'), 'utf8'));
    expect(src).toMatch(/imagePath:\s*null/);
  });
});
