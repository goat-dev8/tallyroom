import type { NextConfig } from 'next';
// Type checking runs separately (`tsc --noEmit`) before `next build`.
// The engine uses NodeNext-style `./x.js` imports; map them to the .ts sources.
const config: NextConfig = {
  typescript: { ignoreBuildErrors: true }, poweredByHeader: false, reactStrictMode: true,
  webpack: (c) => { c.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] }; return c; },
};
export default config;
