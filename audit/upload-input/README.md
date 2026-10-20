# fix/upload-input: BUG-009..011 (red→green, local)

The bugs came from surviving parse.ts mutants (Stryker) and a local API probe (`npm run dev`, not production).
- Red: `red-vitest-main.txt` (BUG-009 on main) and `red-api-local.txt` (BUG-010/011 before the fix).
- Green: `green-vitest-full.txt` (153/153), `green-api-local.txt`, and `green-testsprite-py-local.txt` (`testsprite/backend/api_upload_input.py` run against localhost).
- Still to do: register `api:upload-input` in TestSprite and verify it on the PR preview once credits are topped up.

Probe findings that are not bugs (decisions for momo):
- There are no CORS headers. A browser page on another origin can't read `/api/tabulate` results, while curl and servers can. Nothing documents cross-origin use.
- `application/xml` and other unknown types fall through to the CSV parser, which answers with a confusing 422 `CSV_FORMAT_AMBIGUOUS`. A 415 would be clearer.
- The JSON body is read fully before the size check (`req.text()`). There is no early 413 from `Content-Length`. The platform body limit applies first on Vercel.
