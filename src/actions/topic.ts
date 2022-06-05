import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {ChatInputCommandInteraction, VoiceBasedChannel} from 'discord.js';

export const name = 'topic';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription('Set the topic of the current meeting.')
	.addStringOption((option) => {
		return option.setName('topic')
			.setDescription('Set the meeing topic');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Set the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	});

async function setTopic(interaction: ChatInputCommandInteraction<'cached'>, channel: VoiceBasedChannel) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const topic = interaction.options.getString('topic');
		
	try {
		meetingStore.getMeeting(channel).setTopic(topic);
		
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
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') as VoiceBasedChannel ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are neither in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await setTopic(interaction, voiceChannel);
}
