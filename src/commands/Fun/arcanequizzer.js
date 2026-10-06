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
            "Hint 1: ROT 13",
            "Hint 2: Actor"
        ]
    },
    {
        id: 2,
        difficulty: "Easy",
        points: 100,
        question: "54686579207468696e6b2069276d20686964696e6720696e2074686520736861646f7773",
        answer: "BATMAN",
        hints: [
            "Hint 1: Hexadecimal",
            "Hint 2: Christian Bale, Robert Pattinson, Ben Afflec, Michael Keaton"
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
        answer: "ARTIC MONKEYS",
        hints: [
            "Hint 1: Base-64 then Backlink",
            "Hint 2: R U Mine?"
        ]
    },
    {
        id: 6,
        difficulty: "Medium",
        points: 250,
        question: "cG93ZGVyZWQgcm9vdCBvZiBhc3Bob2RlbCB0byBhbiBpbmZ1c2lvbiBvZiB3b3Jtd29vZA==",
        answer: "DRAUGHT OF LIVING DEATH",
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
                .setDescription('Start an 8-stage Cyber Hunt challenge (1 hour 35 mins limit)!'))
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

        // --- SUBCOMMAND: LEADERBOARD (/
