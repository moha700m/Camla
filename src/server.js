import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import tiktokService, { normalizeUsername } from "./services/TikTokService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, "../public");
const app = express();
const httpServer = createServer(app);
const allowedOrigins = String(process.env.WEB_ORIGIN || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);
const io = new Server(httpServer, allowedOrigins.length
	? { cors: { origin: allowedOrigins, methods: ["GET", "POST"] } }
	: {});
const port = Number(process.env.PORT || 3000);
const connectAttempts = new Map();

function securityHeaders(_req, res, next) {
	res.set({
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "SAMEORIGIN",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	});
	next();
}

function limitConnectRequests(req, res, next) {
	const now = Date.now();
	const key = req.ip || req.socket.remoteAddress || "unknown";
	const recent = (connectAttempts.get(key) || []).filter((time) => now - time < 60_000);
	if (recent.length >= 10) {
		res.status(429).json({ ok: false, error: "Too many connection attempts. Try again in one minute." });
		return;
	}
	recent.push(now);
	connectAttempts.set(key, recent);
	next();
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(express.json({ limit: "32kb" }));
app.use(express.static(publicDir, { extensions: ["html"] }));
app.get("/play", (_req, res) => res.sendFile(join(publicDir, "games/camel-rush/index.html")));

app.get("/api/health", (_req, res) => {
	res.json({ ok: true, timestamp: new Date().toISOString(), ...tiktokService.getStats() });
});

app.get("/api/stats", (_req, res) => res.json(tiktokService.getStats()));

app.post("/api/connect", limitConnectRequests, async (req, res) => {
	const username = normalizeUsername(req.body?.username);
	if (!/^[a-z0-9._]{2,32}$/.test(username)) {
		res.status(400).json({ ok: false, error: "Enter a valid TikTok handle without @." });
		return;
	}
	const connected = await tiktokService.connect(username, io);
	res.status(connected ? 200 : 202).json({ ok: true, connected, ...tiktokService.getStats() });
});

app.post("/api/disconnect", async (_req, res) => {
	const stats = tiktokService.getStats();
	if (stats.activeUsername) await tiktokService.disconnect(stats.activeUsername, io);
	res.json({ ok: true, ...tiktokService.getStats() });
});

io.on("connection", (socket) => {
	socket.on("join-room", async (username) => {
		const normalized = normalizeUsername(username);
		if (!/^[a-z0-9._]{2,32}$/.test(normalized)) {
			socket.emit("connection-error", { message: "Invalid TikTok username" });
			return;
		}
		if (socket.data.username && socket.data.username !== normalized) await leaveRoom(socket);
		socket.data.username = normalized;
		socket.join(normalized);
		tiktokService.addClient(normalized);
		const connected = await tiktokService.connect(normalized, io);
		socket.emit("room-joined", { room: normalized, connected, timestamp: Date.now() });
		socket.emit("tiktok_status", { status: tiktokService.getStats().status, username: normalized });
	});

	socket.on("leave-room", () => void leaveRoom(socket));
	socket.on("disconnect", () => void leaveRoom(socket));
});

async function leaveRoom(socket) {
	const username = socket.data.username;
	if (!username) return;
	socket.leave(username);
	tiktokService.removeClient(username);
	socket.data.username = undefined;
}

httpServer.listen(port, "0.0.0.0", () => {
	console.log(`CAMEL RUSH 966 local bridge listening on http://127.0.0.1:${port}`);
	if (process.env.TIKTOK_UNIQUE_ID) void tiktokService.connect(process.env.TIKTOK_UNIQUE_ID, io);
});

async function shutdown() {
	const stats = tiktokService.getStats();
	if (stats.activeUsername) await tiktokService.disconnect(stats.activeUsername, io);
	httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
