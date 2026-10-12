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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "door-holes", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const outline = JSON.parse((await call("list_outline")).content[0].text);
let group = null;
for (const root of outline.roots) {
	if (root.name !== "SIDE_HATCH") continue;
	group = root.uuid;
	for (const child of root.children ?? []) await call("remove_element", { id: child.uuid });
}
if (!group) throw new Error("no SIDE_HATCH");
const box = (name, from, to) => ({ name, from, to });
const x0 = 0.5, x1 = 1.15;
const y0 = 2.2, y1 = 8.8;
const z0 = 1.9, z1 = 13.1;
const bars = [
	box("door_frame_top", [x0, y1 - 0.35, z0], [x1, y1, z1]),
	box("door_frame_bottom", [x0, y0, z0], [x1, y0 + 0.35, z1]),
	box("door_frame_north", [x0, y0, z0], [x1, y1, z0 + 0.35]),
	box("door_frame_south", [x0, y0, z1 - 0.35], [x1, y1, z1]),
];
for (let i = 1; i <= 4; i++) {
	const z = z0 + i * ((z1 - z0) / 5);
	bars.push(box(`bar_v_${i}`, [x0, y0, z - 0.12], [x1, y1, z + 0.12]));
}
for (let i = 1; i <= 3; i++) {
	const y = y0 + i * ((y1 - y0) / 4);
	bars.push(box(`bar_h_${i}`, [x0, y - 0.12, z0], [x1, y + 0.12, z1]));
}
await call("place_cube", { group, texture: "hatch", faces: true, elements: bars });
console.log(`open grid door, ${bars.length} bars, holes are empty`);
