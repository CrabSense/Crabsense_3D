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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "stretch-z", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const outline = JSON.parse((await call("list_outline")).content[0].text);
for (const root of outline.roots) await call("remove_element", { id: root.uuid });
for (const name of ["MAIN_BODY", "PIPE_PORTS", "SIDE_HATCH"]) await call("add_group", { name });

const box = (name, from, to) => ({ name, from, to });
const z0 = 0;
const z1 = 15;
const body = [
	box("floor", [1, 0, z0 + 1], [15, 1, z1 - 1]),
	box("wall_east", [15, 1, z0 + 1], [16, 10, z1 - 1]),
	box("end_south_a", [0, 1, z1 - 1], [3, 10, z1]),
	box("end_south_n1", [3, 1, z1 - 1], [5, 8, z1]),
	box("end_south_b", [5, 1, z1 - 1], [8, 10, z1]),
	box("end_south_n2", [8, 1, z1 - 1], [10, 8, z1]),
	box("end_south_c", [10, 1, z1 - 1], [13, 10, z1]),
	box("end_south_n3", [13, 1, z1 - 1], [16, 8, z1]),
	box("end_north_a", [0, 1, z0], [3, 10, z0 + 1]),
	box("end_north_n1", [3, 1, z0], [5, 8, z0 + 1]),
	box("end_north_b", [5, 1, z0], [8, 10, z0 + 1]),
	box("end_north_n2", [8, 1, z0], [10, 8, z0 + 1]),
	box("end_north_c", [10, 1, z0], [13, 10, z0 + 1]),
	box("end_north_n3", [13, 1, z0], [16, 8, z0 + 1]),
	box("recess_north", [0, 1, z0 + 1], [1.8, 10, z0 + 1.8]),
	box("recess_south", [0, 1, z1 - 1.8], [1.8, 10, z1 - 1]),
	box("recess_top", [0, 8.8, z0 + 1.8], [1.8, 10, z1 - 1.8]),
	box("recess_bottom", [0, 1, z0 + 1.8], [1.8, 2.2, z1 - 1.8]),
];
await call("place_cube", { group: "MAIN_BODY", texture: "box", faces: true, elements: body });
await call("place_cube", {
	group: "PIPE_PORTS", texture: "box", faces: true,
	elements: [
		box("port_north", [6.4, 2.2, z0 - 1], [9.6, 4.6, z0 + 0.2]),
		box("port_south", [6.4, 2.2, z1 - 0.2], [9.6, 4.6, z1 + 1]),
	],
});
await call("place_cube", {
	group: "PIPE_PORTS", texture: "dark", faces: true,
	elements: [
		box("bore_north", [7.4, 2.9, z0 - 1.15], [8.6, 3.9, z0 - 0.95]),
		box("bore_south", [7.4, 2.9, z1 + 0.95], [8.6, 3.9, z1 + 1.15]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "hatch", faces: true,
	elements: [box("grid_door", [0.45, 2.2, z0 + 1.8], [1.15, 8.8, z1 - 1.8])],
});
const holes = [box("handle_slot", [0.28, 4.6, 6], [0.48, 6.2, 10])];
for (let row = 0; row < 3; row++) {
	for (let col = 0; col < 12; col++) {
		const z = z0 + 2.6 + col * 2.2;
		if (z > z1 - 2.6) continue;
		holes.push(box(`hole_${row}_${col}`, [0.28, 2.8 + row * 1.7, z], [0.48, 3.5 + row * 1.7, z + 0.7]));
	}
}
await call("place_cube", { group: "SIDE_HATCH", texture: "dark", faces: true, elements: holes });
await call("set_camera_angle", { view: "active", position: [28, 20, 8], target: [8, 4, 7], projection: "perspective" });
console.log("width is 15, one and a half times the original");
