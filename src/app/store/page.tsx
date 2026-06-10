import Header from "@/components/layout/Header";
import StoreFeed from "@/components/store/StoreFeed";
import Footer from "@/components/layout/Footer";

export default function Home() {
	return (
		<>
			<Header />
			<main>
				<StoreFeed />
			</main>
			<Footer />
		</>
	);
}
