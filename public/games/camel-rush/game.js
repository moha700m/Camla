(() => {
	const canvas = document.getElementById("raceCanvas");
	const renderer = new CamelRushRenderer(canvas);
	const audio = new CamelRushAudio();
	const liveStatus = document.getElementById("liveStatus");
	const viewerCount = document.getElementById("viewerCount");
	const camelCount = document.getElementById("raceNumber");
	const feedEl = document.getElementById("eventFeed");
	const toastEl = document.getElementById("eventToast");
	const hypeFill = document.getElementById("hypeFill");
	const soundToggle = document.getElementById("soundToggle");
	const demoControls = document.getElementById("demoControls");
	const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
	const camels = new Map();
	const feed = [];
	let hype = 0;
	let toastTimer;
	let lastHeartbeat = 0;
	let previousFrame = performance.now();

	window.addEventListener("resize", () => renderer.resize());

	function userKey(user = {}) {
		return String(user.uniqueId || user.username || user.nickname || `guest-${Date.now()}`).trim().toLowerCase();
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
	}

	function pushFeed(text, type = "join") {
		feed.unshift({ text, type });
		feed.splice(3);
		feedEl.innerHTML = feed.map((item) => `<div class="feed-item is-${item.type}">${escapeHtml(item.text)}</div>`).join("");
	}

	function showToast(kicker, text) {
		toastEl.innerHTML = `<small>${escapeHtml(kicker)}</small><strong>${escapeHtml(text)}</strong>`;
		toastEl.classList.remove("show");
		void toastEl.offsetWidth;
		toastEl.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2100);
	}

	function setStatus(status) {
		const connected = status === "connected";
		liveStatus.classList.toggle("is-live", connected);
		liveStatus.classList.toggle("is-offline", !connected);
		liveStatus.querySelector("span").textContent = connected ? "LIVE CONNECTED" : status === "connecting" || status === "reconnecting" ? "CONNECTING" : "WAITING FOR LIVE";
	}

	function addCamel(user = {}, vip = false) {
		void audio.unlock();
		const key = userKey(user);
		const existing = camels.get(key);
		if (existing) {
			existing.boostUntil = performance.now() + 4200;
			existing.vip ||= vip;
			return existing;
		}
		if (camels.size >= 60) camels.delete(camels.keys().next().value);
		const index = camels.size;
		const camel = {
			key,
			name: String(user.nickname || user.uniqueId || "ضيف 966").trim().slice(0, 18),
			lane: index % 6,
			progress: .13 + ((index * 19) % 55) / 100,
			speed: .02 + (index % 7) * .0014,
			color: ["#f0b86c", "#59dccd", "#e78b75", "#b89af3", "#7ea9ed", "#ead6ad"][index % 6],
			phase: index * 1.37,
			boostUntil: performance.now() + 2700,
			vip,
		};
		camels.set(key, camel);
		camelCount.textContent = String(camels.size);
		pushFeed(`🐪 ${camel.name} دخل السباق`);
		showToast("متسابق جديد", `${camel.name} وصل بجمله`);
		renderer.burst(window.innerWidth * .2, renderer.laneY(camel.lane), vip ? 38 : 22, vip ? "#ffd25f" : "#42e3cf");
		audio.join();
		return camel;
	}

	function gift(data = {}) {
		const value = Math.max(1, Number(data.giftValue) || 1);
		const level = value >= 100 || data.giftType === "large" ? 3 : value >= 10 ? 2 : 1;
		const camel = addCamel(data.user || data.viewer, level === 3);
		camel.boostUntil = performance.now() + Math.min(12000, 3600 + value * 42);
		camel.speed = Math.min(.057, camel.speed + Math.min(.018, value / 7000));
		hype = Math.min(100, hype + Math.max(8, Math.min(45, value)));
		hypeFill.style.width = `${hype}%`;
		pushFeed(`🎁 ${camel.name} — ${data.giftName || "هدية"}`, "gift");
		showToast(level === 3 ? "انطلاقة ملكية 👑" : "هدية = سرعة", `${camel.name} يتقدم الآن`);
		renderer.burst(camel.progress * window.innerWidth, renderer.laneY(camel.lane), level === 3 ? 55 : 34, level === 3 ? "#ffd25f" : "#ff7b68");
		audio.gift(level);
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
		camel.boostUntil = performance.now() + 5200;
		showToast("شارك البث", `${camel.name} حصل على تسريع`);
		audio.gift(2);
	});
	TikTokBridge.on("like", (data) => {
		hype += Math.max(1, Number(data?.likeCount) || 1);
		if (hype >= 100) {
			hype = 0;
			for (const camel of camels.values()) camel.boostUntil = performance.now() + 3400;
			showToast("🔥 هبّة الجمهور", "100 لايك — تسريع جميع الجمال");
			renderer.burst(window.innerWidth * .5, window.innerHeight * .48, 65, "#42e3cf");
			audio.hype();
		}
		hypeFill.style.width = `${Math.min(100, hype)}%`;
	});
	TikTokBridge.on("member", (data) => {
		if (data?.viewerCount) viewerCount.textContent = `◉ ${Number(data.viewerCount).toLocaleString("en-US")}`;
	});

	async function toggleSound() {
		if (audio.enabled && audio.context?.state === "running") audio.setEnabled(false);
		else { audio.setEnabled(true); await audio.unlock(); }
		const active = audio.enabled && audio.context?.state === "running";
		soundToggle.classList.toggle("is-on", active);
		soundToggle.setAttribute("aria-pressed", String(active));
		soundToggle.innerHTML = active ? "<span>♫</span> الصوت يعمل" : "<span>♪</span> شغّل الصوت";
	}
	soundToggle.addEventListener("click", toggleSound);
	window.addEventListener("pointerdown", () => void audio.unlock().then((active) => {
		if (active) {
			soundToggle.classList.add("is-on");
			soundToggle.setAttribute("aria-pressed", "true");
			soundToggle.innerHTML = "<span>♫</span> الصوت يعمل";
		}
	}), { once: true });

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

	function frame(now) {
		const deltaSeconds = Math.min(.05, Math.max(0, (now - previousFrame) / 1000));
		previousFrame = now;
		renderer.render(now, deltaSeconds, camels);
		if (now - lastHeartbeat >= 5000) {
			lastHeartbeat = now;
			TikTokBridge.reportGameState({ phase: "endless", round: 1, remainingMs: 0, leaderProgress: 0, camelCount: camels.size });
		}
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
})();
