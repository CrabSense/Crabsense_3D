// Crab-box manifolds: surface DN27, bottom DN34. Fittings auto-size to 27/34/60.
import fs from "fs";

const dir = "src/main/resources/assets/crabsense_ras/models/block";
const od = (dn) => (dn / 27) * 0.9;
const pvc = () => ({
	north: { uv: [0, 0, 16, 16], texture: "#pvc" },
	east: { uv: [0, 0, 16, 16], texture: "#pvc" },
	south: { uv: [0, 0, 16, 16], texture: "#pvc" },
	west: { uv: [0, 0, 16, 16], texture: "#pvc" },
	up: { uv: [0, 0, 16, 16], texture: "#pvc" },
	down: { uv: [0, 0, 16, 16], texture: "#pvc" },
});
const cube = (name, from, to) => ({ name, from, to, faces: pvc() });
const model = (elements) => ({
	format_version: "26.3",
	ambientocclusion: false,
	textures: { pvc: "crabsense_ras:block/drum_pvc", particle: "crabsense_ras:block/drum_pvc" },
	elements,
});
const lift = (elements, dy) => elements.map((e) => ({ ...e, from: [e.from[0], round(e.from[1] + dy), e.from[2]], to: [e.to[0], round(e.to[1] + dy), e.to[2]] }));
const write = (name, elements) => {
	fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(model(elements), null, "\t") + "\n");
	fs.writeFileSync(`${dir}/${name}_upper.json`, JSON.stringify(model(lift(elements, 8)), null, "\t") + "\n");
};
const round = (n) => Math.round(n * 100) / 100;
// Half-height box: short run just under the drain outlet.
const y0 = -2.26;
const y1 = -1.36;
const yc = (y0 + y1) / 2;
const band = (dn) => {
	const h = od(dn) / 2;
	return [round(yc - h), round(yc + h)];
};
const zRun = (name, cx, cz, dn, z0, z1) => {
	const h = od(dn) / 2;
	const [a, b] = band(dn);
	return cube(name, [round(cx - h), a, z0], [round(cx + h), b, z1]);
};
const xRun = (name, cx, cz, dn, x0, x1) => {
	const h = od(dn) / 2;
	const [a, b] = band(dn);
	return cube(name, [x0, a, round(cz - h)], [x1, b, round(cz + h)]);
};

const BX = 14.0, BZ = 8.0, SX = 8.0, SZ = 13.15;
const B = 34, S = 27;
const bh = od(B) / 2, sh = od(S) / 2;
// Three front slots are evenly spaced: spray, surface drain, bottom drain.
const sprayX = 2.4;
const sprayY = 7.35;

const stem = (x, z, h) => cube("stem", [round(x - h), round(yc), round(z - h)], [round(x + h), -1.05, round(z + h)]);
write("crab_box_pipe_drops", [
	stem(BX, BZ, bh),
	stem(SX, SZ, sh),
]);
write("crab_box_pipe_bottom_n", [zRun("arm", BX, BZ, B, -1.2, round(BZ + 0.2))]);
write("crab_box_pipe_bottom_s", [zRun("arm", BX, BZ, B, round(BZ - 0.2), 16.2)]);
write("crab_box_pipe_bottom_e", [xRun("arm", BX, BZ, B, round(BX - 0.2), 15.8)]);
write("crab_box_pipe_bottom_w", [xRun("arm", BX, BZ, B, 0.2, round(BX + 0.2))]);
write("crab_box_pipe_surface_n", [zRun("arm", SX, SZ, S, -1.2, round(SZ + 0.2))]);
write("crab_box_pipe_surface_s", [zRun("arm", SX, SZ, S, round(SZ - 0.2), 16.2)]);
write("crab_box_pipe_surface_e", [xRun("arm", SX, SZ, S, round(SX - 0.2), 15.8)]);
write("crab_box_pipe_surface_w", [xRun("arm", SX, SZ, S, 0.2, round(SX + 0.2))]);
write("crab_box_spray_pipe", [
	cube("spray_pipe", [round(sprayX - sh), sprayY - sh, -1.2],
		[round(sprayX + sh), sprayY + sh, 16.5]),
]);

