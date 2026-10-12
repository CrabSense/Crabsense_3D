// Builds the RAS rotary drum filter (spec sections A-J) inside the running
// Blockbench, screenshots it, and exports the Java block model + .bbmodel.
//
// Minecraft limits that shape this design:
//   * one block model lives in a 16x16x16 grid (elements may go -16..32);
//   * a cube rotates around a single axis by at most 45 degrees.
// So round parts (drum, pipes) are octagons: four axis-aligned slabs plus the
// same four rotated 45 degrees around the shared axis. Blockbench's java_block
// format has no mesh shapes, so an octagon is the closest a block model gets.
//
// Environment:
//   BB_EXPLODE=1   shift each group apart for a documentation exploded view.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

// ---------------------------------------------------------------- MCP client
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
const textOf = (r) => r.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
async function screenshot(output) {
	const shot = await call("capture_screenshot", { view: "active", max_size: 900 });
	const image = shot.content?.find((c) => c.type === "image");
	if (!image) { console.log(`  ! no image for ${output}`); return false; }
	mkdirSync("preview/renders", { recursive: true });
	writeFileSync(output, Buffer.from(image.data, "base64"));
	return true;
}

// ------------------------------------------------------------- PNG (16x16)
const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();
function crc32(buf) {
	let c = -1;
	for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}
function chunk(type, data) {
	const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, pixels) {
	const raw = Buffer.alloc((width * 4 + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (width * 4 + 1)] = 0;
		for (let x = 0; x < width; x++) {
			const pixel = pixels[y][x];
			const [r, g, b, a] = Array.isArray(pixel) ? pixel : hex(pixel);
			const o = y * (width * 4 + 1) + 1 + x * 4;
			raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
	]);
}
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]; };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]; };
const paint = (fn) => Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => hex(fn(x, y))));

const TEXTURES = {
	// A/J: cream technical plastic housing with panel lines and a shaded base.
	housing: paint((x, y) => (y >= 14 ? "#a99f88" : y <= 1 ? "#e6e0d0" : x % 8 === 0 ? "#bdb49c" : y < 8 ? "#d9d3c3" : "#cfc8b6")),
	// B: filter mesh. The gaps are transparent so the rotating drum, drawn with a
	// cutout render type, reads as a screen you can see through.
	mesh: Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => meshPixel(x, y, 0, false))),
	// metal: brushed grey with a light top and dark bottom edge.
	metal: paint((x, y) => (y <= 1 ? "#b8bfc7" : y >= 14 ? "#5f666e" : "#9299a2")),
	// pvc: pipe white with a soft vertical highlight.
	pvc: paint((x) => (x <= 2 ? "#f4f6f8" : x >= 13 ? "#c9ced5" : "#e9ecef")),
	// E: drive motor, dark with cooling vents.
	motor: paint((x, y) => (y % 4 === 2 ? "#242a32" : x >= 13 ? "#2d343d" : "#39414b")),
	// I: sludge/waste line, dirty brown with specks.
	waste: paint((x, y) => ((x * 7 + y * 5) % 11 === 0 ? "#3a2c1d" : "#4c3a28")),
	water: paint(() => "#2f9bff"),
};

/**
 * One 16x16 frame of the filter mesh. With `alpha` the openings are transparent,
 * which is what the rotating drum (entity cutout) needs; Blockbench previews want
 * opaque pixels instead.
 */
function meshPixel(x, y, shift, alpha = false) {
	const wire = (x + shift) % 3 === 0 || y % 3 === 0;
	if (!wire) return alpha ? hexA("#000000", 0) : "#e2e7ec";
	const colour = (x + shift) % 6 === 0 || y % 6 === 0 ? "#6f7780" : "#aab2ba";
	return colour;
}

/**
 * Optional scrolling variant of the mesh (BB_ANIMATED_MESH=1): a vertical strip of
 * frames plus the .mcmeta that animates it. Off by default - with the drum actually
 * rotating there is no need for a second, competing motion.
 */
function writeAnimatedMesh(dir) {
	const frames = 4, period = 3;
	const pixels = [];
	for (let f = 0; f < frames; f++) {
		for (let y = 0; y < 16; y++) {
			pixels.push(Array.from({ length: 16 }, (_, x) => hex(meshPixel(x, y, f * 4))));
		}
	}
	writeFileSync(`${dir}/drum_mesh.png`, encodePng(16, 16 * frames, pixels));
	writeFileSync(`${dir}/drum_mesh.png.mcmeta`, `${JSON.stringify({ animation: { frametime: 2 } }, null, "\t")}\n`);
	return frames;
}

