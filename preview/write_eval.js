const fs = require("fs");
const code = `
const names = (typeof ModelProject !== 'undefined' ? ModelProject.all : []).map(p => p.name);
const crab = (ModelProject.all || []).find(p => p.save_path && p.save_path.includes('crab_box_fixed'));
if (crab) crab.select();
({names, active: Project.name, save: Project.save_path, cubes: Cube.all.length});
`;
fs.writeFileSync("preview/eval.json", JSON.stringify({code}));
