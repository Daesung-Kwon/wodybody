-- Test fixtures: two rooms. Runs as superuser. Ids are fixed so assertions can refer to them.
INSERT INTO challenges (id, code, title, start_date, end_date, stake_amount)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'ROOMA1', 'Room A', '2026-09-01', '2026-10-31', 10000),
       ('bbbbbbbb-0000-0000-0000-000000000001', 'ROOMB2', 'Room B', '2026-09-01', '2026-10-31', 10000);
UPDATE challenges SET admin_pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 4))
 WHERE code = 'ROOMB2';

INSERT INTO participants (id, challenge_id, nickname, age, gender, height_cm, target_body_fat)
VALUES ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'alice', 30, 'F', 165.0, 22.0),
       ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'andy',  41, 'M', 178.0, 15.0),
       ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'bob',   35, 'M', 180.0, 14.0);

INSERT INTO submissions (participant_id, type, body_fat_rate, image_url, device_secret_hash)
VALUES ('aaaaaaaa-1111-0000-0000-000000000001', 'start', 28.5,
        'aaaaaaaa-1111-0000-0000-000000000001/start-1.jpg', encode(extensions.digest('secret-a', 'sha256'), 'hex')),
       ('bbbbbbbb-1111-0000-0000-000000000001', 'start', 25.0,
        'bbbbbbbb-1111-0000-0000-000000000001/start-1.jpg', encode(extensions.digest('secret-b', 'sha256'), 'hex'));

INSERT INTO weekly_logs (id, participant_id, week_no, recorded_at, weight_kg, body_fat_rate, device_secret_hash)
VALUES ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', 1, '2026-09-07', 60.1, 28.0,
        encode(extensions.digest('secret-wa', 'sha256'), 'hex')),
       ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001', 1, '2026-09-07', 82.0, 24.5,
        encode(extensions.digest('secret-wb', 'sha256'), 'hex'));

INSERT INTO storage.objects (bucket_id, name, version)
VALUES ('inbody', 'aaaaaaaa-1111-0000-0000-000000000001/start-1.jpg', '1'),
       ('inbody', 'bbbbbbbb-1111-0000-0000-000000000001/start-1.jpg', '1');