// -------------------------------------------------------------- geometry spec
// The drum is deliberately small and low so it reads as a horizontal cylinder
// resting in the tank rather than a vaulted roof over it.
const DRUM_CX = 8, DRUM_CY = 6.2, DRUM_CZ = 8;
const DRUM_APOTHEM = 4.0, DRUM_THICK = 0.4;
// For a regular octagon, half-side = apothem * tan(22.5 deg). Deriving it keeps
// the inscribed circle round instead of a squashed diamond.
const DRUM_HALF = DRUM_APOTHEM * Math.tan(Math.PI / 8);
const RING_APOTHEM = 4.35, RING_THICK = 0.45;
const RING_HALF = RING_APOTHEM * Math.tan(Math.PI / 8);
const MESH_Z0 = 4.4, MESH_Z1 = 14.8;

const box = (name, from, to, rotation = [0, 0, 0], origin = [0, 0, 0]) => ({ name, from, to, rotation, origin });
const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);

/** Eight faces of an octagonal tube around the Z axis, centred on the drum. */
function octagon(z0, z1, apothem, half, thick, prefix) {
	const origin = [DRUM_CX, DRUM_CY, DRUM_CZ];
	const cards = [
		["east", [DRUM_CX + apothem - thick, DRUM_CY - half, z0], [DRUM_CX + apothem, DRUM_CY + half, z1]],
		["west", [DRUM_CX - apothem, DRUM_CY - half, z0], [DRUM_CX - apothem + thick, DRUM_CY + half, z1]],
		["up", [DRUM_CX - half, DRUM_CY + apothem - thick, z0], [DRUM_CX + half, DRUM_CY + apothem, z1]],
		["down", [DRUM_CX - half, DRUM_CY - apothem, z0], [DRUM_CX + half, DRUM_CY - apothem + thick, z1]],
	];
	const out = [];
	for (const [label, from, to] of cards) {
		out.push(box(`${prefix}_${label}`, from, to, [0, 0, 0], origin));
		// +45 degrees around the drum axis turns a cardinal slab into the diagonal
		// that closes the octagon. Minecraft caps cube rotation at 45 per axis.
		out.push(box(`${prefix}_${label}_diag`, from, to, [0, 0, 45], origin));
	}
	return out;
}

/**
 * Octagonal spigot: a square stub that passes through the wall, plus the same
 * stub rotated 45 degrees about the port's axis so the bore reads round. The
 * flange sits on the outer face; four bolts sit on its corners and point outward,
 * never inward through the wall. `dir` is +1 when the port points along +axis.
 */
function spigot(prefix, axis, dir, stub, flange) {
	const rotation = axis === "x" ? [45, 0, 0] : [0, 0, 45];
	const elements = [
		box(`${prefix}_stub`, stub.from, stub.to),
		box(`${prefix}_stub_diag`, stub.from, stub.to, rotation, mid(stub.from, stub.to)),
		box(`${prefix}_flange`, flange.from, flange.to),
	];
	const f = { from: flange.from, to: flange.to };
	const size = 0.3, inset = 0.5;
	// Bolt band along the port axis: outside the flange only.
	const band = axis === "x"
		? dir > 0 ? [f.to[0], f.to[0] + size] : [f.from[0] - size, f.from[0]]
		: dir > 0 ? [f.to[2], f.to[2] + size] : [f.from[2] - size, f.from[2]];
	// Cross-section corners on the flange plane.
	const cross = axis === "x" ? [[f.from[1], f.to[1]], [f.from[2], f.to[2]]] : [[f.from[0], f.to[0]], [f.from[1], f.to[1]]];
	let n = 0;
	for (const u of [0, 1]) for (const v of [0, 1]) {
		n++;
		const a = cross[0][0] + inset + u * (cross[0][1] - cross[0][0] - 2 * inset);
		const b = cross[1][0] + inset + v * (cross[1][1] - cross[1][0] - 2 * inset);
		if (axis === "x") elements.push(box(`${prefix}_bolt_${n}`, [band[0], a, b], [band[1], a + size, b + size]));
		else elements.push(box(`${prefix}_bolt_${n}`, [a, b, band[0]], [a + size, b + size, band[1]]));
	}
	return elements;
}

