import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags 
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

// Global score database
export const userScores = new Map();

// Track active games per user: Map
const activeGames = new Map();

// List of allowed channel IDs where this command can be executed
const ALLOWED_CHANNEL_IDS = [
    '1551655109220634694',
    '1551657573344878622'
];

// Cyber Hunt 8-Stage Question Bank (3 Easy, 3 Medium, 2 Hard)
const questions = [
    // --- EASY (3 Questions - 100 pts each) ---
    {
        id: 1,
        difficulty: "Easy",
        points: 100,
        question: "Gur gehgu vf... V nz Veba Zna",
        answer: "ROBERT DOWNEY JR",
        hints: [
            "Hint 1: Actor",
            "Hint 2: Dude srsly, Iron man Actor?"
        ]
    },
    {
        id: 2,
        difficulty: "Easy",
        points: 100,
        question: "42108 456 34154402197 17995730 1517381 48401546 917992",
        answer: "STEVE WOZNIAK",
        hints: [
            "Hint 1: Base 36",
            "Hint 2: Who co-founded apple with Steve Jobs"
        ]
    },
    {
        id: 3,
        difficulty: "Easy",
        points: 100,
        question: "01010100 01101000 01101111 01110010 00100111 01110011 00100000 01000011 01101111 01100100 01100101 00100000 01001110 01100001 01101101 01100101",
        answer: "POINT BREAK",
        hints: [
            "Hint 1: Binary Conversion",
            "Hint 2: Thor Ragnarok"
        ]
    },
    // --- MEDIUM (3 Questions - 250 pts each) ---
    {
        id: 4,
        difficulty: "Medium",
        points: 250,
        question: "FuFcoZPMi",
        answer: "JINX",
        hints: [
            "Hint 1: BinPaste Backlink",
            "Hint 2: Name of this bot."
        ]
    },
    {
        id: 5,
        difficulty: "Medium",
        points: 250,
        question: "MS1CaXlzOFNOaVFhaEdnbVJjZFp6bUV0SWxpalA4NXZs",
        answer: "LINKIN PARK",
        hints: [
            "Hint 1: Base-64 then Backlink",
            "Hint 2: And now you've become a polar bear (band name)"
        ]
    },
    {
        id: 6,
        difficulty: "Medium",
        points: 250,
        question: "cG93ZGVyZWQgcm9vdCBvZiBhc3Bob2RlbCB0byBhbiBpbmZ1c2lvbiBvZiB3b3Jtd29vZA==",
        answer: "encryption",
        hints: [
            "Hint 1: First Potion's class",
            "Hint 2: What is this the recipe for?"
        ]
    },
    // --- HARD (2 Questions - 500 pts each) ---
    {
        id: 7,
        difficulty: "Hard",
        points: 500,
        question: "35oXIDqB7nY",
        answer: "COCA COLA",
        hints: [
            "Hint 1: Youtube Backlink",
            "Hint 2: Youtube Vid Description"
        ]
    },
    {
        id: 8,
        difficulty: "Hard",
        points: 500,
        question: "0100010101100100011001010110100001101111010100110110010001111000011011110100010001110111011101010110100001100111011011000110100001110110",
        answer: "MY PRECIOUS",
        hints: [
            "Hint 1: ROT 3, Library of Babel Website",
            "Hint 2: 333, BinPaste"
        ]
    }
];

// Helper to format milliseconds into readable time (e.g. 14m 23s)
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return hours + 'h ' + minutes + 'm ' + seconds + 's';
    } else if (minutes > 0) {
        return minutes + 'm ' + seconds + 's';
    }
    return seconds + 's';
}

