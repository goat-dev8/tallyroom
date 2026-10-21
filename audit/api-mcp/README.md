# REST API (OpenAPI 3.1) and MCP server

- `GET /api/openapi`: OpenAPI 3.1 document (`src/openapi.ts`). Rule enums come from the validator constants.
- `POST /api/mcp`: MCP over streamable HTTP, stateless JSON responses, one serverless invocation per request.
- `npx tsx mcp/stdio.ts`: same server over stdio for desktop MCP clients.
- Tools: `count_ballots` (IRV/STV), `list_elections`, `election_rounds`, `counting_rules`. Each calls the same handler as the REST route.

Checks:
- `test/openapi.test.ts` (9 tests): documented paths equal the route files under `app/api`; every example request
  returns 200 and validates (Ajv, JSON Schema 2020-12) against the documented result schema; error bodies validate
  against `Error` with a documented status; every documented election id resolves; overvote enum = accepted values.
- `test/mcp.test.ts` (8 tests): handshake, tool list and schemas, IRV/STV/preset counts equal `/api/tabulate`,
  tool errors vs protocol errors, batch and notifications, and a real stdio round trip.
- `sdk-interop-2026-10-20.txt`: the official `@modelcontextprotocol/sdk` 1.32.1 client, run on this box against
  stdio and against `next dev` over HTTP (port 3917, stopped afterwards), plus raw curl of `/api/mcp` and `/api/openapi`.
