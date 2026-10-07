"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SonicRunner.module.scss";

// physics
const SCALE = 2;
const CANVAS_H = 80;
const GROUND_Y = 80;
const MAX_RUN = 13;
const BALL_VEL = 22;
const ACCEL = 0.6;
const FRICTION = 0.78;
const BRAKE_FRICTION = 0.885;
const DEAD_ZONE = 24;
const STOP_ZONE = 60;
const CHASE_ZONE = 130;
const SPECIAL_MIN = 3500;
const SPECIAL_MAX = 8000;
const BALL_DUR = 75;

// sprite frames
type Frame = { sx: number; sy: number; sw: number; sh: number };

// Row 0 C1-C2: idle (skip C0)
const IDLE: Frame[] = [
	{ sx: 83, sy: 5, sw: 16, sh: 23 },
	{ sx: 146, sy: 5, sw: 16, sh: 23 },
];

// Row 1 C0-C3: acceleration (play once)
const ACCEL_FRAMES: Frame[] = [
	{ sx: 20, sy: 39, sw: 16, sh: 23 },
	{ sx: 84, sy: 40, sw: 15, sh: 23 },
	{ sx: 146, sy: 39, sw: 16, sh: 23 },
	{ sx: 210, sy: 40, sw: 15, sh: 23 },
];

// Row 1 C4-C5: running loop
const RUN_LOOP: Frame[] = [
	{ sx: 273, sy: 40, sw: 15, sh: 23 },
	{ sx: 335, sy: 40, sw: 16, sh: 23 },
];

// Row 1 C6: braking/stop (single hold frame)
const STOP_FRAME: Frame = { sx: 397, sy: 41, sw: 17, sh: 22 };

// Row 0 C4-C6: ball/dash spin (C7-C8 excluded)
const BALL: Frame[] = [
	{ sx: 273, sy: 13, sw: 14, sh: 14 },
	{ sx: 336, sy: 13, sw: 14, sh: 14 },
	{ sx: 399, sy: 13, sw: 14, sh: 14 },
];

// types
type SonicState = "idle" | "accel" | "run" | "stop" | "ball";

interface Trail {
	x: number;
	alpha: number;
	frame: Frame;
}
interface PhysState {
	x: number;
	vx: number;
	dir: 1 | -1;
	pendingDir: 0 | 1 | -1;
	frameIdx: number;
	tick: number;
	state: SonicState;
	stateTimer: number;
	nextSpecial: number;
	trails: Trail[];
	mouseX: number;
}

// sprite cache: pre-render each frame (both dirs) to OffscreenCanvas
type CachedFrame = {
	r: OffscreenCanvas;
	l: OffscreenCanvas;
	w: number;
	h: number;
};
const spriteCache = new Map<Frame, CachedFrame>();

function getCached(sheet: HTMLImageElement, f: Frame): CachedFrame {
	if (spriteCache.has(f)) return spriteCache.get(f)!;
	const dw = f.sw * SCALE,
		dh = f.sh * SCALE;

	const r = new OffscreenCanvas(dw, dh);
	const rc = r.getContext("2d")!;
	rc.imageSmoothingEnabled = false;
	rc.drawImage(sheet, f.sx, f.sy, f.sw, f.sh, 0, 0, dw, dh);

	const l = new OffscreenCanvas(dw, dh);
	const lc = l.getContext("2d")!;
	lc.imageSmoothingEnabled = false;
	lc.translate(dw, 0);
	lc.scale(-1, 1);
	lc.drawImage(sheet, f.sx, f.sy, f.sw, f.sh, 0, 0, dw, dh);

	const cached: CachedFrame = { r, l, w: dw, h: dh };
	spriteCache.set(f, cached);
	return cached;
}

// draw
function drawFrame(
	ctx: CanvasRenderingContext2D,
	sheet: HTMLImageElement,
	f: Frame,
	cx: number,
	dir: 1 | -1,
	alpha = 1,
) {
	const c = getCached(sheet, f);
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.drawImage(
		dir === 1 ? c.r : c.l,
		Math.round(cx - c.w / 2),
		GROUND_Y - c.h,
	);
	ctx.restore();
}

function transitionTo(s: PhysState, next: SonicState) {
	s.state = next;
	s.frameIdx = 0;
	s.tick = 0;
}

