import {userMention} from '@discordjs/builders';
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, MessageActionRowComponentBuilder} from 'discord.js';

export default async function loadListener(client: Client) {
	const meetingStore = client.singletons.meetingStore;
	
	// Add channel listener
	client.on('voiceStateUpdate', async (oldState, newState) => {
		const channel = newState.channel;
		
		if (!newState.member) {
			return;
		}
		
		if (channel?.isVoice() && oldState.channelId !== channel.id) {
			if (!meetingStore.hasMeeting(channel) && meetingStore.addHint(channel)) {
				const content = `${userMention(newState.member.id)} Would you like to start a meeting here?`;
				const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
					.addComponents([
						new ButtonBuilder()
							.setCustomId(JSON.stringify({data: channel.id, command: 'start'}))
							.setEmoji('🚀')
							.setLabel('Start')
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(JSON.stringify({command: 'dismiss'}))
							.setEmoji('❌')
							.setLabel('Dismiss')
							.setStyle(ButtonStyle.Secondary),
					]);
				await channel.send({content, components: [row]});
			}
		} else if (oldState.channel?.isVoice() && oldState.channelId !== newState.channelId) {
			if (oldState.channel.members.size === 0) {
				meetingStore.removeHint(oldState.channel);
			}
		}
	});
}
