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
function solidPng(r, g, b) {
	const raw = Buffer.alloc((16 * 4 + 1) * 16);
	for (let y = 0; y < 16; y++) {
		raw[y * 65] = 0;
		for (let x = 0; x < 16; x++) {
			const o = y * 65 + 1 + x * 4;
			const shade = y < 3 ? 28 : 0;
			raw[o] = Math.min(255, r + shade);
			raw[o + 1] = Math.min(255, g + shade);
			raw[o + 2] = Math.min(255, b + shade);
			raw[o + 3] = 255;
		}
	}
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	const crc32 = (buf) => { let c = -1; for (const v of buf) c = table[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "color", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const blue = solidPng(21, 74, 176).toString("base64");
const pale = solidPng(186, 224, 246).toString("base64");
await call("create_texture", { name: "box_flat", width: 16, height: 16, data: `data:image/png;base64,${blue}` });
await call("create_texture", { name: "door_flat", width: 16, height: 16, data: `data:image/png;base64,${pale}` });
const outline = JSON.parse((await call("list_outline")).content[0].text);
for (const root of outline.roots) {
	for (const child of root.children ?? []) {
		const dark = /hole|mouth|pin|slot|bore|drain_hole|drain_outlet/.test(child.name);
		const door = root.name === "SIDE_HATCH" && !dark;
		const texture = dark ? "dark" : door ? "door_flat" : "box_flat";
		await call("apply_texture", { id: child.uuid, texture, applyTo: "all" });
	}
}
const code = `(() => {
const hatch = Group.all.find(g => g.name === 'SIDE_HATCH');
if (!hatch) return {ok:false};
hatch.origin = [1.1, 5, 2.1];
hatch.rotation = [0, -75, 0];
return {ok:true, rotation: hatch.rotation};
})()`;
const spun = await call("risky_eval", { code });
console.log(spun.content?.[0]?.text ?? "rotated");
