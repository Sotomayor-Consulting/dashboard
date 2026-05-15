import type { MeetingData, StageStatus } from '../types';

export type MeetingState =
	| 'idle'
	| 'awaiting_booking'
	| 'scheduled'
	| 'past'
	| 'completed'
	| 'cancelled';

export const isMeetingPast = (meeting: MeetingData): boolean => {
	const endsAt =
		new Date(meeting.scheduled_at).getTime() +
		meeting.duration_minutes * 60 * 1000;
	return Date.now() > endsAt;
};

export const resolveMeetingState = (
	stageStatus: StageStatus,
	meeting: MeetingData | null | undefined,
): MeetingState => {
	if (!meeting) {
		return stageStatus === 'in_progress' ? 'awaiting_booking' : 'idle';
	}
	if (meeting.status === 'scheduled') {
		return isMeetingPast(meeting) ? 'past' : 'scheduled';
	}
	if (meeting.status === 'completed') return 'completed';
	if (meeting.status === 'cancelled') {
		return stageStatus === 'in_progress' ? 'awaiting_booking' : 'cancelled';
	}
	return 'idle';
};
