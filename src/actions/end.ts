import {bold, channelMention, hyperlink, italic, SlashCommandBuilder, userMention} from '@discordjs/builders';
import {ChannelType} from 'discord-api-types/v10';
import {AttachmentBuilder, BaseGuildVoiceChannel, ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import Meeting from '../util/meeting/Meeting.js';
import {inferTime} from '../util/time.js';

export const name = 'end';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription('Ends a meeting.')
	.addStringOption((option) => {
		return option.setName('time')
			.setDescription('Override the end time');
	}).addChannelOption((option) => {
		return option.setName('channel')
			.setDescription('Specify the voice channel')
			.addChannelTypes(ChannelType.GuildVoice);
	});

export async function endMeeting(meeting: Meeting, interaction?: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>) {
	if (!meeting.endTime) {
		throw new Error('Meeting has not ended!');
	}
	
	const calendarAttachment = new AttachmentBuilder(await meeting.getCalendarEvent(), {name: 'event.ics'});
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
				value: bold(hyperlink('Click to add this meeting to your calendar', await meeting.getCalendarLink())),
				inline: false,
			},
		]).setFooter({text: `Started by ${meeting.getOwner().displayName}`, iconURL: meeting.getOwner().displayAvatarURL()});
		
	if (meeting.getTopic()) {
		embed.setDescription(meeting.getTopic());
	}
	
	const payload = {embeds: [embed], files: [calendarAttachment]};
	let message = null;
	if (interaction?.reply) {
		try {
			message = await interaction.reply(payload);
		} catch {}
	}
	if (!message && meeting.initiator) {
		try {
			message = await meeting.initiator.reply(payload);
		} catch {}
	}
	if (!message) {
		try {
			message = await meeting.getTextChannel().send(payload);
		} catch {}
	}
}

export async function onCommand(interaction: ChatInputCommandInteraction<'cached'>) {
	const meetingStore = interaction.client.singletons.meetingStore;
	const member = interaction.member;
	const voiceChannel = member.voice.channel ?? interaction.options.getChannel('channel') as BaseGuildVoiceChannel ?? null;
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
	const channel = await interaction.guild.channels.fetch(id) as BaseGuildVoiceChannel;
	meetingStore.stopMeeting(channel, {interaction});
}
