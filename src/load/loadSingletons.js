import MeetingStore from '../util/meeting/MeetingStore.js';

export default async function loadSingletons(client) {
	client.singletons = {};
	client.singletons.meetingStore = new MeetingStore();
}
