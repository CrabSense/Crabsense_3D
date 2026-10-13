import fs from "fs";

const dir = "src/main/resources/assets/crabsense_ras/models/block";
const od = (dn) => (dn === 60 ? 3.2 : dn === 34 ? 1.2 : 0.9);
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
const holeFaces = () => ({
	north: { uv: [0, 0, 16, 16], texture: "#hole" },
	east: { uv: [0, 0, 16, 16], texture: "#hole" },
	south: { uv: [0, 0, 16, 16], texture: "#hole" },
	west: { uv: [0, 0, 16, 16], texture: "#hole" },
	up: { uv: [0, 0, 16, 16], texture: "#hole" },
	down: { uv: [0, 0, 16, 16], texture: "#hole" },
});
const holeCube = (name, from, to) => ({ name, from, to, faces: holeFaces() });
/** Square tube: four walls plus a dark bore on each open end so it reads as a water pipe. */
function arm(name, from, to) {
	const x0 = round(from[0]), y0 = round(from[1]), z0 = round(from[2]);
	const x1 = round(to[0]), y1 = round(to[1]), z1 = round(to[2]);
	const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
	const w = round(Math.min(0.22, Math.min(Math.abs(dx), Math.abs(dy), Math.abs(dz)) * 0.28));
	if (w < 0.12) return [cube(name, [x0, y0, z0], [x1, y1, z1])];
	if (Math.abs(dz) >= Math.abs(dx) && Math.abs(dz) >= Math.abs(dy)) {
		return [
			cube(`${name}_dn`, [x0, y0, z0], [x1, y0 + w, z1]),
			cube(`${name}_up`, [x0, y1 - w, z0], [x1, y1, z1]),
			cube(`${name}_we`, [x0, y0 + w, z0], [x0 + w, y1 - w, z1]),
			cube(`${name}_ea`, [x1 - w, y0 + w, z0], [x1, y1 - w, z1]),
			holeCube(`${name}_a`, [x0 + w, y0 + w, z0], [x1 - w, y1 - w, round(z0 + 0.05)]),
			holeCube(`${name}_b`, [x0 + w, y0 + w, round(z1 - 0.05)], [x1 - w, y1 - w, z1]),
		];
	}
	if (Math.abs(dx) >= Math.abs(dy)) {
		return [
			cube(`${name}_dn`, [x0, y0, z0], [x1, y0 + w, z1]),
			cube(`${name}_up`, [x0, y1 - w, z0], [x1, y1, z1]),
			cube(`${name}_no`, [x0, y0 + w, z0], [x1, y1 - w, z0 + w]),
			cube(`${name}_so`, [x0, y0 + w, z1 - w], [x1, y1 - w, z1]),
			holeCube(`${name}_a`, [x0, y0 + w, z0 + w], [round(x0 + 0.05), y1 - w, z1 - w]),
			holeCube(`${name}_b`, [round(x1 - 0.05), y0 + w, z0 + w], [x1, y1 - w, z1 - w]),
		];
	}
	return [
		cube(`${name}_we`, [x0, y0, z0], [x0 + w, y1, z1]),
		cube(`${name}_ea`, [x1 - w, y0, z0], [x1, y1, z1]),
		cube(`${name}_no`, [x0 + w, y0, z0], [x1 - w, y1, z0 + w]),
		cube(`${name}_so`, [x0 + w, y0, z1 - w], [x1 - w, y1, z1]),
		holeCube(`${name}_a`, [x0 + w, y0, z0 + w], [x1 - w, round(y0 + 0.05), z1 - w]),
		holeCube(`${name}_b`, [x0 + w, round(y1 - 0.05), z0 + w], [x1 - w, y1, z1 - w]),
	];
}
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
	textures: {
		pvc: "crabsense_ras:block/drum_pvc",
		hole: "minecraft:block/black_concrete",
		particle: "crabsense_ras:block/drum_pvc",
	},
	elements,
});
const write = (name, elements) => {
	fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(model(elements.flat()), null, "\t") + "\n");
};

