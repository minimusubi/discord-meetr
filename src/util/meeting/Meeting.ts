import datebook, {CalendarOptions} from 'datebook';
import dayjs, {Dayjs} from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import {getHumanDuration, getShortDuration, TimeParts} from '../time.js';
import Stopwatch, {StopwatchExport} from '../Stopwatch.js';
import {BaseGuildVoiceChannel, Client, GuildMember, Message, TextBasedChannel, VoiceState} from 'discord.js';
import {save} from '../Store.js';
import {readFile} from 'fs/promises';
import path from 'path';
import CalendarAttendee from 'datebook/dist/types/CalendarAttendee';
const {ICalendar, OutlookCalendar} = datebook;

dayjs.extend(duration);

const ATTENDEE_MAP_FILE = 'attendeeMap.json';

type MeetingParticipant = {
	name: string,
	email: string,
}

export interface MeetingExport {
	guild: string,
	voiceChannel: string,
	textChannel: string,
	topic: string | null,
	owner: string,
	initiator: string | null,
	startTime: number,
	endTime: number | null,
	members: {member: string, stopwatch: StopwatchExport}[],
}

export default class Meeting {
	voiceChannel: BaseGuildVoiceChannel;
	textChannel: TextBasedChannel;
	topic: string | null;
	owner: GuildMember;
	initiator: Message | null;
	startTime: Dayjs;
	endTime: Dayjs | null;
	members: Map<string, Stopwatch>;
	listener: (oldState: VoiceState, newState: VoiceState) => void;
	
	constructor(voiceChannel: BaseGuildVoiceChannel, textChannel: TextBasedChannel, owner: GuildMember) {
		this.voiceChannel = voiceChannel;
		this.textChannel = textChannel;
		this.topic = null;
		this.owner = owner;
		this.initiator = null;
		this.startTime = dayjs();
		this.endTime = null;
		this.members = new Map();
		this.listener = async (oldState, newState) => {
			if (!newState.member) {
				return;
			}
			
			if (newState.channelId === this.voiceChannel.id) {
				this.addMember(newState.member);
			} else if (oldState.channelId === this.voiceChannel.id && newState.channelId !== this.voiceChannel.id) {
				this.removeMember(newState.member);
			}
			
			if (this.voiceChannel.members.size === 0) {
				await this.voiceChannel.client.singletons.meetingStore.stopMeeting(this.voiceChannel);
			}
		};
		
		// Add channel listener
		voiceChannel.client.on('voiceStateUpdate', this.listener);
		
		for (const [, member] of voiceChannel.members) {
			this.addMember(member);
		}
	}
	
	getChannel() {
		return this.voiceChannel;
	}
	
	getTextChannel() {
		return this.textChannel;
	}
	
	setTopic(topic: string | null) {
		this.topic = topic;
		
		save(this.voiceChannel.client);
	}
	
	getTopic() {
		return this.topic;
	}
	
	getOwner() {
		return this.owner;
	}
	
	setInitiator(initiator: Message) {
		this.initiator = initiator;
	}
	
	setStartTime(parts: TimeParts) {
		this.startTime = dayjs().hour(parts.hours).minute(parts.minutes).startOf('minute');
		
		for (const [, stopwatch] of this.members) {
			stopwatch.reset();
			stopwatch.start(this.startTime.toDate().valueOf());
		}
		
		save(this.voiceChannel.client);
	}
	
	addMember(member: GuildMember) {
		if (!this.members.has(member.id)) {
			this.members.set(member.id, new Stopwatch());
		}
		
		this.members.get(member.id)!.start();
		save(this.voiceChannel.client);
	}
	
	removeMember(member: GuildMember) {
		this.members.get(member.id)?.stop();
		
		save(this.voiceChannel.client);
	}
	
	getMembers() {
		return Array.from(this.members).map(([member, timer]) => {
			return {member, duration: getShortDuration(timer.getTime())};
		});
	}
	
	end(endTimeParts?: TimeParts) {
		this.endTime = dayjs();
		this.voiceChannel.client.off('voiceStateUpdate', this.listener);
		
		if (endTimeParts) {
			this.endTime = this.endTime.hour(endTimeParts.hours).minute(endTimeParts.minutes).startOf('minute');
		}
		
		for (const [, timer] of this.members) {
			timer.stop(this.endTime.toDate().valueOf());
		}
	}
	
	getDuration() {
		if (this.endTime === null) {
			throw new Error('Meeting has not ended.');
		}
		
		return getHumanDuration(this.endTime.diff(this.startTime));
	}
	
