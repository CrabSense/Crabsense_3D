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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "fix-crab", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const drop = [
	"7c4d5f11-e66f-4e69-f51a-62f77794adc3",
	"b7ebd8f0-21ab-4a11-7975-af7caf36fdcb",
	"824c6f84-4580-4341-4925-8973ab3b0630",
	"038b16ae-8e74-b961-959f-bf4e820558f4",
	"9a319e7a-1c5f-e34f-b753-c5542ea98faf",
	"f3037b9e-e01d-07b0-4678-d98ad4fae02b",
	"d8c635c9-6547-8d3c-d527-b7f39620a7cc",
	"74680ec1-8f02-daf3-31a6-4fdab2dd201a",
	"f0c729d3-e548-52b6-0ec7-2885c1cc7160",
	"0e7c0680-e0d1-03f7-a23d-ef301472d767",
	"f87a23b7-d28d-bd1d-3212-13879203c4b2",
	"d57a6290-a8a3-d8f8-b24e-08d2bef583e8",
];
for (const id of drop) await call("remove_element", { id });

const box = (name, from, to) => ({ name, from, to });
await call("place_cube", {
	group: "MAIN_BODY",
	texture: "box",
	faces: true,
	elements: [
		box("wall_north_a", [0, 1, 0], [3.2, 11, 1]),
		box("wall_north_notch_1", [3.2, 1, 0], [5.2, 8.4, 1]),
		box("wall_north_b", [5.2, 1, 0], [8.2, 11, 1]),
		box("wall_north_notch_2", [8.2, 1, 0], [10.2, 8.4, 1]),
		box("wall_north_c", [10.2, 1, 0], [13.2, 11, 1]),
		box("wall_north_notch_3", [13.2, 1, 0], [16, 8.4, 1]),
		box("cap_south", [0, 10, 15], [16, 11, 16]),
		box("cap_west", [0, 10, 1], [1, 11, 15]),
		box("cap_east", [15, 10, 1], [16, 11, 15]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH",
	texture: "box",
	faces: true,
	elements: [
		box("hatch_panel", [-0.25, 1.6, 3.2], [0.15, 8.6, 10.4]),
		box("hatch_hinge", [-0.25, 1.6, 3.2], [0.15, 8.6, 3.6]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH",
	texture: "dark",
	faces: true,
	elements: [box("hatch_latch", [-0.55, 4.5, 6.2], [-0.25, 5.7, 7.4])],
});
console.log("rim flush, hatch is a side panel");
