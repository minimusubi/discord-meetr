import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {BaseGuildVoiceChannel, ChatInputCommandInteraction} from 'discord.js';

export const dev = true;
export const name = 'schedule';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription('Schedule a meeting.')
	.addStringOption((option) => {
		return option.setName('time')
			.setDescription('The meeting time')
			.setRequired(true);
	}).addStringOption((option) => {
		return option.setName('topic')
			.setDescription('Set the meeing topic');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Set the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	}).addStringOption((option) => {
		return option.setName('repeat')
			.setDescription('Make the meeting recurring on weekdays. Specify any combination of UMTWRFS.');
	});

async function setTopic(interaction: ChatInputCommandInteraction<'cached'>, channel: BaseGuildVoiceChannel) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const topic = interaction.options.getString('topic');
		
	try {
		meetingStore?.getMeeting(channel)?.setTopic(topic);
		
		if (topic) {
			await interaction.reply(`Set the topic of ${channelMention(channel.id)} to ${inlineCode(topic)}!`);
		} else {
			await interaction.reply(`Removed the topic for ${channelMention(channel.id)}!`);
		}
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'NoMeetingExistsError') {
				await interaction.reply({content: `There is no meeting running in ${channelMention(channel.id)}!`, ephemeral: true});
				return;
			}
		}
		
		await interaction.reply({content: 'An error has occurred!', ephemeral: true});
		console.error(error);
	}
}

export async function onCommand(interaction: ChatInputCommandInteraction<'cached'>) {
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') as BaseGuildVoiceChannel ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are neither in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await setTopic(interaction, voiceChannel);
}
