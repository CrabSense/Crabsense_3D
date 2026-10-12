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
await rpc({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "unlatch", version: "1" } } });
await rpc({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
const switched = await call("risky_eval", { code: `(() => {
const projects = (typeof ModelProject !== 'undefined' && ModelProject.all) ? ModelProject.all.map(p => p.name) : [];
const crab = (ModelProject.all || []).find(p => p.name === 'crab_box');
if (crab && crab.select) crab.select();
return {projects, selected: Project.name};
})()` });
console.log(switched.content?.[0]?.text);
const outline = JSON.parse((await call("list_outline")).content[0].text);
let removed = 0;
function walk(nodes) {
	for (const node of nodes ?? []) {
		if (/latch|pin|chot/i.test(node.name)) {
			return [node];
		}
		const nested = walk(node.children);
		if (nested.length) return nested;
	}
	return [];
}
const hits = [];
function collect(nodes) {
	for (const node of nodes ?? []) {
		if (/latch|pin/i.test(node.name)) hits.push(node);
		collect(node.children);
	}
}
collect(outline.roots);
for (const node of hits) {
	await call("remove_element", { id: node.uuid });
	removed++;
}
console.log(`removed ${removed}`);
