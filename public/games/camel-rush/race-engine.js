/**
 * CAMEL RUSH 966 deterministic race state machine.
 * Rendering stays separate so the same rules work in demo mode and with real
 * TikTok events.
 */
class CamelRushRaceEngine {
	constructor(config) {
		this.config = config;
		this.listeners = new Map();
		this.viewerLanes = new Map();
		this.queuedViewers = new Map();
		this.reset(0);
	}

	on(event, listener) {
		const list = this.listeners.get(event) || [];
		list.push(listener);
		this.listeners.set(event, list);
		return () => this.listeners.set(event, list.filter((item) => item !== listener));
	}

	emit(event, payload) {
		for (const listener of this.listeners.get(event) || []) {
			try { listener(payload); } catch (error) { console.error(`[Race] ${event}`, error); }
		}
	}

	reset(raceNumber = this.state?.raceNumber ?? 0) {
		const queued = [...this.queuedViewers.values()];
		this.viewerLanes.clear();
		this.queuedViewers.clear();
		this.state = {
			phase: "waiting",
			phaseStartedAt: Date.now(),
			raceNumber,
			lanes: this.config.lanes.map((lane) => ({
				...lane,
				progress: 0,
				supporters: new Map(),
				giftTotal: 0,
				playerNames: [],
				lastPlayer: "",
			})),
			winner: null,
			podium: [],
		hype: 0,
			viewerCount: 0,
			events: [],
			effects: [],
		};
		this.emit("reset", this.state);
		for (const viewer of queued) this.assignViewer(viewer);
	}

	phaseDuration(phase = this.state.phase) {
		return this.config.phases[phase]?.duration ?? Infinity;
	}

	phaseElapsed(now = Date.now()) {
		return Math.max(0, now - this.state.phaseStartedAt);
	}

	phaseRemaining(now = Date.now()) {
		const duration = this.phaseDuration();
		if (!Number.isFinite(duration)) return Infinity;
		return Math.max(0, duration - this.phaseElapsed(now));
	}

	setPhase(phase) {
		if (phase === this.state.phase) return;
		this.state.phase = phase;
		this.state.phaseStartedAt = Date.now();
		this.emit("phase", { phase });
	}

	tick(now = Date.now()) {
		const phase = this.state.phase;
		const remaining = this.phaseRemaining(now);
		if (phase === "waiting" && remaining <= 0) this.setPhase("countdown");
		if (phase === "countdown" && remaining <= 0) this.setPhase("racing");
		if (phase === "racing" && remaining <= this.config.phases.final.duration) this.setPhase("final");
		if (phase === "final" && remaining <= 0) this.resolveWinner();
		if (phase === "finished" && remaining <= 0) this.setPhase("cooldown");
		if (phase === "cooldown" && remaining <= 0) {
			this.reset(this.state.raceNumber + 1);
		}
		this.state.effects = this.state.effects.filter((effect) => effect.until > now);
		return this.state;
	}

	startNow() {
		if (this.state.phase === "waiting") this.setPhase("countdown");
	}

	viewerKey(user) {
		return String(user?.uniqueId || user?.username || user?.nickname || "viewer").trim().toLowerCase();
	}

	assignViewer(user, preferredLane = -1) {
		const key = this.viewerKey(user);
		if (this.viewerLanes.has(key)) return this.viewerLanes.get(key);
		if (this.joinWindowClosed()) {
			if (!this.queuedViewers.has(key)) {
				this.queuedViewers.set(key, user);
				this.pushEvent({ type: "queue", nickname: user?.nickname || key });
			}
			return -1;
		}
		const lane = preferredLane >= 0 && preferredLane < this.state.lanes.length
			? preferredLane
			: this.hash(key) % this.state.lanes.length;
		this.viewerLanes.set(key, lane);
		const laneState = this.state.lanes[lane];
		const nickname = String(user?.nickname || key).trim().slice(0, 24);
		if (!laneState.playerNames.includes(nickname)) laneState.playerNames.push(nickname);
		laneState.lastPlayer = nickname;
		this.pushEvent({ type: "join", nickname: user?.nickname || key, lane: this.state.lanes[lane] });
		return lane;
	}

	joinWindowClosed() {
		return this.state.phase === "final"
			|| this.state.phase === "finished"
			|| this.state.phase === "cooldown"
			|| (this.state.phase === "racing" && this.phaseRemaining() <= this.config.lateJoinWindow);
	}

	handleFollow(data) {
		this.startNow();
		const assignedLane = this.assignViewer(data?.user || data?.viewer || {});
		this.addEffect("join", assignedLane >= 0 ? "تابع ودخل السباق" : "جاهز للجولة القادمة", "cyan");
	}

