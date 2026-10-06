"use client";

interface Props {
	loading?: boolean;
	error?: string | null;
	onSignIn: () => void;
	onClose?: () => void;
}

export default function SignInCard({
	loading,
	error,
	onSignIn,
	onClose,
}: Props) {
	return (
		<div
			className={
				"relative flex items-end justify-end overflow-hidden w-full max-w-105 h-55 rounded-2xl [box-shadow:0_0_10px_0_rgba(0,0,0,0.6)] p-5 m-auto"
			}
			style={{
				backgroundImage:
					"linear-gradient(135deg, var(--surface) 0%, transparent 30%, var(--surface) 100%), url(/ui/Kagami.webp)",
				backgroundPosition: "center",
				backgroundSize: "cover",
				backgroundRepeat: "no-repeat",
			}}
		>
			{onClose && (
				<button
					type="button"
					className={
						"absolute top-3.5 right-3.5 z-2 [backdrop-filter:blur(30px)] [background:transparent] [border:none] [box-shadow:inset_0_0_0_1px_var(--border)] rounded-xs text-foreground cursor-pointer flex items-center justify-center w-7 h-7 [transition:color_0.15s,box-shadow_0.15s] hover:text-accent hover:[box-shadow:inset_0_0_0_1px_var(--border)]"
					}
					onClick={onClose}
					aria-label="Close"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path
							d="M18 6L6 18M6 6l12 12"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			)}
			<span
				className={
					'absolute top-4 left-5 z-1 font-["Lucky_Star"] font-normal text-[36px] text-foreground'
				}
			>
				Sign in
			</span>
			<div className="relative z-1 flex flex-col items-end gap-2 text-right max-w-65">
				<button
					type="button"
					className={
						"inline-flex items-center gap-2.25 p-[11px_20px] rounded-sm [border:none] [box-shadow:inset_0_0_0_1px_var(--border)] [backdrop-filter:blur(30px)] [background:transparent] text-foreground font-(family-name:--font-heading-large) text-[14px] font-bold cursor-pointer [transition:background_0.15s,color_0.15s] [&:hover:not(:disabled)]:text-accent disabled:cursor-not-allowed"
					}
					onClick={onSignIn}
					disabled={loading}
				>
					<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
					</svg>
					{loading ? "Redirecting…" : "Continue with GitHub"}
				</button>
				{error && (
					<span
						className={
							"text-[13px] text-danger [background:var(--danger-hover)] [border:1px_solid_var(--danger-border)] rounded-sm p-[8px_12px]"
						}
					>
						{error}
					</span>
				)}
			</div>
		</div>
	);
}
