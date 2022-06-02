import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration.js';
import {pluralize} from './number.js';

dayjs.extend(durationPlugin);

export function getHumanDuration(time, maxParts = 2) {
	const length = dayjs.duration(time);
	const parts = [
		{label: 'day', value: length.days()},
		{label: 'hour', value: length.hours()},
		{label: 'minute', value: length.minutes()},
		{label: 'second', value: length.seconds()},
	];
	
	const largestNonZeroPartIndex = parts.findIndex((part) => {
		return part.value > 0;
	});
	const relevantParts = parts.slice(largestNonZeroPartIndex, largestNonZeroPartIndex + maxParts).filter((part) => {
		return part.value > 0;
	}).map((part) => {
		return `${part.value} ${pluralize(part.label, part.value)}`;
	});
	
	return relevantParts.join(' and ');
}

export function getShortDuration(time) {
	const duration = dayjs.duration(time);
	
	if (duration.hours() > 0) {
		return duration.format('H [hr] m [min]');
	} else if (duration.minutes() > 0) {
		return duration.format('m [min] s [sec]');
	} else {
		return duration.format('s [sec]');
	}
}

export function inferTime(input) {
	// Extract A or P
	let meridiem = input.match(/[^\d:]*?([ap])[^\d:]*$/i);
	if (meridiem) {
		input = input.substring(0, meridiem.index);
		
		if (meridiem[1].toLowerCase() == 'p') {
			meridiem = 12;
		} else {
			meridiem = 0;
		}
	}
	
	// Ignore anything that's not a digit or colon
	// Split the numbers by colon
	let time = input.replace(/[^\d:]+/g, '').split(/:+/).filter((element) => {
		return element.length > 0;
	});
	
	// Process groups of numbers
	// ABC becomes A:BC
	// ABCD becomes AB:CD
	for (let i = 0; i < time.length; i++) {
		while (time[i].length > 2) {
			let group = time[i].substring(0, time[i].length % 2 == 0 ? 2 : 1);
			time[i] = time[i].substring(group.length);
			time.splice(i, 0, group);
			i++;
		}
	}
	
	// Times with more than three parts HH:MM:SS are invalid
	if (time.length < 1 || time.length > 3) {
		return null;
	}
	
	// Convert all parts to a number
	for (let i = 0; i < time.length; i++) {
		time[i] = Number(time[i]);
	}
	
	// Fill empty groups
	while (time.length < 3) {
		time.push(0);
	}
	
	// Validate the hours
	if (time[0] < 0 || time[0] > 23) {
		return null;
	}
	// Validate the minutes
	if (time[1] < 0 || time[1] > 59) {
		return null;
	}
	// Validate the second
	if (time[2] < 0 || time[2] > 59) {
		return null;
	}
	
	// Add meridiem
	if (meridiem !== null) {
		if (time[0] < 12) {
			time[0] += meridiem;
		} else if (time[0] == 12) {
			// 12 PM is not 24:00
			// 12 AM is not 12:00
			time[0] += meridiem == 0 ? 12 : 0;
		}
	}
	
	// Round to the nearest minute
	if (time[2] > 30) {
		// If seconds > 20, add minute
		time[1]++;
	}
	// If minutes == 60, add hour
	if (time[1] == 60) {
		time[1] = 0;
		time[0]++;
	}
	// If hours == 24, set to 0
	if (time[0] == 24) {
		time[0] = 0;
	}
	
	return {hours: time[0], minutes: time[1]};
}
