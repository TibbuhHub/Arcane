const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// List of allowed channel IDs where the leaderboard can be checked
const ALLOWED_CHANNEL_IDS = [
    '123456789012345678' // Replace with your leaderboard Channel ID
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("arcanelb")
        .setDescription("Displays the Cyber Hunt leaderboard rankings!"),

    category: 'Fun',

    async execute(interaction, config, client) {
        // Channel Restriction Check
        if (ALLOWED_CHANNEL_IDS.length > 0 && !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)) {
            const allowedChannelsList = ALLOWED_CHANNEL_IDS.map(id => `<#${id}>`).join(', ');
            return await interaction.reply({
                content: `❌ This command can only be used in assigned channels: ${allowedChannelsList}`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Safely pull scores from client memory or custom helper
        const userScores = client.userScores || global.userScores;

        // Check if there are any scores recorded yet
        if (!userScores || userScores.size === 0) {
            return await interaction.editReply({
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

        await interaction.editReply({
            embeds: [leaderboardEmbed]
        });
    },
};
