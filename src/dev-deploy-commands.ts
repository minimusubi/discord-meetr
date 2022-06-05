import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v10';
import {readdirSync} from 'node:fs';

if (!process.env.DISCORD_TOKEN) {
	throw new Error('Missing Discord token!');
}
if (!process.env.DISCORD_CLIENT_ID) {
	throw new Error('Missing Discord client ID!');
}
if (!process.env.DISCORD_GUILD_IDS) {
	throw new Error('Missing Discord guild IDs!');
}

const commands = [];
const commandFiles = readdirSync('./actions').filter((file) => {
	return file.endsWith('.js');
});

// Place your client and guild ids here
const guildIds = JSON.parse(process.env.DISCORD_GUILD_IDS);

for (const file of commandFiles) {
	const command = await import(`./actions/${file}`);
	
	if (command.data) {
		commands.push(command.data.toJSON());
		console.log(`Will deploy command "${command.data.name}"`);
	}
}

const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);

try {
	console.log('Started refreshing application (/) commands.');

	for (const guildId of guildIds) {
		console.log(`Deploying to guild ${guildId}`);
		await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
			{body: commands}
		);
	}

	console.log('Successfully reloaded application (/) commands.');
} catch (error) {
	console.error(error);
}
