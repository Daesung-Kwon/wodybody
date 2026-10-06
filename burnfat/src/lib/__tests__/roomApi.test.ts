import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../supabase';
import {
  createSubmission,
  createWeeklyLog,
  fetchChallengeByCode,
  fetchRoomParticipants,
  joinChallenge,
  normalizeRoomCode,
  RoomApiError,
  updateParticipantBasicInfo,
} from '../roomApi';

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe('roomApi', () => {
  it('normalizeRoomCode trims + upper-cases', () => {
    expect(normalizeRoomCode('  ab12cd ')).toBe('AB12CD');
  });

  it('fetchChallengeByCode → get_challenge_by_code, first row or null', async () => {
    rpcMock.mockResolvedValueOnce({ data: [{ id: 'c1', code: 'AB12CD' }], error: null });
    await expect(fetchChallengeByCode('ab12cd')).resolves.toMatchObject({ id: 'c1' });
    expect(rpcMock).toHaveBeenCalledWith('get_challenge_by_code', { p_code: 'AB12CD' });

    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchChallengeByCode('NOPE99')).resolves.toBeNull();
  });

  it('fetchRoomParticipants → get_room_participants, always has a submissions array', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        { id: 'p1', submissions: [{ id: 's1' }] },
        { id: 'p2', submissions: null },
      ],
      error: null,
    });
    const rows = await fetchRoomParticipants('AB12CD');
    expect(rows[0].submissions).toHaveLength(1);
    expect(rows[1].submissions).toEqual([]);
    expect(rpcMock).toHaveBeenCalledWith('get_room_participants', { p_code: 'AB12CD' });
  });

  it('joinChallenge surfaces the unique-violation message (UI matches on "unique")', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "participants_challenge_id_nickname_key"', code: '23505' },
    });
    const err = await joinChallenge('AB12CD', 'kim').catch((e) => e);
    expect(err).toBeInstanceOf(RoomApiError);
    expect(err.message).toContain('unique');
    expect(err.code).toBe('23505');
    expect(rpcMock).toHaveBeenCalledWith('join_challenge', { p_code: 'AB12CD', p_nickname: 'kim' });
  });

  it('updateParticipantBasicInfo passes explicit NULLs (clearing a field)', async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: 'p1' }, error: null });
    await updateParticipantBasicInfo('ab12cd', 'p1', {
      age: null,
      gender: 'F',
      height_cm: 160,
      target_body_fat: null,
    });
    expect(rpcMock).toHaveBeenCalledWith('update_participant_basic_info', {
      p_code: 'AB12CD',
      p_participant_id: 'p1',
      p_age: null,
      p_gender: 'F',
      p_height_cm: 160,
      p_target_body_fat: null,
    });
  });

  it('createSubmission / createWeeklyLog map to the room-code RPCs', async () => {
    rpcMock.mockResolvedValue({ data: { id: 'x' }, error: null });
    await createSubmission('ab12cd', {
      participantId: 'p1',
      type: 'start',
      bodyFatRate: 25.5,
      imagePath: 'p1/start-1.jpg',
      deviceSecretHash: 'a'.repeat(64),
    });
    expect(rpcMock).toHaveBeenCalledWith('create_submission', {
      p_code: 'AB12CD',
      p_participant_id: 'p1',
      p_type: 'start',
      p_body_fat_rate: 25.5,
      p_image_path: 'p1/start-1.jpg',
      p_device_secret_hash: 'a'.repeat(64),
    });
    await createWeeklyLog(
      'AB12CD',
      'p1',
      {
        week_no: 1,
        recorded_at: '2026-10-01',
        age: null,
        gender: null,
        weight_kg: null,
        height_cm: null,
        body_fat_rate: 25,
        exercise_count: null,
        sleep_hours: null,
        diet_quality: null,
        note: null,
      },
      'b'.repeat(64)
    );
    expect(rpcMock).toHaveBeenLastCalledWith(
      'create_weekly_log',
      expect.objectContaining({ p_code: 'AB12CD', p_participant_id: 'p1', p_device_secret_hash: 'b'.repeat(64) })
    );
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('errors become RoomApiError with fallback message', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const err = await createSubmission('AB12CD', {
      participantId: 'p9',
      type: 'end',
      bodyFatRate: 1,
      imagePath: null,
      deviceSecretHash: 'c'.repeat(64),
    }).catch((e) => e);
    expect(err).toBeInstanceOf(RoomApiError);
    expect(err.code).toBe('42501');
    expect(err.message).toBeTruthy();
  });
});
