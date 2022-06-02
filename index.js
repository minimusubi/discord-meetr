import {Client} from 'discord.js';
import {GatewayIntentBits} from 'discord-api-types/v10';
import loadCommands from './load/loadCommands.js';
import loadSingletons from './load/loadSingletons.js';

const client = new Client({intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.MessageContent,
]});

await loadCommands(client);
await loadSingletons(client);

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);
		
		if (!command?.onCommand) {
			console.error('No command handler available to handle interation!');
			console.error(`Command: ${interaction.commandName}`);
			return;
		}

		try {
			await command.onCommand(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
		}
	} else if (interaction.isButton()) {
		const metadata = JSON.parse(interaction.customId);
		const command = client.commands.get(metadata.command);
		
		if (!command?.onButton) {
			console.error('No button handler available to handle interation!');
			console.error(`Metadata: ${JSON.stringify(metadata)}`);
			return;
		}

		try {
			await command.onButton(interaction, metadata.data);
		} catch (error) {
			console.error(error);
			await interaction.reply({content: 'There was an error while executing this button!', ephemeral: true});
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
