export class MeetingExistsError extends Error {
	constructor(...args) {
		super(...args);
		this.name = 'MeetingExistsError';
	}
}

export class NoMeetingExistsError extends Error {
	constructor(...args) {
		super(...args);
		this.name = 'NoMeetingExistsError';
	}
}
