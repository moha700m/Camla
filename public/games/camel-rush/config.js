const CAMEL_RUSH_CONFIG = {
	finishLine: 100,
	chatBoost: 2.5,
	globalBoost: 1.5,
	likeMilestone: 100,
	lateJoinWindow: 15_000,
	phases: {
		waiting: { duration: 5_000 },
		countdown: { duration: 8_000 },
		racing: { duration: 75_000 },
		final: { duration: 15_000 },
		finished: { duration: 8_000 },
		cooldown: { duration: 4_000 },
	},
	lanes: [
		{ id: 0, name: "الرعد", latin: "AL RAAD", color: "#55E0D2", dark: "#126A6B", aliases: ["1", "الرعد", "raad"] },
		{ id: 1, name: "البرق", latin: "AL BARQ", color: "#FFD166", dark: "#9B6420", aliases: ["2", "البرق", "barq"] },
		{ id: 2, name: "الواحة", latin: "AL OASIS", color: "#9BE28F", dark: "#2E7656", aliases: ["3", "الواحة", "oasis"] },
		{ id: 3, name: "العنقاء", latin: "AL ANQA", color: "#FF8A72", dark: "#8D3B45", aliases: ["4", "العنقاء", "anqa"] },
		{ id: 4, name: "النجم", latin: "AL NAJM", color: "#B59CFF", dark: "#55458E", aliases: ["5", "النجم", "najm"] },
	],
	giftBoost(value) {
		if (value >= 100) return 12;
		if (value >= 10) return 6;
		return 2.5;
	},
};

window.CAMEL_RUSH_CONFIG = CAMEL_RUSH_CONFIG;
