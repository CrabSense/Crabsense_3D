const fs = require("fs");
const p = "src/main/resources/assets/crabsense_ras/models/block/drum_filter.json";
let s = fs.readFileSync(p, "utf8");
const a = s.split('"z": 192').length - 1;
const b = s.split('"z": 237').length - 1;
s = s.replaceAll('"z": 192', '"z": 0').replaceAll('"z": 237', '"z": 45');
fs.writeFileSync(p, s);
console.log({a, b});
