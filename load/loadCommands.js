import {readdirSync} from 'node:fs';
import {Collection} from 'discord.js';

export default async function loadCommands(client) {
	client.commands = new Collection();
	const commandFiles = readdirSync('./commands').filter((file) => {
		return file.endsWith('.js');
	});

	for (const file of commandFiles) {
		const command = await import(`../commands/${file}`);
		client.commands.set(command.data.name, command);
	}
}
