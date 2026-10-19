import { ENGINE_VERSION } from '../../../src/api';
export const dynamic = 'force-static';
export function GET() { return Response.json({ ok: true, engineVersion: ENGINE_VERSION }); }