	getRange() {
		if (this.endTime === null) {
			throw new Error('Meeting has not ended.');
		}
		
		return {
			start: this.startTime.format('h:mm A'),
			end: this.endTime.format('h:mm A'),
		};
	}
	
	async getCalendarOptions() {
		if (this.endTime === null) {
			throw new Error('Meeting has not ended.');
		}
		
		let attendees: CalendarAttendee[] = [];
		try {
			const attendeeMap: Record<string, MeetingParticipant> = JSON.parse(await readFile(path.join('.', ATTENDEE_MAP_FILE), 'utf-8'));
			
			for (const [memberID] of this.members) {
				if (attendeeMap[memberID]) {
					attendees.push({
						name: attendeeMap[memberID].name,
						email: attendeeMap[memberID].email,
					});
				}
			}
		} catch (error) {
			console.error(error);
		}
		
		return {
			title: this.topic ?? 'Unnamed Meeting',
			location: `#${this.voiceChannel.name} in Discord`,
			start: this.startTime.toDate(),
			end: this.endTime.toDate(),
			attendees,
		} as CalendarOptions;
	}
	
	async getCalendarEvent() {
		if (this.endTime === null) {
			throw new Error('Meeting has not ended.');
		}
		
		const calendar = new ICalendar(await this.getCalendarOptions());
		
		return Buffer.from(calendar.render(), 'utf-8');
	}
	
	async getCalendarLink() {
		if (this.endTime === null) {
			throw new Error('Meeting has not ended.');
		}
		
		const options = await this.getCalendarOptions();
		const calendar = new OutlookCalendar(await this.getCalendarOptions());
		calendar.setHost('office');
		
		console.log(options.attendees);
		if (options.attendees && options.attendees.length > 0) {
			return `${calendar.render()}&to=${encodeURIComponent(options.attendees.map((attendee) => {
				return `"${attendee.name}" <${attendee.email}>`;
			}).join(','))}`;
		} else {
			return calendar.render();
		}
	}
	
	export(): MeetingExport {
		return {
			guild: this.voiceChannel.guildId,
			voiceChannel: this.voiceChannel.id,
			textChannel: this.textChannel.id,
			topic: this.topic ?? null,
			owner: this.owner.id,
			initiator: this.initiator?.id ?? null,
			startTime: this.startTime.valueOf(),
			endTime: this.endTime?.valueOf() ?? null,
			members: Array.from(this.members.entries()).map(([memberID, stopwatch]) => {
				return {member: memberID, stopwatch: stopwatch.export()};
			}),
		};
	}
	
	static async import(client: Client, object: MeetingExport) {
		const guild = await client.guilds.fetch(object.guild);
		if (!guild.available) {
			throw new Error(`Guild ${object.guild} is unavailable`);
		}
		
		const voiceChannel = await guild.channels.fetch(object.voiceChannel);
		if (!voiceChannel?.isVoiceBased()) {
			throw new Error(`Channel ${object.voiceChannel} in guild ${object.guild} is either unavailable or not a voice channel`);
		}
		
		const textChannel = await guild.channels.fetch(object.textChannel);
		if (!textChannel?.isTextBased()) {
			throw new Error(`Channel ${object.textChannel} in guild ${object.guild} is either unavailable or not a text channel`);
		}
		
		const owner = await guild.members.fetch(object.owner);
		
		let initiator = null;
		if (object.initiator) {
			try {
				initiator = await textChannel.messages.fetch(object.initiator) ?? null;
			} catch {}
		}
		
		// Create the meeting
		const meeting = new Meeting(voiceChannel, textChannel, owner);
		meeting.initiator = initiator;
		meeting.topic = object.topic;
		meeting.startTime = dayjs(object.startTime);
		meeting.endTime = object.endTime ? dayjs(object.endTime) : null;
		
		// Add saved meeting participants
		for (const {member: memberID, stopwatch: stopwatchExport} of object.members) {
			let stopwatch = meeting.members.get(memberID);
			
			if (stopwatch) {
				stopwatch.duration += stopwatchExport.duration;
				
				if (stopwatchExport.time) {
					stopwatch.time = stopwatchExport.time;
				}
			} else {
				stopwatch = new Stopwatch();
				stopwatch.duration = stopwatchExport.duration;
				stopwatch.time = stopwatchExport.time;
				stopwatch.stop();
				
				meeting.members.set(memberID, stopwatch);
			}
		}
		
		return meeting;
	}
}
