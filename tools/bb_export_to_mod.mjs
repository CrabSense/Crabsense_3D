// Converts a Blockbench "Java Block/Item" export into the mod's model convention:
// parent block/block, ambientocclusion off, and every texture reference rewritten
// to the mod's own namespace.
//
// Texture resolution: a Blockbench export maps face refs ("#0") to texture names
// ("housing"). Each name is pointed at crabsense_ras:block/drum_<name> when that
// PNG exists in the mod (the drum filter's per-part materials), otherwise at
// crabsense_ras:block/<block-name> (single-texture blocks like tank).
//
// Usage: node tools\bb_export_to_mod.mjs <export.json> <block-name>
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [src, name] = process.argv.slice(2);
if (!src || !name) {
	console.error("usage: node tools\\bb_export_to_mod.mjs <export.json> <block-name>");
	process.exit(2);
}
const textureDir = "src/main/resources/assets/crabsense_ras/textures/block";
const input = JSON.parse(readFileSync(src, "utf8"));
const blockRef = `crabsense_ras:block/${name}`;

// "#0" -> "housing" -> "crabsense_ras:block/drum_housing" (or the block texture).
const idToName = input.textures ?? {};
const resolve = (ref) => {
	const key = String(ref).replace(/^#/, "");
	const texName = idToName[key] ?? (key === "all" || key === "particle" ? name : key);
	const candidate = `drum_${texName}`;
	return existsSync(`${textureDir}/${candidate}.png`) ? `crabsense_ras:block/${candidate}` : blockRef;
};

const used = new Map();
const textures = {};
for (const [, texName] of Object.entries(idToName)) {
	const resolved = resolve(texName);
	if (!used.has(texName)) {
		used.set(texName, resolved);
		textures[texName] = resolved;
	}
}

const elements = (input.elements ?? []).map((element) => {
	const out = { from: element.from, to: element.to };
	if (element.rotation && element.rotation.angle) out.rotation = element.rotation;
	if (element.shade === false) out.shade = false;
	out.faces = {};
	for (const [face, data] of Object.entries(element.faces ?? {})) {
		const mapped = { uv: data.uv };
		const ref = data.texture === undefined ? null : String(data.texture);
		const texName = ref ? (idToName[ref.replace(/^#/, "")] ?? Object.keys(textures)[0]) : null;
		mapped.texture = texName ? `#${texName}` : undefined;
		if (!mapped.texture) delete mapped.texture;
		if (data.rotation) mapped.rotation = data.rotation;
		if (data.tintindex !== undefined) mapped.tintindex = data.tintindex;
		if (data.cullface) mapped.cullface = data.cullface;
		out.faces[face] = mapped;
	}
	return out;
});

const model = {
	parent: "block/block",
	ambientocclusion: false,
	textures: { particle: Object.values(textures)[0] ?? blockRef, ...textures },
	elements,
};
// Drop empty texture keys so the JSON stays readable.
for (const key of Object.keys(textures)) if (!textures[key]) delete textures[key];

const target = `src/main/resources/assets/crabsense_ras/models/block/${name}.json`;
writeFileSync(target, `${JSON.stringify(model, null, "\t")}\n`);
console.log(`wrote ${target}: ${elements.length} elements, ${used.size} textures`);
for (const [n, ref] of used) console.log(`  ${n} -> ${ref}`);
