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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "drains", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
try { await call("add_group", { name: "FLOOR_DRAINS" }); } catch { /* already there */ }
const box = (name, from, to) => ({ name, from, to });
const spots = [[8, 5], [8, 10]];
const rings = [];
const holes = [];
spots.forEach(([x, z], i) => {
	rings.push(box(`drain_ring_${i}`, [x - 1.1, 1, z - 1.1], [x + 1.1, 1.7, z + 1.1]));
	holes.push(box(`drain_mouth_${i}`, [x - 0.45, 1.55, z - 0.45], [x + 0.45, 1.75, z + 0.45]));
	holes.push(box(`drain_through_${i}`, [x - 0.4, -0.35, z - 0.4], [x + 0.4, 1.2, z + 0.4]));
});
await call("place_cube", { group: "FLOOR_DRAINS", texture: "box", faces: true, elements: rings });
await call("place_cube", { group: "FLOOR_DRAINS", texture: "dark", faces: true, elements: holes });
console.log("two interior drains and bottom outlets");
