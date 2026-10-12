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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "door-lower", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const box = (name, from, to) => ({ name, from, to });
const bars = [
	box("door_lower_rail", [0.55, 1.45, 2.1], [1.1, 1.8, 12.9]),
	box("door_lower_crossbar", [0.55, 1.8, 2.1], [1.1, 2.05, 12.9]),
	...Array.from({ length: 13 }, (_, i) => box(`door_lower_vertical_${i}`, [0.55, 1.45, 2.1 + i * 0.8], [1.1, 3.0, 2.35 + i * 0.8])),
];
await call("place_cube", { group: "7f8d2614-a7d1-6e2a-69ec-5f40f92f943c", texture: "door_flat", faces: true, elements: bars });
await call("export_model", { codec_id: "project", path: "e:/RAS_IOT_BE/minesense-ras-mod/preview/crab_box_fixed.bbmodel", overwrite: true, max_content_length: 0, result_format: "text" });
console.log("lower door grid filled and saved");
