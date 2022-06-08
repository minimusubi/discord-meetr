import {BaseGuildVoiceChannel, ButtonInteraction, ChatInputCommandInteraction, Client, Collection, GuildMember, TextBasedChannel} from 'discord.js';
import {endMeeting} from '../../actions/end.js';
import {save} from '../Store.js';
import {TimeParts} from '../time.js';
import Meeting, {MeetingExport} from './Meeting.js';
import {MeetingExistsError, NoMeetingExistsError} from './MeetingErrors.js';

export type MeetingStoreExport = Array<MeetingExport>;

export default class MeetingStore {
	ongoingMeetings: Collection<string, Meeting>;
	hintedMeetings: Set<string>;
	
	constructor() {
		this.ongoingMeetings = new Collection();
		this.hintedMeetings = new Set();
		// this.pastMeetings = [];
	}
	
	startMeeting(voiceChannel: BaseGuildVoiceChannel, textChannel: TextBasedChannel, member: GuildMember) {
		if (this.ongoingMeetings.has(voiceChannel.id)) {
			throw new MeetingExistsError(`A meeting is already running in ${voiceChannel.id}!`);
		}
		
		const meeting = new Meeting(voiceChannel, textChannel, member);
		this.ongoingMeetings.set(voiceChannel.id, meeting);
		console.log(`Active meetings: ${this.ongoingMeetings.size}`);
		
		save(voiceChannel.client);
		
		return meeting;
	}
	
	hasMeeting(channel: BaseGuildVoiceChannel) {
		return this.ongoingMeetings.has(channel.id);
	}
	
	getMeeting(channel: BaseGuildVoiceChannel) {
		const meeting = this.ongoingMeetings.get(channel.id);
		
		if (!meeting) {
			throw new NoMeetingExistsError(`No meeting is running in ${channel.id}!`);
		}
		
		return meeting;
	}
	
	stopMeeting(channel: BaseGuildVoiceChannel, {overrideEndTime, interaction}: {overrideEndTime?: TimeParts, interaction?: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>} = {}) {
		const meeting = this.getMeeting(channel);
		
		meeting.end(overrideEndTime);
		// this.pastMeetings.push(meeting);
		this.ongoingMeetings.delete(channel.id);
		endMeeting(meeting, interaction);
		console.log(`Active meetings: ${this.ongoingMeetings.size}`);
		
		save(channel.client);
	}
	
	addHint(channel: BaseGuildVoiceChannel) {
		if (this.hasHint(channel)) {
			return false;
		}
		
		this.hintedMeetings.add(channel.id);
		return true;
	}
	
	hasHint(channel: BaseGuildVoiceChannel) {
		return this.hintedMeetings.has(channel.id);
	}
	
	removeHint(channel: BaseGuildVoiceChannel) {
		return this.hintedMeetings.delete(channel.id);
	}
	
	export(): MeetingStoreExport {
		return Array.from(this.ongoingMeetings.values()).map((meeting) => {
			return meeting.export();
		});
	}
	
	static async import(client: Client, object: MeetingStoreExport) {
		const meetingStore = client.singletons.meetingStore;
		const meetingResults = await Promise.allSettled(object.map((meetingExport) => {
			return Meeting.import(client, meetingExport);
		}));
		
		for (const importResult of meetingResults) {
			if (importResult.status === 'fulfilled') {
				const meeting = importResult.value;
				meetingStore.ongoingMeetings.set(meeting.voiceChannel.id, meeting);
			} else {
				console.error('Error importing meeting');
				console.error(importResult.reason);
			}
		}
		
		// Typecasting causes ESLint to see extra parenthesis
		// eslint-disable-next-line no-extra-parens
		const meetings = (meetingResults.filter((result) => {
			return result.status === 'fulfilled';
		}) as PromiseFulfilledResult<Meeting>[]).map((result) => {
			return result.value;
		});
		
		await Promise.allSettled(meetings.map((meeting) => {
			meeting.voiceChannel.fetch();
		}));
		
		for (const meeting of meetings) {
			if (meeting.voiceChannel.members.size === 0) {
				meetingStore.stopMeeting(meeting.voiceChannel);
			}
		}
		
		await save(client);
		
		if (meetingResults.length > 0) {
			console.log(`Imported ${meetings.length} of ${meetingResults.length} meetings`);
		}
	}
}
