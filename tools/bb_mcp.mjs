// Talks to the Blockbench desktop plugin's MCP server (http://localhost:3000/bb-mcp)
// with plain Node, so the tools work even before Cursor reloads its MCP list.
//
// Usage:
//   node tools\bb_mcp.mjs tools                                   # list tool names
//   node tools\bb_mcp.mjs schema place_cube                       # print one tool's inputSchema
//   node tools\bb_mcp.mjs schema --all                            # dump every schema to preview\mcp_schemas.json
//   node tools\bb_mcp.mjs call place_cube '{"x":0,"y":0,"z":0}'   # or @args.json
const url = process.env.BB_MCP_URL ?? "http://localhost:3000/bb-mcp";

async function rpc(session, body) {
	const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
	if (session) headers["mcp-session-id"] = session;
	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	const text = await res.text();
	// Notifications are acknowledged with 202 and no body.
	if (!text.trim()) return { sid: res.headers.get("mcp-session-id"), json: null };
	// Streamable HTTP may answer as SSE; unwrap the single data: payload.
	const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
	const payload = dataLine ? dataLine.slice(5).trim() : text;
	if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
	return { sid: res.headers.get("mcp-session-id"), json: JSON.parse(payload) };
}

async function connect() {
	const init = await rpc(null, {
		jsonrpc: "2.0", id: 1, method: "initialize",
		params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "bb-mcp-cli", version: "1" } },
	});
	const sid = init.sid;
	await rpc(sid, { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
	return sid;
}

const [command, ...rest] = process.argv.slice(2);
const sid = await connect();
let id = 10;

if (command === "tools") {
	const { json } = await rpc(sid, { jsonrpc: "2.0", id: ++id, method: "tools/list", params: {} });
	console.log((json.result?.tools ?? []).map((t) => t.name).join("\n"));
} else if (command === "schema") {
	const { json } = await rpc(sid, { jsonrpc: "2.0", id: ++id, method: "tools/list", params: {} });
	const tools = json.result?.tools ?? [];
	if (rest[0] === "--all") {
		const { writeFileSync, mkdirSync } = await import("node:fs");
		mkdirSync("preview", { recursive: true });
		writeFileSync("preview/mcp_schemas.json", JSON.stringify(tools, null, 2));
		console.log(`wrote preview/mcp_schemas.json (${tools.length} tools)`);
	} else {
		const tool = tools.find((t) => t.name === rest[0]);
		if (!tool) { console.error(`no tool '${rest[0]}'`); process.exit(1); }
		console.log(JSON.stringify({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }, null, 2));
	}
} else if (command === "call") {
	const [tool, raw] = rest;
	if (!tool) { console.error("usage: call <tool> '<json>'|@file"); process.exit(2); }
	let args = {};
	if (raw) {
		const text = raw.startsWith("@") ? (await import("node:fs")).readFileSync(raw.slice(1), "utf8") : raw;
		args = JSON.parse(text);
	}
	const { json } = await rpc(sid, { jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name: tool, arguments: args } });
	const out = json.result ?? json.error;
	console.log(JSON.stringify(out, null, 2));
	if (json.result?.isError) process.exitCode = 1;
} else {
	console.error("usage: bb_mcp.mjs tools | schema <tool>|--all | call <tool> [json|@file]");
	process.exitCode = 2;
}
