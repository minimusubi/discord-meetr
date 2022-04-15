import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {MessageActionRow, MessageButton} from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('start')
	.setDescription('Starts a new meeting.')
	.addStringOption((option) => {
		return option.setName('topic')
			.setDescription('Set the meeing topic');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Set the voice channel')
			.addChannelType(ChannelType.GuildVoice);
	});
	
export async function execute(interaction) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') ?? null;
	const topic = interaction.options.getString('topic');
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	try {
		const meeting = meetingStore.startMeeting(voiceChannel, interaction.channel, interaction.member);
		meeting.setTopic(topic);
		
		const content = `Started a meeting ${topic ? `for ${inlineCode(topic)} ` : ''}in ${channelMention(voiceChannel.id)}!`;
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(JSON.stringify({data: voiceChannel.id, command: 'end'}))
					.setEmoji('🛑')
					.setLabel('End')
					.setStyle('PRIMARY')
			);
		await interaction.reply({content, components: [row]});
	} catch (error) {
		if (error.name === 'MeetingExistsError') {
			await interaction.reply({content: `A meeting is already running in ${channelMention(voiceChannel.id)}!`, ephemeral: true});
		} else {
			await interaction.reply({content: 'An error has occurred!', ephemeral: true});
			console.error(error);
		}
	}
}
