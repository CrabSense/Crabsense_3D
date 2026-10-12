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
const outline = JSON.parse((await call("list_outline")).content[0].text);
for (const root of outline.roots) {
	for (const child of root.children ?? []) {
		if (child.name.startsWith("drain_")) await call("remove_element", { id: child.uuid });
	}
}
const box = (name, from, to) => ({ name, from, to });
await call("place_cube", {
	group: "4d84a293-ae41-bb28-1df1-afdaf36da541", texture: "box", faces: true,
	elements: [
		box("bottom_drain_pipe", [5.4, -1.8, 3.6], [7, 1.55, 5.2]),
		box("surface_drain_pipe", [10.2, -1.8, 9], [11.8, 4.2, 10.6]),
	],
});
await call("place_cube", {
	group: "4d84a293-ae41-bb28-1df1-afdaf36da541", texture: "dark", faces: true,
	elements: [
		box("bottom_drain_hole", [5.8, 1.35, 4], [6.6, 1.6, 4.8]),
		box("surface_drain_mouth", [10.55, 3.85, 9.35], [11.45, 4.25, 10.25]),
	],
});
console.log("center bottom drain, surface drain at 40 percent height");
