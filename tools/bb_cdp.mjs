// Evaluate JavaScript inside the running Blockbench desktop app over the Chrome
// DevTools Protocol. Blockbench is Electron, so launching it with
// `--remote-debugging-port=9222` exposes its renderer for automation.
//
// Usage:
//   node tools\bb_cdp.mjs "return 2+2"
//   node tools\bb_cdp.mjs "await Plugin.loadFromURL('https://x/y.js', false); return 'ok'"
//
// The snippet is wrapped in an async function, so `return` and `await` both work.
// Prints the JSON result (or the thrown error) and exits non-zero on failure.
const port = Number(process.env.BB_CDP_PORT ?? 9222);
const code = process.argv.slice(2).join(" ");
if (!code) {
	console.error("usage: node tools/bb_cdp.mjs \"<javascript>\"");
	process.exit(2);
}

async function findPage(retries = 30) {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
			if (page) return page;
		} catch {
			// Blockbench not up yet.
		}
		await new Promise((r) => setTimeout(r, 1000));
	}
	throw new Error(`no debuggable page on port ${port} after ${retries}s`);
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
	let timer;
	const settle = (fn, value) => {
		clearTimeout(timer);
		ws.close();
		fn(value);
	};
	ws.addEventListener("open", () => {
		ws.send(JSON.stringify({
			id: 1,
			method: "Runtime.evaluate",
			params: {
				expression: `(async () => { ${code} })()`,
				awaitPromise: true,
				returnByValue: true,
			},
		}));
	});
	ws.addEventListener("message", (event) => {
		const msg = JSON.parse(event.data);
		if (msg.id !== 1) return;
		if (msg.error) return settle(reject, new Error(JSON.stringify(msg.error)));
		const { result: r, exceptionDetails: ex } = msg.result;
		if (ex) return settle(reject, new Error(ex.exception?.description ?? JSON.stringify(ex)));
		settle(resolve, r.value);
	});
	ws.addEventListener("error", () => settle(reject, new Error("websocket error")));
	timer = setTimeout(() => settle(reject, new Error("timed out waiting for the evaluate result")), 60_000);
});

console.log(JSON.stringify(result, null, 2));
// Blockbench's page never closes its socket promptly; don't linger.
process.exit(0);
