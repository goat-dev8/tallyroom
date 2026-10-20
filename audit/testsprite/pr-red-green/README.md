# PR #24: TestSprite red, then green, on the same PR (2026-10-21, Cairo UTC+3)

PR: https://github.com/goat-dev8/tallyroom/pull/24 (branch `ts-red-green`).

Commit order:
1. `b387c23`: 15 regression guards (`testsprite/regress/`, stored as `regress:bug-NNN` in project tallyroom-api) and `scripts/testsprite-regress.mjs`. App code is unchanged from main. Vercel built a preview (`scripts/` isn't on the ignore list). `red/preview-probe.txt` shows every bug present on that preview before the runs.
2. `aea3fce`: merge of the fix stack (through c8d92e4). New preview; `green/preview-probe.txt` shows the fixed values.
3. `6fbb0f7`: fail-closed TestSprite V3 gate. `7d3cec8`: production red evidence. Then this evidence commit. These are CI/docs-only changes, so Vercel skips them.

The runner bound each preview URL into the stored test code, then ran each guard once (`red/runs.jsonl`, `green/runs.jsonl`, per-test JSON, failure bundles for the reds).

| Bug | Test id | Red run (preview of b387c23, bugs present) | Green run (preview of aea3fce, fixes) |
|---|---|---|---|
| BUG-009 | 2baa46fc-8615-4c7f-ab83-e33806ae4190 | 5f241c35-f24f-4268-9df4-0d683e77a608 failed (assertion) | 679af9f0-d3ec-44a4-9cfa-3a41c71b974a passed |
| BUG-010 | 640adff8-dc91-478d-9f41-f6d90424e920 | 7f4763d9-2ec2-469f-adc3-69c62a098319 failed (assertion) | 04794c80-7dcd-4017-b195-2ecfc6060980 passed |
| BUG-011 | 8b235a50-546d-406a-8867-08ab87ee56e2 | bf82515b-662f-46c5-af74-c37dd4189050 failed (assertion) | b9424bad-f1eb-4382-8ee5-78834782bc18 passed |
| BUG-012 | 9104fe07-c858-4e03-b179-14dd041dcc9e | 7b2f54b9-3260-49c2-aa4b-6be2a29980bb failed (assertion) | 2c4db206-aec0-4443-9172-68502f963240 passed |
| BUG-013 | 2c7d0b96-c94f-45e9-8d8d-9792630a1a74 | f62ed6b1-2f5e-4646-a1aa-19570cb1b424 failed (assertion) | f36df358-5b3f-4a31-8aff-6ced2ec32029 passed |
| BUG-014 | baf3ae70-4438-4666-822a-b90b46a06d34 | f4626c2f-1c1d-48fa-92f2-d9e323040a67 failed (assertion) | 9d6494a5-331c-415c-9244-63681ea46e8b passed |
| BUG-015 | 84802352-e942-4e7b-9f93-ef5c1a069f70 | 083d72b2-335d-4c3d-a80d-feae987d2ffa failed (assertion) | 26183258-85a1-4031-99d0-eedad5d28a5b passed |
| BUG-016 | 3e46dd98-f996-42a2-9acd-037ed87d1435 | 0195f901-4b55-4a1e-9af3-0a21d10f38e3 failed (assertion) | fc9c0c78-78eb-4fb2-8978-6ff5afb83df2 passed |
| BUG-018 | cbdc897f-1356-4f5f-bb37-e5b4f0c56a8f | c3a79747-7068-4633-87d2-e2ab27c09e78 failed (assertion) | 988af040-334b-41f0-a30f-a865f099f671 passed |
| BUG-019 | 2c3b8c12-b610-49ef-a1c6-e730cd44564c | bf47297d-ed7b-44a6-aa3d-d9c5f1f6718a failed (assertion) | 35646e80-d514-43c3-8e50-eb37d21fa688 passed |
| BUG-021 | aa98bbd6-0987-4ec8-9c9f-564c3de89f9f | 9fb36a7c-c699-49b5-ae54-2e00a84132f5 failed (assertion) | f85fd773-3f30-4e0f-b9aa-0a5057c7213b passed |
| BUG-024 | 28a6c190-394e-48b1-ba0a-ae78b929d580 | 2797990e-a1bc-4bac-9ab8-3d29b9551f4a failed (assertion) | 0f552ccd-b4f5-46b3-9912-8114032c3cf3 passed |
| BUG-028 | b95fddab-e854-413b-a0e5-1854b13fed33 | b956aa34-1c43-4508-8686-1c4836b03eaa failed (assertion) | 71575198-20b1-4ca0-8871-d27d63d185c2 passed |
| BUG-029 | 2b7bbed5-2a37-4c8c-a8c5-e402af8529a1 | b50d72fa-c97f-4842-9400-7663d9cbaebc failed (assertion) | b44fd754-c875-4bb8-86b5-f0b16fa4da86 passed |
| BUG-030 | abef2d38-2f4d-402e-bf1c-44ed448dc370 | 62ff1c0e-7862-4635-8d62-03aa0afe4067 failed (assertion) | 15c49a1e-13e6-4c00-af25-59f61197606f passed |

PR checks from our CLI job:
- b387c23: `testsprite-cli` success; it ran no tests, because only `testsprite/` and `scripts/` changed (filter rule). See `ci-testsprite-cli-b387c23.txt`.
- aea3fce: `testsprite-cli` 22/22 `api:` passed on the fixed preview. It skipped the 15 `regress:` tests, as designed. See `ci-testsprite-cli-aea3fce.txt`.

The PR's CLI check doesn't show the red. The reds are the CLI runs above, against the same PR's preview. TestSprite GitHub App PR triggers were off for this window (momo's choice, to stay within credits), so there is no `TestSprite V3` status. The `testsprite-v3-gate` job therefore fails closed on these heads.

