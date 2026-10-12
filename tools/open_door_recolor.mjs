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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "open-door", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const code = `(() => {
const flat = Texture.all.find(t => t.name === 'box_flat');
const doorTex = Texture.all.find(t => t.name === 'door_flat');
const dark = Texture.all.find(t => (t.name || '').includes('dark'));
let painted = 0;
const hatch = Group.all.find(g => g.name === 'SIDE_HATCH');
if (hatch) { hatch.rotation = [0, 0, 0]; hatch.origin = [0, 0, 0]; }
Cube.all.forEach(cube => {
  const group = cube.parent && cube.parent.name;
  const darkPart = /hole|mouth|pin|slot|bore|outlet/.test(cube.name);
  if (group === 'SIDE_HATCH') {
    cube.rotation = [0, 0, 0];
    cube.origin = [0, 0, 0];
    cube.from[0] = Math.max(0.45, cube.from[0]);
    cube.to[0] = Math.min(1.15, cube.to[0]);
    cube.from[1] = Math.min(cube.from[1], 9.25);
    cube.to[1] = Math.min(cube.to[1], 9.8);
    if (darkPart && dark) cube.applyTexture(dark, true);
    else if (doorTex) cube.applyTexture(doorTex, true);
  } else if (darkPart && dark) cube.applyTexture(dark, true);
  else if (flat) { cube.applyTexture(flat, true); painted++; }
});
Canvas.updateAll();
return {painted, cubes: Cube.all.length};
})()`;
const result = await call("risky_eval", { code });
console.log(result.content?.[0]?.text ?? JSON.stringify(result));
