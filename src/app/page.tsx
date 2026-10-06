import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import StarsSection from "@/components/home/StarsSection";
import Footer from "@/components/layout/Footer";
import Background from "@/components/ui/Background";

export default function Home() {
	return (
		<>
			<Header />
			<main
				className={
					'overflow-hidden relative [&::after]:[content:""] [&::after]:absolute [&::after]:inset-0 [&::after]:z-1 [&::after]:pointer-events-none *:relative *:z-2 [&_.heroBg]:absolute [&_.heroBg]:inset-0 [&_.heroBg]:z-0'
				}
			>
				<Background
					className={"in-[.main]:inset-0 in-[.main]:absolute in-[.main]:z-0"}
					fade="down"
					fadeStart={30}
					fadeEnd={100}
					patterns={[{ type: "lines", size: 50 }]}
				/>
				<div id="download">
					<Hero />
				</div>
			</main>
			<StarsSection />
			<Footer />
		</>
	);
}
