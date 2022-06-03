import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v10';
import {readdirSync} from 'node:fs';

const commands = [];
const commandFiles = readdirSync('./commands').filter((file) => {
	return file.endsWith('.js');
});

// Place your client and guild ids here
const clientId = '963392378411036703';
const guildIds = [
	'121501228508119040',
	'959576752248717362',
];

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

if (!process.env.DISCORD_TOKEN) {
	throw new Error('Missing Discord token!');
}

const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		for (const guildId of guildIds) {
			await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{body: commands}
			);
		}

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();
