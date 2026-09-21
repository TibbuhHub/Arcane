import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
// Note: Adjust the import path below to point to your cyberhunt.js file 
// where `userScores` is exported, or store `userScores` in a shared database/file module.
import { userScores } from './cyberhunt.js'; 

export default {
    data: new SlashCommandBuilder()
        .setName("arcanelb")
        .setDescription("View the global Cyber Hunt leaderboard!"),

    category: 'Fun',

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        try {
            // Check if userScores map exists and has data
            if (!userScores || userScores.size === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle('🏆 Arcane Cyber Hunt Leaderboard')
                    .setDescription('No scores recorded yet! Be the first to play using `/cyberhunt`.')
                    .setColor('#FEE75C');

                return await InteractionHelper.safeEditReply(interaction, { embeds: [emptyEmbed] });
            }

            // Convert Map to an array and sort by score descending
            const sortedScores = Array.from(userScores.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10); // Top 10 players

            let description = '';
            
            for (let i = 0; i < sortedScores.length; i++) {
                const [userId, score] = sortedScores[i];
                let medal = '';
                
                if (i === 0) medal = '🥇 ';
                else if (i === 1) medal = '🥈 ';
                else if (i === 2) medal = '🥉 ';
                else medal = `**${i + 1}.** `;

                description += `\({medal} <@\){userId}> — **${score} pts**\n`;
            }

            const leaderboardEmbed = new EmbedBuilder()
                .setTitle('🏆 Arcane Cyber Hunt Leaderboard')
                .setDescription(description || 'No scores available.')
                .setColor('#57F287')
                .setFooter({ text: 'Play /cyberhunt to earn points and climb the ranks!' })
                .setTimestamp();

            if (logger?.debug) {
                logger.debug('Arcane leaderboard command executed by ' + interaction.user.id);
            }

            return await InteractionHelper.safeEditReply(interaction, { embeds: [leaderboardEmbed] });

        } catch (error) {
            if (logger?.error) logger.error('Error fetching /arcanelb: ' + error);
            return await InteractionHelper.safeEditReply(interaction, {
                content: '❌ An error occurred while generating the leaderboard.'
            });
        }
    },
};
