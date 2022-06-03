import {Collection, GuildMember, TextBasedChannel, VoiceBasedChannel} from 'discord.js';
import { TimeParts } from '../time.js';
import Meeting from './Meeting.js';
import {MeetingExistsError, NoMeetingExistsError} from './MeetingErrors.js';

export default class MeetingStore {
	ongoingMeetings: Collection<string, Meeting>;
	
	constructor() {
		this.ongoingMeetings = new Collection();
		// this.pastMeetings = [];
	}
	
	startMeeting(voiceChannel: VoiceBasedChannel, textChannel: TextBasedChannel, member: GuildMember) {
		if (this.ongoingMeetings.has(voiceChannel.id)) {
			throw new MeetingExistsError(`A meeting is already running in ${voiceChannel.id}!`);
		}
		
		const meeting = new Meeting(voiceChannel, textChannel, member);
		this.ongoingMeetings.set(voiceChannel.id, meeting);
		console.log(`Active meetings: ${this.ongoingMeetings.size}`);
		
		return meeting;
	}
	
	getMeeting(channel: VoiceBasedChannel) {
		const meeting = this.ongoingMeetings.get(channel.id);
		
		if (!meeting) {
			throw new NoMeetingExistsError(`No meeting is running in ${channel.id}!`);
		}
		
		return meeting;
	}
	
	stopMeeting(channel: VoiceBasedChannel, overrideEndTime?: TimeParts) {
		const meeting = this.getMeeting(channel);
		
		meeting.end(overrideEndTime);
		// this.pastMeetings.push(meeting);
		this.ongoingMeetings.delete(channel.id);
		console.log(`Active meetings: ${this.ongoingMeetings.size}`);
	}
	
	async save() {
		// await writeFile('data/meetings.json', JSON.stringify(this.ongoingMeetings.entries))
	}
	
	async load() {
		
	}
}
