"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function prettify(href: string): string {
	const m = href.match(/^\/track\?id=(.+)$/);
	return m ? `/track/${m[1]}` : href;
}

export default function TrackLink({
	href,
	className,
	style,
	children,
}: {
	href: string;
	className?: string;
	style?: React.CSSProperties;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const display = prettify(href);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (display === href) return;
		if (
			e.defaultPrevented ||
			e.button !== 0 ||
			e.metaKey ||
			e.ctrlKey ||
			e.shiftKey ||
			e.altKey
		)
			return;

		e.preventDefault();
		if (window.location.pathname === display) return;
		router.push(href);
	};

	return (
		<Link
			href={display}
			className={className}
			style={style}
			onClick={handleClick}
		>
			{children}
		</Link>
	);
}