// Vertical T risers at the north and south pipe ends, one per drain line.
const riserAt = (cx, cz, dn, yFrom, yTo) => {
	const h = od(dn) / 2;
	const center = Math.abs(yFrom - (y0 + 8)) < 0.2 ? yc + 8 : yc;
	const yA = round(center - h);
	return [
		cube("riser", [round(cx - h), Math.min(yA, yFrom), round(cz - h)], [round(cx + h), yTo, round(cz + h)]),
	];
};
// Keep both T hubs inside the box: north/south pipe ends point inward instead of protruding.
const ends = [-0.35, 15.35];
const drains = [[BX, B], [SX, S]];
const between = { n: [], s: [] };
const betweenTop = { n: [], s: [] };
const aboveLow = [];
const aboveHigh = [];
for (const z of ends) {
	const side = z < 8 ? "n" : "s";
	for (const [x, dn] of drains) {
		between[side].push(...riserAt(x, z, dn, y0, 15.3));
		betweenTop[side].push(...riserAt(x, z, dn, y0, y1 + 8));
		aboveLow.push(...riserAt(x, z, dn, y0, y1 + 17.4));
		aboveHigh.push(...riserAt(x, z, dn, y0 + 8, y1 + 17.4));
	}
}
write("crab_box_riser_tiers_n", between.n);
write("crab_box_riser_tiers_s", between.s);
write("crab_box_riser_tiers_top_n", betweenTop.n);
write("crab_box_riser_tiers_top_s", betweenTop.s);
write("crab_box_riser_above", aboveLow);
write("crab_box_riser_above_top", aboveHigh);
const upperFeed = [];
const sprayLink = { n: [], s: [] };
for (const z of ends) {
	for (const [x, dn] of drains) {
		const h = od(dn) / 2;
		upperFeed.push(cube("rise", [round(x - h), -1.2, round(z - h)], [round(x + h), 10.2, round(z + h)]));
		upperFeed.push(z < 8
			? cube("into", [round(x - h), 8.9, round(z)], [round(x + h), 10.15, 1.5])
			: cube("into", [round(x - h), 8.9, 14.5], [round(x + h), 10.15, round(z)]));
	}
	const h = sh;
	sprayLink[z < 8 ? "n" : "s"].push(cube("spray_link", [round(sprayX - h), round(sprayY - h), round(z - h)], [round(sprayX + h), 15.5, round(z + h)]));
}
write("crab_box_upper_feed", upperFeed);
write("crab_box_spray_link_n", sprayLink.n);
write("crab_box_spray_link_s", sprayLink.s);
const sprayNext = { n: [], s: [] };
for (const z of ends) {
	const h = sh;
	sprayNext[z < 8 ? "n" : "s"].push(cube("spray_next", [round(sprayX - h), round(sprayY + 8 - h), round(z - h)], [round(sprayX + h), round(sprayY + 16 + h), round(z + h)]));
}
write("crab_box_spray_next_n", sprayNext.n);
write("crab_box_spray_next_s", sprayNext.s);
const sprayDown = { n: [], s: [] };
for (const z of ends) {
	const h = sh;
	sprayDown[z < 8 ? "n" : "s"].push(cube("spray_down", [round(sprayX - h), round(sprayY - 8 - h), round(z - h)], [round(sprayX + h), round(sprayY + h), round(z + h)]));
}
write("crab_box_spray_down_n", sprayDown.n);
write("crab_box_spray_down_s", sprayDown.s);
const toNext = [];
for (const z of ends) {
	for (const [x, dn] of [...drains, [sprayX, S]]) {
		const h = od(dn) / 2;
		toNext.push(cube("to_next", [round(x - h), 6.2, round(z - h)], [round(x + h), 15.3, round(z + h)]));
	}
}
write("crab_box_riser_to_next", toNext);
const downTall = [];
const downLow = [];
for (const z of ends) {
	for (const [x, dn] of drains) {
		downTall.push(...riserAt(x, z, dn, y0 + 8 - 16, y1));
		downLow.push(...riserAt(x, z, dn, y0 - 16, y1));
	}
}
write("crab_box_riser_down_tall", downTall);
write("crab_box_riser_down_low", downLow);
const bottomUp = [];
for (const z of ends) {
	for (const [x, dn] of drains) {
		bottomUp.push(...riserAt(x, z, dn, y1, y1 + 8));
		const h = od(dn) / 2;
		const outward = z < 8
			? cube("bottom_outlet", [round(x - h), y1 - 0.05, round(z - h - 1.2)], [round(x + h), y1 + 0.55, round(z - h)])
			: cube("bottom_outlet", [round(x - h), y1 - 0.05, round(z + h)], [round(x + h), y1 + 0.55, round(z + h + 1.2)]);
		bottomUp.push(outward);
	}
}
write("crab_box_riser_bottom_up", bottomUp);

