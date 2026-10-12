// Crab-box manifolds: surface DN27, bottom DN34. Fittings auto-size to 27/34/60.
import fs from "fs";

const dir = "src/main/resources/assets/crabsense_ras/models/block";
const od = (dn) => (dn / 27) * 0.72;
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
const write = (name, elements) => {
	fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(model(elements), null, "\t") + "\n");
};
const round = (n) => Math.round(n * 100) / 100;
const zRun = (name, cx, cz, dn, z0, z1, y0 = -3.15, y1 = -2.35) => {
	const h = od(dn) / 2;
	return cube(name, [round(cx - h), y0, z0], [round(cx + h), y1, z1]);
};
const xRun = (name, cx, cz, dn, x0, x1) => {
	const h = od(dn) / 2;
	return cube(name, [x0, -3.15, round(cz - h)], [x1, -2.35, round(cz + h)]);
};

const BX = 14.0, BZ = 7.3, SX = 7.6, SZ = 13.15;
const B = 34, S = 27;
const bh = od(B) / 2, sh = od(S) / 2;

write("crab_box_pipe_drops", [
	cube("drop_bottom", [round(BX - bh), -2.3, round(BZ - bh)], [round(BX + bh), -1.8, round(BZ + bh)]),
	cube("tee_bottom", [round(BX - bh - 0.08), -3.25, round(BZ - bh - 0.08)], [round(BX + bh + 0.08), -2.2, round(BZ + bh + 0.08)]),
	cube("drop_surface", [round(SX - sh), -2.3, round(SZ - sh)], [round(SX + sh), -1.8, round(SZ + sh)]),
	cube("tee_surface", [round(SX - sh - 0.06), -3.25, round(SZ - sh - 0.06)], [round(SX + sh + 0.06), -2.2, round(SZ + sh + 0.06)]),
]);
write("crab_box_pipe_bottom_n", [zRun("arm", BX, BZ, B, -2, round(BZ - bh))]);
write("crab_box_pipe_bottom_s", [zRun("arm", BX, BZ, B, round(BZ + bh), 18)]);
write("crab_box_pipe_bottom_e", [xRun("arm", BX, BZ, B, round(BX + bh), 16)]);
write("crab_box_pipe_bottom_w", [xRun("arm", BX, BZ, B, 0, round(BX - bh))]);
write("crab_box_pipe_surface_n", [zRun("arm", SX, SZ, S, -2, round(SZ - sh))]);
write("crab_box_pipe_surface_s", [zRun("arm", SX, SZ, S, round(SZ + sh), 18)]);
write("crab_box_pipe_surface_e", [xRun("arm", SX, SZ, S, round(SX + sh), 16)]);
write("crab_box_pipe_surface_w", [xRun("arm", SX, SZ, S, 0, round(SX - sh))]);

const lines = [];
const part = (when, modelName) => {
	const o = { apply: { model: `crabsense_ras:block/${modelName}` } };
	if (when) o.when = when;
	lines.push(o);
};
part(null, "crab_box");
part(null, "crab_box_pipe_drops");
part(null, "crab_box_pipe_bottom_n");
part(null, "crab_box_pipe_bottom_s");
part(null, "crab_box_pipe_surface_n");
part(null, "crab_box_pipe_surface_s");
part({ east: "true" }, "crab_box_pipe_bottom_e");
part({ east: "true" }, "crab_box_pipe_surface_e");
part({ west: "true" }, "crab_box_pipe_bottom_w");
part({ west: "true" }, "crab_box_pipe_surface_w");
fs.writeFileSync("src/main/resources/assets/crabsense_ras/blockstates/crab_box.json", JSON.stringify({ multipart: lines }, null, "\t") + "\n");

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
