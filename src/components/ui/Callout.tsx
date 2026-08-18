"use client";

import type { ReactNode } from "react";
import styles from "./Callout.module.scss";

interface Props {
	tone: "danger" | "warning";
	icon: ReactNode;
	title?: string;
	children: ReactNode;
	actions?: ReactNode;
}

export default function Callout({
	tone,
	icon,
	title,
	children,
	actions,
}: Props) {
	return (
		<div className={`${styles.box} ${styles[tone]}`}>
			<div className={styles.header}>
				<div className={styles.icon}>{icon}</div>
				{title && <div className={styles.title}>{title}</div>}
			</div>
			<div className={styles.text}>{children}</div>
			{actions && <div className={styles.actions}>{actions}</div>}
		</div>
	);
}
