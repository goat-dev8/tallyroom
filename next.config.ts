import type { NextConfig } from 'next';
// Type checking runs separately (`tsc --noEmit`) before `next build`.
// The engine uses NodeNext-style `./x.js` imports; map them to the .ts sources.
const config: NextConfig = {
  typescript: { ignoreBuildErrors: true }, poweredByHeader: false, reactStrictMode: true,
  // Sample files open as readable text in the browser; the dashboard link still downloads them.
  headers: async () => [{ source: '/samples/:file*', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }, { key: 'Content-Disposition', value: 'inline' }] }],
  // Bundled election fixtures are read from disk at request time by the tabulate route.
  outputFileTracingIncludes: { '/api/elections/[id]/tabulate': ['./data/fixtures/*.tsv'] },
  webpack: (c) => { c.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }; return c; },
};
export default config;