const lines = [];
const box = JSON.parse(fs.readFileSync(`${dir}/crab_box.json`, "utf8"));
for (const e of box.elements) {
	if (e.name === "north_notch_door" || e.name === "south_notch_door") {
		e.to[1] = 6.55;
	}
	if (/^(north|south)_notch_(surface|bottom)$/.test(e.name)) {
		e.to[1] = 5.35;
	}
}
fs.writeFileSync(`${dir}/crab_box.json`, JSON.stringify(box, null, "\t") + "\n");
const openBox = structuredClone(box);
for (const e of openBox.elements) {
	if (/^(door_|bar_)/.test(e.name ?? "")) {
		// The left edge at z=2.1 is the hinge; swing the panel outward from there.
		e.rotation = { origin: [0, 0, 2.1], axis: "y", angle: -100 };
	}
}
fs.writeFileSync(`${dir}/crab_box_open.json`, JSON.stringify(openBox, null, "\t") + "\n");
for (const e of box.elements) {
	if (!e.from) continue;
	e.from[1] = round(e.from[1] + 8);
	e.to[1] = round(e.to[1] + 8);
}
fs.writeFileSync(`${dir}/crab_box_upper.json`, JSON.stringify(box, null, "\t") + "\n");
for (const e of openBox.elements) {
	if (!e.from) continue;
	e.from[1] = round(e.from[1] + 8);
	e.to[1] = round(e.to[1] + 8);
}
fs.writeFileSync(`${dir}/crab_box_open_upper.json`, JSON.stringify(openBox, null, "\t") + "\n");
fs.copyFileSync(`${dir}/crab_box_open.json`, `${dir}/crab_box_open_low.json`);
fs.copyFileSync(`${dir}/crab_box_open_upper.json`, `${dir}/crab_box_open_high_upper.json`);

