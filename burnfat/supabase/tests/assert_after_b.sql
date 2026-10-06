-- After Migration B: no direct table access for anon; RPCs scoped to one room.
SET ROLE anon;

-- 1) Direct table access is denied (permission denied = 42501).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['participants', 'submissions', 'weekly_logs', 'challenges', 'challenges_public'] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t);
      RAISE EXCEPTION 'B: anon can still SELECT %', t USING ERRCODE = 'P0001';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
  BEGIN
    UPDATE public.participants SET age = 1;
    RAISE EXCEPTION 'B: anon can still UPDATE participants' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.participants (challenge_id, nickname) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'evil');
    RAISE EXCEPTION 'B: anon can still INSERT participants' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.weekly_logs (participant_id, week_no, recorded_at) VALUES ('aaaaaaaa-1111-0000-0000-000000000001', 9, '2026-10-01');
    RAISE EXCEPTION 'B: anon can still INSERT weekly_logs' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public._challenge_id_for_code('ROOMA1');
    RAISE EXCEPTION 'B: anon can call internal helper' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'after B: direct table access denied for anon';
END $$;

-- 2) Read RPCs: right room only, no secrets.
DO $$
DECLARE
  v_json JSONB;
BEGIN
  ASSERT (SELECT count(*) FROM get_challenge_by_code('ROOMA1')) = 1, 'B: challenge by valid code';
  ASSERT (SELECT count(*) FROM get_challenge_by_code('NOPE99')) = 0, 'B: unknown code returns nothing';
  ASSERT (SELECT count(*) FROM get_challenge_by_code(NULL)) = 0, 'B: NULL code returns nothing';
  ASSERT (SELECT has_admin_pin FROM get_challenge_by_code('ROOMB2')), 'B: has_admin_pin exposed as boolean';

  ASSERT (SELECT count(*) FROM get_room_participants('ROOMA1')) = 2, 'B: room A has 2 participants';
  ASSERT (SELECT count(*) FROM get_room_participants('ROOMB2')) = 1, 'B: room B has 1 participant';
  ASSERT (SELECT count(*) FROM get_room_participants('NOPE99')) = 0, 'B: unknown code => no participants';
  ASSERT NOT EXISTS (SELECT 1 FROM get_room_participants('ROOMA1') WHERE challenge_id <> 'aaaaaaaa-0000-0000-0000-000000000001'), 'B: no cross-room leak';

  SELECT jsonb_agg(to_jsonb(r)) INTO v_json FROM get_room_participants('ROOMA1') r;
  ASSERT v_json::text NOT LIKE '%device_secret_hash%', 'B: participants RPC leaks device_secret_hash';
  ASSERT v_json::text NOT LIKE '%admin_pin_hash%', 'B: participants RPC leaks admin_pin_hash';
  ASSERT (SELECT jsonb_array_length(submissions) FROM get_room_participants('ROOMA1') WHERE nickname = 'alice') = 1, 'B: submissions embedded';

  SELECT jsonb_agg(to_jsonb(r)) INTO v_json FROM get_room_weekly_logs('ROOMA1') r;
  ASSERT jsonb_array_length(v_json) = 1, 'B: room A has 1 weekly log';
  ASSERT v_json::text NOT LIKE '%device_secret_hash%', 'B: weekly logs RPC leaks device_secret_hash';
  ASSERT (SELECT count(*) FROM get_room_weekly_logs('ROOMA1', 'bbbbbbbb-1111-0000-0000-000000000001')) = 0, 'B: other room participant filtered out';
  ASSERT (SELECT count(*) FROM get_room_weekly_logs('ROOMA1', 'aaaaaaaa-1111-0000-0000-000000000001')) = 1, 'B: participant filter';

  SELECT jsonb_agg(to_jsonb(r)) INTO v_json FROM get_challenge_by_code('ROOMB2') r;
  ASSERT v_json::text NOT LIKE '%admin_pin_hash%', 'B: challenge RPC leaks admin_pin_hash';
  RAISE NOTICE 'after B: read RPCs scoped + no secrets';
END $$;

-- 3) Write RPCs.
DO $$
DECLARE
  v JSONB;
  v_id UUID;
