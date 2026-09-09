import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../public/games/camel-rush/race-engine.js", import.meta.url), "utf8");
const context = { console, Date, Math, window: {} };
vm.runInNewContext(source, context);
const RaceEngine = context.window.CamelRushRaceEngine;
const config = {
	finishLine: 100,
	chatBoost: 2.5,
	globalBoost: 1.5,
	likeMilestone: 100,
	lateJoinWindow: 15_000,
	phases: { waiting: { duration: 5_000 }, countdown: { duration: 8_000 }, racing: { duration: 75_000 }, final: { duration: 15_000 }, finished: { duration: 8_000 }, cooldown: { duration: 4_000 } },
	lanes: [
		{ id: 0, name: "الرعد", aliases: ["الرعد"] },
		{ id: 1, name: "البرق", aliases: ["البرق"] },
		{ id: 2, name: "الواحة", aliases: ["الواحة"] },
	],
	giftBoost: (value) => value >= 100 ? 12 : value >= 10 ? 6 : 2.5,
};

test("a gift assigns a viewer and moves their camel", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "racing";
	engine.handleGift({ user: { uniqueId: "m7", nickname: "محمد" }, giftName: "Rose", giftValue: 1, giftType: "small" });
	const lane = engine.state.lanes.find((item) => item.supporters.size === 1);
	assert.ok(lane);
	assert.equal(lane.progress, 2.5);
	assert.equal(lane.supporters.get("m7").nickname, "محمد");
});

test("the race automatically transitions to final and podium", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "racing";
	engine.state.phaseStartedAt = Date.now() - 61_000;
	engine.tick();
	assert.equal(engine.state.phase, "final");
	engine.state.phaseStartedAt = Date.now() - 16_000;
	engine.tick();
	assert.equal(engine.state.phase, "finished");
	assert.equal(engine.state.podium.length, 3);
});

test("chat lane selection is Arabic-friendly", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "racing";
	engine.handleChat({ user: { uniqueId: "sara", nickname: "سارة" }, comment: "البرق" });
	assert.equal(engine.state.lanes[1].progress, 2.5);
});

test("Arabic-Indic lane numbers work", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "racing";
	engine.handleChat({ user: { uniqueId: "ali", nickname: "علي" }, comment: "٣" });
	assert.equal(engine.state.lanes[2].progress, 2.5);
});

test("late follow is queued for the next round", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "final";
	engine.handleFollow({ user: { uniqueId: "late", nickname: "متأخر" } });
	assert.equal(engine.state.lanes.every((lane) => lane.playerNames.length === 0), true);
	assert.equal(engine.queuedViewers.size, 1);
	engine.state.phase = "cooldown";
	engine.state.phaseStartedAt = Date.now() - 5_000;
	engine.tick();
	assert.equal(engine.queuedViewers.size, 0);
	assert.equal(engine.state.lanes.some((lane) => lane.playerNames.includes("متأخر")), true);
});

test("like milestones trigger one community burst when a batch crosses 100", () => {
	const engine = new RaceEngine(config);
	engine.state.phase = "racing";
	engine.handleLike({ user: { uniqueId: "fan", nickname: "مشجع" }, likeCount: 101 });
	assert.equal(engine.state.lanes.every((lane) => lane.progress === 1.5), true);
});
