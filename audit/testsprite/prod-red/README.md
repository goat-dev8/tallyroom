# TestSprite red runs on production, before any fix deploys (2026-10-20, Cairo UTC+3)

Project tallyroom-api a7aa06b0-0721-49ff-a7aa-0181ad8586d6, target https://tallyroom-rosy.vercel.app. One run per bug, none rerun.
Test code: testsprite/prodred/ (asserts the correct behaviour; every file passes against the fixed stack 40716fe locally).
Measured cost: 0.2 credits per backend run (balance 19 -> 16 over 15 runs; the CLI's creditsPerRun says 0.5, but that is the frontend rate).
Fresh production curls before the runs: production-curl-2026-10-20.txt. BUG-026 skipped (300 s timeout on production, not cheap or safe).

| Bug | Test id | Run id | Verdict | Balance before -> after |
|---|---|---|---|---|
| BUG-028 | b95fddab-e854-413b-a0e5-1854b13fed33 | aa0b26f5-f7f4-4b65-82a1-3bb6f6f32cad | failed (assertion) | 19 -> 18.8 |
| BUG-009 | 2baa46fc-8615-4c7f-ab83-e33806ae4190 | 47c4d103-503b-4dc4-8870-4af795313baa | failed (assertion) | 18.8 -> 18.6 |
| BUG-010 | 640adff8-dc91-478d-9f41-f6d90424e920 | a78f86cd-ff62-4ba7-9589-0fb1ee6fbfa3 | failed (assertion) | 18.6 -> 18.4 |
| BUG-011 | 8b235a50-546d-406a-8867-08ab87ee56e2 | 975792b2-3d88-4c3a-9b42-47fdc3aa0446 | failed (assertion) | 18.4 -> 18.2 |
| BUG-012 | 9104fe07-c858-4e03-b179-14dd041dcc9e | 82cd22d6-fc22-43f8-b5a4-b26061f23e32 | failed (assertion) | 18.2 -> 18 |
| BUG-013 | 2c7d0b96-c94f-45e9-8d8d-9792630a1a74 | a9d5fb57-dfcb-494e-9165-bfe616f43fe0 | failed (assertion) | 18 -> 17.8 |
| BUG-014 | baf3ae70-4438-4666-822a-b90b46a06d34 | 5ee0bdbc-be91-4565-aeb7-0e79d213b013 | failed (assertion) | 17.8 -> 17.6 |
| BUG-015 | 84802352-e942-4e7b-9f93-ef5c1a069f70 | 14d0e7d0-c83f-40c8-8582-f6600a6d75aa | failed (assertion) | 17.6 -> 17.4 |
| BUG-016 | 3e46dd98-f996-42a2-9acd-037ed87d1435 | c6184fa4-154d-4b2d-8e34-28e2f5250204 | failed (assertion) | 17.4 -> 17.2 |
| BUG-018 | cbdc897f-1356-4f5f-bb37-e5b4f0c56a8f | 0becbade-d477-42bd-91b6-85c98181a084 | failed (assertion) | 17.2 -> 17 |
| BUG-019 | 2c3b8c12-b610-49ef-a1c6-e730cd44564c | 15d96113-8f9e-4104-9cb3-0e080fc715a7 | failed (assertion) | 17 -> 16.8 |
| BUG-021 | aa98bbd6-0987-4ec8-9c9f-564c3de89f9f | e8a69229-084a-4c20-8e7a-c77aae609f97 | failed (assertion) | 16.8 -> 16.6 |
| BUG-024 | 28a6c190-394e-48b1-ba0a-ae78b929d580 | ec6c8bb6-2a1b-40ed-847a-46ed1606abdc | failed (assertion) | 16.6 -> 16.4 |
| BUG-029 | 2b7bbed5-2a37-4c8c-a8c5-e402af8529a1 | 001e2b8d-968f-4d9b-ac01-a097fadf802f | failed (assertion) | 16.4 -> 16.2 |
| BUG-030 | abef2d38-2f4d-402e-bf1c-44ed448dc370 | 92203c90-279c-47f8-94f3-2c7cf8c56d57 | failed (assertion) | 16.2 -> 16 |
