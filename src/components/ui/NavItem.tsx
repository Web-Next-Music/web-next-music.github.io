import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./NavItem.module.scss";

type Props = {
	children: ReactNode;
	active?: boolean;
	count?: number;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

export default function NavItem({
	children,
	active = false,
	count,
	href,
	onClick,
}: Props) {
	const className = cx(styles.item, active && styles.active);
	const content = (
		<>
			{children}
			{count !== undefined && <span className={styles.count}>{count}</span>}
		</>
	);
	return href !== undefined ? (
		<Link
			href={href}
			className={className}
			aria-current={active ? "page" : undefined}
		>
			{content}
		</Link>
	) : (
		<button
			type="button"
			className={className}
			aria-pressed={active}
			onClick={onClick}
		>
			{content}
		</button>
	);
}
