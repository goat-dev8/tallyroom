/** Local MCP server over stdio (newline-delimited JSON-RPC). Run: npx tsx mcp/stdio.ts
 *  Client config example: { "command": "npx", "args": ["tsx", "mcp/stdio.ts"], "cwd": "<repo>" } */
import { createInterface } from 'node:readline';
import { handleMcpMessage } from '../src/mcp.js';

const rl = createInterface({ input: process.stdin });
rl.on('line', line => {
  if (!line.trim()) return;
  let reply: unknown;
  try { reply = handleMcpMessage(JSON.parse(line)); } catch { reply = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }; }
  if (reply !== null) process.stdout.write(JSON.stringify(reply) + '\n');
});
