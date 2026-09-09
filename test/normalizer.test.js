import assert from "node:assert/strict";
import test from "node:test";
import { normalizeChat, normalizeGift } from "../src/lib/tiktokEventNormalizer.js";

test("normalizes Arabic user and gift payloads from connector 2.x", () => {
	const event = normalizeGift({
		user: { uniqueId: "m7", nickname: "محمد" },
		gift: { id: 5655, name: "Rose", diamondCount: 1 },
		repeatCount: 2,
		repeatEnd: true,
	});
	assert.deepEqual(event.user, { uniqueId: "m7", nickname: "محمد", profilePictureUrl: "" });
	assert.equal(event.giftName, "Rose");
	assert.equal(event.repeatCount, 2);
});

test("preserves Arabic chat text instead of lowercasing it", () => {
	const event = normalizeChat({ user: { uniqueId: "sara", nickname: "سارة" }, content: "ادخل" });
	assert.equal(event.comment, "ادخل");
});