Credits: 16 → 13 (red, 15 × 0.2) → 5.6 (green 15 × 0.2 = 3.0, plus the CI job's 22 × 0.2 = 4.4).

## The latest red `testsprite-cli` check on eed4977 is a production fallback, not a PR failure

The eed4977 push changed only CI files and evidence, so Vercel skipped the preview. The old workflow then ran the
whole PR's `api:` selection against production (https://tallyroom-rosy.vercel.app). Its notice said production "runs
this PR's app code", which was false here: production is main, and this PR changes the app.

Result: 20/22 passed, 2 failed (run f0a92ee7-6ca1-4dcb-977a-306d610978cf, JUnit in `ci-testsprite-cli-eed4977-junit.xml`):
- `api:health`: expects `burlington-2009` in `elections`; production lists only maine-2018-cd2, alaska-2022, nyc-2021.
- `api:elections-list`: the same missing election (added by this PR's stack, not deployed).

Both failures come from testing the wrong deployment, not from this PR's code, which passed 22/22 on its own preview
at aea3fce. The run cost 4.4 credits and took the balance from 5.6 to 1.2, under the 3-credit reserve.

Fix, committed locally and not pushed: `scripts/testsprite-preview.mjs` with `test/testsprite-preview.test.ts`.
- The CLI job runs only against the commit's own preview. If the preview was skipped, is missing, still pending, or
  failed, the job says "no preview, not run" and exits without running tests. GitHub has no neutral job conclusion,
  so the check shows success and the summary says not run.
- Suites are picked from the latest push's diff (`before..head`) on synchronize. Opened, reopened and force-pushed PRs
  use the whole PR diff.
- Known limit: if a head's run was cancelled, the next CI-only push won't re-test that head's app changes.


## Note (2026-10-21): are the greens real?

All 15 green result files have 0 steps, an empty trace and a null targetUrl. That is the normal shape of a passing backend run: the reds also have 0 steps, and only an assertion error produces a trace. Red and green ran the same stored code (the same `codeVersion`), with the preview URL inside the code. See `GREEN-VERIFICATION.md` for the evidence, the remaining weakness, and a 3–6 credit plan to remove it.