// component
export default function SonicRunner() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef(0);
	const [started, setStarted] = useState(false);
	const startedRef = useRef(false);
	const sonicXRef = useRef(0);

	function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current!;
		const rect = canvas.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (canvas.width / rect.width),
			y: (e.clientY - rect.top) * (canvas.height / rect.height),
		};
	}

	function isOverSonic(cx: number, cy: number) {
		const HIT_W = 10 * SCALE;
		const HIT_H = 23 * SCALE;
		return (
			cx >= sonicXRef.current - HIT_W &&
			cx <= sonicXRef.current + HIT_W &&
			cy >= GROUND_Y - HIT_H &&
			cy <= GROUND_Y
		);
	}

	function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
		if (startedRef.current || !canvasRef.current) return;
		const { x, y } = getCanvasCoords(e);
		canvasRef.current.style.cursor = isOverSonic(x, y) ? "pointer" : "";
	}

	function handleCanvasMouseLeave() {
		if (startedRef.current || !canvasRef.current) return;
		canvasRef.current.style.cursor = "";
	}

	function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
		if (startedRef.current || !canvasRef.current) return;
		const { x, y } = getCanvasCoords(e);
		if (isOverSonic(x, y)) {
			startedRef.current = true;
			setStarted(true);
		}
	}

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const sheet = new Image();
		sheet.src = "/sprites/sonic-sheet.png";

		function resize() {
			if (!canvas || !container) return;
			canvas.width = container.clientWidth;
			canvas.height = CANVAS_H;
		}
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(container);

		const s: PhysState = {
			x: (canvas.width || 800) / 2,
			vx: 0,
			dir: 1,
			pendingDir: 0,
			frameIdx: 0,
			tick: 0,
			state: "idle",
			stateTimer: 0,
			nextSpecial: SPECIAL_MIN + Math.random() * (SPECIAL_MAX - SPECIAL_MIN),
			trails: [],

			mouseX: (canvas.width || 800) / 2,
		};

		function onMouseMove(e: MouseEvent) {
			if (!container || !startedRef.current) return;
			s.mouseX = e.clientX - container.getBoundingClientRect().left;
		}
		window.addEventListener("mousemove", onMouseMove, { passive: true });

		let lastTime = 0;

		function loop(now: number) {
			rafRef.current = requestAnimationFrame(loop);
			const dt = Math.min(now - lastTime, 50);
			lastTime = now;
			if (!canvas || !ctx || !sheet.complete) return;

			const W = canvas.width;
			ctx.clearRect(0, 0, W, CANVAS_H);

			if (!startedRef.current) {
				s.mouseX = W / 2;
				s.x = W / 2;
				s.vx = 0;
			}

			const spd = Math.abs(s.vx);
			const target = Math.max(30, Math.min(W - 30, s.mouseX));
			const dist = target - s.x;
			const absDist = Math.abs(dist);

			// ball timer
			if (s.stateTimer > 0) {
				s.stateTimer--;
				if (s.stateTimer === 0) {
					transitionTo(s, "run");
					s.vx = Math.max(-MAX_RUN, Math.min(MAX_RUN, s.vx));
				}
			}

			// random ball trigger
			s.nextSpecial -= dt;
			if (s.nextSpecial <= 0 && s.state === "run") {
				s.nextSpecial =
					SPECIAL_MIN + Math.random() * (SPECIAL_MAX - SPECIAL_MIN);
				transitionTo(s, "ball");
				s.stateTimer = BALL_DUR;
				s.vx = s.dir * BALL_VEL;
			}
			if (s.nextSpecial <= 0) {
				s.nextSpecial =
					SPECIAL_MIN + Math.random() * (SPECIAL_MAX - SPECIAL_MIN);
			}

			// ball: exit immediately if direction changes
			if (s.state === "ball" && absDist > DEAD_ZONE) {
				const wantDir = (Math.sign(dist) || s.dir) as 1 | -1;
				if (wantDir !== s.dir) {
					s.stateTimer = 0;
					s.pendingDir = wantDir;
					transitionTo(s, "stop");
				}
			}

			// run/accel: enter stop immediately if target flips to opposite side
			if (
				(s.state === "run" || s.state === "accel") &&
				absDist > DEAD_ZONE &&
				s.pendingDir === 0
			) {
				const wantDir = (Math.sign(dist) || s.dir) as 1 | -1;
				if (wantDir !== s.dir) {
					s.pendingDir = wantDir;
					transitionTo(s, "stop");
				}
			}

			// physics
			const waitingFlip = s.pendingDir !== 0 && s.state === "stop";
			const canChase =
				!waitingFlip && (s.state !== "idle" || absDist > CHASE_ZONE);
			const maxSpd = s.state === "ball" ? BALL_VEL : MAX_RUN;
			if (canChase && absDist > DEAD_ZONE) {
				const a = s.state === "ball" ? ACCEL * 3 : ACCEL;
				s.vx += Math.sign(dist) * a;
			} else {
				s.vx *= s.state === "stop" ? BRAKE_FRICTION : FRICTION;
				if (Math.abs(s.vx) < 0.3) s.vx = 0;
			}
			s.vx = Math.max(-maxSpd, Math.min(maxSpd, s.vx));
			s.x += s.vx;
			s.x = Math.max(30, Math.min(W - 30, s.x));

			// dir update: queue flip through stop animation on direction change
			if (!waitingFlip && Math.abs(s.vx) > 0.5) {
				const wantDir = (s.vx > 0 ? 1 : -1) as 1 | -1;
				if (wantDir !== s.dir && (s.state === "run" || s.state === "accel")) {
					s.pendingDir = wantDir;
					transitionTo(s, "stop");
				} else if (s.state !== "stop") {
					s.dir = wantDir;
				}
			}

			// state machine transitions
			if (s.state !== "ball") {
				const wf = s.pendingDir !== 0 && s.state === "stop";
				if (spd < 0.5) {
					if (s.pendingDir !== 0) {
						s.dir = s.pendingDir as 1 | -1;
						s.pendingDir = 0;
					}
					if (s.state !== "idle") transitionTo(s, "idle");
				} else if (!wf) {
					if (absDist <= STOP_ZONE) {
						if (s.state === "run") transitionTo(s, "stop");
						if (s.state === "accel") transitionTo(s, "idle");
					} else {
						if (s.state === "stop") transitionTo(s, "accel");
						if (s.state === "idle" && absDist > CHASE_ZONE)
							transitionTo(s, "accel");
						if (s.state === "accel" && s.frameIdx >= ACCEL_FRAMES.length)
							transitionTo(s, "run");
					}
				}
			}

			// animation tick
			const ticksPerFrame =
				s.state === "ball"
					? 3
					: s.state === "idle"
						? 40
						: s.state === "accel"
							? 5
							: s.state === "run"
								? 3
								: 999; // stop: hold frame, no cycling
			s.tick++;
			if (s.tick >= ticksPerFrame) {
				s.tick = 0;
				s.frameIdx++;
			}

			// current frame
			let curFrame: Frame;
			switch (s.state) {
				case "idle":
					curFrame = IDLE[s.frameIdx % IDLE.length];
					break;
				case "accel":
					curFrame =
						ACCEL_FRAMES[Math.min(s.frameIdx, ACCEL_FRAMES.length - 1)];
					break;
				case "run":
					curFrame = RUN_LOOP[s.frameIdx % RUN_LOOP.length];
					break;
				case "stop":
					curFrame = STOP_FRAME;
					break;
				default:
					curFrame = BALL[s.frameIdx % BALL.length];
			}

			// trails
			if (s.state === "ball" && s.frameIdx % 2 === 0) {
				s.trails.push({ x: s.x, alpha: 0.5, frame: curFrame });
			}
			s.trails = s.trails
				.map((t) => ({ ...t, alpha: t.alpha - 0.07 }))
				.filter((t) => t.alpha > 0.02);

			// render
			for (const t of s.trails) {
				ctx.save();
				ctx.filter = "sepia(1) saturate(6) hue-rotate(175deg)";
				drawFrame(ctx, sheet, t.frame, t.x, s.dir, t.alpha);
				ctx.restore();
			}
			ctx.save();
			if (s.state === "ball") {
				ctx.filter =
					"brightness(1.3) drop-shadow(0 0 4px rgba(100,220,255,0.7))";
			}
			drawFrame(ctx, sheet, curFrame, s.x, s.dir);
			ctx.restore();
			sonicXRef.current = s.x;
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener("mousemove", onMouseMove);
			ro.disconnect();
			spriteCache.clear();
		};
	}, []);

	return (
		<div ref={containerRef} className={styles.container}>
			<canvas
				ref={canvasRef}
				className={styles.canvas}
				style={started ? {} : { pointerEvents: "auto" }}
				onMouseMove={handleCanvasMouseMove}
				onMouseLeave={handleCanvasMouseLeave}
				onClick={handleCanvasClick}
			/>
		</div>
	);
}
