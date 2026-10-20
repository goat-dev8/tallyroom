import { healthBody } from '../../../src/health';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

export function GET() {
  return Response.json(healthBody());
}
