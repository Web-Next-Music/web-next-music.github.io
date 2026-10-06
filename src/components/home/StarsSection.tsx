"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Stargazer } from "@/types/github";
import { fetchStargazers } from "@/lib/github";

const PAGE_SIZE = 12;

export default function StarsSection() {
	const [stargazers, setStargazers] = useState<Stargazer[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

	useEffect(() => {
		fetchStargazers()
			.then(setStargazers)
			.catch(() => setStargazers([]))
			.finally(() => setLoading(false));
	}, []);

	const totalPages = Math.ceil(stargazers.length / PAGE_SIZE);
	const pageItems = stargazers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<section
			className={
				"m-[0_auto] p-[60px_0] bg-canvas [border-top:1px_solid_var(--border)] [@media(max-width:_900px)]:p-5"
			}
		>
			<div className={"max-w-275 m-auto"}>
				<div
					className={
						"text-[14px] font-extrabold font-sans text-accent tracking-[2px] mb-5"
					}
				>
					COMMUNITY
				</div>
				<div
					className={
						"text-[32px] font-bold [letter-spacing:-1px] mb-2.5 font-(family-name:--font-heading-large)"
					}
				>
					Stargazers
				</div>
				<p className={"text-[14px] font-bold text-muted mb-5"}>
					{loading
						? "Loading stargazers…"
						: stargazers.length > 0
							? `${stargazers.length} people gave this project a star on GitHub - thank you!`
							: "Everyone who gave the project a star on GitHub - thank you!"}
				</p>
				<div
					className={
						"grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 min-h-57 [@media(max-width:_900px)]:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"
					}
				>
					{loading && (
						<p className={"text-[14px] font-bold text-muted col-span-full"}>
							Loading…
						</p>
					)}

					{!loading && stargazers.length === 0 && (
						<p className={"text-[14px] font-bold text-muted col-span-full"}>
							No stars yet
						</p>
					)}

					{!loading &&
						pageItems.map((user) => {
							return (
								<a
									key={user.login}
									href={user.html_url}
									target="_blank"
									rel="noopener noreferrer"
									className={
										"[background:var(--bg)] rounded-2xl h-27 p-3.75 flex flex-col items-center gap-3.75 [transition:all_0.2s] cursor-pointer [border:1px_solid_var(--border)] hover:[background:var(--surface)] hover:border-border"
									}
								>
									<Image
										src={user.avatar_url}
										alt={user.login}
										width={44}
										height={44}
										className={
											"w-11 h-11 rounded-(--radius-full) object-cover shrink-0 [border:1px_solid_var(--border)]"
										}
										loading="lazy"
									/>
									<div
										className={
											"text-[14px] font-extrabold text-center overflow-hidden text-ellipsis whitespace-nowrap max-w-full font-(family-name:--font-heading-large)"
										}
									>
										{user.login}
									</div>
								</a>
							);
						})}
				</div>

				{!loading && totalPages > 1 && (
					<div
						className={
							"flex bg-canvas [border:1px_solid_var(--border)] p-2.5 rounded-(--radius-pill) items-center justify-center gap-1.5 mt-5"
						}
					>
						<button
							className={
								"w-8.5 h-8.5 p-0 rounded-(--radius-full) flex items-center justify-center [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground text-[13px] font-sans font-extrabold cursor-pointer [transition:background_0.15s,border-color_0.15s,color_0.15s] [&:hover:not(:disabled)]:[background:var(--surface2)] [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:text-accent disabled:opacity-[0.35] disabled:cursor-default"
							}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M10 12L6 8L10 4"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>

						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<button
								key={p}
								className={`${"w-8.5 h-8.5 p-0 rounded-(--radius-full) flex items-center justify-center [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground text-[13px] font-sans font-extrabold cursor-pointer [transition:background_0.15s,border-color_0.15s,color_0.15s] [&:hover:not(:disabled)]:[background:var(--surface2)] [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:text-accent disabled:opacity-[0.35] disabled:cursor-default"} ${p === page ? "[background:var(--accent)] border-accent text-canvas font-bold [&:hover:not(:disabled)]:[background:var(--accent2)] [&:hover:not(:disabled)]:border-(--accent2) [&:hover:not(:disabled)]:text-canvas" : ""}`}
								onClick={() => setPage(p)}
							>
								{p}
							</button>
						))}

						<button
							className={
								"w-8.5 h-8.5 p-0 rounded-(--radius-full) flex items-center justify-center [border:1px_solid_var(--border)] [background:var(--surface)] text-foreground text-[13px] font-sans font-extrabold cursor-pointer [transition:background_0.15s,border-color_0.15s,color_0.15s] [&:hover:not(:disabled)]:[background:var(--surface2)] [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:text-accent disabled:opacity-[0.35] disabled:cursor-default"
							}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6 4L10 8L6 12"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					</div>
				)}
			</div>
		</section>
	);
}
