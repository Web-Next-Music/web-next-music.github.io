"use client";

import { AlertTriangle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type {
	AnchorHTMLAttributes,
	ButtonHTMLAttributes,
	ReactNode,
} from "react";
import { cx } from "@/lib/cx";
import styles from "./Callout.module.scss";

export type CalloutTone = "danger" | "warning" | "info" | "success";

const DEFAULT_ICONS: Record<CalloutTone, ReactNode> = {
	danger: <TriangleAlert size={18} />,
	warning: <AlertTriangle size={18} />,
	info: <Info size={18} />,
	success: <CheckCircle2 size={18} />,
};

interface Props {
	tone: CalloutTone;
	icon?: ReactNode;
	title?: string;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
}

export default function Callout({
	tone,
	icon,
	title,
	children,
	actions,
	className,
}: Props) {
	return (
		<div className={cx(styles.box, styles[tone], className)}>
			<div className={styles.header}>
				<div className={styles.icon}>{icon ?? DEFAULT_ICONS[tone]}</div>
				{title && <div className={styles.title}>{title}</div>}
			</div>
			<div className={styles.text}>{children}</div>
			{actions && <div className={styles.actions}>{actions}</div>}
		</div>
	);
}

export function CalloutButton({
	className,
	type = "button",
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button type={type} className={cx(styles.toneBtn, className)} {...rest} />
	);
}

export function CalloutLink({
	className,
	...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
	return <a className={cx(styles.toneLink, className)} {...rest} />;
}
