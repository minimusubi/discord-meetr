import {bold, channelMention, hyperlink, italic, SlashCommandBuilder, userMention} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {Attachment, ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, VoiceBasedChannel} from 'discord.js';
import Meeting from '../util/meeting/Meeting.js';
import {inferTime} from '../util/time.js';

export const name = 'end';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription('Ends a meeting.')
	.addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Specify the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	}).addStringOption((option) => {
		return option.setName('time')
			.setDescription('Override the end time');
	});

export async function endMeeting(meeting: Meeting, interaction?: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>) {
	if (!meeting.endTime) {
		throw new Error('Meeting has not ended!');
	}
	
	const calendarAttachment = new Attachment(meeting.getCalendarEvent()!, 'event.ics');
	const embed = new EmbedBuilder()
		.setTitle('Meeting Summary')
		.setColor('#6c31ff')
		.addFields([
			{
				name: 'Participants',
				value: meeting.getMembers().map(({member: memberID, duration}) => {
					return `${userMention(memberID)} ${duration}`;
				}).join('\n') || italic('No participants'),
				inline: false,
			},
			{
				name: 'Channel',
				value: channelMention(meeting.voiceChannel.id),
				inline: true,
			},
			{
				name: 'Duration',
				value: `Ran for ${bold(meeting.getDuration()!)}`,
				inline: true,
			},
			{
				name: 'Add to Outlook on the Web',
				value: bold(hyperlink('Click to add this meeting to your calendar', meeting.getCalendarLink()!)),
				inline: false,
			},
		]).setFooter({text: `Started by ${meeting.getOwner().displayName}`, iconURL: meeting.getOwner().displayAvatarURL()});
		
	if (meeting.getTopic()) {
		embed.setDescription(meeting.getTopic());
	}
		
	const sendMessage = interaction?.reply?.bind(interaction) ?? meeting.initiator?.reply.bind(meeting.initiator) ?? meeting.getTextChannel().send.bind(meeting.getTextChannel());
	await sendMessage({embeds: [embed], files: [calendarAttachment]});
}

export async function onCommand(interaction: ChatInputCommandInteraction<'cached'>) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') as VoiceBasedChannel ?? null;
	const endTime = interaction.options.getString('time') ?? null;
	
	if (voiceChannel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	if (endTime) {
		const parts = inferTime(endTime);
		
		if (parts) {
			meetingStore.stopMeeting(voiceChannel, {overrideEndTime: parts});
		} else {
			meetingStore.stopMeeting(voiceChannel, {interaction});
		}
	} else {
		meetingStore.stopMeeting(voiceChannel, {interaction});
	}
}

export async function onButton(interaction: ButtonInteraction<'cached'>, id: string) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const channel = await interaction.guild.channels.fetch(id) as VoiceBasedChannel;
	meetingStore.stopMeeting(channel, {interaction});
}
