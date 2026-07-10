const dateFormatter = new Intl.DateTimeFormat('es-ES', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

export const formatStageDate = (iso: string | null | undefined): string => {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return dateFormatter.format(date);
};

export const formatMeetingDate = (iso: string): string =>
	new Intl.DateTimeFormat('es-ES', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date(iso));

export const formatMeetingTime = (iso: string): string =>
	new Intl.DateTimeFormat('es-ES', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
		timeZoneName: 'short',
	}).format(new Date(iso));

export const platformLabel = (platform: string): string => {
	const labels: Record<string, string> = {
		zoom: 'Zoom',
		google_meet: 'Google Meet',
		teams: 'Microsoft Teams',
	};
	return (
		labels[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
	);
};
