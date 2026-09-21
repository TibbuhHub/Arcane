const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

// Database to track user scores across rounds
const userScores = new Map();

// Cyber Hunt Question Bank
const questions = [
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
        id: 3,
        difficulty: "Hard",
        points: 500,
        question: "Which cryptographic attack attempts to find two different inputs that produce the exact same hash output?",
        answer: "collision attack",
        hints: [
            "Hint 1: Think about what happens when two objects crash into each other.",
            "Hint 2: It exploits vulnerabilities in hash functions like MD5 or SHA-1."
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cyberhunt')
        .setDescription('Start a Cyber Hunt challenge!'),

    async execute(interaction) {
        const userId = interaction.user.id;
        
        // Initialize user score if first time
        if (!userScores.has(userId)) {
            userScores.set(userId, 0);
        }

        // Select a random question from the pool
        const challenge = questions[Math.floor(Math.random() * questions.length)];
        
        let hintsRevealed = 0;
        let hintPenalty = 0;

        // Build Embed UI
        const buildEmbed = () => {
            const currentPoints = challenge.points - hintPenalty;
            const embed = new EmbedBuilder()
                .setTitle(`🎯 Cyber Hunt: ${challenge.difficulty} Challenge`)
                .setColor(challenge.difficulty === 'Easy' ? '#57F287' : challenge.difficulty === 'Medium' ? '#FEE75C' : '#ED4245')
                .addFields(
                    { name: 'Difficulty', value: challenge.difficulty, inline: true },
                    { name: 'Base Points', value: `${challenge.points} pts`, inline: true },
                    { name: 'Reward if Solved Now', value: `**${currentPoints} pts**`, inline: true },
                    { name: 'Riddle / Task', value: `> ${challenge.question}` }
                )
                .setFooter({ text: 'Type your answer in this channel! You have infinite attempts until solved.' });

            if (hintsRevealed > 0) {
                const revealedList = challenge.hints.slice(0, hintsRevealed).map(h => `💡 ${h}`).join('\n');
                embed.addFields({ name: `Revealed Hints (-${hintPenalty} pts)`, value: revealedList });
            }

            return embed;
        };

        // Create Hint Button
        const buildRow = () => {
            const row = new ActionRowBuilder();
            const button = new ButtonBuilder()
                .setCustomId('get_hint')
                .setLabel(hintsRevealed >= 2 ? 'No More Hints' : `Get Hint (-50 pts) [${hintsRevealed}/2]`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(hintsRevealed >= 2);
            row.addComponents(button);
            return row;
        };

        const response = await interaction.reply({
            embeds: [buildEmbed()],
            components: [buildRow()],
            fetchReply: true
        });

        // 1. Button Collector (for hints)
        const buttonCollector = response.createMessageComponentCollector({ time: 300000 }); // 5 min timeout

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

        // 2. Text Message Collector (for infinite attempts)
        const messageFilter = m => m.author.id === interaction.user.id;
        const messageCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 300000 });

        messageCollector.on('collect', async msg => {
            const userAnswer = msg.content.trim().toLowerCase();
            const expectedAnswer = challenge.answer.toLowerCase();

            if (userAnswer === expectedAnswer) {
                const earnedPoints = challenge.points - hintPenalty;
                const newTotal = userScores.get(userId) + earnedPoints;
                userScores.set(userId, newTotal);

                // Stop collectors
                buttonCollector.stop();
                messageCollector.stop();

                await msg.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('🚩 Flag Captured!')
                            .setDescription(`Correct! You answered **${challenge.answer}** and earned **${earnedPoints} pts**!`)
                            .setColor('#57F287')
                            .addFields({ name: 'Total Score', value: `🏆 **${newTotal} pts**` })
                    ]
                });
            } else {
                // Wrong answer - allow retry without ending round
                await msg.react('❌');
            }
        });

        // Cleanup on timeout
        messageCollector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.followUp({ content: `⏳ Cyber Hunt time expired for this question! The answer was **${challenge.answer}**.` });
            }
        });
    }
};
