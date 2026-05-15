import { describe, it, expect } from 'vitest';
import {
  getChallengePhase,
  getDaysUntilEnd,
  getDaysUntilStart,
  getDDayDisplay,
} from './challengeSchedule';

const START = '2026-05-04';
const END = '2026-06-01';

describe('getChallengePhase', () => {
  it('시작 전 / 진행 중 / 종료 후를 구분', () => {
    expect(getChallengePhase(START, END, new Date('2026-05-01'))).toBe('before');
    expect(getChallengePhase(START, END, new Date('2026-05-15'))).toBe('active');
    expect(getChallengePhase(START, END, new Date('2026-06-10'))).toBe('ended');
  });

  it('시작일·종료일 당일은 active', () => {
    expect(getChallengePhase(START, END, new Date(START))).toBe('active');
    expect(getChallengePhase(START, END, new Date(END))).toBe('active');
  });
});

describe('getDaysUntilEnd / getDaysUntilStart', () => {
  it('종료일까지 남은 일수 — 당일 0, 지난 뒤 음수', () => {
    expect(getDaysUntilEnd(END, new Date('2026-05-29'))).toBe(3);
    expect(getDaysUntilEnd(END, new Date(END))).toBe(0);
    expect(getDaysUntilEnd(END, new Date('2026-06-03'))).toBe(-2);
  });

  it('시작일까지 남은 일수', () => {
    expect(getDaysUntilStart(START, new Date('2026-05-01'))).toBe(3);
    expect(getDaysUntilStart(START, new Date(START))).toBe(0);
  });

  it('빈 날짜는 null', () => {
    expect(getDaysUntilEnd('', new Date())).toBeNull();
    expect(getDaysUntilStart('', new Date())).toBeNull();
  });
});

describe('getDDayDisplay', () => {
  it('시작 전 — 시작 D-N, info 톤', () => {
    const d = getDDayDisplay(START, END, new Date('2026-05-01'));
    expect(d.label).toBe('시작 D-3');
    expect(d.tone).toBe('info');
    expect(d.endingSoon).toBe(false);
  });

  it('종료 3일 전 — D-3, warning 톤, 모달 미트리거', () => {
    const d = getDDayDisplay(START, END, new Date('2026-05-29'));
    expect(d.label).toBe('D-3');
    expect(d.tone).toBe('warning');
    expect(d.endingSoon).toBe(false);
  });

  it('종료 1일 전 — D-1, 종료 임박(모달 트리거)', () => {
    const d = getDDayDisplay(START, END, new Date('2026-05-31'));
    expect(d.label).toBe('D-1');
    expect(d.endingSoon).toBe(true);
  });

  it('종료 당일 — D-DAY, 종료 임박', () => {
    const d = getDDayDisplay(START, END, new Date(END));
    expect(d.label).toBe('D-DAY');
    expect(d.tone).toBe('warning');
    expect(d.endingSoon).toBe(true);
  });

  it('종료 후 — 종료, ended 톤', () => {
    const d = getDDayDisplay(START, END, new Date('2026-06-10'));
    expect(d.label).toBe('종료');
    expect(d.tone).toBe('ended');
    expect(d.endingSoon).toBe(false);
  });

  it('여유 있는 진행 중 — D-N, default 톤', () => {
    const d = getDDayDisplay(START, END, new Date('2026-05-10'));
    expect(d.tone).toBe('default');
    expect(d.endingSoon).toBe(false);
  });
});
