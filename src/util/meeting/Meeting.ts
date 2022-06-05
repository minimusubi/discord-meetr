import datebook, {CalendarOptions} from 'datebook';
import dayjs, {Dayjs} from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import {endMeeting} from '../../actions/end.js';
import {getHumanDuration, getShortDuration, TimeParts} from '../time.js';
import Stopwatch from '../Stopwatch.js';
import {GuildMember, TextBasedChannel, VoiceBasedChannel, VoiceState} from 'discord.js';
const {ICalendar, OutlookCalendar} = datebook;

dayjs.extend(duration);

export default class Meeting {
	voiceChannel: VoiceBasedChannel;
	textChannel: TextBasedChannel;
	topic: string | null;
	owner: GuildMember;
	startTime: Dayjs;
	endTime: Dayjs | null;
	members: Map<GuildMember, Stopwatch>;
	listener: (oldState: VoiceState, newState: VoiceState) => void;
	
	constructor(voiceChannel: VoiceBasedChannel, textChannel: TextBasedChannel, owner: GuildMember) {
		this.voiceChannel = voiceChannel;
		this.textChannel = textChannel;
		this.topic = null;
		this.owner = owner;
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
				await endMeeting(null, this.voiceChannel);
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
	}
	
	getTopic() {
		return this.topic;
	}
	
	getOwner() {
		return this.owner;
	}
	
	setStartTime(parts: TimeParts) {
		this.startTime = dayjs().hour(parts.hours).minute(parts.minutes).startOf('minute');
		
		for (const [, stopwatch] of this.members) {
			stopwatch.reset();
			stopwatch.start(this.startTime.toDate().valueOf());
		}
	}
	
	addMember(member: GuildMember) {
		if (!this.members.has(member)) {
			this.members.set(member, new Stopwatch());
		}
		
		try {
			// @ts-ignore If statement above guarantees that member exists in Collection
			this.members.get(member).start();
		} catch (error) {
			console.log('member: ', member);
			console.log('stopwatch: ', this.members.get(member));
		}
	}
	
	removeMember(member: GuildMember) {
		if (!this.members.has(member)) {
			return;
		}
		
		// @ts-ignore If statement above guarantees that member exists in Collection
		this.members.get(member).stop();
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
	
	endWithTime(parts: TimeParts) {
		this.endTime = dayjs().hour(parts.hours).minute(parts.minutes).startOf('minute');
		this.voiceChannel.client.off('voiceStateUpdate', this.listener);
		
		for (const [, stopwatch] of this.members) {
			console.log(stopwatch);
			if (stopwatch.time !== null) {
				stopwatch.duration = this.endTime.toDate().valueOf() - stopwatch.time;
				stopwatch.time = null;
			}
		}
	}
	
	getDuration() {
		if (this.endTime === null) {
			return null;
		}
		
		return getHumanDuration(this.endTime.diff(this.startTime));
	}
	
	getCalendarOptions() {
		if (this.endTime === null) {
			return null;
		}
		
		return {
			title: this.topic ?? 'Unnamed Meeting',
			location: `#${this.voiceChannel.name} in Discord`,
			start: this.startTime.toDate(),
			end: this.endTime.toDate(),
		} as CalendarOptions;
	}
	
	getCalendarEvent() {
		if (this.endTime === null) {
			return null;
		}
		
		// @ts-ignore If statement above guarantees endTime is not null
		const calendar = new ICalendar(this.getCalendarOptions());
		
		return Buffer.from(calendar.render(), 'utf-8');
	}
	
	getCalendarLink() {
		if (this.endTime === null) {
			return null;
		}
		
		// @ts-ignore If statement above guarantees endTime is not null
		const calendar = new OutlookCalendar(this.getCalendarOptions());
		calendar.setHost('office');
		
		return calendar.render();
	}
}
