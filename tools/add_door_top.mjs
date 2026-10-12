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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "door-top", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const code = `(() => {
const proj = ModelProject.all.find(p => p.name === 'crab_box');
if (proj) proj.select();
const rail = Cube.all.find(c => c.name === 'door_frame_top');
if (!rail) return {ok:false};
rail.from[1] = 9.8;
rail.to[1] = 10.7;
const tex = Texture.all.find(t => t.name === 'door_flat');
if (tex) rail.applyTexture(tex, true);
Canvas.updateAll();
return {ok:true, from: rail.from, to: rail.to};
})()`;
const result = await call("risky_eval", { code });
console.log(result.content?.[0]?.text ?? JSON.stringify(result));
