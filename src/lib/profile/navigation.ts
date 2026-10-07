export function navigateProfile(href: string): void {
	if (`${window.location.pathname}${window.location.search}` === href) return;
	window.history.pushState(null, "", href);
}
