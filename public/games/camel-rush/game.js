(() => {
	const config = window.CAMEL_RUSH_CONFIG;
	const engine = new window.CamelRushRaceEngine(config);
	const canvas = document.getElementById("raceCanvas");
	const ctx = canvas.getContext("2d", { alpha: false });
	const laneBoard = document.getElementById("laneBoard");
	const eventFeed = document.getElementById("eventFeed");
	const eventToast = document.getElementById("eventToast");
	const podium = document.getElementById("podium");
	const podiumRows = document.getElementById("podiumRows");
	const liveStatus = document.getElementById("liveStatus");
	const viewerCount = document.getElementById("viewerCount");
	const phaseLabel = document.getElementById("phaseLabel");
	const phaseTimer = document.getElementById("phaseTimer");
	const raceNumber = document.getElementById("raceNumber");
	const hypeFill = document.getElementById("hypeFill");
	const demoControls = document.getElementById("demoControls");
	const params = new URLSearchParams(window.location.search);
	const demoMode = params.get("demo") === "1";
	const particles = [];
	let width = 0;
	let height = 0;
	let dpr = 1;
	let lastFrame = performance.now();
	let toastTimer;

	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	window.addEventListener("resize", resize);
	resize();

	function buildLaneBoard() {
		laneBoard.innerHTML = config.lanes.map((lane, index) => `
			<div class="lane-card" id="lane-card-${lane.id}" style="--lane:${lane.color}">
				<span class="lane-rank" id="lane-rank-${lane.id}">${String(index + 1).padStart(2, "0")}</span>
				<span class="lane-info"><span class="lane-name">${lane.name}</span><span class="lane-latin">${lane.latin}</span><span class="lane-player" id="lane-player-${lane.id}">بانتظار مشارك</span></span>
				<span class="lane-score" id="lane-score-${lane.id}">0%</span>
				<span class="lane-progress"><span id="lane-progress-${lane.id}"></span></span>
			</div>
		`).join("");
	}
	buildLaneBoard();

	function phaseText(phase) {
		return {
			waiting: "الاستعداد",
			countdown: "انطلاق السباق",
			racing: "السباق مستمر",
			final: "🔥 الاندفاعة الأخيرة",
			finished: "الفائز وصل",
			cooldown: "تجهيز الجولة القادمة",
		}[phase] || phase;
	}

	function formatTime(ms) {
		if (!Number.isFinite(ms)) return "--:--";
		const seconds = Math.max(0, Math.ceil(ms / 1000));
		return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
	}

	function renderHud(state) {
		document.getElementById("gameShell").dataset.phase = state.phase;
		phaseLabel.textContent = phaseText(state.phase);
		phaseTimer.textContent = formatTime(engine.phaseRemaining());
		raceNumber.textContent = String(state.raceNumber + 1).padStart(2, "0");
		hypeFill.style.width = `${Math.min(100, ((state.hype % config.likeMilestone) / config.likeMilestone) * 100)}%`;
		const sorted = engine.sortedLanes();
		state.lanes.forEach((lane, index) => {
			const pct = Math.min(100, Math.round(lane.progress));
			document.getElementById(`lane-score-${lane.id}`).textContent = `${pct}%`;
			document.getElementById(`lane-progress-${lane.id}`).style.width = `${pct}%`;
			document.getElementById(`lane-rank-${lane.id}`).textContent = String(sorted.indexOf(lane) + 1).padStart(2, "0");
			document.getElementById(`lane-player-${lane.id}`).textContent = lane.lastPlayer || "بانتظار مشارك";
			const card = document.getElementById(`lane-card-${lane.id}`);
			card.classList.toggle("is-leading", sorted[0] === lane && lane.progress > 0);
		});
		if (state.events) renderFeed(state.events);
	}

	function renderFeed(events) {
		eventFeed.innerHTML = events.slice(0, 3).map((event) => {
			const lane = event.lane?.name ? ` → ${event.lane.name}` : "";
			const text = event.type === "gift"
				? `🎁 ${escapeHtml(event.nickname)} أرسل ${escapeHtml(event.label || "هدية")}${lane}`
				: event.type === "comment"
					? `💬 ${escapeHtml(event.nickname)} اختار ${escapeHtml(event.lane?.name || "جمل")}`
						: event.type === "join"
							? `✦ ${escapeHtml(event.nickname)} دخل السباق${lane}`
							: event.type === "queue"
								? `◷ ${escapeHtml(event.nickname)} جاهز للجولة القادمة`
								: event.type === "share" ? `↗ ${escapeHtml(event.nickname)} شارك البث` : `♥ ${escapeHtml(event.nickname || "الجمهور")} رفع الحماس`;
			return `<div class="feed-item ${event.type === "gift" ? "is-gift" : event.type === "chat" ? "is-chat" : ""}">${text}</div>`;
		}).join("");
	}

	function escapeHtml(value) {
		return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
	}

	function setLiveStatus(status) {
		const connected = status === "connected";
		liveStatus.classList.toggle("is-live", connected);
		liveStatus.classList.toggle("is-offline", !connected);
		liveStatus.querySelector("span").textContent = connected ? "TikTok LIVE" : status === "connecting" || status === "reconnecting" ? "جاري الربط" : "غير متصل";
	}

	function showToast(text) {
		eventToast.textContent = text;
		eventToast.classList.remove("show");
		void eventToast.offsetWidth;
		eventToast.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => eventToast.classList.remove("show"), 1_700);
	}

	function renderPodium(items) {
		const medals = ["🥇", "🥈", "🥉"];
		podiumRows.innerHTML = items.map((lane, index) => `
			<div class="podium-row"><span class="podium-medal">${medals[index] || "✦"}</span><span class="podium-name" style="color:${lane.color}">${lane.name}<small> ${lane.latin}</small></span><span class="podium-score">${Math.round(lane.progress)}%</span></div>
		`).join("");
		podium.classList.remove("hidden");
	}

	function addParticles(laneIndex, tone = "dust", amount = 8) {
		for (let i = 0; i < amount; i += 1) {
			particles.push({ laneIndex, tone, life: 1, x: 0, y: 0, size: 2 + Math.random() * 4, drift: (Math.random() - .5) * 30 });
		}
	}

	engine.on("move", ({ laneIndex, type }) => {
		addParticles(laneIndex, type === "gift" ? "gold" : "dust", type === "gift" ? 9 : 5);
		const card = document.getElementById(`lane-card-${config.lanes[laneIndex].id}`);
		card?.classList.remove("is-hit");
		void card?.offsetWidth;
		card?.classList.add("is-hit");
	});
	engine.on("event", (event) => {
		if (event.type === "gift") showToast(`🎁 ${event.label || "هدية"} → ${event.lane?.name || "Boost"}`);
		if (event.type === "join") showToast(`${event.nickname} دخل السباق`);
	});
	engine.on("winner", ({ podium: items }) => {
		addParticles(0, "confetti", 40);
		renderPodium(items);
		showToast(`🏆 ${items[0]?.name || "الفائز"} ملك السباق`);
	});
	engine.on("reset", () => podium.classList.add("hidden"));

	TikTokBridge.on("status", (data) => setLiveStatus(data?.status || "disconnected"));
	TikTokBridge.on("connected", (data) => setLiveStatus(data?.connected ? "connected" : "connecting"));
	TikTokBridge.on("error", () => setLiveStatus("reconnecting"));
	TikTokBridge.on("chat", (data) => engine.handleChat(data));
	TikTokBridge.on("gift", (data) => engine.handleGift(data));
	TikTokBridge.on("like", (data) => engine.handleLike(data));
	TikTokBridge.on("share", (data) => engine.handleShare(data));
	TikTokBridge.on("follow", (data) => engine.handleFollow(data));
	TikTokBridge.on("member", (data) => { if (data?.viewerCount) viewerCount.textContent = `◉ ${Number(data.viewerCount).toLocaleString("en-US")}`; });

	function demoEvent(type) {
		const user = { uniqueId: "demo-mohammed", nickname: "محمد" };
		if (type === "join") engine.handleFollow({ user });
		if (type === "rose") engine.handleGift({ user, giftName: "Rose", giftValue: 1, giftType: "small", repeatCount: 1 });
		if (type === "gift") engine.handleGift({ user, giftName: "Galaxy", giftValue: 10, giftType: "medium", repeatCount: 1 });
		if (type === "rocket") engine.handleGift({ user, giftName: "Lion", giftValue: 100, giftType: "large", repeatCount: 1 });
		if (type === "likes") engine.handleLike({ user, likeCount: 100 });
		if (type === "share") engine.handleShare({ user });
	}
	if (demoMode) {
		demoControls.classList.remove("hidden");
		demoControls.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => demoEvent(button.dataset.demo)));
		setLiveStatus("connected");
	}

	function drawWorld(state, elapsed) {
		ctx.save();
		ctx.clearRect(0, 0, width, height);
		const sky = ctx.createLinearGradient(0, 0, 0, height);
		sky.addColorStop(0, "#07111f"); sky.addColorStop(.52, "#112844"); sky.addColorStop(1, "#6a3d39");
		ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "rgba(255, 220, 159, .9)"; ctx.beginPath(); ctx.arc(width * .18, height * .17, Math.min(width, height) * .055, 0, Math.PI * 2); ctx.fill();
		drawStars(elapsed);
		drawCity();
		drawDunes();
		drawGate();
		drawTracks(state, elapsed);
		drawParticles(state, elapsed);
		ctx.restore();
	}

	function drawStars(elapsed) {
		for (let i = 0; i < 26; i += 1) {
			const x = (i * 83 + 31) % Math.max(width, 1);
			const y = 42 + ((i * 47) % Math.max(height * .26, 1));
			const alpha = .25 + .2 * Math.sin(elapsed * .001 + i);
			ctx.fillStyle = `rgba(245,241,232,${alpha})`;
			ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
		}
	}

	function drawCity() {
		const base = height * .45;
		for (let i = 0; i < 18; i += 1) {
			const bw = 15 + (i % 4) * 9;
			const bh = 20 + (i * 19) % 70;
			const x = (i * (width / 16)) - 20;
			ctx.fillStyle = i % 3 === 0 ? "rgba(82,224,208,.10)" : "rgba(5,13,27,.55)";
			ctx.fillRect(x, base - bh, bw, bh);
			if (i % 3 === 0) { ctx.fillStyle = "rgba(255,209,102,.4)"; ctx.fillRect(x + 4, base - bh + 9, 2, 2); }
		}
	}

	function drawDunes() {
		ctx.fillStyle = "#2C2738"; ctx.beginPath(); ctx.moveTo(0, height * .53); ctx.quadraticCurveTo(width * .25, height * .43, width * .52, height * .54); ctx.quadraticCurveTo(width * .78, height * .42, width, height * .52); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
		ctx.fillStyle = "rgba(201,137,85,.38)"; ctx.beginPath(); ctx.moveTo(0, height * .63); ctx.quadraticCurveTo(width * .26, height * .55, width * .52, height * .66); ctx.quadraticCurveTo(width * .78, height * .55, width, height * .64); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
	}

	function drawGate() {
		const x = width * .76; const y = height * .30; const w = width * .12; const h = height * .23;
		ctx.strokeStyle = "rgba(201,137,85,.5)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 18); ctx.quadraticCurveTo(x + w / 2, y - 5, x + w, y + 18); ctx.lineTo(x + w, y + h); ctx.stroke();
		ctx.strokeStyle = "rgba(82,224,208,.55)"; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.strokeRect(x + 9, y + 14, w - 18, h - 14); ctx.setLineDash([]);
	}

	function drawTracks(state, elapsed) {
		const startX = width * .10; const endX = width * .89; const trackTop = height * .34; const trackBottom = height * .77; const laneHeight = (trackBottom - trackTop) / state.lanes.length;
		state.lanes.forEach((lane, index) => {
			const y = trackTop + index * laneHeight + laneHeight * .5;
			ctx.strokeStyle = "rgba(245,241,232,.14)"; ctx.lineWidth = 1; ctx.setLineDash([4, 9]); ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke(); ctx.setLineDash([]);
			ctx.fillStyle = `${lane.color}18`; ctx.fillRect(startX, y - laneHeight * .28, (endX - startX) * (lane.progress / config.finishLine), laneHeight * .56);
			ctx.strokeStyle = `${lane.color}75`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(startX, y - laneHeight * .28); ctx.lineTo(endX, y - laneHeight * .28); ctx.stroke();
			const camelX = startX + (endX - startX) * Math.min(lane.progress / config.finishLine, 1);
			drawCamel(camelX, y - 5, Math.max(.35, Math.min(1, width / 430)), lane.color, elapsed * .012 + index, state.lanes[index] === engine.sortedLanes()[0] && lane.progress > 0);
			drawPlayerTag(camelX, y, lane.lastPlayer, lane.color);
			ctx.fillStyle = "rgba(245,241,232,.5)"; ctx.font = "600 8px 'Space Grotesk', sans-serif"; ctx.textAlign = "left"; ctx.fillText(lane.latin, startX, y + laneHeight * .32);
		});
		ctx.strokeStyle = "rgba(255,209,102,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(endX, trackTop - 18); ctx.lineTo(endX, trackBottom + 18); ctx.stroke();
		ctx.fillStyle = "#FFD166"; ctx.font = "700 9px 'Space Grotesk', sans-serif"; ctx.textAlign = "center"; ctx.fillText("FINISH", endX, trackTop - 26);
	}

	function drawCamel(x, y, scale, color, runPhase, leader) {
		const s = 34 * scale; const bob = Math.sin(runPhase) * 1.5 * scale;
		ctx.save(); ctx.translate(x, y + bob); ctx.lineCap = "round"; ctx.lineJoin = "round";
		ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(-2 * scale, 15 * scale, 22 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = color; ctx.lineWidth = 4 * scale; ctx.beginPath(); ctx.moveTo(-12 * scale, 1 * scale); ctx.lineTo(-14 * scale, 17 * scale + Math.sin(runPhase) * 3 * scale); ctx.moveTo(4 * scale, 1 * scale); ctx.lineTo(8 * scale, 17 * scale + Math.sin(runPhase + Math.PI) * 3 * scale); ctx.stroke();
		ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(-2 * scale, -3 * scale, 18 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
		ctx.beginPath(); ctx.moveTo(-3 * scale, -7 * scale); ctx.quadraticCurveTo(2 * scale, -28 * scale, 10 * scale, -20 * scale); ctx.lineTo(14 * scale, -9 * scale); ctx.lineTo(6 * scale, -7 * scale); ctx.closePath(); ctx.fill();
		ctx.beginPath(); ctx.ellipse(16 * scale, -21 * scale, 8 * scale, 5 * scale, -.15, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = "#111B2E"; ctx.beginPath(); ctx.arc(19 * scale, -22 * scale, 1.2 * scale, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = "rgba(245,241,232,.7)"; ctx.lineWidth = 1.5 * scale; ctx.beginPath(); ctx.moveTo(22 * scale, -18 * scale); ctx.lineTo(29 * scale, -16 * scale); ctx.stroke();
		ctx.fillStyle = leader ? "#FFD166" : "rgba(245,241,232,.85)"; ctx.beginPath(); ctx.arc(-5 * scale, -14 * scale, leader ? 3 * scale : 2 * scale, 0, Math.PI * 2); ctx.fill();
		if (leader) { ctx.strokeStyle = "rgba(255,209,102,.75)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -8 * scale, 27 * scale, 0, Math.PI * 2); ctx.stroke(); }
		ctx.restore();
	}

	function drawPlayerTag(x, y, nickname, color) {
		if (!nickname) return;
		const label = nickname.length > 13 ? `${nickname.slice(0, 12)}…` : nickname;
		ctx.save();
		ctx.font = "600 8px 'IBM Plex Sans Arabic', sans-serif";
		const textWidth = ctx.measureText(label).width;
		ctx.fillStyle = "rgba(8,14,26,.82)";
		ctx.strokeStyle = `${color}99`;
		ctx.lineWidth = 1;
		const left = x - textWidth / 2 - 6;
		ctx.beginPath();
		ctx.roundRect(left, y - 30, textWidth + 12, 15, 5);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#F5F1E8";
		ctx.textAlign = "center";
		ctx.fillText(label, x, y - 20);
		ctx.restore();
	}

	function drawParticles(state, elapsed) {
		const startX = width * .10; const endX = width * .89; const top = height * .34; const bottom = height * .77; const laneHeight = (bottom - top) / state.lanes.length;
		for (const particle of particles) {
			const y = top + particle.laneIndex * laneHeight + laneHeight * .5;
			const lane = state.lanes[particle.laneIndex];
			const x = startX + (endX - startX) * Math.min(lane.progress / config.finishLine, 1) - 18 + particle.drift;
			particle.life -= .035;
			particle.drift += Math.sin(elapsed * .01 + particle.size) * .18;
			const color = particle.tone === "gold" || particle.tone === "confetti" ? "#FFD166" : particle.tone === "rocket" ? "#FF6B5E" : lane?.color || "#C98955";
			ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y + (1 - particle.life) * 12 - particle.size, particle.size * particle.life, 0, Math.PI * 2); ctx.fill();
		}
		ctx.globalAlpha = 1;
		for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
	}

	function frame(now) {
		const elapsed = now - lastFrame; lastFrame = now;
		if (elapsed > 100) lastFrame = now;
		const state = engine.tick();
		drawWorld(state, now);
		renderHud(state);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
})();