function hub(dn, extra) {
	const h = (od(dn) / 2) + extra;
	return cube("hub", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]);
}
function freeTee(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("run", [round(8 - h), round(8 - h), 0], [round(8 + h), round(8 + h), 16]),
		...arm("branch", [round(8 - h), round(8 - h), round(8 - h)], [16, round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeUp(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("run", [round(8 - h), round(8 - h), 0], [round(8 + h), round(8 + h), 16]),
		...arm("branch", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeDown(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("run", [round(8 - h), round(8 - h), 0], [round(8 + h), round(8 + h), 16]),
		...arm("branch", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeElbow(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 16]),
		...arm("out", [round(8 - h), round(8 - h), round(8 - h)], [16, round(8 + h), round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeElbowUp(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 16]),
		...arm("out", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeElbowDown(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("in", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), round(8 + h), 16]),
		...arm("out", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]),
		hub(dn, 0.3),
	];
}
function freeCap(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("socket", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 16]),
		cube("plug", [round(8 - h - 0.35), round(8 - h - 0.35), 7.2], [round(8 + h + 0.35), round(8 + h + 0.35), 8.4]),
	];
}
function freePipe(dn) {
	const h = (od(dn) / 2);
	return arm("run", [round(8 - h), round(8 - h), 0], [round(8 + h), round(8 + h), 16]);
}
function freeTeeStem(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("stem", [round(8 - h), round(8 - h), 8], [round(8 + h), round(8 + h), 16]),
		...arm("bar", [0, round(8 - h), round(8 - h)], [16, round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeStemUp(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("bar", [0, round(8 - h), round(8 - h)], [16, round(8 + h), round(8 + h)]),
		...arm("stem", [round(8 - h), round(8 - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freeTeeStemDown(dn) {
	const h = (od(dn) / 2);
	return [
		...arm("bar", [0, round(8 - h), round(8 - h)], [16, round(8 + h), round(8 + h)]),
		...arm("stem", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(8 + h), round(8 + h)]),
		hub(dn, 0.25),
	];
}
function freePipeUp(dn) {
	const h = (od(dn) / 2);
	return arm("run", [round(8 - h), 0, round(8 - h)], [round(8 + h), 16, round(8 + h)]);
}
function drumHub(dn, y) {
	const h = (od(dn) / 2) + 0.25;
	return cube("hub", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), round(y + h), round(8 + h)]);
}
function freeElbowUpDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("in", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), round(y + h), 16]),
		...arm("out", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		drumHub(dn, y),
	];
}
function freeElbowDownDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("in", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), round(y + h), 16]),
		...arm("out", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(y + h), round(8 + h)]),
		drumHub(dn, y),
	];
}
function freeTeeUpDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("run", [round(8 - h), round(y - h), 0], [round(8 + h), round(y + h), 16]),
		...arm("branch", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		drumHub(dn, y),
	];
}
function freeTeeDownDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("run", [round(8 - h), round(y - h), 0], [round(8 + h), round(y + h), 16]),
		...arm("branch", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(y + h), round(8 + h)]),
		drumHub(dn, y),
	];
}
function freeTeeStemUpDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("bar", [0, round(y - h), round(8 - h)], [16, round(y + h), round(8 + h)]),
		...arm("stem", [round(8 - h), round(y - h), round(8 - h)], [round(8 + h), 16, round(8 + h)]),
		drumHub(dn, y),
	];
}
function freeTeeStemDownDrum(dn, y) {
	const h = (od(dn) / 2);
	return [
		...arm("bar", [0, round(y - h), round(8 - h)], [16, round(y + h), round(8 + h)]),
		...arm("stem", [round(8 - h), 0, round(8 - h)], [round(8 + h), round(y + h), round(8 + h)]),
		drumHub(dn, y),
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
		? arm("run", [round(cx - h), y0, 0], [round(cx + h), y1, 16])
		: arm("run", [0, y0, round(cz - h)], [16, y1, round(cz + h)]);
	const hx = round(hubX);
	const hz = round(hubZ);
	let branch;
	if (bend === "up") {
		branch = arm("branch", [round(hx - h), y1, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
	} else if (bend === "down") {
		branch = arm("branch", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1, round(hz + h)]);
	} else if (ns) {
		const left = bend === "left";
		branch = left
			? arm("branch", [round(cx - h), y0, round(hz - h)], [round(cx + h + 5), y1, round(hz + h)])
			: arm("branch", [round(cx - h - 5), y0, round(hz - h)], [round(cx + h), y1, round(hz + h)]);
	} else {
		const left = bend === "left";
		branch = left
			? arm("branch", [round(hx - h), y0, round(cz - h)], [round(hx + h), y1, round(cz + h + 5)])
			: arm("branch", [round(hx - h), y0, round(cz - h - 5)], [round(hx + h), y1, round(cz + h)]);
	}
	const hubEl = cube("hub", [round(hx - h - 0.12), y0 - 0.08, round(hz - h - 0.12)], [round(hx + h + 0.12), y1 + 0.12, round(hz + h + 0.12)]);
	if (kind === "pipe") return run;
	let stem;
	if (facing === "south") stem = arm("stem", [round(cx - h), y0, hz], [round(cx + h), y1, 16]);
	else if (facing === "north") stem = arm("stem", [round(cx - h), y0, 0], [round(cx + h), y1, hz]);
	else if (facing === "east") stem = arm("stem", [hx, y0, round(cz - h)], [16, y1, round(cz + h)]);
	else stem = arm("stem", [0, y0, round(cz - h)], [hx, y1, round(cz + h)]);
	if (kind === "tee" && port === "stem") {
		let bar;
		if (bend === "up") {
			bar = arm("bar", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
		} else if (bend === "down") {
			bar = arm("bar", [round(hx - h), y0 - 5, round(hz - h)], [round(hx + h), y1 + 5, round(hz + h)]);
		} else if (ns) {
			bar = arm("bar", [0, y0, round(hz - h)], [16, y1, round(hz + h)]);
		} else {
			bar = arm("bar", [round(hx - h), y0, 0], [round(hx + h), y1, 16]);
		}
		return [...stem, ...bar, hubEl];
	}
	if (kind === "tee") return [...run, ...branch, hubEl];
	if (kind === "elbow") return mount === "box" ? [...branch, hubEl] : [...stem, ...branch, hubEl];
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
	if (kind === "pipe" && (bend === "up" || bend === "down")) return `crabsense_ras:block/pvc_pipe_dn${dn}_up`;
	if (kind === "cap" || kind === "pipe" || bend === "left" || bend === "right") return `crabsense_ras:block/pvc_${kind}_dn${dn}`;
	return `crabsense_ras:block/pvc_${kind}_dn${dn}_${bend}`;
};

for (const kind of kinds) {
	const multipart = [];
	const part = (when, apply) => multipart.push({ when, apply });
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
		if (kind === "pipe") {
			write(`pvc_pipe_dn${dn}_up`, freePipeUp(dn));
		}
		const stemFree = (bend) => {
			if (kind !== "tee") return freeModel(kind, dn, bend);
			if (bend === "up" || bend === "down") return `crabsense_ras:block/pvc_tee_dn${dn}_stem_${bend}`;
			return `crabsense_ras:block/pvc_tee_dn${dn}_stem`;
		};
		const shiftY = (elements, y) => {
			const dy = y - 8;
			return elements.map((el) => ({
				...el,
				from: [el.from[0], round(el.from[1] + dy), el.from[2]],
				to: [el.to[0], round(el.to[1] + dy), el.to[2]],
			}));
		};
		const drumLane = (y) => {
			const parts = { "": shiftY(maker(dn), y) };
			if (kind === "tee") {
				parts._up = freeTeeUpDrum(dn, y);
				parts._down = freeTeeDownDrum(dn, y);
				parts._stem = shiftY(freeTeeStem(dn), y);
				parts._stem_up = freeTeeStemUpDrum(dn, y);
				parts._stem_down = freeTeeStemDownDrum(dn, y);
			}
			if (kind === "elbow") {
				parts._up = freeElbowUpDrum(dn, y);
				parts._down = freeElbowDownDrum(dn, y);
			}
			return parts;
		};
		const lowLane = drumLane(3.2);
		const highLane = drumLane(9.4);
		const writeLane = (suffix, parts) => {
			const base = `pvc_${kind}_dn${dn}_drum${suffix}`;
			for (const [tag, els] of Object.entries(parts)) {
				write(`${base}${tag}`, els);
			}
			return base;
		};
		const drumLow = writeLane("", lowLane);
		const drumHigh = writeLane("_high", highLane);
		const drumModel = (k, base, bend, port) => {
			if (k === "tee" && port === "stem") {
				if (bend === "up" || bend === "down") return `crabsense_ras:block/${base}_stem_${bend}`;
				return `crabsense_ras:block/${base}_stem`;
			}
			if (k === "pipe" && (bend === "up" || bend === "down")) {
				return `crabsense_ras:block/pvc_pipe_dn${dn}_up`;
			}
			if ((k === "tee" || k === "elbow") && (bend === "up" || bend === "down")) {
				return `crabsense_ras:block/${base}_${bend}`;
			}
			return `crabsense_ras:block/${base}`;
		};
		for (const facing of facings) {
			for (const bend of bends) {
				const sides = { model: freeModel(kind, dn, bend), y: yFor(facing, bend) };
				const stem = { model: stemFree(bend), y: yFor(facing, bend) };
				for (const [port, spec] of [["sides", sides], ["stem", stem]]) {
					const yaw = yFor(facing, bend);
					const when = { dn: String(dn), facing, bend, port };
					part({ ...when, mount: "air" }, spec);
					part({ ...when, mount: "drum" }, { model: drumModel(kind, drumLow, bend, port), y: yaw });
					part({ ...when, mount: "drum_high" }, { model: drumModel(kind, drumHigh, bend, port), y: yaw });
					part({ ...when, mount: "drum_both" }, { model: drumModel(kind, drumLow, bend, port), y: yaw });
					for (const hk of kinds) {
						part(
							{ dn: String(dn), high_facing: facing, high_bend: bend, mount: "drum_both", port, high_kind: hk },
							{ model: drumModel(hk, `pvc_${hk}_dn${dn}_drum_high`, bend, port), y: yaw },
						);
					}
					if (dn === 60) {
						part({ ...when, mount: "box" }, spec);
						part({ ...when, mount: "line" }, spec);
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
							part(
								{ dn: String(dn), facing, bend, mount, port },
								{ model: `crabsense_ras:block/${name}` },
							);
						}
					}
				}
			}
		}
	}
	fs.copyFileSync(`${dir}/pvc_${kind}_dn34.json`, `${dir}/pvc_${kind}.json`);
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/blockstates/pvc_${kind}.json`, JSON.stringify({ multipart }, null, "\t") + "\n");
	fs.writeFileSync(`src/main/resources/assets/crabsense_ras/models/item/pvc_${kind}.json`, JSON.stringify({ parent: `crabsense_ras:block/pvc_${kind}_dn34` }) + "\n");
	fs.writeFileSync(
		`src/main/resources/assets/crabsense_ras/items/pvc_${kind}.json`,
		JSON.stringify({ model: { type: "minecraft:model", model: `crabsense_ras:block/pvc_${kind}_dn34` } }, null, "\t") + "\n"
	);
}

const tee = JSON.parse(fs.readFileSync("src/main/resources/assets/crabsense_ras/blockstates/pvc_tee.json", "utf8"));
const parts = tee.multipart;
const has = (pred) => parts.some((p) => pred(p.when || {}, p.apply));
if (!has((w) => w.mount === "air" && w.bend === "down" && w.dn === "34")) throw new Error("missing tee down");
if (!has((w) => w.mount === "line" && w.port === "stem")) throw new Error("missing tee stem line");
if (!has((w) => w.mount === "drum")) throw new Error("missing drum mount");
if (!has((w) => w.mount === "drum_high")) throw new Error("missing drum high");
if (!has((w) => w.mount === "drum_both" && w.high_facing && w.high_kind === "pipe")) throw new Error("missing drum both high lane");
if (!has((w, a) => w.mount === "air" && w.bend === "right" && a.y === 180)) throw new Error("right should y+180");
if (!has((w, a) => w.mount === "air" && w.bend === "up" && String(a.model).endsWith("_up"))) throw new Error("up model");
if (!has((w, a) => w.mount === "air" && w.port === "stem" && String(a.model).includes("stem"))) throw new Error("stem model");
console.log("fittings generated", parts.length, "tee parts");