const part = (when, modelName) => {
	const lower = { apply: { model: `crabsense_ras:block/${modelName}` } };
	if (when) lower.when = when;
	lines.push(lower);
	lines.push({ apply: { model: `crabsense_ras:block/${modelName}_upper` }, when: { ...(when ?? {}), layers: "2" } });
};
lines.push({ apply: { model: "crabsense_ras:block/crab_box" }, when: { open_low: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_open_low" }, when: { open_low: "true" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_upper" }, when: { layers: "2", open_high: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_open_high_upper" }, when: { layers: "2", open_high: "true" } });
part(null, "crab_box_pipe_drops");
part(null, "crab_box_pipe_bottom_n");
part(null, "crab_box_pipe_bottom_s");
part(null, "crab_box_pipe_surface_n");
part(null, "crab_box_pipe_surface_s");
part(null, "crab_box_spray_pipe");
part({ east: "true" }, "crab_box_pipe_bottom_e");
part({ east: "true" }, "crab_box_pipe_surface_e");
part({ west: "true" }, "crab_box_pipe_bottom_w");
part({ west: "true" }, "crab_box_pipe_surface_w");
const lidFaces = () => ({
	north: { uv: [0, 0, 16, 16], texture: "#lid" },
	east: { uv: [0, 0, 16, 16], texture: "#lid" },
	south: { uv: [0, 0, 16, 16], texture: "#lid" },
	west: { uv: [0, 0, 16, 16], texture: "#lid" },
	up: { uv: [0, 0, 16, 16], texture: "#lid" },
	down: { uv: [0, 0, 16, 16], texture: "#lid" },
});
const lidModel = (y) => ({
	format_version: "26.3",
	ambientocclusion: false,
	textures: { lid: "crabsense_ras:block/lid_white", particle: "crabsense_ras:block/lid_white" },
	elements: [{ name: "lid", from: [0.15, y, 0.15], to: [15.85, round(y + 0.45), 14.85], faces: lidFaces() }],
});
fs.writeFileSync(`${dir}/crab_box_lid.json`, JSON.stringify(lidModel(7.7), null, "\t") + "\n");
fs.writeFileSync(`${dir}/crab_box_lid_upper.json`, JSON.stringify(lidModel(15.7), null, "\t") + "\n");
lines.push({ apply: { model: "crabsense_ras:block/crab_box_lid" }, when: { layers: "1", up: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_lid_upper" }, when: { layers: "2", up: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_riser_tiers_n" }, when: { layers: "2", up: "true", north: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_riser_tiers_s" }, when: { layers: "2", up: "true", south: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_riser_tiers_top_n" }, when: { layers: "2", up: "false", north: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_riser_tiers_top_s" }, when: { layers: "2", up: "false", south: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_link_n" }, when: { layers: "2", north: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_link_s" }, when: { layers: "2", south: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_next_n" }, when: { layers: "2", up: "true", north: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_next_s" }, when: { layers: "2", up: "true", south: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_down_n" }, when: { join: "2", north: "false" } });
lines.push({ apply: { model: "crabsense_ras:block/crab_box_spray_down_s" }, when: { join: "2", south: "false" } });
fs.writeFileSync("src/main/resources/assets/crabsense_ras/blockstates/crab_box.json", JSON.stringify({ multipart: lines }, null, "\t") + "\n");
console.log({ od27: od(27), od34: od(34), od60: od(60), pipeY: [y0, y1] });
process.exit(0);

function fitting(kind, dn) {
	const h = od(dn) / 2;
	const hub = h + 0.18;
	const c = 8;
	if (kind === "tee") {
		return [
			cube("run", [round(c - h), round(c - h), 1], [round(c + h), round(c + h), 15]),
			cube("branch", [round(c - h), round(c - h), round(c - h)], [round(c + h + 6), round(c + h), round(c + h)]),
			cube("hub", [round(c - hub), round(c - hub), round(c - hub)], [round(c + hub), round(c + hub), round(c + hub)]),
		];
	}
	if (kind === "elbow") {
		return [
			cube("in", [round(c - h), round(c - h), round(c - h)], [round(c + h), round(c + h), 15]),
			cube("out", [round(c - h), round(c - h), round(c - h)], [15, round(c + h), round(c + h)]),
			cube("hub", [round(c - hub), round(c - hub), round(c - hub)], [round(c + hub), round(c + hub), round(c + hub)]),
		];
	}
	return [
		cube("socket", [round(c - h), round(c - h), round(c - 1)], [round(c + h), round(c + h), 15]),
		cube("plug", [round(c - h - 0.12), round(c - h - 0.12), round(c - 1.4)], [round(c + h + 0.12), round(c + h + 0.12), round(c - 0.4)]),
	];
}

const sizes = [27, 34, 60];
const kinds = ["tee", "elbow", "cap"];
for (const kind of kinds) {
	for (const dn of sizes) {
		write(`pvc_${kind}_dn${dn}`, fitting(kind, dn));
	}
	fs.copyFileSync(`${dir}/pvc_${kind}_dn34.json`, `${dir}/pvc_${kind}.json`);
	const variants = {};
	for (const dn of sizes) {
		const m = `crabsense_ras:block/pvc_${kind}_dn${dn}`;
		variants[`dn=${dn},facing=south`] = { model: m };
		variants[`dn=${dn},facing=west`] = { model: m, y: 90 };
		variants[`dn=${dn},facing=north`] = { model: m, y: 180 };
		variants[`dn=${dn},facing=east`] = { model: m, y: 270 };
	}
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/blockstates/pvc_${kind}.json`, JSON.stringify({ variants }, null, "\t") + "\n");
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/models/item/pvc_${kind}.json`, JSON.stringify({ parent: `crabsense_ras:block/pvc_${kind}_dn34` }) + "\n");
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/items/pvc_${kind}.json`, JSON.stringify({ model: { type: "minecraft:model", model: `crabsense_ras:block/pvc_${kind}_dn34` } }, null, "\t") + "\n");
}

console.log({ od27: od(27), od34: od(34), od60: od(60) });
