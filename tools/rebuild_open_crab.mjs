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
const box = (name, from, to) => ({ name, from, to });

await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "rebuild-crab", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const outline = await call("list_outline");
const roots = JSON.parse(outline.content[0].text).roots;
for (const item of roots) await call("remove_element", { id: item.uuid });
console.log(`removed ${roots.length}`);

for (const name of ["MAIN_BODY", "TOP_RIM", "SIDE_RIBS", "PIPE_PORTS", "SIDE_HATCH", "BOTTOM_DETAILS"]) {
	await call("add_group", { name });
}

const body = [
	box("floor", [1, 0, 1], [15, 1, 15]),
	box("wall_north", [0, 1, 0], [16, 10, 1]),
	box("wall_south", [0, 1, 15], [16, 10, 16]),
	box("wall_west", [0, 1, 1], [1, 10, 15]),
	box("wall_east", [15, 1, 1], [16, 10, 15]),
];
const rim = [
	box("rim_north_a", [0, 10, 0], [3, 11, 1.4]),
	box("rim_north_b", [5, 10, 0], [8, 11, 1.4]),
	box("rim_north_c", [10, 10, 0], [13, 11, 1.4]),
	box("rim_south", [0, 10, 14.6], [16, 11, 16]),
	box("rim_west", [0, 10, 1.4], [1.4, 11, 14.6]),
	box("rim_east", [14.6, 10, 1.4], [16, 11, 14.6]),
];
const ribs = [
	box("rib_1", [16, 2, 4], [16.45, 9, 4.35]),
	box("rib_2", [16, 2, 8], [16.45, 9, 8.35]),
	box("rib_3", [16, 2, 12], [16.45, 9, 12.35]),
	box("diamond_1", [3, 3, -0.18], [4.1, 4.1, 0]),
	box("diamond_2", [6.6, 3, -0.18], [7.7, 4.1, 0]),
	box("diamond_3", [10.2, 3, -0.18], [11.3, 4.1, 0]),
];
const ports = [
	box("port_front", [2, 2.2, -1.2], [4.2, 4.4, 0.15]),
	box("port_side", [15.85, 5, 6], [17.2, 7.2, 8.2]),
];
const hatch = [
	box("hatch", [-1, 2, 4], [-0.35, 8.5, 11]),
	box("latch", [-1.45, 4.6, 6.8], [-1, 5.8, 8]),
];
await call("place_cube", { elements: body, group: "MAIN_BODY", faces: false });
await call("place_cube", { elements: rim, group: "TOP_RIM", faces: false });
await call("place_cube", { elements: ribs, group: "SIDE_RIBS", faces: false });
await call("place_cube", { elements: ports, group: "PIPE_PORTS", faces: false });
await call("place_cube", { elements: [box("port_bore", [2.7, 2.9, -1.28], [3.5, 3.7, -1.15])], group: "PIPE_PORTS", faces: false });
await call("place_cube", { elements: [hatch[0]], group: "SIDE_HATCH", faces: false });
await call("place_cube", { elements: [hatch[1]], group: "SIDE_HATCH", faces: false });
await call("place_cube", { elements: [box("floor_hole", [7.6, 1, 7.6], [8.4, 1.15, 8.4])], group: "BOTTOM_DETAILS", faces: false });

const info = await call("get_project_info");
console.log(info.content[0].text);
await call("set_camera_angle", { view: "active", position: [28, 18, 28], target: [8, 5, 8], projection: "perspective" });




