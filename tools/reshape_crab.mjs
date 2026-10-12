import { deflateSync } from "node:zlib";

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
function png16(r, g, b) {
	const raw = Buffer.alloc((16 * 4 + 1) * 16);
	for (let y = 0; y < 16; y++) {
		raw[y * 65] = 0;
		for (let x = 0; x < 16; x++) {
			const o = y * 65 + 1 + x * 4;
			raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
		}
	}
	const crcTable = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		crcTable[n] = c;
	}
	const crc32 = (buf) => { let c = -1; for (const v of buf) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
	const chunk = (type, data) => {
		const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
		const body = Buffer.concat([Buffer.from(type), data]);
		const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
		return Buffer.concat([len, body, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
	]);
}

await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "reshape-crab", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const outline = JSON.parse((await call("list_outline")).content[0].text);
for (const root of outline.roots) await call("remove_element", { id: root.uuid });

const hatchPng = png16(186, 230, 253);
await call("create_texture", { name: "hatch", width: 16, height: 16, data: `data:image/png;base64,${hatchPng.toString("base64")}` });

for (const name of ["MAIN_BODY", "TOP_RIM", "PIPE_PORTS", "SIDE_HATCH"]) await call("add_group", { name });
const box = (name, from, to) => ({ name, from, to });
// Long rectangle: 16 long, 10 wide. Front and back are the same.
const endWall = (z0, prefix) => [
	box(`${prefix}_a`, [0, 1, z0], [3, 10, z0 + 1]),
	box(`${prefix}_notch1`, [3, 1, z0], [5, 8, z0 + 1]),
	box(`${prefix}_b`, [5, 1, z0], [8, 10, z0 + 1]),
	box(`${prefix}_notch2`, [8, 1, z0], [10, 8, z0 + 1]),
	box(`${prefix}_c`, [10, 1, z0], [13, 10, z0 + 1]),
	box(`${prefix}_notch3`, [13, 1, z0], [16, 8, z0 + 1]),
];
await call("place_cube", {
	group: "MAIN_BODY", texture: "box", faces: true,
	elements: [
		box("floor", [1, 0, 4], [15, 1, 13]),
		box("wall_west", [0, 1, 4], [1, 10, 13]),
		box("wall_east", [15, 1, 4], [16, 10, 13]),
		...endWall(3, "front"),
		...endWall(12, "back"),
	],
});
await call("place_cube", {
	group: "PIPE_PORTS", texture: "box", faces: true,
	elements: [
		box("port_front", [6.8, 2.2, 2], [9.2, 4.6, 3.2]),
		box("port_back", [6.8, 2.2, 12.8], [9.2, 4.6, 14]),
	],
});
await call("place_cube", {
	group: "PIPE_PORTS", texture: "dark", faces: true,
	elements: [
		box("bore_front", [7.5, 2.9, 1.85], [8.5, 3.9, 2.05]),
		box("bore_back", [7.5, 2.9, 13.95], [8.5, 3.9, 14.15]),
	],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "hatch", faces: true,
	elements: [box("door", [-2.4, 1.4, 5], [-1.5, 8.2, 12])],
});
await call("place_cube", {
	group: "SIDE_HATCH", texture: "dark", faces: true,
	elements: [box("door_latch", [-2.7, 4.2, 7.8], [-2.4, 5.4, 9.2])],
});
console.log("reshaped open project");