BEGIN
  v := join_challenge('rooma1', '  carol  ');
  ASSERT v->>'nickname' = 'carol', 'B: join trims nickname';
  ASSERT v->>'challenge_id' = 'aaaaaaaa-0000-0000-0000-000000000001', 'B: join lands in the coded room';
  v_id := (v->>'id')::uuid;

  BEGIN
    PERFORM join_challenge('ROOMA1', 'carol');
    RAISE EXCEPTION 'B: duplicate nickname accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN unique_violation THEN
    ASSERT SQLERRM LIKE '%unique%', 'B: duplicate message must contain "unique" (UI relies on it)';
  END;
  BEGIN
    PERFORM join_challenge('NOPE99', 'mallory');
    RAISE EXCEPTION 'B: join with bad code accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;

  v := update_participant_basic_info('ROOMA1', v_id, 33, 'F', 160.5, 20.0);
  ASSERT (v->>'age')::int = 33 AND v->>'gender' = 'F', 'B: basic info updated';
  v := update_participant_basic_info('ROOMA1', v_id, NULL, NULL, NULL, NULL);
  ASSERT v->'age' = 'null'::jsonb, 'B: NULL clears basic info';
  BEGIN
    PERFORM update_participant_basic_info('ROOMA1', 'bbbbbbbb-1111-0000-0000-000000000001', 1, 'M', 1, 1);
    RAISE EXCEPTION 'B: cross-room basic info update accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  v := create_submission('ROOMA1', v_id, 'start', 30.2, v_id::text || '/start-123.jpg',
                         encode(extensions.digest('s-carol', 'sha256'), 'hex'));
  ASSERT v ? 'id' AND NOT v ? 'device_secret_hash', 'B: create_submission returns row without secret';
  BEGIN
    PERFORM create_submission('ROOMA1', v_id, 'end', 29.0, 'bbbbbbbb-1111-0000-0000-000000000001/start-1.jpg', NULL);
    RAISE EXCEPTION 'B: foreign image path accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM create_submission('ROOMA1', 'bbbbbbbb-1111-0000-0000-000000000001', 'end', 20.0, NULL, NULL);
    RAISE EXCEPTION 'B: cross-room submission accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM create_submission('ROOMA1', v_id, 'start', 31.0, NULL, NULL);
    RAISE EXCEPTION 'B: duplicate start submission accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  v := create_weekly_log('ROOMA1', v_id,
         jsonb_build_object('week_no', 1, 'recorded_at', '2026-09-07', 'weight_kg', 55.5,
                            'body_fat_rate', 29.9, 'exercise_count', 3, 'sleep_hours', 6.5,
                            'diet_quality', 'normal', 'note', 'hi'),
         encode(extensions.digest('w-carol', 'sha256'), 'hex'));
  ASSERT v ? 'id' AND NOT v ? 'device_secret_hash', 'B: create_weekly_log returns row without secret';
  ASSERT (v->>'exercise_count')::int = 3, 'B: weekly log fields stored';

  -- existing device-secret RPC still works on rows created through the new RPC
  PERFORM update_weekly_log((v->>'id')::uuid, 'w-carol', '{"note": "edited"}'::jsonb);
  ASSERT (SELECT note FROM get_room_weekly_logs('ROOMA1', v_id)) = 'edited', 'B: update_weekly_log still works';
  BEGIN
    PERFORM update_weekly_log((v->>'id')::uuid, 'wrong-secret', '{"note": "x"}'::jsonb);
    RAISE EXCEPTION 'B: update_weekly_log accepted wrong secret' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM create_weekly_log('ROOMA1', 'bbbbbbbb-1111-0000-0000-000000000001', '{"week_no": 2, "recorded_at": "2026-09-14"}'::jsonb, NULL);
    RAISE EXCEPTION 'B: cross-room weekly log accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- challenge RPCs from earlier migrations keep working for anon
  PERFORM create_challenge_with_pin('NEWRM3', 'New', '2026-10-01', '2026-11-01', 0, NULL);
  ASSERT (SELECT count(*) FROM get_challenge_by_code('NEWRM3')) = 1, 'B: create_challenge_with_pin still works';
  BEGIN
    PERFORM create_challenge_with_pin('NEWRM3', 'Dup', '2026-10-01', '2026-11-01', 0, NULL);
    RAISE EXCEPTION 'B: duplicate code accepted' USING ERRCODE = 'P0001';
  EXCEPTION WHEN unique_violation THEN NULL;  -- frontend retries with a new code on 23505
  END;
  ASSERT verify_admin_pin('bbbbbbbb-0000-0000-0000-000000000001', '1234'), 'B: verify_admin_pin still works';
  PERFORM update_challenge_admin('bbbbbbbb-0000-0000-0000-000000000001', '1234', p_ranking_unlocked => true);
  ASSERT (SELECT ranking_unlocked FROM get_challenge_by_code('ROOMB2')), 'B: update_challenge_admin still works';
  RAISE NOTICE 'after B: write RPCs OK';
END $$;
RESET ROLE;

-- 4) service_role (Railway backend / Edge Function) still reads everything.
SET ROLE service_role;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM participants) >= 4, 'B: service_role must still read participants';
  ASSERT (SELECT count(*) FROM submissions WHERE device_secret_hash IS NOT NULL) >= 2, 'B: service_role reads device_secret_hash (backend ownership checks)';
  ASSERT (SELECT count(*) FROM weekly_logs) >= 3, 'B: service_role reads weekly_logs';
  ASSERT (SELECT count(*) FROM challenges) >= 3, 'B: service_role reads challenges';
  RAISE NOTICE 'after B: service_role unaffected';
END $$;
RESET ROLE;

-- 5) No policy left on the data tables; none for anon on challenges.
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                       AND tablename IN ('participants', 'submissions', 'weekly_logs')), 'B: leftover policies on data tables';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenges'
                       AND roles && ARRAY['public', 'anon', 'authenticated']::name[]), 'B: leftover anon policies on challenges';
  RAISE NOTICE 'after B: no anon policies left';
END $$;
