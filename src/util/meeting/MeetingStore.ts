import {Collection, GuildMember, TextBasedChannel, VoiceBasedChannel} from 'discord.js';
import { TimeParts } from '../time.js';
import Meeting from './Meeting.js';
import {MeetingExistsError, NoMeetingExistsError} from './MeetingErrors.js';

export default class MeetingStore {
	ongoingMeetings: Collection<string, Meeting>;
	hintedMeetings: Set<string>;
	
	constructor() {
		this.ongoingMeetings = new Collection();
		this.hintedMeetings = new Set();
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
	
	hasMeeting(channel: VoiceBasedChannel) {
		return this.ongoingMeetings.has(channel.id);
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
	
	addHint(channel: VoiceBasedChannel) {
		if (this.hasHint(channel)) {
			return false;
		}
		
		this.hintedMeetings.add(channel.id);
		return true;
	}
	
	hasHint(channel: VoiceBasedChannel) {
		return this.hintedMeetings.has(channel.id);
	}
	
	removeHint(channel: VoiceBasedChannel) {
		return this.hintedMeetings.delete(channel.id);
	}
	
	async save() {
		// await writeFile('data/meetings.json', JSON.stringify(this.ongoingMeetings.entries))
	}
	
	async load() {
		
	}
}
