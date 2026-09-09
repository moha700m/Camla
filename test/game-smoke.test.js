import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const configSource = await readFile(new URL("../public/games/camel-rush/config.js", import.meta.url), "utf8");
const engineSource = await readFile(new URL("../public/games/camel-rush/race-engine.js", import.meta.url), "utf8");
const gameSource = await readFile(new URL("../public/games/camel-rush/game.js", import.meta.url), "utf8");

function element(id) {
	return {
		id,
		innerHTML: "",
		textContent: "",
		value: "",
		dataset: {},
		style: {},
		classList: { add() {}, remove() {}, toggle() {} },
		addEventListener() {},
		querySelector() { return { textContent: "" }; },
		querySelectorAll() { return []; },
	};
}

function canvasContext() {
	return new Proxy({
		createLinearGradient: () => ({ addColorStop() {} }),
		measureText: (text) => ({ width: String(text).length * 5 }),
		save() {},
		restore() {},
		translate() {},
		scale() {},
		setTransform() {},
		clearRect() {},
		fillRect() {},
		fillText() {},
		beginPath() {},
		closePath() {},
		moveTo() {},
		lineTo() {},
		quadraticCurveTo() {},
		arc() {},
		ellipse() {},
		stroke() {},
		fill() {},
		strokeRect() {},
		setLineDash() {},
		roundRect() {},
	}, { get(target, property) { return property in target ? target[property] : undefined; }, set(target, property, value) { target[property] = value; return true; } });
}

test("vertical overlay initializes without browser runtime errors", () => {
	const elements = new Map();
	const canvas = element("raceCanvas");
	canvas.getContext = () => canvasContext();
	elements.set("raceCanvas", canvas);
	const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); } };
	const listeners = new Map();
	const bridgeHandlers = new Map();
	let frameCalled = false;
	const window = {
		CAMEL_RUSH_CONFIG: undefined,
		CamelRushRaceEngine: undefined,
		innerWidth: 390,
		innerHeight: 844,
		devicePixelRatio: 1,
		location: { search: "?demo=1" },
		addEventListener(event, callback) { listeners.set(event, callback); },
		requestAnimationFrame() {},
		TikTokBridge: { on(event, callback) { bridgeHandlers.set(event, callback); }, reportGameState() {} },
	};
	const context = {
		console,
		Date,
		Math,
		URLSearchParams,
		performance: { now: () => 0 },
		setTimeout: () => 1,
		clearTimeout() {},
		document,
		window,
		TikTokBridge: window.TikTokBridge,
		requestAnimationFrame(callback) {
			if (!frameCalled) { frameCalled = true; callback(16); }
			return 1;
		},
	};
	vm.runInNewContext(configSource, context);
	vm.runInNewContext(engineSource, context);
	vm.runInNewContext(gameSource, context);
	assert.equal(frameCalled, true);
	bridgeHandlers.get("follow")({ user: { uniqueId: "m7", nickname: "محمد" } });
	assert.equal(elements.get("raceNumber").textContent, "1");
	assert.match(elements.get("eventFeed").innerHTML, /محمد/);
});