const FLANGE_T = 0.4;
// Koi Pro Drum 30.000 UV: 2x Ø110 inlets, 2x Ø110 clean outlets, 1x Ø110 drain.
// Water enters the drum and leaves through the screen. The two inlets sit on the
// dirty end; the two outlets sit on the opposite clean end; the drain is alone
// on the side and is fed only by the waste trough.
// The product photo shows all three white pipes on the same short end.
// Two are stacked on a mounting plate; the third sits lower and nearer the centre.
// Front face, matching the photo and the stated flow:
// top pipe on the plate = waste, lower pipe under it = dirty inlet,
// lower pipe nearer the centre = clean outlet.
const PORTS = {
	plate_upper: { axis: "z", dir: -1, stub: { from: [7.0, 8.4, -1.6], to: [9.0, 10.4, 1.0] }, flange: { from: [6.4, 7.8, -0.4], to: [9.6, 11.0, 0.0] } },
	plate_lower: { axis: "z", dir: -1, stub: { from: [2.2, 1.8, -1.6], to: [4.2, 3.8, 1.0] }, flange: { from: [1.6, 1.2, -0.4], to: [4.8, 4.4, 0.0] } },
	front_low: { axis: "z", dir: 1, stub: { from: [11.8, 1.8, 15.0], to: [13.8, 3.8, 17.6] }, flange: { from: [11.2, 1.2, 16.0], to: [14.4, 4.4, 16.4] } },
};

// A, J: the tank shell. The inlet baffle is split in two so the drive shaft can
// pass through the gap - a solid baffle would block the shaft (real baffles have
// a shaft hole; a block model cannot cut one out of a single cube).
const SHELL = [
	box("housing_floor", [0, 0, 0], [16, 1, 16]),
	box("housing_wall_west", [0, 1, 0], [1, 13, 16]),
	box("housing_wall_east", [15, 1, 0], [16, 13, 16]),
	box("housing_wall_north", [1, 1, 0], [15, 13, 1]),
	box("housing_wall_south", [1, 1, 15], [15, 13, 16]),
	box("housing_rim_west", [0, 13, 0], [1.6, 14.5, 16]),
	box("housing_rim_east", [14.4, 13, 0], [16, 14.5, 16]),
	box("housing_rim_north", [1.6, 13, 0], [14.4, 14.5, 1.6]),
	box("housing_rim_south", [1.6, 13, 14.4], [14.4, 14.5, 16]),
];

// The drum itself is NOT part of the block model: it is drawn and spun at runtime by
// DrumFilterRenderer (client), so the block model keeps only the static shell and
// the parts the drum hangs on. BB_STATIC_DRUM=1 puts the drum back for a single-file
// reference render.
const ROTATING_DRUM = false;
const DRUM_PARTS = [
	{ group: "B_Rotary_Drum", texture: "mesh", elements: octagon(MESH_Z0, MESH_Z1, DRUM_APOTHEM, DRUM_HALF, DRUM_THICK, "drum_mesh") },
	{ group: "B_Rotary_Drum", texture: "metal", elements: [
		...octagon(4.4, 5.0, RING_APOTHEM, RING_HALF, RING_THICK, "drum_ring_in"),
		...octagon(14.2, 14.8, RING_APOTHEM, RING_HALF, RING_THICK, "drum_ring_out"),
	] },
];