	handleChat(data) {
		const user = data?.user || {};
		const comment = String(data?.comment || "").trim();
		const lower = comment.toLowerCase();
		const aliases = this.config.lanes.flatMap((lane, index) => (lane.aliases || []).map((alias) => [alias, index]));
		const numeric = Number.parseInt(comment.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))), 10);
		const alias = aliases.find(([value]) => value === lower || value === comment);
		const laneIndex = numeric >= 1 && numeric <= this.state.lanes.length ? numeric - 1 : (alias?.[1] ?? -1);
		if (laneIndex >= 0 || ["ادخل", "دخل", "join", "go"].includes(lower)) {
			this.startNow();
			const assignedLane = this.assignViewer(user, laneIndex);
			if (assignedLane >= 0 && laneIndex >= 0) this.moveLane(assignedLane, this.config.chatBoost, user, "comment", comment);
			return;
		}
		this.pushEvent({ type: "chat", nickname: user.nickname || "مشاهد", text: comment });
	}

	handleGift(data) {
		const user = data?.user || {};
		const laneIndex = this.assignViewer(user);
		this.startNow();
		if (laneIndex < 0) return;
		const value = Math.max(1, Number(data?.giftValue) || 1);
		const count = Math.max(1, Math.min(100, Number(data?.repeatCount) || 1));
		const distance = this.config.giftBoost(value) * Math.min(count, 5);
		this.moveLane(laneIndex, distance, user, "gift", data?.giftName || "Gift");
		this.addEffect(data?.giftType === "large" ? "rocket" : "gift", `${user.nickname || "مشاهد"} أرسل ${data?.giftName || "هدية"}`, data?.giftType === "large" ? "gold" : "cyan");
		if (data?.giftType === "large" || value >= 100) this.addEffect("storm", "اندفاعة ذهبية", "gold");
	}

	handleLike(data) {
		const likes = Math.max(1, Number(data?.likeCount) || 1);
		const before = this.state.hype;
		this.state.hype = Math.min(9999, this.state.hype + likes);
		const milestonesBefore = Math.floor(before / this.config.likeMilestone);
		const milestonesAfter = Math.floor(this.state.hype / this.config.likeMilestone);
		if (milestonesAfter > milestonesBefore) {
			for (const lane of this.state.lanes) lane.progress = Math.min(this.config.finishLine, lane.progress + this.config.globalBoost);
			this.addEffect("hype", "الجمهور شغّل دفعة السرعة", "cyan");
		}
		this.pushEvent({ type: "like", nickname: data?.user?.nickname || "الجمهور", count: likes });
	}

	handleShare(data) {
		this.state.hype += 10;
		this.addEffect("share", "مشاركة = طاقة للجميع", "gold");
		this.pushEvent({ type: "share", nickname: data?.user?.nickname || "مشاهد" });
	}

	moveLane(index, distance, user, type, label) {
		if (!this.state.lanes[index] || ["finished", "cooldown"].includes(this.state.phase)) return;
		const lane = this.state.lanes[index];
		const safeDistance = Math.max(0, Math.min(18, distance));
		lane.progress = Math.min(this.config.finishLine, lane.progress + safeDistance);
		lane.giftTotal += type === "gift" ? safeDistance : 0;
		const key = this.viewerKey(user);
		const supporter = lane.supporters.get(key) || { nickname: user?.nickname || key, total: 0 };
		supporter.total += safeDistance;
		lane.supporters.set(key, supporter);
		this.pushEvent({ type, nickname: user?.nickname || "مشاهد", lane, label, distance: Math.round(safeDistance) });
		this.state.effects.push({ type, lane: index, until: Date.now() + 900 });
		this.emit("move", { laneIndex: index, distance: safeDistance, lane, type });
		if (this.state.phase === "racing" || this.state.phase === "final") this.checkFinish();
	}

	checkFinish() {
		if (this.state.winner) return;
		const leader = this.state.lanes.find((lane) => lane.progress >= this.config.finishLine);
		if (leader) {
			this.state.winner = leader;
			this.state.podium = this.sortedLanes().slice(0, 3);
			this.setPhase("finished");
			this.emit("winner", { winner: leader, podium: this.state.podium });
		}
	}

	resolveWinner() {
		this.state.podium = this.sortedLanes().slice(0, 3);
		this.state.winner = this.state.podium[0] || null;
		this.setPhase("finished");
		this.emit("winner", { winner: this.state.winner, podium: this.state.podium });
	}

	sortedLanes() {
		return [...this.state.lanes].sort((a, b) => b.progress - a.progress);
	}

	pushEvent(event) {
		this.state.events.unshift({ ...event, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() });
		this.state.events = this.state.events.slice(0, 7);
		this.emit("event", event);
	}

	addEffect(type, text, tone) {
		this.state.effects.push({ type, text, tone, until: Date.now() + 1_600 });
	}

	hash(value) {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
	return Math.abs(hash >>> 0);
	}
}

if (typeof module !== "undefined" && module.exports) module.exports = CamelRushRaceEngine;
else window.CamelRushRaceEngine = CamelRushRaceEngine;
