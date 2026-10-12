const url = "http://localhost:3000/bb-mcp";
let session;
async function rpc(body) {
	const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
	if (session) headers["mcp-session-id"] = session;
	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	session ??= res.headers.get("mcp-session-id");
	const text = await res.text();
	if (!text.trim()) return null;
	const line = text.split("\n").find((v) => v.startsWith("data:"));
	return JSON.parse(line ? line.slice(5).trim() : text);
}
const init = await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "save", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const result = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "export_model", arguments: {
	codec_id: "project",
	path: "e:/RAS_IOT_BE/minesense-ras-mod/preview/crab_box_fixed.bbmodel",
	overwrite: true,
	max_content_length: 0,
	result_format: "text",
} } });
console.log(JSON.stringify(result.result ?? result.error));
