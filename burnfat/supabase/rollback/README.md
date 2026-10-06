# BurnFat RLS lockdown — rollout & rollback runbook (2026-10)

Project ref `nvmwkyedangfdeggawdm`. Pre-change state captured 2026-10-06 KST (policies + grants
are reproduced verbatim in the rollback files' headers).

## Rollout (strict order)

| # | Step | Prod DB write? | Gate before next step |
|---|------|----------------|-----------------------|
| 1 | Apply **Migration A** `20261006000001_room_scoped_rpcs.sql` (additive RPCs; drops two legacy storage policy names that are already gone) | **yes** | `select count(*) from get_challenge_by_code('<real code>')` returns 1 as anon |
| 2 | Merge the PR → Vercel deploys burnfat.wodybody.com **and** www.wodybody.com (embeds `../burnfat/src`); Railway deploys backend (`/api/burnfat/images/sign`) | no | Both sites load a room, join/basic-info/weekly-log/submit work; "보기" opens an image and the network tab shows `images/sign` → 200 |
| 3 | Apply **Migration B** `20261006000002_lockdown_room_reads.sql` (drop anon table policies + revoke grants) | **yes** | Room page still loads on both sites; anon `GET /rest/v1/participants` → 401/permission denied |
| 4 | Apply **Migration C** `20261006000003_inbody_storage_narrowing.sql` (storage) | **yes** | Image view still works (backend signing); new proof upload works; anon `storage list inbody` → empty |

A must precede step 2 (the new frontend calls the RPCs). B and C are independent of each
other, but both require step 2. Wait for old tabs/bundles to age out (minutes) before B.

## Rollback

Run the file for the step you are undoing, newest first. Each is a single transaction.

| Undo | File | Effect |
|------|------|--------|
| C | `20261006000003_inbody_storage_narrowing.rollback.sql` | Restores the 3 bucket-wide anon policies (select/insert/update) exactly as captured; drops helper fn |
| B | `20261006000002_lockdown_room_reads.rollback.sql` | Restores the 9 anon `USING (true)` policies + table/column grants exactly as captured (**re-opens the exposure**) |
| A | `20261006000001_room_scoped_rpcs.rollback.sql` | Drops the new RPCs — only after B is rolled back **and** the frontend is reverted |

Frontend/backend: revert the merge commit (Vercel/Railway auto-deploy from `main`). The new
frontend keeps working with B/C rolled back (RPCs are independent of table policies), so a
DB-only rollback of B or C needs no code revert.

The pre-existing legacy storage policies ("Allow anonymous read inbody" / "Allow anonymous
upload inbody", dropped 2026-10-06 before this work) have their own rollback outside the repo:
`/workspace/sbbase/rollback_inbody_policies.sql`.
