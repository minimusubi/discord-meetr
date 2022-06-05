import {channelMention, inlineCode, SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType, ButtonStyle} from 'discord-api-types/v10';
import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ChatInputCommandInteraction, Message, MessageActionRowComponentBuilder, VoiceBasedChannel} from 'discord.js';
import {inferTime} from '../util/time.js';

export const name = 'start';

export const data = new SlashCommandBuilder()
	.setName(name)
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
	
export async function startMeeting(interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>, channel: VoiceBasedChannel) {
	const meetingStore = interaction.client.singletons.meetingStore;
	// @ts-ignore Below expression behaves correctly
	const topic = interaction.options?.getString('topic');
	// @ts-ignore Below expression behaves correctly
	const startTime = interaction.options?.getString('time');
	
	if (channel === null) {
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	try {
		if (!interaction.channel) {
			throw new Error('Interaction channel is not cached!');
		}
		
		if (interaction.isButton()) {
			interaction.deferUpdate();
		}
		
		const meeting = meetingStore.startMeeting(channel, interaction.channel, interaction.member);
		meeting.setTopic(topic);
		
		if (startTime) {
			const parts = inferTime(startTime);
			
			if (parts) {
				meeting.setStartTime(parts);
			}
		}
		
		const content = `Started a meeting ${topic ? `for ${inlineCode(topic)} ` : ''}in ${channelMention(channel.id)}!`;
		const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
			.addComponents([
				new ButtonBuilder()
					.setCustomId(JSON.stringify({data: channel.id, command: 'end'}))
					.setEmoji('🛑')
					.setLabel('End')
					.setStyle(ButtonStyle.Primary),
			]);
		const sendMessage = interaction.isButton() ? interaction.message.edit.bind(interaction.message) : interaction.reply.bind(interaction);
		const response = await sendMessage({content, components: [row]});
		if (response instanceof Message) {
			console.log('set initiator');
			meeting.setInitiator(response);
		}
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'MeetingExistsError') {
				await interaction.reply({content: `A meeting is already running in ${channelMention(channel.id)}!`, ephemeral: true});
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
		await interaction.reply({content: 'Error: You are not in a voice channel, nor did you specify one.', ephemeral: true});
		return;
	}
	
	await startMeeting(interaction, voiceChannel);
}

export async function onButton(interaction: ButtonInteraction<'cached'>, id: string) {
	const channel = await interaction.guild.channels.fetch(id) as VoiceBasedChannel;
	await startMeeting(interaction, channel);
}
