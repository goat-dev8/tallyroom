// Copies the verified pattern fixtures into public/data so the browser runs the same engine on the same bytes.
import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
mkdirSync('public/data', { recursive: true });
for (const f of readdirSync('data/fixtures')) if (f.endsWith('.tsv')) copyFileSync(`data/fixtures/${f}`, `public/data/${f}`);
