document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("connectForm");
	const usernameInput = document.getElementById("username");
	const connectBtn = document.getElementById("connectBtn");
	const message = document.getElementById("connectionMessage");
	const linkPanel = document.getElementById("linkPanel");
	const overlayUrl = document.getElementById("overlayUrl");
	const openOverlay = document.getElementById("openOverlay");
	const copyBtn = document.getElementById("copyBtn");
	const serverStatus = document.getElementById("serverStatus");

	const params = new URLSearchParams(window.location.search);
	if (params.get("username")) usernameInput.value = params.get("username").replace(/^@+/, "");

	async function getHealth() {
		try {
			const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
			const data = await response.json();
			serverStatus.textContent = data.status === "connected" ? "TikTok LIVE متصل" : "الجسر المحلي جاهز";
		} catch { serverStatus.textContent = "افتح السيرفر المحلي أولًا"; }
	}
	getHealth();

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const username = usernameInput.value.trim().replace(/^@+/, "").toLowerCase();
		if (!/^[a-z0-9._]{2,32}$/.test(username)) {
			setMessage("اكتب معرّف TikTok صحيحًا بدون @.", true);
			return;
		}
		connectBtn.disabled = true;
		connectBtn.textContent = "جاري الاتصال…";
		setMessage("نحاول الاتصال بالبث العام…");
		try {
			const response = await fetch("/api/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
			const data = await response.json();
			const url = `${window.location.origin}/play?id=${encodeURIComponent(username)}`;
			overlayUrl.value = url;
			openOverlay.href = url;
			linkPanel.classList.remove("hidden");
			setMessage(data.connected
				? "تم الاتصال الحقيقي. أضف الرابط كمصدر متصفح."
				: `الاتصال قيد المحاولة${data.lastError ? `: ${data.lastError}` : ". اترك LIVE مفتوحًا وسيعيد الجسر المحاولة."}`,
				!data.connected && Boolean(data.lastError));
		} catch (error) {
			setMessage("تعذر الوصول إلى الجسر المحلي. شغّل npm start ثم أعد المحاولة.", true);
		}
		connectBtn.disabled = false;
		connectBtn.innerHTML = 'اتصل بالبث <span>→</span>';
	});

	copyBtn.addEventListener("click", async () => {
		if (!overlayUrl.value) return;
		try { await navigator.clipboard.writeText(overlayUrl.value); } catch { overlayUrl.select(); document.execCommand("copy"); }
		copyBtn.textContent = "تم النسخ";
		setTimeout(() => { copyBtn.textContent = "نسخ"; }, 1_500);
	});

	function setMessage(text, isError = false) {
		message.textContent = text;
		message.classList.toggle("error", isError);
	}
});
