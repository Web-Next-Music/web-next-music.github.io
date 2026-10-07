"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Stargazer } from "@/types/github";
import { fetchStargazers } from "@/lib/github";
import styles from "./StarsSection.module.scss";

const PAGE_SIZE = 12;

export default function StarsSection() {
	const [stargazers, setStargazers] = useState<Stargazer[]>([]);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);
	const [page, setPage] = useState(1);

	useEffect(() => {
		fetchStargazers()
			.then(setStargazers)
			.catch(() => setFailed(true))
			.finally(() => setLoading(false));
	}, []);

	const totalPages = Math.ceil(stargazers.length / PAGE_SIZE);
	const pageItems = stargazers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<section className={styles.sectionLayout}>
			<div className={styles.sectionWrap}>
				<div className={styles.sectionLabel}>COMMUNITY</div>
				<div className={styles.sectionTitle}>Stargazers</div>
				<p className={styles.sectionSub}>
					{loading
						? "Loading stargazers…"
						: stargazers.length > 0
							? `${stargazers.length} people gave this project a star on GitHub - thank you!`
							: "Everyone who gave the project a star on GitHub - thank you!"}
				</p>
				<div className={styles.gridLayout}>
					{loading && <p className={styles.empty}>Loading…</p>}

					{!loading && failed && (
						<p className={styles.empty}>
							Unable to load stargazers. Please try again later.
						</p>
					)}

					{!loading && !failed && stargazers.length === 0 && (
						<p className={styles.empty}>No stars yet</p>
					)}

					{!loading &&
						pageItems.map((user) => {
							return (
								<a
									key={user.login}
									href={user.html_url}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.cardLayout}
								>
									<Image
										src={user.avatar_url}
										alt={user.login}
										width={44}
										height={44}
										className={styles.avatarImg}
										loading="lazy"
									/>
									<div className={styles.name}>{user.login}</div>
								</a>
							);
						})}
				</div>

				{!loading && totalPages > 1 && (
					<div className={styles.pagination}>
						<button
							className={styles.pageBtnLayout}
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
								className={`${styles.pageBtnLayout} ${p === page ? styles.pageBtnActiveLayout : ""}`}
								onClick={() => setPage(p)}
							>
								{p}
							</button>
						))}

						<button
							className={styles.pageBtnLayout}
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
