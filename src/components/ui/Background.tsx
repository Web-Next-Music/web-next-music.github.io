"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Background.module.scss";

export type BackgroundPatternType =
	"grid" | "dots" | "lines" | "cross" | "checker" | "aurora";

export type BackgroundFade = "down" | "up" | "none";

export interface BackgroundPattern {
	type: BackgroundPatternType;
	size?: number;
	color?: string;
	opacity?: number;
	angle?: number;
}

type PatternInput = BackgroundPatternType | BackgroundPattern;

interface Props extends HTMLAttributes<HTMLDivElement> {
	patterns: PatternInput[];
	fade?: BackgroundFade;
	fadeStart?: number;
	fadeEnd?: number;
	opacity?: number;
}

const DEFAULT_SIZE: Record<BackgroundPatternType, number> = {
	grid: 32,
	dots: 20,
	lines: 12,
	cross: 40,
	checker: 24,
	aurora: 100,
};

function normalize(input: PatternInput): Required<BackgroundPattern> {
	const pattern = typeof input === "string" ? { type: input } : input;
	return {
		type: pattern.type,
		size: pattern.size ?? DEFAULT_SIZE[pattern.type],
		color: pattern.color ?? "var(--border)",
		opacity: pattern.opacity ?? 1,
		angle: pattern.angle ?? 45,
	};
}

export default function Background({
	patterns,
	fade = "down",
	fadeStart = 0,
	fadeEnd = 100,
	opacity = 1,
	className,
	style,
	children,
	...rest
}: Props) {
	const layers = patterns.map(normalize);

	return (
		<div
			aria-hidden={children ? undefined : true}
			className={cx(styles.root, className)}
			style={{ "--bg-opacity": opacity, ...style } as CSSProperties}
			{...rest}
		>
			<div
				className={cx(styles.layers, fade !== "none" && styles[`fade-${fade}`])}
				style={
					{
						"--bg-fade-start": `${fadeStart}%`,
						"--bg-fade-end": `${fadeEnd}%`,
					} as CSSProperties
				}
			>
				{layers.map((layer, i) => (
					<div
						key={`${layer.type}-${i}`}
						className={cx(styles.layer, styles[layer.type])}
						style={
							{
								"--bg-size": `${layer.size}px`,
								"--bg-color": layer.color,
								"--bg-layer-opacity": layer.opacity,
								"--bg-angle": `${layer.angle}deg`,
								"--bg-accent": layer.color,
							} as CSSProperties
						}
					/>
				))}
			</div>
			{children}
		</div>
	);
}
