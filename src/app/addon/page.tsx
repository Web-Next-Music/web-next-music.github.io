import Header from "@/components/layout/Header";
import AddonDetail from "@/components/addon/AddonDetail";
import Footer from "@/components/layout/Footer";
import { Suspense } from "react";

export default function AddonPage() {
	return (
		<>
			<Header />
			<main>
				<Suspense
					fallback={
						<div style={{ textAlign: "center", padding: "4rem" }}>
							Loading addon…
						</div>
					}
				>
					<AddonDetail />
				</Suspense>
			</main>
			<Footer />
		</>
	);
}
