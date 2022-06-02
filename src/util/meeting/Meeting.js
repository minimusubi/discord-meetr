import datebook from 'datebook';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import {endMeeting} from '../../commands/end.js';
import {getHumanDuration, getShortDuration} from '../time.js';
import Stopwatch from '../Stopwatch.js';
const {ICalendar, OutlookCalendar} = datebook;

dayjs.extend(duration);

export default class Meeting {
	constructor(voiceChannel, textChannel, owner) {
		this.voiceChannel = voiceChannel;
		this.textChannel = textChannel;
		this.topic = null;
		this.owner = owner;
		this.startTime = dayjs();
		this.endTime = null;
		this.members = new Map();
		this.listener = async (oldState, newState) => {
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
	
	setTopic(topic) {
		this.topic = topic ?? null;
	}
	
	getTopic() {
		return this.topic;
	}
	
	getOwner() {
		return this.owner;
	}
	
	setStartTime(parts) {
		this.startTime = dayjs().hour(parts.hours).minute(parts.minutes).startOf('minute');
		
		for (const [, stopwatch] of this.members) {
			stopwatch.time = this.startTime.toDate().valueOf();
		}
	}
	
	setEndTime(parts) {
		this.endTime = dayjs().hour(parts.hours).minute(parts.minutes).startOf('minute');
		
		for (const [, stopwatch] of this.members) {
			stopwatch.duration = this.endTime.toDate().valueOf() - stopwatch.time;
		}
	}
	
	addMember(member) {
		if (!this.members.has(member)) {
			this.members.set(member, new Stopwatch());
		}
		
		try {
			this.members.get(member).start();
		} catch (error) {
			console.log('member: ', member);
			console.log('stopwatch: ', this.members.get(member));
		}
	}
	
	removeMember(member) {
		if (!this.members.has(member)) {
			return;
		}
		
		this.members.get(member).stop();
	}
	
	getMembers() {
		return Array.from(this.members).map(([member, timer]) => {
			return [member, getShortDuration(timer.getTime())];
		});
	}
	
	end() {
		this.endTime = dayjs();
		this.voiceChannel.client.off('voiceStateUpdate', this.listener);
		
		for (const [, timer] of this.members) {
			timer.stop();
		}
	}
	
	getDuration() {
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
		};
	}
	
	getCalendarEvent() {
		if (this.endTime === null) {
			return null;
		}
		
		const calendar = new ICalendar(this.getCalendarOptions());
		
		return Buffer.from(calendar.render(), 'utf-8');
	}
	
	getCalendarLink() {
		if (this.endTime === null) {
			return null;
		}
		
		const calendar = new OutlookCalendar(this.getCalendarOptions());
		calendar.setHost('office');
		
		return calendar.render();
	}
}
