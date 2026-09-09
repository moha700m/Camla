((global) => {
	const TAU = Math.PI * 2;
	const colors = ["#22d3c5", "#ffb547", "#ff665d", "#bc8cff", "#72a7ff", "#f4e0ae"];

	class CamelRushRenderer {
		constructor(canvas) {
			this.canvas = canvas;
			this.ctx = canvas.getContext("2d", { alpha: false });
			this.particles = [];
			this.flashUntil = 0;
			this.ambient = Array.from({ length: 5 }, (_, index) => ({
				lane: index, progress: (index * .21 + .08) % 1, speed: .014 + index * .0007,
				phase: index * 1.9, color: colors[index], ambient: true,
			}));
			this.resize();
		}

		resize() {
			this.width = global.innerWidth;
			this.height = global.innerHeight;
			this.dpr = Math.min(global.devicePixelRatio || 1, 1.6);
			this.canvas.width = Math.floor(this.width * this.dpr);
			this.canvas.height = Math.floor(this.height * this.dpr);
			this.canvas.style.width = `${this.width}px`;
			this.canvas.style.height = `${this.height}px`;
			this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		}

		laneY(lane) {
			return this.height * .34 + lane * (this.height * .39 / 6) + this.height * .03;
		}

		burst(x, y, amount, color, kind = "spark") {
			for (let index = 0; index < amount; index += 1) {
				this.particles.push({
					x, y, vx: (Math.random() - .5) * (kind === "dust" ? 50 : 150),
					vy: kind === "dust" ? -8 - Math.random() * 18 : -40 - Math.random() * 120,
					life: .55 + Math.random() * .45, color, size: 2 + Math.random() * (kind === "dust" ? 8 : 5), kind,
				});
			}
			if (kind !== "dust") this.flashUntil = performance.now() + 550;
		}

		drawWorld(now) {
			const { ctx, width: w, height: h } = this;
			const sky = ctx.createLinearGradient(0, 0, 0, h);
			sky.addColorStop(0, "#030717"); sky.addColorStop(.36, "#102a56");
			sky.addColorStop(.62, "#7f3954"); sky.addColorStop(1, "#160e24");
			ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

			const halo = ctx.createRadialGradient(w * .19, h * .16, 0, w * .19, h * .16, w * .26);
			halo.addColorStop(0, `rgba(255,204,110,${now < this.flashUntil ? .4 : .28})`);
			halo.addColorStop(1, "rgba(255,204,110,0)");
			ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h * .48);
			ctx.fillStyle = "#ffd37c"; ctx.beginPath(); ctx.arc(w * .19, h * .15, Math.min(w, h) * .055, 0, TAU); ctx.fill();
			ctx.fillStyle = "#07132b"; ctx.beginPath(); ctx.arc(w * .215, h * .135, Math.min(w, h) * .052, 0, TAU); ctx.fill();

			for (let index = 0; index < 34; index += 1) {
				ctx.globalAlpha = .25 + Math.sin(now * .0012 + index) * .14;
				ctx.fillStyle = index % 7 ? "#fff4dc" : "#58ead7";
				ctx.fillRect((index * 97 + 23) % w, 28 + (index * 59) % Math.max(80, h * .27), index % 5 ? 1.2 : 2.2, index % 5 ? 1.2 : 2.2);
			}
			ctx.globalAlpha = 1;
			this.drawSkyline(now);
			this.drawDunes();
			this.drawTrack(now);
			this.drawGate(now);
		}

		drawSkyline(now) {
			const { ctx, width: w, height: h } = this;
			const base = h * .34;
			for (let index = 0; index < 13; index += 1) {
				const bw = w * (.045 + (index % 3) * .012);
				const bh = h * (.035 + (index % 5) * .015);
				const x = index * w / 12 - bw * .4;
				ctx.fillStyle = "rgba(4,9,24,.92)"; ctx.fillRect(x, base - bh, bw, bh);
				ctx.fillStyle = "rgba(255,194,97,.55)";
				for (let row = 0; row < 3; row += 1) for (let col = 0; col < 2; col += 1) if ((index + row + col) % 3) ctx.fillRect(x + 6 + col * 9, base - bh + 8 + row * 10, 2, 3);
			}
			ctx.strokeStyle = "rgba(69,234,211,.4)"; ctx.lineWidth = 1; ctx.beginPath();
			ctx.moveTo(w * .74, base); ctx.lineTo(w * .77, base - h * .14); ctx.lineTo(w * .8, base); ctx.stroke();
			ctx.fillStyle = `rgba(69,234,211,${.45 + Math.sin(now * .002) * .15})`; ctx.fillRect(w * .765, base - h * .145, 3, 3);
		}

		drawDunes() {
			const { ctx, width: w, height: h } = this;
			const back = ctx.createLinearGradient(0, h * .27, 0, h * .55);
			back.addColorStop(0, "#b96566"); back.addColorStop(1, "#623044"); ctx.fillStyle = back;
			ctx.beginPath(); ctx.moveTo(0, h * .39); ctx.bezierCurveTo(w * .18, h * .29, w * .34, h * .34, w * .5, h * .42);
			ctx.bezierCurveTo(w * .68, h * .3, w * .84, h * .31, w, h * .39); ctx.lineTo(w, h * .58); ctx.lineTo(0, h * .58); ctx.fill();
			const front = ctx.createLinearGradient(0, h * .38, 0, h * .78);
			front.addColorStop(0, "#d88b62"); front.addColorStop(.65, "#6b3646"); front.addColorStop(1, "#21142d"); ctx.fillStyle = front;
			ctx.beginPath(); ctx.moveTo(0, h * .5); ctx.bezierCurveTo(w * .22, h * .39, w * .39, h * .47, w * .57, h * .51);
			ctx.bezierCurveTo(w * .75, h * .41, w * .91, h * .45, w, h * .49); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
		}

		drawTrack(now) {
			const { ctx, width: w, height: h } = this;
			const top = h * .34, bottom = h * .79;
			const track = ctx.createLinearGradient(0, top, 0, bottom);
			track.addColorStop(0, "rgba(28,25,47,.76)"); track.addColorStop(.55, "rgba(49,28,45,.9)"); track.addColorStop(1, "rgba(17,14,31,.97)");
			ctx.fillStyle = track; ctx.beginPath(); ctx.moveTo(w * .02, top); ctx.lineTo(w * .98, top + h * .018);
			ctx.lineTo(w * .94, bottom); ctx.lineTo(w * .06, bottom); ctx.closePath(); ctx.fill();
			ctx.strokeStyle = "rgba(255,205,115,.42)"; ctx.lineWidth = 2; ctx.stroke();
			for (let lane = 0; lane < 6; lane += 1) {
				const y = this.laneY(lane) + h * .026;
				ctx.strokeStyle = lane % 2 ? "rgba(255,255,255,.075)" : "rgba(74,230,210,.1)";
				ctx.setLineDash([w * .035, w * .025]); ctx.lineDashOffset = -(now * .022 + lane * 17) % 60;
				ctx.beginPath(); ctx.moveTo(w * .055, y); ctx.lineTo(w * .945, y); ctx.stroke();
			}
			ctx.setLineDash([]); ctx.globalAlpha = .24;
			for (let index = 0; index < 10; index += 1) {
				const x = index * w / 9; ctx.fillStyle = index % 2 ? "#f2d59c" : "#24cbbb";
				ctx.beginPath(); ctx.moveTo(x, bottom); ctx.lineTo(x + w * .035, bottom); ctx.lineTo(x + w * .012, bottom + h * .018); ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		drawGate() {
			const { ctx, width: w, height: h } = this;
			const x = w * .095, top = h * .31, bottom = h * .805;
			ctx.strokeStyle = "#f4cf88"; ctx.lineWidth = Math.max(3, w * .012); ctx.beginPath();
			ctx.moveTo(x, bottom); ctx.lineTo(x, top + 16); ctx.quadraticCurveTo(x, top, x + 16, top);
			ctx.lineTo(x + w * .13, top); ctx.quadraticCurveTo(x + w * .15, top, x + w * .15, top + 18); ctx.stroke();
			ctx.fillStyle = "rgba(6,15,31,.94)"; ctx.fillRect(x - 7, top + 25, w * .165, 27);
			ctx.strokeStyle = "rgba(74,230,210,.7)"; ctx.lineWidth = 1; ctx.strokeRect(x - 7, top + 25, w * .165, 27);
			ctx.fillStyle = "#4aead3"; ctx.font = `700 ${Math.max(9, w * .026)}px Space Grotesk, sans-serif`;
			ctx.textAlign = "center"; ctx.fillText("START 966", x + w * .073, top + 43);
		}

		drawPalm(x, y, scale, now) {
			const { ctx } = this;
			ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
			ctx.strokeStyle = "#563443"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(4, 0, 0, -42); ctx.stroke();
			ctx.strokeStyle = "#36a98f"; ctx.lineWidth = 5;
			for (let index = 0; index < 7; index += 1) {
				const angle = index / 7 * TAU + Math.sin(now * .001 + index) * .03;
				ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(Math.cos(angle) * 15, -53 + Math.sin(angle) * 7, Math.cos(angle) * 29, -39 + Math.sin(angle) * 20); ctx.stroke();
			}
			ctx.restore();
		}

		drawCamel(camel, now, deltaSeconds, dimmed = false) {
			const boosted = now < (camel.boostUntil || 0);
			camel.progress += camel.speed * (boosted ? 3.2 : 1) * deltaSeconds;
			if (camel.progress > 1.18) { camel.progress = -.18; camel.lane = (camel.lane + 1) % 6; }
			const x = camel.progress * this.width, y = this.laneY(camel.lane);
			const scale = Math.max(.72, Math.min(1.08, this.width / 390)) * (.9 + camel.lane * .035);
			const run = now * (boosted ? .024 : .014) + camel.phase, leg = Math.sin(run) * 10;
			const { ctx } = this;
			ctx.save(); ctx.globalAlpha = dimmed ? .34 : 1; ctx.translate(x, y + Math.sin(run * 2) * 2.4); ctx.scale(scale, scale);
			if (boosted || camel.vip) {
				const glow = ctx.createRadialGradient(0, -8, 6, 0, -8, 58);
				glow.addColorStop(0, camel.vip ? "rgba(255,202,91,.38)" : "rgba(54,232,211,.33)"); glow.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = glow; ctx.fillRect(-70, -70, 140, 120);
			}
			ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(-4, 24, 42, 7, 0, 0, TAU); ctx.fill();
			ctx.strokeStyle = camel.color; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath();
			ctx.moveTo(-23, 6); ctx.lineTo(-29 + leg, 29); ctx.lineTo(-23 + leg, 34);
			ctx.moveTo(-8, 8); ctx.lineTo(-3 - leg, 29); ctx.lineTo(4 - leg, 34);
			ctx.moveTo(15, 7); ctx.lineTo(21 + leg, 28); ctx.lineTo(29 + leg, 32); ctx.stroke();
			ctx.fillStyle = camel.color; ctx.beginPath(); ctx.ellipse(-7, -2, 35, 18, -.04, 0, TAU); ctx.fill();
			ctx.beginPath(); ctx.arc(-21, -18, 15, Math.PI, TAU); ctx.arc(0, -20, 15, Math.PI, TAU); ctx.lineTo(9, -5); ctx.lineTo(-31, -5); ctx.fill();
			ctx.beginPath(); ctx.moveTo(18, -8); ctx.quadraticCurveTo(29, -47, 44, -42); ctx.lineTo(50, -27); ctx.lineTo(31, -19); ctx.fill();
			ctx.beginPath(); ctx.ellipse(51, -42, 14, 9, -.13, 0, TAU); ctx.fill();
			ctx.beginPath(); ctx.moveTo(44, -49); ctx.lineTo(47, -61); ctx.lineTo(53, -49); ctx.fill();
			ctx.fillStyle = "#140f20"; ctx.beginPath(); ctx.arc(56, -44, 2.2, 0, TAU); ctx.fill();
			ctx.strokeStyle = camel.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-39, -6); ctx.quadraticCurveTo(-52, -14 + Math.sin(run) * 4, -51, -24); ctx.stroke();
			ctx.fillStyle = camel.vip ? "#ffd25f" : "#123b48"; ctx.beginPath(); ctx.roundRect(-26, -13, 37, 22, 5); ctx.fill();
			ctx.strokeStyle = camel.vip ? "#fff2b6" : "#47e5cf"; ctx.lineWidth = 2; ctx.stroke();
			ctx.fillStyle = camel.vip ? "#462411" : "#d7fff7"; ctx.font = "700 9px Space Grotesk, sans-serif"; ctx.textAlign = "center"; ctx.fillText("966", -7, 2);
			if (camel.name && !dimmed) {
				ctx.font = "700 13px IBM Plex Sans Arabic, sans-serif"; const textWidth = Math.min(120, ctx.measureText(camel.name).width);
				ctx.fillStyle = "rgba(5,10,25,.9)"; ctx.beginPath(); ctx.roundRect(-textWidth / 2 - 10, -78, textWidth + 20, 24, 12); ctx.fill();
				ctx.strokeStyle = camel.vip ? "rgba(255,210,95,.85)" : "rgba(71,229,207,.55)"; ctx.lineWidth = 1; ctx.stroke();
				ctx.fillStyle = camel.vip ? "#ffd25f" : "#fff"; ctx.fillText(camel.name, 0, -62);
			}
			ctx.restore();
			if ((boosted || Math.random() > .9) && x > 0 && x < this.width) this.burst(x - 35, y + 26, boosted ? 2 : 1, boosted ? (camel.vip ? "#ffd25f" : "#42e3cf") : "#d69a72", "dust");
		}

		drawParticles(deltaSeconds) {
			const { ctx } = this;
			for (const particle of this.particles) {
				particle.x += particle.vx * deltaSeconds; particle.y += particle.vy * deltaSeconds;
				particle.vy += (particle.kind === "dust" ? 8 : 120) * deltaSeconds; particle.life -= (particle.kind === "dust" ? .7 : 1.15) * deltaSeconds;
				ctx.globalAlpha = Math.max(0, particle.life) * (particle.kind === "dust" ? .34 : 1); ctx.fillStyle = particle.color;
				ctx.beginPath(); ctx.arc(particle.x, particle.y, Math.max(.2, particle.size * particle.life), 0, TAU); ctx.fill();
			}
			ctx.globalAlpha = 1;
			for (let index = this.particles.length - 1; index >= 0; index -= 1) if (this.particles[index].life <= 0) this.particles.splice(index, 1);
		}

		render(now, deltaSeconds, racers) {
			this.drawWorld(now);
			this.drawPalm(this.width * .05, this.height * .84, .7, now);
			this.drawPalm(this.width * .93, this.height * .82, .85, now);
			const active = [...racers.values()];
			for (const camel of this.ambient) this.drawCamel(camel, now, deltaSeconds, active.length > 0);
			active.sort((a, b) => a.lane - b.lane).forEach((camel) => this.drawCamel(camel, now, deltaSeconds));
			this.drawParticles(deltaSeconds);
		}
	}

	global.CamelRushRenderer = CamelRushRenderer;
})(window);
