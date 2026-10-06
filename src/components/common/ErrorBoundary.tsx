"use client";

import { Component, type ReactNode } from "react";

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
				<div
					className={
						"flex flex-col items-center justify-center h-full [background:var(--bg)] gap-5"
					}
				>
					<div className={"flex flex-col items-center gap-3.75"}>
						<svg
							className={"text-muted opacity-[0.85]"}
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
						<span
							className={
								"font-(family-name:--font-nunito) text-[1.5rem] font-bold text-foreground"
							}
						>
							Something went wrong
						</span>
					</div>
					<pre
						className={
							"[background:var(--surface)] [border:1px_solid_var(--border)] rounded-md p-[12px_20px] max-w-[50%] w-[90%] max-h-[50%] overflow-auto font-[monospace] text-[0.8rem] text-danger [word-break:break-word] whitespace-pre-wrap [user-select:text]"
						}
					>
						{msg}
					</pre>
				</div>
			);
		}
		return this.props.children;
	}
}
