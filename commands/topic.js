import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';

export const data = new SlashCommandBuilder()
	.setName('topic')
	.setDescription('Set the topic of the current meeting.')
	.addStringOption((option) => {
		return option.setName('topic')
			.setDescription('Set the meeing topic');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Set the voice channel')
			.addChannelType(ChannelType.GuildVoice);
	});

async function setTopic(interaction, channel) {
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
		if (error.name === 'NoMeetingExistsError') {
			await interaction.reply({content: `There is no meeting running in ${channelMention(channel.id)}!`, ephemeral: true});
		} else {
			await interaction.reply({content: 'An error has occurred!', ephemeral: true});
			console.error(error);
		}
	}
}

export async function execute(interaction) {
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are neither in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await setTopic(interaction, voiceChannel);
}
