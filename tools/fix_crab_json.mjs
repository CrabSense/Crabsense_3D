import { readFileSync, writeFileSync } from "node:fs";

const path = "src/main/resources/assets/crabsense_ras/models/block/crab_box.json";
const raw = readFileSync(path, "utf8").replaceAll("\\t", "\t");
const model = JSON.parse(raw);
writeFileSync(path, `${JSON.stringify(model, null, "\t")}\n`);
console.log(`elements ${model.elements.length}`);
