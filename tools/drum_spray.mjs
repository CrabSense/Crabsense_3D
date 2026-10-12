const url = "http://localhost:3000/bb-mcp";
let session;
async function rpc(body) {
	const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
	if (session) headers["mcp-session-id"] = session;
	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	session ??= res.headers.get("mcp-session-id");
	const text = await res.text();
	if (!text.trim()) return null;
	const line = text.split("\n").find((l) => l.startsWith("data:"));
	return JSON.parse(line ? line.slice(5).trim() : text);
}
async function call(name, args = {}) {
	const json = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
	const result = json.result ?? json.error;
	if (result?.isError) throw new Error(`${name}: ${result.content?.[0]?.text ?? JSON.stringify(result)}`);
	return result;
}
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "spray", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const result = await call("create_particle_effect", {
	identifier: "crabsense:backwash",
	preset: "drip",
	overwrite: true,
	pack_root: "e:/RAS_IOT_BE/minesense-ras-mod/preview",
	design: {
		color: "#3aa0ff",
		rate: 30,
		duration: 15,
		sleep_time: 10,
		looping: true,
		size: 0.12,
		acceleration: [0, -6, 0],
		speed: 0.15,
	},
});
console.log(result.content?.[0]?.text?.slice(0, 400) ?? "ok");
