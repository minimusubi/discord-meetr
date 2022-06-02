import {bold, channelMention, hyperlink, italic, SlashCommandBuilder, userMention} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {Attachment, EmbedBuilder} from 'discord.js';
import {inferTime} from '../util/time.js';

export const data = new SlashCommandBuilder()
	.setName('end')
	.setDescription('Ends a meeting.')
	.addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Specify the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	}).addStringOption((option) => {
		return option.setName('time')
			.setDescription('Override the end time');
	});

export async function endMeeting(interaction, channel) {
	const meetingStore = (interaction ?? channel).client.singletons.meetingStore;
	const endTime = interaction?.options?.getString('time') ?? null;
	
	try {
		const meeting = meetingStore.getMeeting(channel);
		const topic = meeting.getTopic();
		meetingStore.stopMeeting(channel);
		
		if (endTime) {
			const parts = inferTime(endTime);
			
			if (parts) {
				meeting.setEndTime(parts);
			}
		}
		
		const calendarAttachment = new Attachment(meeting.getCalendarEvent(), 'event.ics');
		const embed = new EmbedBuilder()
			.setTitle('Meeting Summary')
			.setColor('#6c31ff')
			.addFields([
				{
					name: 'Participants',
					value: meeting.getMembers().map(([member, duration]) => {
						return `${userMention(member.id)} ${duration}`;
					}).join('\n') || italic('No participants'),
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
				},
				{
					name: 'Add to Outlook on the Web',
					value: bold(hyperlink('Click to add this meeting to your calendar', meeting.getCalendarLink())),
					inline: false,
				},
			]).setFooter({text: `Started by ${meeting.getOwner().displayName}`, iconURL: meeting.getOwner().displayAvatarURL()});
			
		if (topic) {
			embed.setDescription(topic);
		}
		
		const sendMessage = interaction?.reply?.bind(interaction) ?? meeting.getTextChannel().send.bind(meeting.getTextChannel());
		await sendMessage({embeds: [embed], files: [calendarAttachment]});
		
	} catch (error) {
		if (error.name === 'NoMeetingExistsError') {
			await interaction.reply({content: `There is no meeting running in ${channelMention(channel.id)}!`, ephemeral: true});
		} else {
			console.error(error);
			await interaction.reply({content: 'An error has occurred!', ephemeral: true});
		}
	}
}

export async function onCommand(interaction) {
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await endMeeting(interaction, voiceChannel);
}

export async function onButton(interaction, customData) {
	const channel = await interaction.guild.channels.fetch(customData);
	await endMeeting(interaction, channel);
}