export default {
    data: new SlashCommandBuilder()
        .setName('cyberhunt')
        .setDescription('Cyber Hunt challenge commands')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start an 8-stage Cyber Hunt challenge (2-hour limit)!'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('arcanelb')
                .setDescription('Displays the Cyber Hunt challenge leaderboard')),

    category: 'Fun',

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        // 1. Channel Restriction Check for both subcommands
        if (ALLOWED_CHANNEL_IDS.length > 0 && !ALLOWED_CHANNEL_IDS.includes(interaction.channelId)) {
            const allowedChannelsList = ALLOWED_CHANNEL_IDS.map(function(id) { return '<#' + id + '>'; }).join(', ');
            return await interaction.reply({
                content: '❌ This command can only be used in assigned channels: ' + allowedChannelsList,
                flags: MessageFlags.Ephemeral
            });
        }

        await InteractionHelper.safeDefer(interaction);

        // --- SUBCOMMAND: LEADERBOARD (/cyberhunt arcanelb) ---
        if (subcommand === 'arcanelb') {
            if (!userScores || userScores.size === 0) {
                throw new TitanBotError(
                    'No Cyber Hunt data found',
                    ErrorTypes.DATABASE,
                    'No Cyber Hunt scores recorded yet. Start a hunt using /cyberhunt start!'
                );
            }

            const sortedScores = Array.from(userScores.entries())
                .sort(function(a, b) { return b[1] - a[1]; })
                .slice(0, 10);

            const embed = new EmbedBuilder()
                .setTitle('Cyber Hunt Standings')
                .setColor('#3498db')
                .setDescription("Here are the active contenders:")
                .setTimestamp();

            const leaderboardText = sortedScores.map(function(entry, index) {
                const userId = entry[0];
                const score = entry[1];
                const position = index + 1;
                
                // Strictly use numerical rank badges for all positions
                const rankBadge = '#' + position;

                return rankBadge + ' — ' + String.fromCharCode(60) + '@' + userId + String.fromCharCode(62) + ' ➔ **' + score + ' Points**';
            });

            embed.addFields({
                name: 'Leaderboard Stats',
                value: leaderboardText.join('\n')
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            return;
        }

        // --- SUBCOMMAND: START (/cyberhunt start) ---
        const userId = interaction.user.id;

        if (activeGames.get(userId)) {
            return await InteractionHelper.safeEditReply(interaction, {
                content: '⚠️ You already have an active Cyber Hunt in progress! Please complete your current hunt before starting a new one.',
                flags: MessageFlags.Ephemeral
            });
        }

        activeGames.set(userId, true);

        if (!userScores.has(userId)) {
            userScores.set(userId, 0);
        }

        let stageIndex = 0;
        let sessionScore = 0;
        let lastQuestionMessage = null;

        const OVERALL_TIME_LIMIT_MS = 2 * 60 * 60 * 1000; 
        const startTime = Date.now();

        const runStage = async function() {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = OVERALL_TIME_LIMIT_MS - elapsedTime;

            if (stageIndex >= questions.length) {
                activeGames.delete(userId);

                const totalTimeMs = Date.now() - startTime;
                const formattedTime = formatDuration(totalTimeMs);

                const finalEmbed = new EmbedBuilder()
                    .setTitle('🏆 Cyber Hunt Completed!')
                    .setDescription('Congratulations! You completed all **' + questions.length + ' stages** of the Cyber Hunt!')
                    .setColor('#57F287')
                    .addFields(
                        { name: 'Time Taken', value: '⏱️ **' + formattedTime + '**', inline: true },
                        { name: 'Session Score', value: '**+' + sessionScore + ' pts**', inline: true },
                        { name: 'Total Score', value: '🏆 **' + userScores.get(userId) + ' pts**', inline: true }
                    );

                if (lastQuestionMessage) {
                    try { await lastQuestionMessage.delete(); } catch (e) {}
                }

                return await interaction.channel.send({
                    embeds: [finalEmbed],
                    components: []
                });
            }

            if (remainingTime <= 0) {
                activeGames.delete(userId);

                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏳ 2-Hour Cyber Hunt Limit Expired!')
                    .setDescription('Time has run out for this hunt! You reached **Stage ' + (stageIndex + 1) + '/' + questions.length + '**.')
                    .setColor('#ED4245')
                    .addFields(
                        { name: 'Session Score', value: '**+' + sessionScore + ' pts**', inline: true },
                        { name: 'Total Score', value: '🏆 **' + userScores.get(userId) + ' pts**', inline: true }
                    );

                if (lastQuestionMessage) {
                    try { await lastQuestionMessage.delete(); } catch (e) {}
                }

                return await interaction.channel.send({
                    embeds: [timeoutEmbed],
                    components: []
                });
            }

            const challenge = questions[stageIndex];
            let hintsRevealed = 0;
            let hintPenalty = 0;

            const buildEmbed = function() {
                const currentPoints = challenge.points - hintPenalty;
                const embedTitle = '🎯 Stage ' + (stageIndex + 1) + '/' + questions.length + ': ' + challenge.difficulty + ' Challenge';

                const embed = new EmbedBuilder()
                    .setTitle(embedTitle)
                    .setColor(challenge.difficulty === 'Easy' ? '#57F287' : challenge.difficulty === 'Medium' ? '#FEE75C' : '#ED4245')
                    .addFields(
                        { name: 'Difficulty', value: challenge.difficulty, inline: true },
                        { name: 'Base Points', value: challenge.points + ' pts', inline: true },
                        { name: 'Reward if Solved Now', value: '**' + currentPoints + ' pts**', inline: true },
                        { name: 'Riddle / Task', value: '> ' + challenge.question }
                    )
                    .setFooter({ text: 'Type your answer in this channel! Overall time limit: 2 hours.' });

                if (hintsRevealed > 0) {
                    const revealedList = challenge.hints.slice(0, hintsRevealed).map(function(h) { return '💡 ' + h; }).join('\n');
                    embed.addFields({ name: 'Revealed Hints (-' + hintPenalty + ' pts)', value: revealedList });
                }

                return embed;
            };

            const buildRow = function() {
                const row = new ActionRowBuilder();
                const buttonLabel = hintsRevealed >= 2 ? 'No More Hints' : 'Get Hint (-50 pts) [' + hintsRevealed + '/2]';
                
                const button = new ButtonBuilder()
                    .setCustomId('get_hint_' + interaction.id + '_' + stageIndex)
                    .setLabel(buttonLabel)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(hintsRevealed >= 2);
                    
                row.addComponents(button);
                return row;
            };

            if (lastQuestionMessage) {
                try {
                    await lastQuestionMessage.delete();
                } catch (e) {}
            }

            const message = await interaction.channel.send({
                embeds: [buildEmbed()],
                components: [buildRow()]
            });

            lastQuestionMessage = message;

            const collectorTimeout = Math.min(remainingTime, 7200000);
            const buttonCollector = message.createMessageComponentCollector({ time: collectorTimeout });

            buttonCollector.on('collect', async function(i) {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "This isn't your Cyber Hunt challenge!", flags: MessageFlags.Ephemeral });
                }

                if (hintsRevealed < 2) {
                    hintsRevealed++;
                    hintPenalty += 50;
                    await i.update({
                        embeds: [buildEmbed()],
                        components: [buildRow()]
                    });
                }
            });

            const filter = function(m) { return m.author.id === interaction.user.id && !m.author.bot; };
            const messageCollector = interaction.channel.createMessageCollector({ filter: filter, time: collectorTimeout });

            messageCollector.on('collect', async function(msg) {
                function transparentClean(t) {
                    return t.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
                }
                
                const userAnswer = transparentClean(msg.content);
                const expectedAnswer = transparentClean(challenge.answer);

                if (userAnswer === expectedAnswer) {
                    const earnedPoints = challenge.points - hintPenalty;
                    sessionScore += earnedPoints;

                    // Immediately update global score map so /arcanelb shows it live
                    const currentTotal = userScores.get(userId) || 0;
                    userScores.set(userId, currentTotal + earnedPoints);

                    buttonCollector.stop();
                    messageCollector.stop();

                    const footerText = (stageIndex + 1 < questions.length) 
                        ? 'Moving to Stage ' + (stageIndex + 2) + '...' 
                        : 'Finishing Hunt...';

                    await msg.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('🚩 Stage Clear!')
                                .setDescription('Correct! You answered **' + challenge.answer + '** and earned **' + earnedPoints + ' pts**!')
                                .setColor('#57F287')
                                .setFooter({ text: footerText })
                        ]
                    });

                    stageIndex++;
                    runStage();
                } else {
                    try {
                        await msg.react('❌');
                    } catch (e) {}
                }
            });

            messageCollector.on('end', function(collected, reason) {
                if (reason === 'time' && (Date.now() - startTime >= OVERALL_TIME_LIMIT_MS)) {
                    activeGames.delete(userId);
                    interaction.channel.send('⏳ The 2-hour overall time limit for ' + String.fromCharCode(60) + '@' + userId + String.fromCharCode(62) + '\'s Cyber Hunt has expired!');
                }
            });
        };

        runStage();
    },
};
