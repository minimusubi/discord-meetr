import {ButtonInteraction} from 'discord.js';

export const name = 'dismiss';

export async function onButton(interaction: ButtonInteraction<'cached'>, id: string) {
	await interaction.message.delete();
}
