import {dirname, join} from 'path';
import {JSONFile, Low} from 'lowdb';
import {fileURLToPath} from 'url';
import {Client} from 'discord.js';
import MeetingStore from './meeting/MeetingStore.js';

const __dirname = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(__dirname, 'db.json');
const adapter = new JSONFile<Record<string, any>>(file);
const db = new Low<Record<string, any>>(adapter);

// Read data from JSON file, this will set db.data content
await db.read();
createDefaultData();

export async function save(client: Client) {
	createDefaultData();
	db.data!.meetingStore = client.singletons.meetingStore.export();
	
	await db.write();
}

export async function load(client: Client) {
	createDefaultData();
	try {
		await MeetingStore.import(client, db.data!.meetingStore);
	} catch {}
}

function createDefaultData() {
	db.data ||= {};
	db.data.meetingStore ||= {};
}
