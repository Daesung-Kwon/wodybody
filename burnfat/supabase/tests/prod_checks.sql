-- Appended (by make_prod_dry_run.sh) after Migrations A+B+C inside BEGIN … ROLLBACK.
-- Reports counts/booleans only; no row data leaves the database.
-- ===== checks (counts/booleans only; no row data leaves the DB) =====
CREATE TEMP TABLE _v (k TEXT PRIMARY KEY, v TEXT) ON COMMIT DROP;
CREATE TEMP TABLE _ctx ON COMMIT DROP AS
  SELECT c.code,
         (SELECT count(*) FROM public.participants p WHERE p.challenge_id = c.id) AS n_part,
         (SELECT count(*) FROM public.weekly_logs w JOIN public.participants p ON p.id = w.participant_id WHERE p.challenge_id = c.id) AS n_logs,
         (SELECT count(*) FROM public.submissions s JOIN public.participants p ON p.id = s.participant_id WHERE p.challenge_id = c.id) AS n_subs,
         (SELECT p.id FROM public.participants p WHERE p.challenge_id = c.id ORDER BY p.created_at LIMIT 1) AS some_pid
    FROM public.challenges c
   ORDER BY (SELECT count(*) FROM public.participants p WHERE p.challenge_id = c.id) DESC
   LIMIT 1;
GRANT ALL ON _v, _ctx TO anon, service_role;

SET ROLE anon;
DO $$
DECLARE
  t TEXT; r RECORD; n BIGINT; j JSONB; v JSONB; pid UUID; ok BOOLEAN;
BEGIN
  SELECT * INTO r FROM pg_temp._ctx;
  FOREACH t IN ARRAY ARRAY['participants','submissions','weekly_logs','challenges','challenges_public'] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t);
      INSERT INTO pg_temp._v VALUES ('anon_select_' || t, 'ALLOWED (BAD)');
    EXCEPTION WHEN insufficient_privilege THEN
      INSERT INTO pg_temp._v VALUES ('anon_select_' || t, 'denied');
    END;
  END LOOP;
  BEGIN
    UPDATE public.participants SET age = age;
    INSERT INTO pg_temp._v VALUES ('anon_update_participants', 'ALLOWED (BAD)');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO pg_temp._v VALUES ('anon_update_participants', 'denied');
  END;

  -- read RPCs on the largest real room (code itself is never output)
  SELECT count(*) INTO n FROM public.get_challenge_by_code(r.code);
  INSERT INTO pg_temp._v VALUES ('rpc_challenge_rows', n::text);
  SELECT count(*) INTO n FROM public.get_room_participants(r.code);
  INSERT INTO pg_temp._v VALUES ('rpc_participants_rows_vs_actual', n || ' / ' || r.n_part);
  SELECT coalesce(sum(jsonb_array_length(submissions)),0) INTO n FROM public.get_room_participants(r.code);
  INSERT INTO pg_temp._v VALUES ('rpc_embedded_submissions_vs_actual', n || ' / ' || r.n_subs);
  SELECT count(*) INTO n FROM public.get_room_weekly_logs(r.code);
  INSERT INTO pg_temp._v VALUES ('rpc_weekly_logs_rows_vs_actual', n || ' / ' || r.n_logs);
  SELECT jsonb_agg(to_jsonb(x)) INTO j FROM public.get_room_participants(r.code) x;
  ok := coalesce(j::text, '') NOT LIKE '%device_secret_hash%' AND coalesce(j::text, '') NOT LIKE '%admin_pin_hash%';
  SELECT jsonb_agg(to_jsonb(x)) INTO j FROM public.get_room_weekly_logs(r.code) x;
  ok := ok AND coalesce(j::text, '') NOT LIKE '%device_secret_hash%';
  SELECT jsonb_agg(to_jsonb(x)) INTO j FROM public.get_challenge_by_code(r.code) x;
  ok := ok AND coalesce(j::text, '') NOT LIKE '%admin_pin_hash%';
  INSERT INTO pg_temp._v VALUES ('rpc_outputs_free_of_secrets', ok::text);
  SELECT count(*) INTO n FROM public.get_room_participants('ZZZZZZ');
  INSERT INTO pg_temp._v VALUES ('rpc_bad_code_participants', n::text);

  -- write RPCs on a synthetic room (rolled back with everything else)
  PERFORM public.create_challenge_with_pin('VALQ7X', 'rls-validation', current_date, current_date + 28, 0, NULL);
  v := public.join_challenge('valq7x', 'validator');
  pid := (v->>'id')::uuid;
  PERFORM public.update_participant_basic_info('VALQ7X', pid, 30, 'M', 170, 15);
  v := public.create_submission('VALQ7X', pid, 'start', 25.5, pid::text || '/start-1.jpg', encode(extensions.digest('val-s','sha256'),'hex'));
  INSERT INTO pg_temp._v VALUES ('rpc_create_submission', (v ? 'id' AND NOT v ? 'device_secret_hash')::text);
  v := public.create_weekly_log('VALQ7X', pid, jsonb_build_object('week_no',1,'recorded_at',current_date,'body_fat_rate',25.1), encode(extensions.digest('val-w','sha256'),'hex'));
  PERFORM public.update_weekly_log((v->>'id')::uuid, 'val-w', '{"note":"x"}'::jsonb);
  INSERT INTO pg_temp._v VALUES ('rpc_join_update_create_weeklylog_update_weeklylog', 'ok');
  BEGIN
    PERFORM public.update_participant_basic_info('VALQ7X', r.some_pid, 1, 'M', 1, 1);
    INSERT INTO pg_temp._v VALUES ('rpc_cross_room_update_blocked', 'false (BAD)');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO pg_temp._v VALUES ('rpc_cross_room_update_blocked', 'true');
  END;

  -- storage (Migration C)
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'inbody';
  INSERT INTO pg_temp._v VALUES ('anon_visible_inbody_objects', n::text);
  INSERT INTO storage.objects (bucket_id, name, version) VALUES ('inbody', pid::text || '/start-123.jpg', 'val');
  INSERT INTO pg_temp._v VALUES ('anon_upload_own_folder_plain_insert', 'ok');
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, version) VALUES ('inbody', '00000000-0000-0000-0000-000000000000/x.jpg', 'val');
    INSERT INTO pg_temp._v VALUES ('anon_upload_foreign_folder_blocked', 'false (BAD)');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO pg_temp._v VALUES ('anon_upload_foreign_folder_blocked', 'true');
  END;
  UPDATE storage.objects SET version = version WHERE bucket_id = 'inbody';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO pg_temp._v VALUES ('anon_updatable_inbody_objects', n::text);
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
DECLARE n1 BIGINT; n2 BIGINT; n3 BIGINT;
BEGIN
  SELECT count(*) INTO n1 FROM public.participants;
  SELECT count(*) INTO n2 FROM public.weekly_logs;
  SELECT count(*) INTO n3 FROM public.submissions WHERE device_secret_hash IS NOT NULL;
  INSERT INTO pg_temp._v VALUES ('service_role_reads_participants/weekly_logs/hashed_submissions', n1 || '/' || n2 || '/' || n3);
END $$;
RESET ROLE;

INSERT INTO pg_temp._v
SELECT 'remaining_policies', coalesce(string_agg(schemaname||'.'||tablename||':'||policyname, ', ' ORDER BY 1), '(none)')
  FROM pg_policies
 WHERE (schemaname = 'public' AND tablename IN ('participants','submissions','weekly_logs','challenges'))
    OR (schemaname = 'storage' AND tablename = 'objects');

SELECT json_object_agg(k, v ORDER BY k) AS validation FROM pg_temp._v;
