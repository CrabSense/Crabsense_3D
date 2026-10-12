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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "stretch", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const outline = JSON.parse((await call("list_outline")).content[0].text);
for (const root of outline.roots) await call("remove_element", { id: root.uuid });
for (const name of ["MAIN_BODY", "PIPE_PORTS", "SIDE_HATCH"]) await call("add_group", { name });

const box = (name, from, to) => ({ name, from, to });
const body = [
	box("floor", [-15, 0, 4], [31, 1, 13]),
	box("wall_east", [31, 1, 4], [32, 10, 13]),
];
for (let i = 0; i < 3; i++) {
	const x = -16 + i * 16;
	for (const [z, prefix] of [[3, "front"], [12, "back"]]) {
		body.push(
			box(`${prefix}_${i}_a`, [x, 1, z], [x + 3, 10, z + 1]),
			box(`${prefix}_${i}_n1`, [x + 3, 1, z], [x + 5, 8, z + 1]),
			box(`${prefix}_${i}_b`, [x + 5, 1, z], [x + 8, 10, z + 1]),
			box(`${prefix}_${i}_n2`, [x + 8, 1, z], [x + 10, 8, z + 1]),
			box(`${prefix}_${i}_c`, [x + 10, 1, z], [x + 13, 10, z + 1]),
			box(`${prefix}_${i}_n3`, [x + 13, 1, z], [x + 16, 8, z + 1]),
		);
	}
}
await call("place_cube", { group: "MAIN_BODY", texture: "box", faces: true, elements: body });
await call("place_cube", {
	group: "MAIN_BODY", texture: "box", faces: true,
	elements: [
		box("recess_front", [-16, 1, 4], [-14.2, 10, 4.8]),
		box("recess_back", [-16, 1, 12.2], [-14.2, 10, 13]),
		box("recess_top", [-16, 8.8, 4.8], [-14.2, 10, 12.2]),
		box("recess_bottom", [-16, 1, 4.8], [-14.2, 2.2, 12.2]),
	],
});
await call("place_cube", {
	group: "PIPE_PORTS", texture: "box", faces: true,
	elements: [
		box("port_front", [6.4, 2.2, 2], [9.6, 4.6, 3.2]),
		box("port_back", [6.4, 2.2, 12.8], [9.6, 4.6, 14]),
	],
});
await call("place_cube", {
	group: "PIPE_PORTS", texture: "dark", faces: true,
	elements: [
		box("bore_front", [7.4, 2.9, 1.85], [8.6, 3.9, 2.05]),
		box("bore_back", [7.4, 2.9, 13.95], [8.6, 3.9, 14.15]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "hatch", faces: true,
	elements: [box("grid_door", [-15.4, 2.2, 4.8], [-14.8, 8.8, 12.2])],
});
const holes = [box("handle_slot", [-15.55, 4.6, 7.3], [-15.35, 6.2, 9.7])];
for (let row = 0; row < 3; row++) {
	for (let col = 0; col < 4; col++) {
		holes.push(box(`hole_${row}_${col}`, [-15.55, 2.8 + row * 1.7, 5.4 + col * 1.5], [-15.35, 3.5 + row * 1.7, 6.1 + col * 1.5]));
	}
}
await call("place_cube", { group: "SIDE_HATCH", texture: "dark", faces: true, elements: holes });
await call("set_camera_angle", { view: "active", position: [8, 22, 40], target: [8, 4, 8], projection: "perspective" });
console.log("length is 48, from -16 to 32");
