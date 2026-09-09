/** Tiny browser bridge: only normalized events cross into the game. */
((global) => {
	class TikTokBridge {
		constructor() {
			this.socket = null;
			this.username = null;
			this.status = "disconnected";
			this.handlers = new Map();
		}

		autoConnect() {
			const params = new URLSearchParams(global.location.search);
			const username = params.get("id") || params.get("username");
			if (username) this.connect(username, params.get("server") || global.location.origin);
			else this.dispatch("status", { status: "disconnected" });
		}

		connect(username, serverUrl = global.location.origin) {
			const clean = String(username || "").replace(/^@+/, "").trim().toLowerCase();
			if (!clean || this.socket) return;
			if (typeof global.io !== "function") {
				this.status = "error";
				this.dispatch("status", { status: this.status, username: clean });
				this.dispatch("error", { message: "Socket bridge is unavailable on this page." });
				return;
			}
			this.username = clean;
			this.status = "connecting";
			this.dispatch("status", { status: this.status, username: clean });
			this.socket = global.io(serverUrl, { transports: ["websocket", "polling"] });
			this.socket.on("connect", () => this.socket.emit("join-room", clean));
			this.socket.on("room-joined", (data) => this.dispatch("connected", data));
			this.socket.on("tiktok_status", (data) => {
				this.status = data.status || "disconnected";
				this.dispatch("status", data);
			});
			this.socket.on("tiktok_chat", (data) => this.dispatch("chat", data));
			this.socket.on("tiktok_gift", (data) => this.dispatch("gift", data));
			this.socket.on("tiktok_like", (data) => this.dispatch("like", data));
			this.socket.on("tiktok_share", (data) => this.dispatch("share", data));
			this.socket.on("tiktok_follow", (data) => this.dispatch("follow", data));
			this.socket.on("tiktok_member", (data) => this.dispatch("member", data));
			this.socket.on("tiktok_reconnecting", (data) => this.dispatch("reconnecting", data));
			this.socket.on("tiktok_error", (data) => this.dispatch("error", data));
			this.socket.on("connection-error", (data) => this.dispatch("error", data));
			this.socket.on("connect_error", (error) => {
				this.status = "reconnecting";
				this.dispatch("status", { status: this.status, username: clean });
				this.dispatch("error", { message: error?.message || "Socket connection failed" });
			});
			this.socket.on("disconnect", () => {
				this.status = "disconnected";
				this.dispatch("disconnected", { status: this.status });
			});
		}

		on(event, callback) {
			const listeners = this.handlers.get(event) || [];
			listeners.push(callback);
			this.handlers.set(event, listeners);
			return () => this.handlers.set(event, listeners.filter((item) => item !== callback));
		}

		reportGameState(state) {
			if (!this.socket?.connected) return;
			this.socket.emit("game-heartbeat", state);
		}

		dispatch(event, data) {
			for (const callback of this.handlers.get(event) || []) {
				try { callback(data); } catch (error) { console.error(`[Bridge] ${event}`, error); }
			}
			global.dispatchEvent(new CustomEvent(`camel-rush:${event}`, { detail: data }));
		}
	}

	global.TikTokBridge = new TikTokBridge();
	global.addEventListener("load", () => global.TikTokBridge.autoConnect(), { once: true });
})(window);
