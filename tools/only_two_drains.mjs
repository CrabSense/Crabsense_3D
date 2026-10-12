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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "two-drains", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const outline = JSON.parse((await call("list_outline")).content[0].text);
let removed = 0;
for (const root of outline.roots) {
	if (root.name === "FLOOR_DRAINS" || root.name === "PIPE_PORTS") {
		for (const child of root.children ?? []) {
			await call("remove_element", { id: child.uuid });
			removed++;
		}
	}
}
console.log(`removed ${removed}`);
const box = (name, from, to) => ({ name, from, to });
const group = "4d84a293-ae41-bb28-1df1-afdaf36da541";
await call("place_cube", {
	group, texture: "box", faces: true,
	elements: [
		box("bottom_drain_pipe", [13.3, -1.8, 6.6], [14.7, 1.55, 8]),
		box("surface_drain_pipe", [6.8, -1.8, 12.4], [8.4, 4.2, 13.9]),
	],
});
await call("place_cube", {
	group, texture: "dark", faces: true,
	elements: [
		box("bottom_drain_hole", [13.6, 1.3, 6.95], [14.4, 1.6, 7.65]),
		box("bottom_drain_outlet", [13.65, -2.05, 7], [14.35, -1.7, 7.6]),
		box("surface_drain_mouth", [7.15, 3.9, 12.75], [8.05, 4.25, 13.55]),
		box("surface_drain_outlet", [7.15, -2.05, 12.8], [8.05, -1.7, 13.5]),
	],
});
console.log("only two pipes left");
