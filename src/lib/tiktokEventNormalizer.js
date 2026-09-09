/** Normalize legacy and 2.x tiktok-live-connector payloads. */

function object(value) {
	return value !== null && typeof value === "object" ? value : {};
}

function first(...values) {
	return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function normalizeUser(raw) {
	const data = object(raw);
	const user = object(first(data.user, data.author, data.member, data));
	const uniqueId = String(first(user.uniqueId, user.unique_id, user.displayId, user.id, "anonymous"));
	return {
		uniqueId,
		nickname: String(first(user.nickname, user.displayName, uniqueId, "Anonymous")),
		profilePictureUrl: String(first(user.profilePictureUrl, user.avatarLarger, user.avatarThumb) ?? ""),
	};
}

export function normalizeChat(raw) {
	const data = object(raw);
	return {
		user: normalizeUser(data),
		comment: String(first(data.comment, data.content, "")).trim().slice(0, 300),
		timestamp: Date.now(),
	};
}

export function normalizeLike(raw) {
	const data = object(raw);
	return {
		user: normalizeUser(data),
		likeCount: Number(first(data.likeCount, data.count, 1)) || 1,
		totalLikeCount: Number(first(data.totalLikeCount, data.total, 0)) || 0,
		timestamp: Date.now(),
	};
}

export function normalizeShare(raw) {
	return { user: normalizeUser(raw), timestamp: Date.now() };
}

export function normalizeFollow(raw) {
	return { user: normalizeUser(raw), timestamp: Date.now() };
}

export function normalizeMember(raw) {
	const data = object(raw);
	return {
		user: normalizeUser(data),
		viewerCount: Number(first(data.memberCount, data.total, data.viewerCount, 0)) || 0,
		timestamp: Date.now(),
	};
}

export function categorizeGift(value) {
	if (value >= 100) return "large";
	if (value >= 10) return "medium";
	return "small";
}

export function normalizeGift(raw) {
	const data = object(raw);
	const gift = object(first(data.gift, data.giftDetails, data.extendedGiftInfo));
	const giftValue = Number(first(
		data.diamondCount,
		data.giftValue,
		gift.diamondCount,
		gift.diamond_count,
		gift.diamondCost,
		gift.cost,
		1,
	)) || 1;
	const repeatCount = Math.max(1, Math.min(100, Number(data.repeatCount) || 1));
	return {
		user: normalizeUser(data),
		giftId: Number(first(data.giftId, gift.id, 0)) || 0,
		giftName: String(first(data.giftName, gift.name, gift.giftName, "Gift")),
		giftValue,
		repeatCount,
		giftType: categorizeGift(giftValue),
		repeatEnd: data.repeatEnd !== false,
		timestamp: Date.now(),
	};
}
