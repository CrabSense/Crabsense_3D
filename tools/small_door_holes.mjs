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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "small-holes", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const outline = JSON.parse((await call("list_outline")).content[0].text);
const hatch = outline.roots.find((g) => g.name === "SIDE_HATCH");
if (!hatch) throw new Error("no hatch");
for (const child of hatch.children ?? []) {
	if (child.name !== "latch_pin") await call("remove_element", { id: child.uuid });
}
const box = (name, from, to) => ({ name, from, to });
const x0 = 0.55, x1 = 1.1;
const y0 = 2.3, y1 = 8.6;
const z0 = 2.1, z1 = 12.9;
const bars = [
	box("door_frame_top", [x0, y1 - 0.22, z0], [x1, y1, z1]),
	box("door_frame_bottom", [x0, y0, z0], [x1, y0 + 0.22, z1]),
	box("door_frame_north", [x0, y0, z0], [x1, y1, z0 + 0.22]),
	box("door_frame_south", [x0, y0, z1 - 0.22], [x1, y1, z1]),
];
const cols = 14;
const rows = 6;
for (let i = 1; i < cols; i++) {
	const z = z0 + i * ((z1 - z0) / cols);
	bars.push(box(`bar_v_${i}`, [x0, y0, z - 0.08], [x1, y1, z + 0.08]));
}
for (let i = 1; i < rows; i++) {
	const y = y0 + i * ((y1 - y0) / rows);
	bars.push(box(`bar_h_${i}`, [x0, y - 0.08, z0], [x1, y + 0.08, z1]));
}
await call("place_cube", { group: hatch.uuid, texture: "hatch", faces: true, elements: bars });
console.log(`small holes, ${bars.length} bars`);