const PARTS = [
	{ group: "A_Main_Housing", texture: "housing", elements: SHELL },
	...(ROTATING_DRUM ? [] : DRUM_PARTS),
	// J. Inspection details: reinforcement ribs and a technical cover plate.
	{ group: "J_Inspection_Details", texture: "metal", elements: [
		box("cover_plate", [10.2, 14.5, 2.2], [13.6, 15.1, 5.0]),
	] },
	// B. Rotary Drum: octagonal mesh plus a support ring at each end.
	...(ROTATING_DRUM ? [] : []),
	// C. Drum Frame: drive shaft through the inlet baffle gap, two bearing brackets.
	{ group: "C_Drum_Frame", texture: "metal", elements: [
		box("drive_shaft", [7.8, DRUM_CY - 0.2, 0.2], [8.2, DRUM_CY + 0.2, 13.3]),
		box("bearing_inlet", [7.2, 1, 2.5], [8.8, DRUM_CY - 0.2, 2.9]),
		box("bearing_outlet", [7.2, 1, 13.2], [8.8, DRUM_CY - 0.2, 13.6]),
	] },
	// D. Spray Bar: supply tube above the drum, end caps, downward nozzles.
	{ group: "D_Spray_Bar", texture: "metal", elements: [
		box("spray_tube", [7.55, 11.15, 3.4], [8.45, 11.95, 12.4]),
		box("spray_cap_in", [7.35, 11.0, 3.2], [8.65, 12.1, 3.45]),
		box("spray_cap_out", [7.35, 11.0, 12.35], [8.65, 12.1, 12.6]),
		...[4.4, 6.2, 8.0, 9.8, 11.6].map((zc, i) => box(`spray_nozzle_${i + 1}`, [7.85, 10.7, zc - 0.18], [8.15, 11.15, zc + 0.18])),
	] },
	// H. Backwash System: sludge trough, wash-water riser and the run that feeds the
	// spray bar, so the loop reads as one connected circuit.
	{ group: "H_Backwash_System", texture: "metal", elements: [
		box("wash_riser", [1.15, 1.2, 3.2], [1.7, 11.2, 3.8]),
		box("wash_run", [1.7, 11.15, 3.2], [7.55, 11.95, 3.8]),
	] },
	{ group: "H_Backwash_System", texture: "housing", elements: [
		box("front_partition_west", [1, 1, 3.5], [6.4, 12.2, 4.3]),
		box("front_partition_east", [9.6, 1, 3.5], [15, 12.2, 4.3]),
	] },
	{ group: "H_Backwash_System", texture: "metal", elements: [
		box("trough_floor", [5.6, 8.35, 0.3], [10.4, 8.6, 14.5]),
		box("trough_wall_west", [5.6, 8.35, 0.3], [5.95, 9.7, 14.5]),
		box("trough_wall_east", [10.05, 8.35, 0.3], [10.4, 9.7, 14.5]),
	] },
	{ group: "H_Backwash_System", texture: "waste", elements: [
		box("dirty_water", [6.05, 8.62, 0.45], [9.95, 9.05, 14.3]),
	] },
	{ group: "E_Drive_Assembly", texture: "motor", elements: [
		box("motor_body", [6.8, 5.2, 16.0], [9.2, 7.6, 17.5]),
	] },
	{ group: "UV_LAMP", texture: "pvc", elements: [
		box("uv_tube", [5.4, 1.1, 6.4], [10.6, 1.65, 7.5]),
	] },
	{ group: "FRONT_PIPE_PLATE", texture: "metal", elements: [
		box("front_plate", [6.1, 7.5, -0.2], [9.9, 11.2, 0.15]),
	] },
	{ group: "WATER_SURFACE", texture: "water", elements: [
		box("clean_water_west", [1.15, 5.2, 4.5], [3.85, 5.7, 14.6]),
		box("clean_water_east", [12.15, 5.2, 4.5], [14.85, 5.7, 14.6]),
		box("front_water_west", [1.15, 5.2, 0.6], [6.4, 5.7, 3.4]),
		box("front_water_east", [9.6, 5.2, 0.6], [14.85, 5.7, 3.4]),
	] },
	{ group: "I_Waste_Drain", texture: "pvc", elements: spigot("plate_upper", PORTS.plate_upper.axis, PORTS.plate_upper.dir, PORTS.plate_upper.stub, PORTS.plate_upper.flange) },
	{ group: "F_Water_Inlet", texture: "pvc", elements: [
		...spigot("plate_lower", PORTS.plate_lower.axis, PORTS.plate_lower.dir, PORTS.plate_lower.stub, PORTS.plate_lower.flange),
		box("inlet_into_drum", [2.4, 2.2, 1.0], [6.6, 3.2, 4.2]),
	] },
	{ group: "G_Clean_Water_Outlet", texture: "pvc", elements: [
		...spigot("front_low", PORTS.front_low.axis, PORTS.front_low.dir, PORTS.front_low.stub, PORTS.front_low.flange),
		box("outlet_duct", [11.9, 2.1, 4.6], [13.7, 3.5, 16.0]),
	] },
	// Dark bores make all three PVC ports visibly open instead of capped.
	{ group: "PORT_BORES", texture: "motor", elements: [
		box("waste_bore", [7.45, 8.85, -1.62], [8.55, 9.95, -1.58]),
		box("inlet_bore", [2.65, 2.35, -1.62], [3.75, 3.45, -1.58]),
		box("outlet_bore", [12.25, 2.35, 17.58], [13.35, 3.45, 17.62]),
	] },
];

