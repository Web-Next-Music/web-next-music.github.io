"use client";

import { Component, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.scss";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	render() {
		if (this.state.error) {
			if (this.props.fallback) return this.props.fallback;
			const msg = this.state.error.message || String(this.state.error);
			return (
				<div className={styles.page}>
					<div className={styles.header}>
						<svg
							className={styles.icon}
							width="72"
							height="72"
							viewBox="0 0 72 72"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle
								cx="36"
								cy="36"
								r="34"
								stroke="currentColor"
								strokeWidth="3"
							/>
							<rect
								x="33"
								y="18"
								width="6"
								height="24"
								rx="3"
								fill="currentColor"
							/>
							<circle cx="36" cy="52" r="3.5" fill="currentColor" />
						</svg>
						<span className={styles.title}>Something went wrong</span>
					</div>
					<pre className={styles.errorBlock}>{msg}</pre>
				</div>
			);
		}
		return this.props.children;
	}
}
