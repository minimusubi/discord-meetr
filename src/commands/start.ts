import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType, ButtonStyle} from 'discord-api-types/v10';
import {ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, MessageActionRowComponentBuilder, VoiceBasedChannel} from 'discord.js';
import {inferTime} from '../util/time.js';

export const data = new SlashCommandBuilder()
	.setName('start')
	.setDescription('Starts a new meeting.')
	.addStringOption((option) => {
		return option.setName('topic')
			.setDescription('Set the meeing topic');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Set the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	}).addStringOption((option) => {
		return option.setName('time')
			.setDescription('Override the start time');
	});
	
export async function onCommand(interaction: ChatInputCommandInteraction<'cached'>) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') as VoiceBasedChannel ?? null;
	const topic = interaction.options.getString('topic');
	const startTime = interaction.options.getString('time');
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	try {
		if (!interaction.channel) {
			throw new Error('Interaction channel is not cached!');
		}
		
		const meeting = meetingStore.startMeeting(voiceChannel, interaction.channel, interaction.member);
		meeting.setTopic(topic);
		
		if (startTime) {
			const parts = inferTime(startTime);
			
			if (parts) {
				meeting.setStartTime(parts);
			}
		}
		
		const content = `Started a meeting ${topic ? `for ${inlineCode(topic)} ` : ''}in ${channelMention(voiceChannel.id)}!`;
		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
			.addComponents([
				new ButtonBuilder()
					.setCustomId(JSON.stringify({data: voiceChannel.id, command: 'end'}))
					.setEmoji('🛑')
					.setLabel('End')
					.setStyle(ButtonStyle.Primary),
			]);
		await interaction.reply({content, components: [row]});
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'MeetingExistsError') {
				await interaction.reply({content: `A meeting is already running in ${channelMention(voiceChannel.id)}!`, ephemeral: true});
				return;
			}
		}
		
		await interaction.reply({content: 'An error has occurred!', ephemeral: true});
		console.error(error);
	}
}
