import { 
    SlashCommandBuilder, 
    EmbedBuilder 
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

// Import the userScores Map from your cyberhunt command file
import { userScores } from './cyberhunt.js';

// List of allowed channel IDs where the leaderboard can be checked
const ALLOWED_CHANNEL_IDS = [
    '1551656885290270720' // Replace with your leaderboard Channel ID
];

export default {
    data: new SlashCommandBuilder()
        .setName("arcanelb")
        .setDescription("Displays the Cyber Hunt leaderboard rankings!"),

    category: 'Fun',

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        // Channel Restriction Check
        if (ALLOWED_CHANNEL_IDS.length > 0 && !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)) {
            const allowedChannelsList = ALLOWED_CHANNEL_IDS.map(id => `<#${id}>`).join(', ');
            return await InteractionHelper.safeEditReply(interaction, {
                content: `❌ This command can only be used in assigned channels: ${allowedChannelsList}`,
                ephemeral: true
            });
        }

        // Check if there are any scores recorded yet
        if (!userScores || userScores.size === 0) {
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏆 Arcane Cyber Hunt Leaderboard')
                        .setDescription('No scores have been recorded yet! Start a hunt using `/cyberhunt`.')
                        .setColor('#FEE75C')
                ]
            });
        }

        // Sort users by score in descending order (highest score first)
        const sortedScores = Array.from(userScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 players

        // Medal emojis for top 3 positions
        const medals = ['🥇', '🥈', '🥉'];

        const leaderboardText = sortedScores
            .map(([userId, score], index) => {
                const badge = medals[index] || `**#${index + 1}**`;
                return `\({badge} <@\){userId}> — **${score} pts**`;
            })
            .join('\n');

        const leaderboardEmbed = new EmbedBuilder()
            .setTitle('🏆 Arcane Cyber Hunt Leaderboard')
            .setDescription(leaderboardText)
            .setColor('#57F287')
            .setFooter({ text: `Total Participants: ${userScores.size}` })
            .setTimestamp();

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [leaderboardEmbed]
        });

        if (logger?.debug) {
            logger.debug(`Arcane leaderboard viewed by ${interaction.user.id}`);
        }
    },
};
