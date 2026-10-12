const url = "http://localhost:3000/bb-mcp";
let session;
async function rpc(body) {
	const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
	if (session) headers["mcp-session-id"] = session;
	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	session ??= res.headers.get("mcp-session-id");
	const text = await res.text();
	const line = text.split("\n").find((v) => v.startsWith("data:"));
	return JSON.parse(line ? line.slice(5).trim() : text);
}
async function call(name, args = {}) {
	const json = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
	return json.result ?? json.error;
}
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "repair", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const box = (name, from, to) => ({ name, from, to });
const elements = [
	box("lower_frame", [0.55, 2.2, 2.1], [1.1, 3.0, 12.9]),
	...Array.from({ length: 13 }, (_, i) => box(`lower_v_${i}`, [0.55, 2.2, 2.1 + i * 0.8], [1.1, 3.0, 2.35 + i * 0.8])),
	box("lower_h", [0.55, 2.65, 2.1], [1.1, 2.85, 12.9]),
];
await call("place_cube", { group: "700aec03-b1f4-0da0-70c1-7a7214a997c3", texture: "door_flat", faces: true, elements });
console.log("lower grid restored");
