import {Collection} from 'discord.js';
import Meeting from './Meeting.js';
import {MeetingExistsError, NoMeetingExistsError} from './MeetingErrors.js';

export default class MeetingStore {
	constructor() {
		this.ongoingMeetings = new Collection();
		this.pastMeetings = [];
	}
	
	startMeeting(voiceChannel, textChannel, member) {
		if (this.ongoingMeetings.has(voiceChannel.id)) {
			throw new MeetingExistsError(`A meeting is already running in ${voiceChannel.id}!`);
		}
		
		const meeting = new Meeting(voiceChannel, textChannel, member);
		this.ongoingMeetings.set(voiceChannel.id, meeting);
		
		return meeting;
	}
	
	getMeeting(channel) {
		if (!this.ongoingMeetings.has(channel.id)) {
			throw new NoMeetingExistsError(`No meeting is running in ${channel.id}!`);
		}
		
		return this.ongoingMeetings.get(channel.id);
	}
	
	stopMeeting(channel) {
		const meeting = this.getMeeting(channel);
		
		meeting.end();
		this.pastMeetings.push(meeting);
		this.ongoingMeetings.delete(channel.id);
	}
}
