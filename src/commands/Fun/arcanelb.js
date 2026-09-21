import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { userScores } from './cyberhunt.js';

// Replace with your allowed channel ID (as a string)
const ALLOWED_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';

export default {
  data: new SlashCommandBuilder()
    .setName('arcanelb')
    .setDescription("Displays the Cyber Hunt challenge leaderboard")
    .setDMPermission(false),
  category: 'Fun',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    // Channel restriction check
    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          new EmbedBuilder()
            .setColor('#f1c40f')
            .setDescription(`This command can only be used in <#${ALLOWED_CHANNEL_ID}>.`)
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if scores database exists or is empty
    if (!userScores || userScores.size === 0) {
      throw new TitanBotError(
        'No Cyber Hunt data found',
        ErrorTypes.DATABASE,
        'No Cyber Hunt scores recorded yet. Start a hunt using /cyberhunt!'
      );
    }

    // Sort users by score in descending order and slice top 10
    const sortedScores = Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Cryptex Cyber Hunt Leaderboard')
      .setColor('#2ecc71')
      .setDescription("Top 10 Cyber Hunt participants:")
      .setTimestamp();

    const leaderboardText = await Promise.all(
      sortedScores.map(async ([userId, score], index) => {
        try {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          const userMention = member?.user.toString() || `<@${userId}>`;

          let rankPrefix = `${index + 1}.`;
          if (index === 0) rankPrefix = '🥇';
          else if (index === 1) rankPrefix = '🥈';
          else if (index === 2) rankPrefix = '🥉';
          else rankPrefix = `**${index + 1}.**`;

          return `\({rankPrefix}\){userMention} — **${score} pts**`;
        } catch {
          return `**\({index + 1}.** Error loading user\){userId} — **${score} pts**`;
        }
      })
    );

    embed.addFields({
      name: 'Rankings',
      value: leaderboardText.join('\n')
    });

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Arcane leaderboard displayed for guild ${interaction.guildId}`);
  }
};
