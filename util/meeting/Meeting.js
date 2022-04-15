import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import {endMeeting} from '../../commands/end.js';
import {pluralize} from '../number.js';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export default class Meeting {
	constructor(voiceChannel, textChannel, owner) {
		this.voiceChannel = voiceChannel;
		this.textChannel = textChannel;
		this.topic = null;
		this.owner = owner;
		this.members = new Set();
		this.startTime = dayjs();
		this.endTime = null;
		this.listener = async (oldState, newState) => {
			if (newState.channelId === this.voiceChannel.id) {
				this.members.add(newState.member);
			}
			
			if (this.voiceChannel.members.size === 0) {
				await endMeeting(null, this.voiceChannel);
			}
		};
		
		// Add channel listener
		voiceChannel.client.on('voiceStateUpdate', this.listener);
		
		for (const [, member] of voiceChannel.members) {
			this.members.add(member);
		}
	}
	
	getChannel() {
		return this.voiceChannel;
	}
	
	getTextChannel() {
		return this.textChannel;
	}
	
	setTopic(topic) {
		this.topic = topic;
	}
	
	getTopic() {
		return this.topic;
	}
	
	getOwner() {
		return this.owner;
	}
	
	addMember(member) {
		this.members.add(member);
	}
	
	getMembers() {
		return Array.from(this.members);
	}
	
	end() {
		this.endTime = dayjs();
		this.voiceChannel.client.off('voiceStateUpdate', this.listener);
	}
	
	getDuration() {
		const length = dayjs.duration(this.endTime.diff(this.startTime));
		const parts = [];
		let days = length.days();
		let hours = length.hours();
		let minutes = length.minutes();
		let seconds = length.seconds();
		
		if (seconds >= 45) {
			seconds = 0;
			minutes++;
		}
		if (minutes >= 45) {
			minutes = 0;
			hours++;
		}
		if (hours >= 22) {
			hours = 0;
			days++;
		}
		
		parts.push({label: 'day', value: days});
		parts.push({label: 'hour', value: hours});
		parts.push({label: 'minute', value: minutes});
		parts.push({label: 'second', value: seconds});
		
		const largestNonZeroPartIndex = parts.findIndex((part) => {
			return part.value > 0;
		});
		const relevantParts = parts.slice(largestNonZeroPartIndex, largestNonZeroPartIndex + 2).filter((part) => {
			return part.value > 0;
		}).map((part) => {
			return `${part.value} ${pluralize(part.label, part.value)}`;
		});
		
		return relevantParts.join(' and ');
	}
}
