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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "notches", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const outline = JSON.parse((await call("list_outline")).content[0].text);
let body = null;
let removed = 0;
for (const root of outline.roots) {
	if (root.name !== "MAIN_BODY") continue;
	body = root.uuid;
	for (const child of root.children ?? []) {
		if (/^(end_|front_|back_)/.test(child.name)) {
			await call("remove_element", { id: child.uuid });
			removed++;
		}
	}
}
const box = (name, from, to) => ({ name, from, to });
const wall = (z, prefix) => [
	box(`${prefix}_solid_door`, [0, 1, z], [2, 10, z + 1]),
	box(`${prefix}_notch_door`, [2, 1, z], [4, 8, z + 1]),
	box(`${prefix}_solid_mid`, [4, 1, z], [6.6, 10, z + 1]),
	box(`${prefix}_notch_surface`, [6.6, 1, z], [8.6, 8, z + 1]),
	box(`${prefix}_solid_gap`, [8.6, 1, z], [13.1, 10, z + 1]),
	box(`${prefix}_notch_bottom`, [13.1, 1, z], [14.9, 8, z + 1]),
	box(`${prefix}_solid_end`, [14.9, 1, z], [16, 10, z + 1]),
];
await call("place_cube", {
	group: body,
	texture: "box",
	faces: true,
	elements: [...wall(0, "north"), ...wall(14, "south")],
});
console.log(`replaced end walls, removed ${removed}`);
