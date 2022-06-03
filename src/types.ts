import {Interaction, SlashCommandBuilder} from 'discord.js';

export interface Command {
	data: SlashCommandBuilder,
	onCommand?: (interaction: Interaction) => Promise<void>,
	onButton?: (interaction: Interaction, customData: Record<string, unknown>) => Promise<void>,
}
