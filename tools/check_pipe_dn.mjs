import fs from "fs";
const od = (dn) => (dn / 27) * 0.72;
if (!(od(34) > od(27))) throw new Error("bottom DN34 must be thicker than surface DN27");
if (!(od(60) > od(34))) throw new Error("drum DN60 must be thicker than DN34");
const drops = JSON.parse(fs.readFileSync("src/main/resources/assets/crabsense_ras/models/block/crab_box_pipe_drops.json", "utf8"));
const w = (name) => {
	const e = drops.elements.find((c) => c.name === name);
	return e.to[0] - e.from[0];
};
if (!(w("drop_bottom") > w("drop_surface"))) throw new Error("box bottom stub must be wider than surface stub");
console.log("ok", { d27: od(27), d34: od(34), d60: od(60), bottom: w("drop_bottom"), surface: w("drop_surface") });
