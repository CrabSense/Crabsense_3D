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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "door", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

for (const id of [
	"31aea50f-2647-e13a-450a-202cec6b140e",
	"80e7a3c2-9eec-55c0-b3a5-ecaed862f96f",
	"738cbee6-f71a-bd02-8ea5-f22847dac6c4",
]) await call("remove_element", { id });

const box = (name, from, to) => ({ name, from, to });
await call("place_cube", {
	group: "MAIN_BODY", texture: "box", faces: true,
	elements: [
		box("door_frame_front", [0, 1, 4], [1, 10, 4.7]),
		box("door_frame_back", [0, 1, 12.3], [1, 10, 13]),
		box("door_frame_top", [0, 9.2, 4.7], [1, 10, 12.3]),
		box("door_frame_bottom", [0, 1, 4.7], [1, 1.8, 12.3]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "hatch", faces: true,
	elements: [box("grid_door", [-0.15, 1.8, 4.7], [0.85, 9.2, 12.3])],
});
const holes = [];
for (let row = 0; row < 4; row++) {
	for (let col = 0; col < 5; col++) {
		holes.push(box(`hole_${row}_${col}`, [-0.2, 2.6 + row * 1.45, 5.3 + col * 1.25], [-0.05, 3.2 + row * 1.45, 5.9 + col * 1.25]));
	}
}
holes.push(box("handle_slot", [-0.22, 4.7, 7.4], [-0.02, 6.1, 9.6]));
await call("place_cube", { group: "SIDE_HATCH", texture: "dark", faces: true, elements: holes });
console.log(`door grid holes ${holes.length}`);
