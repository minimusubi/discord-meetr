import {readdirSync} from 'node:fs';
import {Client, Collection} from 'discord.js';
import {Command} from '../types';

declare module 'discord.js' {
	// eslint-disable-next-line no-shadow, no-unused-vars
	interface Client<Ready extends boolean = boolean> {
		commands: Collection<string, Command>
	}
}

export default async function loadCommands(client: Client) {
	client.commands = new Collection();
	const commandFiles = readdirSync('./commands').filter((file) => {
		return file.endsWith('.js');
	});

	for (const file of commandFiles) {
		const command = (await import(`../commands/${file}`)) as Command;
		client.commands.set(command.data.name, command);
	}
}