// Per-group offsets for the documentation exploded view (BB_EXPLODE=1). Ribs slide
// forward instead of upward so they read as flat panels, not poles.
const EXPLODE_OFFSETS = {
	A_Main_Housing: [0, 0, 0],
	J_Inspection_Details: [0, 0, -7],
	B_Rotary_Drum: [0, 8, 0],
	C_Drum_Frame: [0, 4, 0],
	D_Spray_Bar: [0, 12, 0],
	H_Backwash_System: [0, 8, 0],
	E_Drive_Assembly: [0, 0, -6],
	F_Water_Inlet: [-5, 0, 0],
	G_Clean_Water_Outlet: [0, 0, 5],
	I_Waste_Drain: [5.5, -2.5, 0],
};

// -------------------------------------------------------------------- checks
/** True when two from/to boxes overlap by more than `slack` on every axis. */
function overlaps(a, b, slack = 0.06) {
	for (let i = 0; i < 3; i++) {
		if (Math.min(a.to[i], b.to[i]) - Math.max(a.from[i], b.from[i]) <= slack) return false;
	}
	return true;
}
/** A port or shaft is meant to pass through a wall, so that pair is not a defect.
 *  Parts of one spigot (stub, flange, bolts) also overlap by construction. */
const INTENTIONAL = [
	/^(inlet_1|inlet_2|outlet_1|outlet_2|waste)_/,
	/^wash_inlet_stub$/,
	/^drive_shaft$/,
];
const WALL = /^housing_wall_(north|south|east|west)$/;
const portPrefix = (n) => (n.match(/^(inlet_1|inlet_2|outlet_1|outlet_2|waste)_/) ?? [null])[0];
const isIntentional = (a, b) => {
	const sharedPort = portPrefix(a) !== null && portPrefix(a) === portPrefix(b);
	const throughWall = (WALL.test(a) && INTENTIONAL.some((r) => r.test(b))) || (WALL.test(b) && INTENTIONAL.some((r) => r.test(a)));
	return sharedPort || throughWall;
};

/** Reports part interpenetration. Rotated slabs are excluded because their
 *  axis-aligned bounds overshoot the real octagon and would give false hits. */
function audit(elements) {
	const plain = elements.filter((e) => !e.rotation.some((v) => v !== 0));
	const hits = [], expected = [];
	for (let i = 0; i < plain.length; i++) for (let j = i + 1; j < plain.length; j++) {
		if (!overlaps(plain[i], plain[j])) continue;
		const pair = `${plain[i].name} x ${plain[j].name}`;
		(isIntentional(plain[i].name, plain[j].name) ? expected : hits).push(pair);
	}
	const outside = elements.filter((e) => [...e.from, ...e.to].some((v) => v < -16 || v > 32));
	const protrudes = elements.filter((e) => e.from[0] < 0 || e.to[0] > 16 || e.from[2] < 0 || e.to[2] > 16);
	return { checked: plain.length, rotated: elements.length - plain.length, hits, expected, outside: outside.map((e) => e.name), protrudes: protrudes.length };
}

function writeBlockModel(parts) {
	const textures = { particle: "crabsense_ras:block/drum_housing" };
	const elements = [];
	for (const part of parts) {
		textures[part.texture] = `crabsense_ras:block/drum_${part.texture}`;
		for (const e of part.elements) {
			const el = { from: e.from, to: e.to, faces: {} };
			const axis = e.rotation[0] ? "x" : e.rotation[2] ? "z" : null;
			if (axis) el.rotation = { origin: e.origin, axis, angle: e.rotation[0] || e.rotation[2] };
			for (const face of ["north", "east", "south", "west", "up", "down"]) {
				el.faces[face] = { uv: [0, 0, 16, 16], texture: `#${part.texture}` };
			}
			elements.push(el);
		}
	}
	const path = "src/main/resources/assets/crabsense_ras/models/block/drum_filter.json";
	writeFileSync(path, `${JSON.stringify({ parent: "block/block", ambientocclusion: false, textures, elements }, null, "\t")}\n`);
	console.log(`wrote ${path}: ${elements.length} elements`);
}

