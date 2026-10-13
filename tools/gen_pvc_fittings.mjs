import fs from "fs";

const dir = "src/main/resources/assets/crabsense_ras/models/block";
const od = (dn) => (dn / 27) * 0.9;
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

function hub(dn, extra) {
	const h = Math.max(0.55, od(dn) / 2) + extra;
	return cube("hub", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]);
}
function freeTee(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("run", [round(8 - h), round(8 - h), 1], [round(8 + h), round(8 + h), 15]),
		cube("branch", [round(8 - h), round(8 - h), round(8 - h)], [15, round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeUp(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("run", [round(8 - h), round(8 - h), 1], [round(8 + h), round(8 + h), 15]),
		cube("branch", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), 15, round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeDown(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("run", [round(8 - h), round(8 - h), 1], [round(8 + h), round(8 + h), 15]),
		cube("branch", [round(8 - h), 1, round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeElbow(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 15]),
		cube("out", [round(8 - h), round(8 - h), round(8 - h)], [15, round(8 + h), round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeElbowUp(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 15]),
		cube("out", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), 15, round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeElbowDown(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 15]),
		cube("out", [round(8 - h), 1, round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeCap(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("socket", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 15]),
		cube("plug", [round(8 - h - 0.35), round(8 - h - 0.35), 7.2], [round(8 + h + 0.35), round(8 + h + 0.35), 8.4]),
	];
}
function freePipe(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [cube("run", [round(8 - h), round(8 - h), 0], [round(8 + h), round(8 + h), 16])];
}
function freeTeeStem(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("stem", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 15]),
		cube("bar", [1, round(8 - h), round(8 - h)], [15, round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeStemUp(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("stem", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 15]),
		cube("bar", [round(8 - h), 8, round(8 - h)], [round(8 + h), 15, round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeStemDown(dn) {
	const h = Math.max(0.55, od(dn) / 2);
	return [
		cube("stem", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 15]),
		cube("bar", [round(8 - h), 1, round(8 - h)], [round(8 + h), 8, round(8 + h)]),
		hub(dn, 0.25),
	];
}

function lowParts(kind, dn, facing, bend, mount, port = "sides") {
	const ns = facing === "north" || facing === "south";
	const cx = ns ? (dn === 34 ? 14 : 7.6) : 8;
	const cz = ns ? 8 : (dn === 34 ? 7.3 : 13.15);
	const h = od(dn) / 2;
	const y0 = -2.26;
	const y1 = -1.36;
	const hubZ = mount === "box"
		? facing === "south" ? 14.3 : facing === "north" ? 1.7 : cz
		: ns ? 8 : cz;
	const hubX = mount === "box"
		? facing === "east" ? 14.3 : facing === "west" ? 1.7 : cx
		: ns ? cx : 8;
	const run = ns
		? cube("run", [round(cx - h), y0, 0], [round(cx + h), y1, 16])
		: cube("run", [0, y0, round(cz - h)], [16, y1, round(cz + h)]);
	const hx = round(hubX);
	const hz = round(hubZ);
	let branch;
	if (bend === "up") {
		branch = cube("branch", [round(hx - h), y1, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
	} else if (bend === "down") {
		branch = cube("branch", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1, round(hz + h)]);
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
	const hubEl = cube("hub", [round(hx - h - 0.12), y0 - 0.08, round(hz - h - 0.12)], [round(hx + h + 0.12), y1 + 0.12, round(hz + h + 0.12)]);
	if (kind === "pipe") return [run];
	let stem;
	if (facing === "south") stem = cube("stem", [round(cx - h), y0, hz], [round(cx + h), y1, 16]);
	else if (facing === "north") stem = cube("stem", [round(cx - h), y0, 0], [round(cx + h), y1, hz]);
	else if (facing === "east") stem = cube("stem", [hx, y0, round(cz - h)], [16, y1, round(cz + h)]);
	else stem = cube("stem", [0, y0, round(cz - h)], [hx, y1, round(cz + h)]);
	if (kind === "tee" && port === "stem") {
		let bar;
		if (bend === "up") {
			bar = cube("bar", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
		} else if (bend === "down") {
			bar = cube("bar", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
		} else if (ns) {
			bar = cube("bar", [0, y0, round(hz - h)], [16, y1, round(hz + h)]);
		} else {
			bar = cube("bar", [round(hx - h), y0, 0], [round(hx + h), y1, 16]);
		}
		return [stem, bar, hubEl];
	}
	if (kind === "tee") return [run, branch, hubEl];
	if (kind === "elbow") return mount === "box" ? [branch, hubEl] : [stem, branch, hubEl];
	const plug = ns
		? cube("plug", [round(cx - h - 0.2), y0 - 0.2, facing === "south" ? 14.6 : 0.2], [round(cx + h + 0.2), y1 + 0.2, facing === "south" ? 15.8 : 1.4])
		: cube("plug", [facing === "east" ? 14.6 : 0.2, y0 - 0.2, round(cz - h - 0.2)], [facing === "east" ? 15.8 : 1.4, y1 + 0.2, round(cz + h + 0.2)]);
	return [hubEl, plug];
}

const sizes = [27, 34, 60];
const kinds = ["tee", "elbow", "cap", "pipe"];
const facings = ["north", "south", "east", "west"];
const bends = ["left", "right", "up", "down"];
const rot = { south: 0, west: 90, north: 180, east: 270 };
const yFor = (facing, bend) => (rot[facing] + (bend === "right" ? 180 : 0)) % 360;
const freeModel = (kind, dn, bend) => {
	if (kind === "cap" || kind === "pipe" || bend === "left" || bend === "right") return `crabsense_ras:block/pvc_${kind}_dn${dn}`;
	return `crabsense_ras:block/pvc_${kind}_dn${dn}_${bend}`;
};

for (const kind of kinds) {
	const variants = {};
	for (const dn of sizes) {
		const maker = kind === "tee" ? freeTee : kind === "elbow" ? freeElbow : kind === "pipe" ? freePipe : freeCap;
		write(`pvc_${kind}_dn${dn}`, maker(dn));
		if (kind === "tee") {
			write(`pvc_tee_dn${dn}_up`, freeTeeUp(dn));
			write(`pvc_tee_dn${dn}_down`, freeTeeDown(dn));
			write(`pvc_tee_dn${dn}_stem`, freeTeeStem(dn));
			write(`pvc_tee_dn${dn}_stem_up`, freeTeeStemUp(dn));
			write(`pvc_tee_dn${dn}_stem_down`, freeTeeStemDown(dn));
		}
		if (kind === "elbow") {
			write(`pvc_elbow_dn${dn}_up`, freeElbowUp(dn));
			write(`pvc_elbow_dn${dn}_down`, freeElbowDown(dn));
		}
		const stemFree = (bend) => {
			if (kind !== "tee") return freeModel(kind, dn, bend);
			if (bend === "up" || bend === "down") return `crabsense_ras:block/pvc_tee_dn${dn}_stem_${bend}`;
			return `crabsense_ras:block/pvc_tee_dn${dn}_stem`;
		};
		const drumDy = 3.2 - 8;
		const shiftY = (elements) =>
			elements.map((el) => ({
				...el,
				from: [el.from[0], round(el.from[1] + drumDy), el.from[2]],
				to: [el.to[0], round(el.to[1] + drumDy), el.to[2]],
			}));
		const drumBase = `pvc_${kind}_dn${dn}_drum`;
		write(drumBase, shiftY(maker(dn)));
		if (kind === "tee") {
			write(`${drumBase}_up`, shiftY(freeTeeUp(dn)));
			write(`${drumBase}_down`, shiftY(freeTeeDown(dn)));
			write(`${drumBase}_stem`, shiftY(freeTeeStem(dn)));
			write(`${drumBase}_stem_up`, shiftY(freeTeeStemUp(dn)));
			write(`${drumBase}_stem_down`, shiftY(freeTeeStemDown(dn)));
		}
		if (kind === "elbow") {
			write(`${drumBase}_up`, shiftY(freeElbowUp(dn)));
			write(`${drumBase}_down`, shiftY(freeElbowDown(dn)));
		}
		const drumModel = (bend, port) => {
			if (kind === "tee" && port === "stem") {
				if (bend === "up" || bend === "down") return `crabsense_ras:block/${drumBase}_stem_${bend}`;
				return `crabsense_ras:block/${drumBase}_stem`;
			}
			if ((kind === "tee" || kind === "elbow") && (bend === "up" || bend === "down")) {
				return `crabsense_ras:block/${drumBase}_${bend}`;
			}
			return `crabsense_ras:block/${drumBase}`;
		};
		for (const facing of facings) {
			for (const bend of bends) {
				const sides = { model: freeModel(kind, dn, bend), y: yFor(facing, bend) };
				const stem = { model: stemFree(bend), y: yFor(facing, bend) };
				for (const [port, spec] of [["sides", sides], ["stem", stem]]) {
					variants[`dn=${dn},facing=${facing},bend=${bend},mount=air,port=${port}`] = spec;
					variants[`dn=${dn},facing=${facing},bend=${bend},mount=drum,port=${port}`] = {
						model: drumModel(bend, port),
						y: yFor(facing, bend),
					};
					if (dn === 60) {
						variants[`dn=${dn},facing=${facing},bend=${bend},mount=box,port=${port}`] = spec;
						variants[`dn=${dn},facing=${facing},bend=${bend},mount=line,port=${port}`] = spec;
					}
				}
			}
		}
		if (dn !== 60) {
			for (const facing of facings) {
				for (const bend of bends) {
					for (const mount of ["box", "line"]) {
						for (const port of ["sides", "stem"]) {
							const name = `pvc_${kind}_dn${dn}_${mount}_${facing}_${bend}${port === "stem" ? "_stem" : ""}`;
							write(name, lowParts(kind, dn, facing, bend, mount, port));
							variants[`dn=${dn},facing=${facing},bend=${bend},mount=${mount},port=${port}`] = {
								model: `crabsense_ras:block/${name}`,
							};
						}
					}
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

const tee = JSON.parse(fs.readFileSync("src/main/resources/assets/crabsense_ras/blockstates/pvc_tee.json", "utf8"));
const keys = Object.keys(tee.variants);
if (!keys.includes("dn=34,facing=south,bend=down,mount=air,port=sides")) throw new Error("missing tee down");
if (!keys.includes("dn=34,facing=south,bend=left,mount=line,port=stem")) throw new Error("missing tee stem line");
if (!keys.includes("dn=34,facing=east,bend=left,mount=drum,port=sides")) throw new Error("missing drum mount");
if (tee.variants["dn=34,facing=south,bend=right,mount=air,port=sides"].y !== 180) throw new Error("right should y+180");
if (!tee.variants["dn=34,facing=south,bend=up,mount=air,port=sides"].model.endsWith("_up")) throw new Error("up model");
if (!tee.variants["dn=34,facing=south,bend=left,mount=air,port=stem"].model.includes("stem")) throw new Error("stem model");
console.log("fittings generated", keys.length, "tee variants");
