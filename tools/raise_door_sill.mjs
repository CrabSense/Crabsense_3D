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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "sill", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const code = `(() => {
const proj = ModelProject.all.find(p => p.name === 'crab_box');
if (proj) proj.select();
const drainTop = 1.55;
const sill = Math.round((drainTop + 10 * 0.03) * 100) / 100;
const doorBottom = Math.max(sill, 3);
let raised = 0;
Cube.all.forEach(cube => {
  if (cube.name === 'recess_bottom' || cube.name === 'door_frame_bottom') {
    cube.from[1] = 1;
    cube.to[1] = doorBottom;
    raised++;
  }
  if (cube.parent && cube.parent.name === 'SIDE_HATCH' && cube.name !== 'latch_pin' && cube.from[1] < doorBottom && cube.to[1] > 3) {
    const lift = doorBottom - cube.from[1];
    cube.from[1] += lift;
    cube.to[1] += lift;
    raised++;
  }
});
Canvas.updateAll();
return {project: Project.name, sill, doorBottom, raised};
})()`;
const result = await call("risky_eval", { code });
console.log(result.content?.[0]?.text ?? JSON.stringify(result));
