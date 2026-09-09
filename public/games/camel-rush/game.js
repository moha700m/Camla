(() => {
	const canvas = document.getElementById("raceCanvas");
	const ctx = canvas.getContext("2d", { alpha: false });
	const liveStatus = document.getElementById("liveStatus");
	const viewerCount = document.getElementById("viewerCount");
	const camelCount = document.getElementById("raceNumber");
	const feedEl = document.getElementById("eventFeed");
	const toastEl = document.getElementById("eventToast");
	const hypeFill = document.getElementById("hypeFill");
	const demoControls = document.getElementById("demoControls");
	const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
	const camels = new Map();
	const particles = [];
	const feed = [];
	let width = 0;
	let height = 0;
	let dpr = 1;
	let hype = 0;
	let lightBurstUntil = 0;
	let toastTimer;
	let lastHeartbeat = 0;
	let previousFrame = performance.now();

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

	function userKey(user = {}) {
		return String(user.uniqueId || user.username || user.nickname || `guest-${Date.now()}`).trim().toLowerCase();
	}

	function addCamel(user = {}, vip = false) {
		const key = userKey(user);
		const existing = camels.get(key);
		if (existing) {
			existing.boostUntil = performance.now() + 4500;
			existing.vip ||= vip;
			return existing;
		}
		if (camels.size >= 60) camels.delete(camels.keys().next().value);
		const index = camels.size;
		const camel = {
			key,
			name: String(user.nickname || user.uniqueId || "ضيف 966").trim().slice(0, 16),
			lane: index % 6,
			progress: ((index * 17) % 80) / 100,
			speed: .020 + (index % 7) * .0012,
			color: `hsl(${(index * 61 + key.length * 17) % 360} 72% 64%)`,
			phase: index * 1.37,
			boostUntil: performance.now() + 2400,
			vip,
		};
		camels.set(key, camel);
		camelCount.textContent = String(camels.size);
		pushFeed(`🐪 ${camel.name} دخل المضمار`);
		showToast(`${camel.name} دخل بجمله`);
		burst(width * .12, laneY(camel.lane), vip ? 32 : 16, vip ? "#FFD166" : "#55E0D2");
		return camel;
	}

	function pushFeed(text) {
		feed.unshift(text);
		feed.splice(4);
		feedEl.innerHTML = feed.map((item) => `<div class="feed-item">${escapeHtml(item)}</div>`).join("");
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
	}

	function showToast(text) {
		toastEl.textContent = text;
		toastEl.classList.remove("show");
		void toastEl.offsetWidth;
		toastEl.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
	}

	function setStatus(status) {
		const connected = status === "connected";
		liveStatus.classList.toggle("is-live", connected);
		liveStatus.classList.toggle("is-offline", !connected);
		liveStatus.querySelector("span").textContent = connected ? "TikTok LIVE" : "جاري الربط";
	}

	function laneY(lane) {
		return height * .38 + lane * (height * .40 / 6) + height * .035;
	}

	function burst(x, y, amount, color) {
		for (let i = 0; i < amount; i += 1) particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: -25 - Math.random() * 75, life: 1, color, size: 2 + Math.random() * 4 });
	}

	function gift(data = {}) {
		const value = Math.max(1, Number(data.giftValue) || 1);
		const camel = addCamel(data.user || data.viewer, value >= 100 || data.giftType === "large");
		camel.boostUntil = performance.now() + Math.min(12000, 3500 + value * 40);
		camel.speed = Math.min(.055, camel.speed + Math.min(.018, value / 7000));
		lightBurstUntil = performance.now() + 1800;
		hype = Math.min(100, hype + Math.max(8, Math.min(45, value)));
		hypeFill.style.width = `${hype}%`;
		pushFeed(`🎁 ${camel.name} أرسل ${data.giftName || "هدية"}`);
		showToast(`${data.giftName || "هدية"} — انطلاقة قوية!`);
		burst(camel.progress * width, laneY(camel.lane), 30, "#FFD166");
	}

	TikTokBridge.on("status", (data) => setStatus(data?.status));
	TikTokBridge.on("connected", (data) => setStatus(data?.connected ? "connected" : "connecting"));
	TikTokBridge.on("follow", (data) => addCamel(data?.user || data?.viewer));
	TikTokBridge.on("chat", (data) => {
		const text = String(data?.comment || "").trim().toLowerCase();
		if (["ادخل", "دخل", "join", "go"].includes(text)) addCamel(data?.user || data?.viewer);
	});
	TikTokBridge.on("gift", gift);
	TikTokBridge.on("share", (data) => {
		const camel = addCamel(data?.user || data?.viewer);
		camel.boostUntil = performance.now() + 5000;
		showToast("مشاركة = تسريع الجمل");
	});
	TikTokBridge.on("like", (data) => {
		hype += Math.max(1, Number(data?.likeCount) || 1);
		if (hype >= 100) {
			hype = 0;
			lightBurstUntil = performance.now() + 2200;
			for (const camel of camels.values()) camel.boostUntil = performance.now() + 3000;
			showToast("🔥 100 لايك — تسريع الجميع!");
		}
		hypeFill.style.width = `${Math.min(100, hype)}%`;
	});
	TikTokBridge.on("member", (data) => {
		if (data?.viewerCount) viewerCount.textContent = `◉ ${Number(data.viewerCount).toLocaleString("en-US")}`;
	});

	if (demoMode) {
		demoControls.classList.remove("hidden");
		setStatus("connected");
		demoControls.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
			const user = { uniqueId: "demo-mohammed", nickname: "محمد" };
			if (button.dataset.demo === "join") addCamel(user);
			if (button.dataset.demo === "rose") gift({ user, giftName: "Rose", giftValue: 1 });
			if (button.dataset.demo === "gift") gift({ user, giftName: "Galaxy", giftValue: 10 });
			if (button.dataset.demo === "rocket") gift({ user, giftName: "Lion", giftValue: 100, giftType: "large" });
		}));
	}

	function drawWorld(now) {
		const flash = now < lightBurstUntil ? .12 + Math.sin(now * .025) * .08 : 0;
		const sky = ctx.createLinearGradient(0, 0, 0, height);
		sky.addColorStop(0, "#07111f"); sky.addColorStop(.5, "#112844"); sky.addColorStop(1, "#6a3d39");
		ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = `rgba(255,209,102,${.8 + flash})`; ctx.beginPath(); ctx.arc(width * .18, height * .17, Math.min(width, height) * .055, 0, Math.PI * 2); ctx.fill();
		for (let i = 0; i < 24; i += 1) { ctx.fillStyle = `rgba(245,241,232,${.22 + .18 * Math.sin(now * .001 + i)})`; ctx.fillRect((i * 83 + 31) % width, 36 + (i * 47) % (height * .25), i % 3 ? 1 : 2, i % 3 ? 1 : 2); }
		ctx.fillStyle = "#2C2738"; ctx.beginPath(); ctx.moveTo(0, height * .53); ctx.quadraticCurveTo(width * .25, height * .43, width * .52, height * .54); ctx.quadraticCurveTo(width * .78, height * .42, width, height * .52); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
		ctx.fillStyle = "rgba(201,137,85,.42)"; ctx.fillRect(0, height * .36, width, height * .48);
		for (let lane = 0; lane < 6; lane += 1) { const y = laneY(lane); ctx.strokeStyle = "rgba(245,241,232,.18)"; ctx.setLineDash([5, 10]); ctx.beginPath(); ctx.moveTo(width * .06, y + 22); ctx.lineTo(width * .94, y + 22); ctx.stroke(); }
		ctx.setLineDash([]);
	}

	function drawCamel(camel, now, deltaSeconds) {
		const boosted = now < camel.boostUntil;
		camel.progress += camel.speed * (boosted ? 3.2 : 1) * deltaSeconds;
		if (camel.progress > 1.08) { camel.progress = -.08; camel.lane = (camel.lane + 1) % 6; }
		const x = camel.progress * width;
		const y = laneY(camel.lane);
		const scale = Math.max(.48, Math.min(.86, width / 500));
		const run = now * (boosted ? .025 : .012) + camel.phase;
		ctx.save(); ctx.translate(x, y + Math.sin(run) * 2); ctx.scale(scale, scale); ctx.lineCap = "round"; ctx.lineJoin = "round";
		if (boosted || camel.vip) { ctx.strokeStyle = camel.vip ? "#FFD166" : "#55E0D2"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -8, 31 + Math.sin(run) * 3, 0, Math.PI * 2); ctx.stroke(); }
		ctx.strokeStyle = camel.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-15, 20 + Math.sin(run) * 5); ctx.moveTo(5, 0); ctx.lineTo(10, 20 + Math.sin(run + Math.PI) * 5); ctx.stroke();
		ctx.fillStyle = camel.color; ctx.beginPath(); ctx.ellipse(-2, -4, 20, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(2, -32, 12, -22); ctx.lineTo(16, -10); ctx.lineTo(7, -7); ctx.fill(); ctx.beginPath(); ctx.ellipse(18, -23, 9, 6, -.15, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = "#07111f"; ctx.beginPath(); ctx.arc(21, -24, 1.4, 0, Math.PI * 2); ctx.fill();
		ctx.font = "600 11px IBM Plex Sans Arabic, sans-serif"; const tw = ctx.measureText(camel.name).width; ctx.fillStyle = "rgba(7,17,31,.88)"; ctx.fillRect(-tw / 2 - 6, -50, tw + 12, 17); ctx.fillStyle = camel.vip ? "#FFD166" : "#fff"; ctx.textAlign = "center"; ctx.fillText(camel.name, 0, -38);
		ctx.restore();
		if (boosted && Math.random() > .72) burst(x - 15, y + 15, 1, camel.vip ? "#FFD166" : "#55E0D2");
	}

	function drawParticles() {
		for (const p of particles) { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 2; p.life -= .025; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); }
		ctx.globalAlpha = 1;
		for (let i = particles.length - 1; i >= 0; i -= 1) if (particles[i].life <= 0) particles.splice(i, 1);
	}

	function frame(now) {
		const deltaSeconds = Math.min(.05, Math.max(0, (now - previousFrame) / 1000));
		previousFrame = now;
		drawWorld(now);
		for (const camel of camels.values()) drawCamel(camel, now, deltaSeconds);
		drawParticles();
		if (now - lastHeartbeat >= 5000) {
			lastHeartbeat = now;
			TikTokBridge.reportGameState({ phase: "endless", round: 1, remainingMs: 0, leaderProgress: 0, camelCount: camels.size });
		}
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
})();
