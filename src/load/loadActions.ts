import {readdirSync} from 'node:fs';
import {Client, Collection} from 'discord.js';
import {Action} from '../types';

declare module 'discord.js' {
	// eslint-disable-next-line no-shadow, no-unused-vars
	interface Client<Ready extends boolean = boolean> {
		botActions: Collection<string, Action>
	}
}

export default async function loadCommands(client: Client) {
	client.botActions = new Collection();
	const commandFiles = readdirSync('./actions').filter((file) => {
		return file.endsWith('.js');
	});

	for (const file of commandFiles) {
		const action = (await import(`../actions/${file}`)) as Action;
		client.botActions.set(action.name, action);
	}
}
