import {Interaction, SlashCommandBuilder} from 'discord.js';

export interface Action {
	name: string,
	data?: SlashCommandBuilder,
	onCommand?: (interaction: Interaction) => Promise<void>,
	onButton?: (interaction: Interaction, customData: Record<string, unknown>) => Promise<void>,
}
