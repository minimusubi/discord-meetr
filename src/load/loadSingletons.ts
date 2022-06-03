import {Client} from 'discord.js';
import MeetingStore from '../util/meeting/MeetingStore.js';

declare module 'discord.js' {
	// eslint-disable-next-line no-shadow, no-unused-vars
	interface Client<Ready extends boolean = boolean> {
		singletons: {
			meetingStore: MeetingStore,
		}
	}
}

export default async function loadSingletons(client: Client) {
	client.singletons = {
		meetingStore: new MeetingStore(),
	};
}