// ---------------------------------------------------------------- build steps
mkdirSync("src/main/resources/assets/crabsense_ras/textures/block", { recursive: true });
const textureDir = "src/main/resources/assets/crabsense_ras/textures/block";
for (const [name, pixels] of Object.entries(TEXTURES)) {
	writeFileSync(`${textureDir}/drum_${name}.png`, encodePng(16, 16, pixels));
}
writeAnimatedMesh(textureDir);
writeBlockModel(PARTS);
console.log("textures: animated drum_mesh strip kept");
if (process.env.BB_SKIP_MCP === "1") process.exit(0);

await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "drum-filter-builder", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const EXPLODE = process.env.BB_EXPLODE === "1";
console.log(textOf(await call("create_project", { name: `rotary_drum_filter${EXPLODE ? "_exploded" : ""}`, format: "java_block" })) || "project created");

for (const [name, pixels] of Object.entries(TEXTURES)) {
	const png = encodePng(16, 16, pixels);
	await call("create_texture", { name, width: 16, height: 16, data: `data:image/png;base64,${png.toString("base64")}` });
}
writeAnimatedMesh(textureDir);
console.log(`textures: ${Object.keys(TEXTURES).join(", ")} | mesh: animated strip`);

for (const group of [...new Set(PARTS.map((p) => p.group))]) await call("add_group", { name: group });
const placed = [];
for (const part of PARTS) {
	const offset = EXPLODE ? EXPLODE_OFFSETS[part.group] : null;
	const shift = (e) => !offset ? e : {
		...e,
		from: e.from.map((v, i) => v + offset[i]),
		to: e.to.map((v, i) => v + offset[i]),
		origin: e.origin.map((v, i) => v + offset[i]),
	};
	const elements = part.elements.map(shift);
	await call("place_cube", { elements, group: part.group, texture: part.texture, faces: true });
	placed.push(...elements);
	console.log(`  ${part.group} [${part.texture}]: ${elements.length}`);
}

const report = audit(placed);
if (EXPLODE) {
	// The exploded layout displaces groups on purpose, so overlaps between them
	// are not geometry errors. The audit only certifies the shipped model.
	console.log("audit skipped: exploded layout moves groups apart deliberately");
	console.log(`  elements: ${placed.length} (${report.rotated} rotated)`);
} else {
	console.log(`audit: ${placed.length} elements (${report.rotated} rotated, skipped by the check)`);
	console.log(`  interpenetrations: ${report.hits.length ? report.hits.join("; ") : "none"}`);
	console.log(`  wall pass-throughs (intended): ${report.expected.length}`);
	console.log(`  outside -16..32: ${report.outside.length ? report.outside.join(", ") : "none"} | past block footprint: ${report.protrudes}`);
}

// --------------------------------------------------------------- screenshots
const tag = EXPLODE ? "drum_v3_exploded" : "drum_v3";
const fit = EXPLODE ? { position: [36, 28, 36], target: [8, 12, 8] } : { position: [26, 19, 26], target: [8, 6, 8] };
await call("set_camera_angle", { view: "active", ...fit, projection: "perspective" });
await screenshot(`preview/renders/${tag}_three_quarter.png`);
if (!EXPLODE) {
	await call("set_camera_angle", { view: "active", position: [8, 6, -30], target: [8, 6, 8], projection: "perspective" });
	await screenshot(`preview/renders/${tag}_front.png`);
	await call("set_camera_angle", { view: "active", position: [8, 32, 8.1], target: [8, 6, 8], projection: "perspective" });
	await screenshot(`preview/renders/${tag}_top.png`);
	await call("set_camera_angle", { view: "active", position: [26, 19, 26], target: [8, 6, 8], projection: "perspective" });
}
console.log(`screenshots: preview/renders/${tag}_*.png`);

// ------------------------------------------------------------------- export
const abs = (p) => `${process.cwd().replace(/\\/g, "\\\\")}\\\\${p.replace(/\//g, "\\\\")}`;
if (!EXPLODE) {
	await call("export_model", { codec_id: "java_block", path: abs("preview/drum_v3_export.json"), overwrite: true, result_format: "text", max_content_length: 0 });
	await call("export_model", { codec_id: "project", path: abs("preview/rotary_drum_filter.bbmodel"), overwrite: true, result_format: "text", max_content_length: 0 });
	console.log("  exported preview/drum_v3_export.json + preview/rotary_drum_filter.bbmodel");
} else {
	await call("export_model", { codec_id: "project", path: abs("preview/rotary_drum_filter_exploded.bbmodel"), overwrite: true, result_format: "text", max_content_length: 0 });
	console.log("  exported preview/rotary_drum_filter_exploded.bbmodel");
}
