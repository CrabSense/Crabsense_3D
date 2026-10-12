import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CRC = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();
const crc32 = (buf) => {
	let c = -1;
	for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
};
const png = (w, h, pixels) => {
	const raw = Buffer.alloc((w * 4 + 1) * h);
	for (let y = 0; y < h; y++) {
		raw[y * (w * 4 + 1)] = 0;
		for (let x = 0; x < w; x++) {
			const [r, g, b, a] = pixels[y][x];
			const o = y * (w * 4 + 1) + 1 + x * 4;
			raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
	]);
};
const hex = (h) => {
	const n = parseInt(h.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};
const paint = (fn) => Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => hex(fn(x, y))));
const dir = "src/main/resources/assets/crabsense_ras/textures/block";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/crab_box.png`, png(16, 16, paint((x, y) => (y < 2 ? "#3b82f6" : (x + y) % 7 === 0 ? "#1d4ed8" : "#1e40af"))));
writeFileSync(`${dir}/crab_box_dark.png`, png(16, 16, paint(() => "#082f6b")));
writeFileSync(`${dir}/crab_box_hatch.png`, png(16, 16, paint((x, y) => (x % 3 === 0 || y % 3 === 0 ? "#dbeafe" : "#93c5fd"))));

const face = (t) => ({ north: { texture: t }, south: { texture: t }, east: { texture: t }, west: { texture: t }, up: { texture: t }, down: { texture: t } });
const box = (from, to, t = "#box") => ({ from, to, faces: face(t) });
const elements = [
	box([0, 0, 0], [16, 1, 13]),
	box([0, 1, 0], [16, 9, 1]),
	box([0, 1, 12], [16, 9, 13]),
	box([0, 1, 1], [1, 9, 12]),
	box([15, 1, 1], [16, 9, 12]),
	// U-notches cut into the top rim of the long wall.
	box([0, 9, 0], [2.2, 11, 1.3]), box([4.2, 9, 0], [6.6, 11, 1.3]),
	box([8.6, 9, 0], [11, 11, 1.3]), box([13, 9, 0], [16, 11, 1.3]),
	box([0, 9, 11.7], [16, 11, 13]),
	box([0, 9, 1.3], [1.3, 11, 11.7]),
	box([14.7, 9, 1.3], [16, 11, 11.7]),
	// Side fins, like the stacked ribs on the real box.
	box([-0.8, 2, 2], [0, 8.5, 2.5]), box([-0.8, 2, 4.2], [0, 8.5, 4.7]),
	box([-0.8, 2, 6.4], [0, 8.5, 6.9]), box([-0.8, 2, 8.6], [0, 8.5, 9.1]),
	// Diamond ribs, simplified as a grid on the front.
	...[2, 4.2, 6.4, 8.6, 10.8, 13].flatMap((x) => [2.2, 4.2, 6.2].map((y) => box([x, y, -0.35], [x + 1.1, y + 1.1, 0]))),
	// Clear hatch standing open beside the box.
	box([-2.2, 1.5, 3], [-1.5, 8.8, 10], "#hatch"),
	box([-1.2, 4.6, 6], [-0.6, 6.2, 7.4], "#dark"),
	// Round ports with a dark bore.
	box([3, 2, -1.5], [5.2, 4.2, 0.2]),
	box([3.7, 2.7, -1.55], [4.5, 3.5, -1.48], "#dark"),
	box([15.8, 5.2, 4], [17.4, 7.2, 6.2]),
	box([17.35, 5.8, 4.7], [17.45, 6.6, 5.5], "#dark"),
	box([7.4, 1, 6], [8.4, 1.3, 7], "#dark"),
];
const model = {
	parent: "block/block",
	ambientocclusion: false,
	textures: {
		particle: "crabsense_ras:block/crab_box",
		box: "crabsense_ras:block/crab_box",
		dark: "crabsense_ras:block/crab_box_dark",
		hatch: "crabsense_ras:block/crab_box_hatch",
	},
	elements,
};
writeFileSync("src/main/resources/assets/crabsense_ras/models/block/crab_box.json", `${JSON.stringify(model, null, "\t")}\n`);
console.log(`crab box elements ${elements.length}`);
