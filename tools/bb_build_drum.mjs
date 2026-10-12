// Builds the RAS drum filter as an octagonal drum inside the running Blockbench,
// then screenshots it. Drives the desktop plugin's MCP endpoint over HTTP.
//
// Why an octagon: a Minecraft Java block model has no cylinders, and per-cube
// rotation is capped at +/-45 degrees. Rotating one cardinal slab by +45 degrees
// around the drum's centre yields a diagonal slab, so the four cardinal slabs
// plus their +45 copies become eight evenly spaced faces.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const url = process.env.BB_MCP_URL ?? "http://localhost:3000/bb-mcp";
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
const textOf = (r) => r.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "(no text)";

await rpc({
	jsonrpc: "2.0", id: 0, method: "initialize",
	params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "drum-builder", version: "1" } },
});
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

// 1. Texture: reuse the mod's own PNG so the preview matches the shipped block.
const png = readFileSync("src/main/resources/assets/crabsense_ras/textures/block/drum_filter.png");
const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
console.log("textures before:", textOf(await call("list_textures")).slice(0, 200));
console.log("texture:", textOf(await call("create_texture", { name: "all", width: 16, height: 16, data: dataUrl })) || "(created)");

// 2. Geometry. Drum axis = Z, circular cross-section centred on (8, 8),
//    apothem 5.5 so the octagon's flat faces sit 5.5 units from the centre,
//    drum length 10 along Z (z 3..13). Cardinal slabs are axis-aligned; the
//    +45 copies are the diagonals. Pivot is the drum centre.
const APOTHEM = 5.5;
const HALF_WIDTH = 2.5; // tangential half-length; chord of a 45-degree arc at r=6 is ~4.6
const Z0 = 3;
const Z1 = 13;
const PIVOT = [8, 8, 8];
const CARDINALS = [
	{ name: "drum_east", from: [8 + APOTHEM - 1, 8 - HALF_WIDTH, Z0], to: [8 + APOTHEM, 8 + HALF_WIDTH, Z1] },
	{ name: "drum_west", from: [8 - APOTHEM, 8 - HALF_WIDTH, Z0], to: [8 - APOTHEM + 1, 8 + HALF_WIDTH, Z1] },
	{ name: "drum_up", from: [8 - HALF_WIDTH, 8 + APOTHEM - 1, Z0], to: [8 + HALF_WIDTH, 8 + APOTHEM, Z1] },
	{ name: "drum_down", from: [8 - HALF_WIDTH, 8 - APOTHEM, Z0], to: [8 + HALF_WIDTH, 8 - APOTHEM + 1, Z1] },
];
const elements = [
	...CARDINALS.map((c) => ({ ...c, origin: PIVOT, rotation: [0, 0, 0] })),
	...CARDINALS.map((c) => ({ name: c.name + "_diag", from: c.from, to: c.to, origin: PIVOT, rotation: [0, 0, 45] })),
	// Axle through the middle, sticking out past both open ends.
	{ name: "shaft", from: [7.5, 7.5, 2], to: [8.5, 8.5, 14], origin: PIVOT, rotation: [0, 0, 0] },
];
// Re-runnable: only add the geometry if it is not already in the project.
const existing = textOf(await call("list_outline"));
if (existing.includes("drum_east")) {
	console.log("geometry already present, skipping place_cube");
} else {
	const placed = await call("place_cube", { elements, texture: "all" });
	console.log("place_cube:", textOf(placed));
}

// 3. Screenshot so the result is visible immediately.
const view = (await call("list_views")).structuredContent?.views?.[0]?.id ?? "active";
const shot = await call("capture_screenshot", { view, max_size: 768 });
const image = shot.content?.find((c) => c.type === "image");
if (image) {
	mkdirSync("preview/renders", { recursive: true });
	writeFileSync("preview/renders/drum_filter_blockbench.png", Buffer.from(image.data, "base64"));
	console.log("screenshot: preview/renders/drum_filter_blockbench.png (view=" + view + ")");
} else {
	console.log("screenshot: no image returned; views =", JSON.stringify(await call("list_views")));
}
console.log("outline:", textOf(await call("list_outline")).slice(0, 400));
