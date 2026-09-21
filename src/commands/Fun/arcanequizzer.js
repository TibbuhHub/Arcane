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

// Cyber Hunt 7-Stage Question Bank (3 Easy, 2 Medium, 2 Hard)
const stages = [
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
    // --- MEDIUM (2 Questions - 250 pts each) ---
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
    // --- HARD (2 Questions - 500 pts each) ---
    {
        id: 6,
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
        id: 7,
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

export default {
    data: new SlashCommandBuilder()
        .setName("cyberhunt")
        .setDescription("Start a 7-stage Cyber Hunt challenge!"),

    category: 'Fun',

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const userId = interaction.user.id;
        if (!userScores.has(userId)) {
            userScores.set(userId, 0);
        }

        let stageIndex = 0;
        let sessionScore = 0;
        const stageTimeLogs = [];

        const runStage = async () => {
            if (stageIndex >= stages.length) {
                const newTotal = (userScores.get(userId) || 0) + sessionScore;
                userScores.set(userId, newTotal);

                const totalSeconds = stageTimeLogs.reduce((a, b) => a + b.seconds, 0);
                const avgSeconds = (totalSeconds / stages.length).toFixed(1);

                const timeBreakdown = stageTimeLogs
                    .map(log => `• **Stage \({log.stage} (\){log.difficulty}):** ${log.seconds}s`)
                    .join('\n');

                const finalEmbed = new EmbedBuilder()
                    .setTitle('🏆 Cyber Hunt Completed!')
                    .setDescription(`Congratulations! You cleared all **${stages.length} levels** of the Cyber Hunt!`)
                    .setColor('#57F287')
                    .addFields(
                        { name: 'Session Points Earned', value: `**+${sessionScore} pts**`, inline: true },
                        { name: 'Total Time Taken', value: `⏱️ **\({totalSeconds}s** (Avg\){avgSeconds}s/q)`, inline: true },
                        { name: 'Lifetime Score', value: `🏆 **${newTotal} pts**`, inline: false },
                        { name: '⏱️ Time Per Question Breakdown', value: timeBreakdown }
                    );

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [finalEmbed],
                    components: []
                });
            }

            const challenge = stages[stageIndex];
            let hintsRevealed = 0;
            let hintPenalty = 0;
            const startTime = Date.now();

            const buildEmbed = () => {
                const currentPoints = challenge.points - hintPenalty;
                const embed = new EmbedBuilder()
                    .setTitle(`🎯 Stage \({stageIndex + 1}/\){stages.length}: ${challenge.difficulty} Challenge`)
                    .setColor(challenge.difficulty === 'Easy' ? '#57F287' : challenge.difficulty === 'Medium' ? '#FEE75C' : '#ED4245')
                    .addFields(
                        { name: 'Difficulty', value: challenge.difficulty, inline: true },
                        { name: 'Base Points', value: `${challenge.points} pts`, inline: true },
                        { name: 'Reward if Solved Now', value: `**${currentPoints} pts**`, inline: true },
                        { name: 'Riddle / Task', value: `> ${challenge.question}` }
                    )
                    .setFooter({ text: 'Type your answer in this channel! You have infinite time & attempts.' });

                if (hintsRevealed > 0) {
                    const revealedList = challenge.hints.slice(0, hintsRevealed).map(h => `💡 ${h}`).join('\n');
                    embed.addFields({ name: `Revealed Hints (-${hintPenalty} pts)`, value: revealedList });
                }

                return embed;
            };

            const buildRow = () => {
                const row = new ActionRowBuilder();
                const button = new ButtonBuilder()
                    .setCustomId(`get_hint_\({interaction.id}_\){stageIndex}`)
                    .setLabel(hintsRevealed >= 2 ? 'No More Hints' : `Get Hint (-50 pts) [${hintsRevealed}/2]`)
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

            const buttonCollector = message.createMessageComponentCollector();

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
            const messageCollector = interaction.channel.createMessageCollector({ filter });

            messageCollector.on('collect', async msg => {
                const cleanAnswer = (text) => text.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
                
                const userAnswer = cleanAnswer(msg.content);
                const expectedAnswer = cleanAnswer(challenge.answer);

                if (userAnswer === expectedAnswer) {
                    const secondsTaken = Math.round((Date.now() - startTime) / 1000);
                    
                    stageTimeLogs.push({
                        stage: stageIndex + 1,
                        difficulty: challenge.difficulty,
                        seconds: secondsTaken
                    });

                    const earnedPoints = challenge.points - hintPenalty;
                    sessionScore += earnedPoints;

                    buttonCollector.stop();
                    messageCollector.stop();

                    await msg.reply({
                        content: `✅ **Correct!** (+\({earnedPoints} pts in **\){secondsTaken}s**). \({stageIndex + 1 < stages.length ? `Moving to Stage\){stageIndex + 2}...` : 'Finishing Hunt...'}`
                    });

                    stageIndex++;
                    runStage();
                } else {
                    try {
                        await msg.react('❌');
                    } catch (e) {
                        // Ignore missing reaction permission
                    }
                }
            });
        };

        runStage();

        if (logger?.debug) {
            logger.debug(`7-stage Cyber Hunt started by user \({interaction.user.id} in guild\){interaction.guildId}`);
        }
    },
};
