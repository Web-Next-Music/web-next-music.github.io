"use client";

import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.scss";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "pill";
}

export default function Button({
	variant = "pill",
	className,
	type = "button",
	...rest
}: Props) {
	return (
		<button
			type={type}
			className={[styles[variant], className].filter(Boolean).join(" ")}
			{...rest}
		/>
	);
}
