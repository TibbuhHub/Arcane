import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

// Global score database
const userScores = new Map();

// Cyber Hunt 8-Stage Question Bank (3 Easy, 3 Medium, 2 Hard)
const questions = [
    // --- EASY (3 Questions - 100 pts each) ---
    {
        id: 1,
        difficulty: "Easy",
        points: 100,
        question: "I disguise myself as a legitimate program to trick you into running me. What type of malware am I?",
        answer: "trojan",
        hints: [
            "Hint 1: Named after a famous wooden horse in ancient history.",
            "Hint 2: It does not self-replicate like a worm."
        ]
    },
    {
        id: 2,
        difficulty: "Easy",
        points: 100,
        question: "What term describes fraudulent communications designed to trick people into revealing sensitive information like passwords or credit cards?",
        answer: "phishing",
        hints: [
            "Hint 1: Sounds like a popular aquatic sport.",
            "Hint 2: Often involves fake emails or malicious links."
        ]
    },
    {
        id: 3,
        difficulty: "Easy",
        points: 100,
        question: "What type of malicious software encrypts a victim's files and demands payment to restore access?",
        answer: "ransomware",
        hints: [
            "Hint 1: The first half of the word refers to money demanded for a captive.",
            "Hint 2: Examples include WannaCry and LockBit."
        ]
    },
    // --- MEDIUM (3 Questions - 250 pts each) ---
    {
        id: 4,
        difficulty: "Medium",
        points: 250,
        question: "What term describes a cyber attack where attackers intercept and relay communication between two parties secretly?",
        answer: "man in the middle",
        hints: [
            "Hint 1: Commonly abbreviated as MitM.",
            "Hint 2: Think of someone eavesdropping right between person A and person B."
        ]
    },
    {
        id: 5,
        difficulty: "Medium",
        points: 250,
        question: "What security concept requires users to provide two or more verification factors to gain access to a resource?",
        answer: "multi factor authentication",
        hints: [
            "Hint 1: Commonly abbreviated as MFA or 2FA.",
            "Hint 2: Often involves entering a code sent to your phone alongside your password."
        ]
    },
    {
        id: 6,
        difficulty: "Medium",
        points: 250,
        question: "What is the process of converting readable plain text into unreadable ciphertext called?",
        answer: "encryption",
        hints: [
            "Hint 1: The reverse process is called decryption.",
            "Hint 2: Uses mathematical algorithms and keys to scramble data."
        ]
    },
    // --- HARD (2 Questions - 500 pts each) ---
    {
        id: 7,
        difficulty: "Hard",
        points: 500,
        question: "Which cryptographic attack attempts to find two different inputs that produce the exact same hash output?",
        answer: "collision attack",
        hints: [
            "Hint 1: Think about what happens when two objects crash into each other.",
            "Hint 2: It exploits vulnerabilities in hash functions like MD5 or SHA-1."
        ]
    },
    {
        id: 8,
        difficulty: "Hard",
        points: 500,
        question: "What security mechanism restricts execution privileges by isolating running applications in a tightly controlled environment?",
        answer: "sandboxing",
        hints: [
            "Hint 1: Named after a safe place where children play with sand.",
            "Hint 2: Web browsers use this to prevent web pages from affecting the host OS."
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
        .setName("cyberhunt")
        .setDescription("Start an 8-stage Cyber Hunt challenge (2-hour limit)!"),

    category: 'Fun',

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const userId = interaction.user.id;
        
        if (!userScores.has(userId)) {
            userScores.set(userId, 0);
        }

        let stageIndex = 0;
        let sessionScore = 0;

        // 2-Hour Overall Hunt Limit (7,200,000 ms)
        const OVERALL_TIME_LIMIT_MS = 2 * 60 * 60 * 1000; 
        const startTime = Date.now();

        const runStage = async () => {
            // Check overall time remaining
            const elapsedTime = Date.now() - startTime;
            const remainingTime = OVERALL_TIME_LIMIT_MS - elapsedTime;

            // Handle completion of all 8 stages
            if (stageIndex >= questions.length) {
                const totalTimeMs = Date.now() - startTime;
                const formattedTime = formatDuration(totalTimeMs);

                const newTotal = (userScores.get(userId) || 0) + sessionScore;
                userScores.set(userId, newTotal);

                const finalEmbed = new EmbedBuilder()
                    .setTitle('🏆 Cyber Hunt Completed!')
                    .setDescription('Congratulations! You completed all **' + questions.length + ' stages** of the Cyber Hunt!')
                    .setColor('#57F287')
                    .addFields(
                        { name: 'Time Taken', value: '⏱️ **' + formattedTime + '**', inline: true },
                        { name: 'Session Score', value: '**+' + sessionScore + ' pts**', inline: true },
                        { name: 'Total Score', value: '🏆 **' + newTotal + ' pts**', inline: true }
                    );

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [finalEmbed],
                    components: []
                });
            }

            // Handle 2-Hour timeout expire before finishing all stages
            if (remainingTime <= 0) {
                const newTotal = (userScores.get(userId) || 0) + sessionScore;
                userScores.set(userId, newTotal);

                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏳ 2-Hour Cyber Hunt Limit Expired!')
                    .setDescription('Time has run out for this hunt! You reached **Stage ' + (stageIndex + 1) + '/' + questions.length + '**.')
                    .setColor('#ED4245')
                    .addFields(
                        { name: 'Session Score', value: '**+' + sessionScore + ' pts**', inline: true },
                        { name: 'Total Score', value: '🏆 **' + newTotal + ' pts**', inline: true }
                    );

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [timeoutEmbed],
                    components: []
                });
            }

            const challenge = questions[stageIndex];
            let hintsRevealed = 0;
            let hintPenalty = 0;

            const buildEmbed = () => {
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

            const buildRow = () => {
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

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildEmbed()],
                components: [buildRow()]
            });

            const message = await interaction.fetchReply();

            // Collectors set to remaining overall time (up to 2 hrs max)
            const collectorTimeout = Math.min(remainingTime, 7200000);

            const buttonCollector = message.createMessageComponentCollector({ time: collectorTimeout });

            buttonCollector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "This isn't your Cyber Hunt challenge!", ephemeral: true });
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

            const filter = m => m.author.id === interaction.user.id && !m.author.bot;
            const messageCollector = interaction.channel.createMessageCollector({ filter, time: collectorTimeout });

            messageCollector.on('collect', async msg => {
                const cleanAnswer = function(text) {
                    return text.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
                };
                
                const userAnswer = cleanAnswer(msg.content);
                const expectedAnswer = cleanAnswer(challenge.answer);

                if (userAnswer === expectedAnswer) {
                    const earnedPoints = challenge.points - hintPenalty;
                    sessionScore += earnedPoints;

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
                    } catch (e) {
                        // Ignore permission issues for reactions
                    }
                }
            });

            messageCollector.on('end', (collected, reason) => {
                if (reason === 'time' && (Date.now() - startTime >= OVERALL_TIME_LIMIT_MS)) {
                    interaction.channel.send('⏳ The 2-hour overall time limit for <@' + userId + '>\'s Cyber Hunt has expired!');
                }
            });
        };

        runStage();

        if (logger?.debug) {
            logger.debug('Cyber Hunt command started by user ' + interaction.user.id + ' in guild ' + interaction.guildId);
        }
    },
};
