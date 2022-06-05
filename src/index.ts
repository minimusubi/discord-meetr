import {Client} from 'discord.js';
import {GatewayIntentBits} from 'discord-api-types/v10';
import loadCommands from './load/loadActions.js';
import loadSingletons from './load/loadSingletons.js';
import loadListener from './load/loadListener.js';

const client = new Client({intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.MessageContent,
]});

await loadCommands(client);
await loadSingletons(client);
await loadListener(client);

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
	// All guilds should be cached, so long as the bot has guilds intent 
	// Returns false if the bot wasn't invited with the bot scope
	if (!interaction.inCachedGuild()) {
		return;
	}
	
	if (interaction.isChatInputCommand()) {
		const command = client.botActions.get(interaction.commandName);
		
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
		const command = client.botActions.get(metadata.command);
		
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
