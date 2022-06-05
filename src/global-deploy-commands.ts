import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v10';
import {readdirSync} from 'node:fs';

if (!process.env.DISCORD_TOKEN) {
	throw new Error('Missing Discord token!');
}
if (!process.env.DISCORD_CLIENT_ID) {
	throw new Error('Missing Discord client ID!');
}

const commands = [];
const commandFiles = readdirSync('./actions').filter((file) => {
	return file.endsWith('.js');
});

for (const file of commandFiles) {
	const command = await import(`./actions/${file}`);
	
	if (command.data && !command.dev) {
		commands.push(command.data.toJSON());
		console.log(`Will deploy command "${command.data.name}"`);
	}
}

const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);

try {
	console.log('Started deploying global application (/) commands.');

	await rest.put(
		Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
		{body: commands}
	);

	console.log('Successfully deployed global application (/) commands.');
} catch (error) {
	console.error(error);
}
