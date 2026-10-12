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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "spin", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const code = `(() => {
const proj = ModelProject.all.find(p => p.name === 'drum_filter');
if (proj) proj.select();
const drum = Cube.all.filter(c => {
  const x = (c.from[0] + c.to[0]) / 2;
  const y = (c.from[1] + c.to[1]) / 2;
  const z = (c.from[2] + c.to[2]) / 2;
  const radial = Math.hypot(x - 8, y - 6.2);
  return radial > 2.2 && radial < 6 && z > 3 && z < 15.5;
});
if (window.__drumSpin) clearInterval(window.__drumSpin);
window.__drumSpin = setInterval(() => {
  drum.forEach(c => {
    c.origin = [8, 6.2, 8];
    const next = ((c.rotation[2] || 0) + 8) % 360;
    c.rotation = [0, 0, next];
  });
}, 50);
return {project: Project.name, spinning: drum.length};
})()`;
const result = await call("risky_eval", { code });
console.log(result.content[0].text);
