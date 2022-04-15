import {bold, channelMention, italic, SlashCommandBuilder, userMention} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {MessageEmbed} from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('end')
	.setDescription('Ends a meeting.')
	.addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Specify the voice channel')
			.addChannelType(ChannelType.GuildVoice);
	});

export async function endMeeting(interaction, channel) {
	const meetingStore = (interaction ?? channel).client.singletons.meetingStore;
	
	try {
		const meeting = meetingStore.getMeeting(channel);
		const topic = meeting.getTopic();
		meetingStore.stopMeeting(channel);
		
		// const content = `Ended the meeting ${topic ? `for ${inlineCode(topic)} ` : ''}in ${channelMention(channelID)}! It ran for ${bold(meeting.getDuration())}.`;
		const embed = new MessageEmbed()
			.setTitle('Meeting Summary')
			.setColor('#6c31ff')
			.addFields(
				{
					name: 'Participants',
					value: meeting.getMembers().map((member) => {
						return userMention(member.id);
					}).join(' ') || italic('No participants'),
					inline: false,
				},
				{
					name: 'Channel',
					value: channelMention(channel.id),
					inline: true,
				},
				{
					name: 'Duration',
					value: `Ran for ${bold(meeting.getDuration())}`,
					inline: true,
				}
			).setFooter({text: `Started by ${meeting.getOwner().displayName}`, iconURL: meeting.getOwner().displayAvatarURL()});
			
		if (topic) {
			embed.setDescription(topic);
		}
		
		const sendMessage = interaction?.reply?.bind(interaction) ?? meeting.getTextChannel().send.bind(meeting.getTextChannel());
		await sendMessage({embeds: [embed]});
		
	} catch (error) {
		if (error.name === 'NoMeetingExistsError') {
			await interaction.reply({content: `There is no meeting running in ${channelMention(channel.id)}!`, ephemeral: true});
		} else {
			console.error(error);
			await interaction.reply({content: 'An error has occurred!', ephemeral: true});
		}
	}
}

export async function execute(interaction) {
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await endMeeting(null, voiceChannel);
}

export async function executeButton(interaction, customData) {
	const channel = await interaction.guild.channels.fetch(customData);
	await endMeeting(interaction, channel);
}
