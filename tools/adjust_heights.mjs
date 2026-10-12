const url = "http://localhost:3000/bb-mcp";
let session;
async function rpc(body) {
	const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
	if (session) headers["mcp-session-id"] = session;
	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
	session ??= res.headers.get("mcp-session-id");
	const text = await res.text();
	if (!text.trim()) return null;
	const line = text.split("\n").find((l) => l.startsWith("data:"));
	return JSON.parse(line ? line.slice(5).trim() : text);
}
async function call(name, args = {}) {
	const json = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
	const result = json.result ?? json.error;
	if (result?.isError) throw new Error(`${name}: ${result.content?.[0]?.text ?? JSON.stringify(result)}`);
	return result;
}
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "heights", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const code = `(() => {
const proj = ModelProject.all.find(p => p.name === 'crab_box');
if (proj) proj.select();
const wallTop = 10;
const surfaceTop = wallTop * 0.30;
const sill = surfaceTop + wallTop * 0.03;
let pipes = 0;
let sills = 0;
Cube.all.forEach(cube => {
  if (cube.name === 'surface_drain_pipe') {
    cube.to[1] = surfaceTop;
    pipes++;
  }
  if (cube.name === 'surface_drain_mouth') {
    cube.from[1] = surfaceTop - 0.35;
    cube.to[1] = surfaceTop + 0.05;
    pipes++;
  }
  if (cube.name === 'recess_bottom' || cube.name === 'door_frame_bottom') {
    cube.from[1] = 1;
    cube.to[1] = sill;
    sills++;
  }
});
const doorParts = Cube.all.filter(c => c.parent && c.parent.name === 'SIDE_HATCH' && c.name !== 'latch_pin');
const lowest = doorParts.reduce((m, c) => Math.min(m, c.from[1]), 99);
if (lowest < sill) {
  const lift = sill - lowest;
  doorParts.forEach(c => { c.from[1] += lift; c.to[1] += lift; });
}
Canvas.updateAll();
return {project: Project.name, surfaceTop, sill, pipes, sills, doorLift: lowest < sill};
})()`;
const result = await call("risky_eval", { code });
console.log(result.content?.[0]?.text ?? JSON.stringify(result));
