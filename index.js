import {Client, Intents} from 'discord.js';
import loadCommands from './load/loadCommands.js';
import loadSingletons from './load/loadSingletons.js';

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]});

await loadCommands(client);
await loadSingletons(client);

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);
		
		if (!command) {
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
		}
	} else if (interaction.isButton()) {
		const metadata = JSON.parse(interaction.customId);
		const command = client.commands.get(metadata.command);
		
		if (!command?.executeButton) {
			return;
		}

		try {
			await command.executeButton(interaction, metadata.data);
		} catch (error) {
			console.error(error);
			await interaction.reply({content: 'There was an error while executing this button!', ephemeral: true});
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
