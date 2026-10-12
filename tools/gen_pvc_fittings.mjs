import fs from "fs";

const dir = "src/main/resources/assets/crabsense_ras/models/block";
const od = (dn) => (dn / 27) * 0.72;
const round = (n) => Math.round(n * 100) / 100;
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
	gui_light: "front",
	display: {
		gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [1.15, 1.15, 1.15] },
		ground: { translation: [0, 2, 0], scale: [0.7, 0.7, 0.7] },
		firstperson_righthand: { rotation: [0, 45, 0], scale: [0.7, 0.7, 0.7] },
		thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: [0.55, 0.55, 0.55] },
	},
	textures: { pvc: "crabsense_ras:block/drum_pvc", particle: "crabsense_ras:block/drum_pvc" },
	elements,
});
const write = (name, elements) => {
	fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(model(elements), null, "\t") + "\n");
};

function freeTee(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("run", [round(8 - h), round(8 - h), 1], [round(8 + h), round(8 + h), 15]),
		cube("branch", [round(8 - h), round(8 - h), round(8 - h)], [15, round(8 + h), round(8 + h)]),
		cube("hub", [round(8 - h - 0.25), round(8 - h - 0.25), round(8 - h - 0.25)], [round(8 + h + 0.25), round(8 + h + 0.25), round(8 + h + 0.25)]),
	];
}
function freeElbow(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 15]),
		cube("out", [round(8 - h), round(8 - h), round(8 - h)], [15, round(8 + h), round(8 + h)]),
		cube("hub", [round(8 - h - 0.3), round(8 - h - 0.3), round(8 - h - 0.3)], [round(8 + h + 0.3), round(8 + h + 0.3), round(8 + h + 0.3)]),
	];
}
function freeCap(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("socket", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 15]),
		cube("plug", [round(8 - h - 0.35), round(8 - h - 0.35), 7.2], [round(8 + h + 0.35), round(8 + h + 0.35), 8.4]),
	];
}

function boxParts(kind, dn, facing, bend) {
	const ns = facing === "north" || facing === "south";
	const cx = ns ? (dn === 34 ? 14 : 7.6) : 8;
	const cz = ns ? 8 : (dn === 34 ? 7.3 : 13.15);
	const h = od(dn) / 2;
	const y0 = -3.15;
	const y1 = -2.25;
	const hubZ = facing === "south" ? 14.3 : facing === "north" ? 1.7 : cz;
	const hubX = facing === "east" ? 14.3 : facing === "west" ? 1.7 : cx;
	const run = ns
		? cube("run", [round(cx - h), y0, 0], [round(cx + h), y1, 16])
		: cube("run", [0, y0, round(cz - h)], [16, y1, round(cz + h)]);
	const hx = round(hubX);
	const hz = round(hubZ);
	let branch;
	if (bend === "up") {
		branch = cube("branch", [round(hx - h), y1, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
	} else if (ns) {
		const left = bend === "left";
		branch = left
			? cube("branch", [round(cx - h), y0, round(hz - h)], [round(cx + h + 5), y1, round(hz + h)])
			: cube("branch", [round(cx - h - 5), y0, round(hz - h)], [round(cx + h), y1, round(hz + h)]);
	} else {
		const left = bend === "left";
		branch = left
			? cube("branch", [round(hx - h), y0, round(cz - h)], [round(hx + h), y1, round(cz + h + 5)])
			: cube("branch", [round(hx - h), y0, round(cz - h - 5)], [round(hx + h), y1, round(cz + h)]);
	}
	const hub = cube("hub", [round(hx - h - 0.12), y0 - 0.08, round(hz - h - 0.12)], [round(hx + h + 0.12), y1 + 0.12, round(hz + h + 0.12)]);
	if (kind === "tee") return [run, branch, hub];
	if (kind === "elbow") return [branch, hub];
	const plug = ns
		? cube("plug", [round(cx - h - 0.2), y0 - 0.2, facing === "south" ? 14.6 : 0.2], [round(cx + h + 0.2), y1 + 0.2, facing === "south" ? 15.8 : 1.4])
		: cube("plug", [facing === "east" ? 14.6 : 0.2, y0 - 0.2, round(cz - h - 0.2)], [facing === "east" ? 15.8 : 1.4, y1 + 0.2, round(cz + h + 0.2)]);
	return [hub, plug];
}

const sizes = [27, 34, 60];
const kinds = ["tee", "elbow", "cap"];
const facings = ["north", "south", "east", "west"];
const bends = ["left", "right", "up"];
const rot = { south: 0, west: 90, north: 180, east: 270 };

for (const kind of kinds) {
	const variants = {};
	for (const dn of sizes) {
		const maker = kind === "tee" ? freeTee : kind === "elbow" ? freeElbow : freeCap;
		write(`pvc_${kind}_dn${dn}`, maker(dn));
		for (const facing of facings) {
			for (const bend of bends) {
				variants[`dn=${dn},facing=${facing},bend=${bend},on_box=false`] = {
					model: `crabsense_ras:block/pvc_${kind}_dn${dn}`,
					y: rot[facing],
				};
			}
		}
		if (dn !== 60) {
			for (const facing of facings) {
				for (const bend of bends) {
					const name = `pvc_${kind}_dn${dn}_box_${facing}_${bend}`;
					write(name, boxParts(kind, dn, facing, bend));
					variants[`dn=${dn},facing=${facing},bend=${bend},on_box=true`] = {
						model: `crabsense_ras:block/${name}`,
					};
				}
			}
		} else {
			for (const facing of facings) {
				for (const bend of bends) {
					variants[`dn=${dn},facing=${facing},bend=${bend},on_box=true`] = {
						model: `crabsense_ras:block/pvc_${kind}_dn${dn}`,
						y: rot[facing],
					};
				}
			}
		}
	}
	fs.copyFileSync(`${dir}/pvc_${kind}_dn34.json`, `${dir}/pvc_${kind}.json`);
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/blockstates/pvc_${kind}.json`, JSON.stringify({ variants }, null, "\t") + "\n");
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/models/item/pvc_${kind}.json`, JSON.stringify({ parent: `crabsense_ras:block/pvc_${kind}_dn34` }) + "\n");
	fs.writeFileSync(
		`src/main/resources/assets/crabsense_ras/items/pvc_${kind}.json`,
		JSON.stringify({ model: { type: "minecraft:model", model: `crabsense_ras:block/pvc_${kind}_dn34` } }, null, "\t") + "\n"
	);
}

console.log("fittings generated");
