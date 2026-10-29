"use client";

import styles from "./Hero.module.scss";

import { useEffect, useState } from "react";
import Image from "next/image";
import { marked } from "marked";
import Modal from "@/components/ui/Modal";
import FeatureVideoPlayer from "./FeatureVideoPlayer";
import DownloadButtons from "./DownloadButtons";

interface Feature {
	title: string;
	content: string;
	videos: string[];
}

const VIDEO_MARKER_PATTERN = /(<div data-feature-video="\d+"><\/div>)/;

export default function Hero() {
	const [features, setFeatures] = useState<Feature[]>([]);
	const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		fetch("/features.md", { signal: controller.signal })
			.then((response) => {
				if (!response.ok) throw new Error("Failed to load features");
				return response.text();
			})
			.then((markdown) => {
				const document = new DOMParser().parseFromString(
					marked.parse(markdown) as string,
					"text/html",
				);
				const parsedFeatures = Array.from(
					document.querySelectorAll("details"),
				).map((details) => {
					const summary = details.querySelector("summary");
					const content = details.cloneNode(true) as HTMLElement;
					const videos: string[] = [];
					content.querySelector("summary")?.remove();
					content
						.querySelectorAll<HTMLAnchorElement>("a[href]")
						.forEach((link) => {
							const href = link.href;
							if (
								!href.startsWith("https://github.com/user-attachments/") ||
								link.textContent?.trim() !== href
							)
								return;

							const marker = document.createElement("div");
							marker.dataset.featureVideo = String(videos.length);
							videos.push(href);
							const parent = link.parentElement;
							if (
								parent?.tagName === "P" &&
								parent.textContent?.trim() === href
							) {
								parent.replaceWith(marker);
							} else {
								link.replaceWith(marker);
							}
						});

					return {
						title: summary?.textContent?.trim() ?? "Feature",
						content: content.innerHTML,
						videos,
					};
				});
				setFeatures(parsedFeatures);
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setFeatures([]);
			});

		return () => controller.abort();
	}, []);

	return (
		<section className={styles.hero}>
			<div className={styles.heroTop}>
				<div className={styles.heroLeft}>
					<h1 className={styles.title}>Next Music</h1>
					<p className={styles.desc}>
						Web client for Yandex Music with support for themes, addons, Discord
						Rich Presence (RPC) and OBS widget
					</p>
					<DownloadButtons />
				</div>
				<div className={styles.heroRight}>
					<div className={styles.previewWrapper}>
						<Image
							src="/preview.png"
							alt="Next Music Client preview"
							width={900}
							height={580}
							className={styles.previewImg}
							priority
						/>
					</div>
				</div>
			</div>
			{features.length > 0 && (
				<div className={styles.featuresSection}>
					<h2 className={styles.featuresTitle}>Feature&apos;s</h2>
					<div className={styles.featuresContent}>
						{features.map((feature) => (
							<button
								key={feature.title}
								type="button"
								className={styles.featureCard}
								onClick={() => setSelectedFeature(feature)}
							>
								<span>{feature.title}</span>
								<span className={styles.featureArrow} aria-hidden="true" />
							</button>
						))}
					</div>
				</div>
			)}
			<Modal
				open={selectedFeature !== null}
				onClose={() => setSelectedFeature(null)}
				title={selectedFeature?.title}
				size="lg"
				bodyClassName={styles.featureModalContent}
			>
				{selectedFeature &&
					selectedFeature.content
						.split(VIDEO_MARKER_PATTERN)
						.map((part, index) => {
							const videoIndex = part.match(
								/^<div data-feature-video="(\d+)"><\/div>$/,
							)?.[1];
							if (videoIndex !== undefined) {
								return (
									<FeatureVideoPlayer
										key={`${selectedFeature.title}-video-${videoIndex}`}
										src={selectedFeature.videos[Number(videoIndex)]}
									/>
								);
							}
							if (!part) return null;
							return (
								<div
									key={`${selectedFeature.title}-content-${index}`}
									onErrorCapture={(event) => {
										const image = event.target;
										if (!(image instanceof HTMLImageElement)) return;
										const message = document.createElement("p");
										message.textContent = "Image unavailable";
										image.replaceWith(message);
									}}
									dangerouslySetInnerHTML={{ __html: part }}
								/>
							);
						})}
			</Modal>
		</section>
	);
}
