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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "recess", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const outline = JSON.parse((await call("list_outline")).content[0].text);
const drop = [];
for (const root of outline.roots) {
	for (const child of root.children ?? []) {
		if (child.name.startsWith("door_") || child.name.startsWith("grid_") || child.name.startsWith("hole_") || child.name === "handle_slot") {
			drop.push(child.uuid);
		}
	}
}
for (const id of drop) await call("remove_element", { id });

const box = (name, from, to) => ({ name, from, to });
await call("place_cube", {
	group: "MAIN_BODY", texture: "box", faces: true,
	elements: [
		box("recess_front", [0, 1, 4], [1.8, 10, 4.8]),
		box("recess_back", [0, 1, 12.2], [1.8, 10, 13]),
		box("recess_top", [0, 8.8, 4.8], [1.8, 10, 12.2]),
		box("recess_bottom", [0, 1, 4.8], [1.8, 2.2, 12.2]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "hatch", faces: true,
	elements: [box("grid_door", [0.55, 2.2, 4.8], [1.15, 8.8, 12.2])],
});
const holes = [box("handle_slot", [0.4, 4.6, 7.3], [0.58, 6.2, 9.7])];
for (let row = 0; row < 3; row++) {
	for (let col = 0; col < 4; col++) {
		holes.push(box(`hole_${row}_${col}`, [0.4, 2.8 + row * 1.7, 5.4 + col * 1.5], [0.58, 3.5 + row * 1.7, 6.1 + col * 1.5]));
	}
}
await call("place_cube", { group: "SIDE_HATCH", texture: "dark", faces: true, elements: holes });
console.log("door sits inside the recessed side");
