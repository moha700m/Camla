import {
	ControlEvent,
	TikTokLiveConnection,
	WebcastEvent,
} from "tiktok-live-connector";
import {
	normalizeChat,
	normalizeFollow,
	normalizeGift,
	normalizeLike,
	normalizeMember,
	normalizeShare,
} from "../lib/tiktokEventNormalizer.js";

const RETRY_MS = 8_000;

function normalizeUsername(value) {
	return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

class TikTokService {
	constructor() {
		this.connections = new Map();
		this.clients = new Map();
		this.retryTimers = new Map();
		this.statuses = new Map();
		this.lastErrors = new Map();
		this.activeUsername = null;
	}

	async connect(username, io) {
		const normalized = normalizeUsername(username);
		if (!normalized) throw new Error("TikTok username is required");

		const existing = this.connections.get(normalized);
		if (existing?.connected) return true;
		if (existing?.isConnecting) return false;

		this.activeUsername = normalized;
		this.clearRetry(normalized);
		this.setStatus(normalized, "connecting", io);

		const connectionOptions = {
			fetchRoomInfoOnConnect: true,
			processInitialData: false,
			// The extended catalog hits EulerStream's premium URL-signing route.
			// Core GIFT events already contain everything the race rules need.
			enableExtendedGiftInfo: false,
		};
		if (process.env.EULER_API_KEY) connectionOptions.signApiKey = process.env.EULER_API_KEY;
		const connection = new TikTokLiveConnection(normalized, connectionOptions);
		const record = { connection, isConnecting: true, connected: false };
		this.connections.set(normalized, record);

		const emit = (event, payload) => io.to(normalized).emit(event, payload);
		const removeIfCurrent = () => {
			if (this.connections.get(normalized)?.connection === connection) {
				this.connections.delete(normalized);
			}
		};

		connection.on(ControlEvent.CONNECTED, (state) => {
			record.isConnecting = false;
			record.connected = true;
			this.lastErrors.delete(normalized);
			this.setStatus(normalized, "connected", io);
			emit("tiktok_connected", { roomId: state?.roomId, timestamp: Date.now() });
			console.log(`[TikTok] Connected to @${normalized}`);
		});

		connection.on(ControlEvent.ERROR, ({ exception, info } = {}) => {
			const message = String(exception?.message || info || "TikTok connection error");
			this.lastErrors.set(normalized, message);
			this.setStatus(normalized, "reconnecting", io, message);
			emit("tiktok_error", { message, timestamp: Date.now() });
			console.error(`[TikTok] @${normalized}: ${message}`);
		});

		connection.on(ControlEvent.DISCONNECTED, ({ reason, code } = {}) => {
			removeIfCurrent();
			const message = String(reason || (code ? `socket ${code}` : "disconnected"));
			this.lastErrors.set(normalized, message);
			this.setStatus(normalized, "reconnecting", io, message);
			emit("tiktok_disconnected", { reason: message, timestamp: Date.now() });
			this.scheduleRetry(normalized, io);
		});

		const on = (event, handler) => connection.on(event, handler);
		on(WebcastEvent.CHAT, (data) => emit("tiktok_chat", normalizeChat(data)));
		on(WebcastEvent.LIKE, (data) => emit("tiktok_like", normalizeLike(data)));
		on(WebcastEvent.SHARE, (data) => emit("tiktok_share", normalizeShare(data)));
		on(WebcastEvent.FOLLOW, (data) => emit("tiktok_follow", normalizeFollow(data)));
		on(WebcastEvent.MEMBER, (data) => emit("tiktok_member", normalizeMember(data)));
		on(WebcastEvent.GIFT, (data) => {
		const normalizedGift = normalizeGift(data);
		if (normalizedGift.repeatEnd) emit("tiktok_gift", normalizedGift);
	});

	try {
		await connection.connect();
		record.isConnecting = false;
		return true;
	} catch (error) {
		removeIfCurrent();
		record.isConnecting = false;
		record.connected = false;
		const message = error instanceof Error ? error.message : String(error);
		this.lastErrors.set(normalized, message);
		this.setStatus(normalized, "reconnecting", io, message);
		emit("tiktok_error", { message, timestamp: Date.now() });
		console.error(`[TikTok] Unable to connect to @${normalized}: ${message}`);
		this.scheduleRetry(normalized, io);
		return false;
	}
	}

	scheduleRetry(username, io) {
		if (this.retryTimers.has(username)) return;
		const timer = setTimeout(() => {
			this.retryTimers.delete(username);
			if (this.clients.get(username) > 0 || this.activeUsername === username) {
				void this.connect(username, io);
			}
		}, RETRY_MS);
		this.retryTimers.set(username, timer);
		io.to(username).emit("tiktok_reconnecting", { delayMs: RETRY_MS, timestamp: Date.now() });
	}

	addClient(username) {
		const normalized = normalizeUsername(username);
		this.clients.set(normalized, (this.clients.get(normalized) || 0) + 1);
	}

	removeClient(username) {
		const normalized = normalizeUsername(username);
		const next = Math.max(0, (this.clients.get(normalized) || 0) - 1);
		this.clients.set(normalized, next);
	}

	async disconnect(username, io) {
		const normalized = normalizeUsername(username);
		this.clearRetry(normalized);
		const record = this.connections.get(normalized);
		this.connections.delete(normalized);
		if (record?.connection) {
			try { await record.connection.disconnect(); } catch { /* already closed */ }
		}
		this.setStatus(normalized, "disconnected", io);
		if (this.activeUsername === normalized) this.activeUsername = null;
	}

	getStats() {
		const username = this.activeUsername;
		return {
			activeUsername: username,
			provider: "tiktok",
			signerConfigured: Boolean(process.env.EULER_API_KEY),
			status: username ? (this.statuses.get(username)?.status || "disconnected") : "disconnected",
			lastError: username ? (this.lastErrors.get(username) || null) : null,
			clients: username ? (this.clients.get(username) || 0) : 0,
			connections: [...this.connections.keys()],
		};
	}

	setStatus(username, status, io, detail = null) {
		this.statuses.set(username, { status, detail, updatedAt: Date.now() });
		io?.to(username).emit("tiktok_status", { status, detail, username, timestamp: Date.now() });
	}

	clearRetry(username) {
		const timer = this.retryTimers.get(username);
		if (timer) clearTimeout(timer);
		this.retryTimers.delete(username);
	}
}

export { normalizeUsername };
export default new TikTokService();
