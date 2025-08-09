// scripts/import-lexicon-csv.ts
// This script is responsible for importing initial data (hardcoded and from CSV) into the database.
// It assumes the database schema has already been set up by node-pg-migrate.

import * as fs from 'fs';
import csv from 'csv-parser';
import { getClient } from '../src/lib/db'; // Adjust path if your db.ts is elsewhere (e.g., ../src/lib/db)
import { PoolClient } from 'pg'; // Import PoolClient for typing
import 'dotenv/config'; // Load environment variables from .env file

// --- Configuration ---
const CSV_FILE_PATH = 'lexicon.csv'; // Make sure this is the correct path relative to where you run the script
const ENTRY_TYPE_LEXICON = 'lexicon';
const ENTRY_TYPE_EXICON = 'exicon';
const DEFAULT_ALIASES: string[] = []; // Default for entries without specific aliases
const DEFAULT_VIDEO_LINK = ''; // Default for entries without a video link
const SUBMITTER_NAME = 'Roma';
const SUBMITTER_EMAIL = 'roma@f3nation.com';

// --- Type Definitions ---
interface CsvRow {
    Title: string;
    Text: string;
    // Add other columns if your CSV has them and you want to process them
}

interface InitialEntry {
    id: string;
    name: string; // Corresponds to 'title' in DB
    description: string; // Corresponds to 'definition' in DB
    aliases: string[];
    tags?: { id: string; name: string }[]; // Optional for lexicon entries, required for exicon
    type: string;
    videoLink?: string; // Optional for lexicon entries, present for exicon
}

// --- Helper Functions ---

/**
 * Cleans up common "smart quotes", mojibake, and other problematic characters from text,
 * and escapes single quotes for SQL insertion.
 * This is a comprehensive cleaning function for all text going into the DB.
 * @param text The input string to clean.
 * @returns The cleaned and SQL-escaped string.
 */
function cleanForDbInsertion(text: string | null | undefined): string {
    if (typeof text !== 'string') {
        return '';
    }
    let cleaned = text;
    // Replace common line breaks
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    // Normalize spaces
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    // Handle specific mojibake/smart quote characters
    cleaned = cleaned.replace(/â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi, "'");
    cleaned = cleaned.replace(/â€¦/g, '...');
    // Handle HTML <br> tags
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    // Normalize multiple newlines
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    // Normalize multiple spaces again after other replacements
    cleaned = cleaned.replace(/\s\s+/g, ' ');
    // Trim whitespace and escape single quotes for SQL
    return cleaned.trim().replace(/'/g, "''");
}

/**
 * Reads a CSV file and returns its content as an array of objects.
 * @param filePath The path to the CSV file.
 * @returns A Promise that resolves with an array of CsvRow objects.
 */
async function readCsvFile(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const entries: CsvRow[] = [];
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }: { header: string }) => header.trim(), // Trim whitespace from headers
            }))
            .on('data', (row: CsvRow) => entries.push(row))
            .on('end', () => {
                console.log(`Read ${entries.length} rows from ${filePath}.`);
                resolve(entries);
            })
            .on('error', (error: Error) => {
                console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
                reject(error);
            });
    });
}

/**
 * Inserts a new entry into the 'entries' table.
 * @param client The PostgreSQL client.
 * @param id The pre-defined ID of the entry (for hardcoded entries) or generated.
 * @param title The title of the entry.
 * @param definition The definition of the entry.
 * @param type The type of the entry ('lexicon' or 'exicon').
 * @param aliases An array of alias strings.
 * @param videoLink An optional video link.
 * @returns The ID of the inserted entry, or null if skipped (e.g., on conflict).
 */
async function insertEntry(
    client: PoolClient,
    id: string, // Accept a pre-defined ID
    title: string,
    definition: string,
    type: string,
    aliases: string[],
    videoLink: string | null
): Promise<string | null> {
    try {
        // Format aliases as array of objects: [{"name": "Alias1"}, {"name": "Alias2"}]
        const formattedAliases = aliases.map(a => ({ name: a }));

        const res = await client.query(
            `INSERT INTO codex_entries (id, title, definition, type, aliases, video_link)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
            [
                id,
                title,
                definition,
                type,
                JSON.stringify(formattedAliases),
                videoLink || null, // Ensure NULL is passed for empty strings
            ]
        );

        if (res.rows.length) {
            console.log(`✅ Inserted entry "${title}" with ID: ${res.rows[0].id}`);
        } else {
            console.log(`⚠️ Entry with ID "${id}" (from title "${title}") already exists, skipping insertion.`);
        }
        return res.rows.length ? res.rows[0].id : null;
    } catch (e: any) {
        console.error(`❌ Error inserting entry "${title}" (ID: ${id}):`, e.message);
        throw e;
    }
}

/**
 * Inserts a user submission record.
 * @param client The PostgreSQL client.
 * @param payload The data payload for the submission.
 */
async function insertSubmission(client: PoolClient, payload: any): Promise<void> {
    try {
        await client.query(
            `INSERT INTO codex_user_submissions (submission_type, data, submitter_name, submitter_email, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
            ['xicon_upload', payload, SUBMITTER_NAME, SUBMITTER_EMAIL, 'approved'] // Assuming these are pre-approved uploads
        );
        console.log(`✅ Inserted submission for "${payload.title}".`);
    } catch (error: any) {
        console.error(
            `❌ Error inserting submission for "${payload.title}":`,
            error.message
        );
        throw error;
    }
}

/**
 * Inserts an entry into the entry_tags join table.
 * @param client The PostgreSQL client.
 * @param entryId The ID of the entry.
 * @param tagId The ID of the tag.
 */
// async function insertEntryTag(client: PoolClient, entryId: string, tagId: string): Promise<void> {
//     try {
//         await client.query(
//             `INSERT INTO codex_entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
//             [entryId, tagId]
//         );
//         // console.log(`  🔗 Linked entry ${entryId} to tag ${tagId}`); // Enable for verbose logging
//     } catch (e: any) {
//         console.error(`❌ Error linking entry ${entryId} to tag ${tagId}:`, e.message);
//         throw e;
//     }
// }

// // --- Initial Hardcoded Data ---

// const initialExiconEntries: InitialEntry[] = [
//     {
//         id: 'ex1',
//         name: '21s',
//         description: 'A type of curls, usually with a coupon, where you do 7 reps of the bottom half of the movement, 7 reps of the top half, and then 7 full reps.',
//         aliases: ['Sevens'],
//         tags: [{ id: 't1', name: 'Arms' }, { id: 't7', name: 'Coupon' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex2',
//         name: 'AINOs',
//         description: 'Squats with Arms In & Out in front of the body, like you’re pulling something.',
//         aliases: [],
//         tags: [{ id: 't1', name: 'Arms' }, { id: 't2', name: 'Legs' }, { id: 't3', name: 'Core' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex3',
//         name: 'Air Claps',
//         description: 'Jump in the air and clap hands above head.',
//         aliases: [],
//         tags: [{ id: 't4', name: 'Cardio' }, { id: 't2', name: 'Legs' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex4',
//         name: 'Air Squats',
//         description: 'Squatting with no additional weight.',
//         aliases: ['Bodyweight Squats'],
//         tags: [{ id: 't2', name: 'Legs' }, { id: 't3', name: 'Core' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex5',
//         name: 'Alligators (Merkins)',
//         description: 'Merkins where you walk forward with your hands, dragging your feet like an alligator. Also a type of walking merkin.',
//         aliases: ['Alligator Push-ups', 'Gator Merkins'],
//         tags: [{ id: 't1', name: 'Arms' }, { id: 't3', name: 'Core' }, { id: 't5', name: 'Full Body' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex6',
//         name: 'Alphabet (The)',
//         description: 'Legs straight out in front of you while on your six, and spell the alphabet with your feet.',
//         aliases: [],
//         tags: [{ id: 't3', name: 'Core' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex7',
//         name: 'American Hammers (AH)',
//         description: 'Sit on your six, lean back slightly, and twist your torso from side to side, touching the ground with your hands (or a coupon). Feet can be on the ground or elevated for more challenge.',
//         aliases: ['Twisting Crunches', 'Russian Twists (without weight often)'],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't7', name: 'Coupon' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: 'https://www.youtube.com/watch?v=LliverIuN5A'
//     },
//     {
//         id: 'ex8',
//         name: 'AMRAP',
//         description: 'A workout format where you complete as many rounds or repetitions of a set of exercises as possible within a given time limit.',
//         aliases: ['As Many Rounds As Possible', 'As Many Reps As Possible'],
//         tags: [{ id: 't12', name: 'AMRAP' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex9',
//         name: 'Apollo Onos',
//         description: 'Speed skaters. Right leg back and to the left, left arm forward. Left leg back and to the right, right arm forward.',
//         aliases: [],
//         tags: [{ id: 't2', name: 'Legs' }, { id: 't3', name: 'Core' }, { id: 't4', name: 'Cardio' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex10',
//         name: 'Arm Circles',
//         description: 'Extend arms out to the sides and make small or large circles forward or backward.',
//         aliases: [],
//         tags: [{ id: 't1', name: 'Arms' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex11',
//         name: 'Ass Wipers',
//         description: 'Lying on your back with legs straight up, lower them side to side like windshield wipers, but focusing on the glute engagement.',
//         aliases: ['Windshield Wipers (variation)'],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex12',
//         name: 'Australian Crawl',
//         description: 'Like a bear crawl, but on your belly. Use arms and legs to propel forward.',
//         aliases: [],
//         tags: [{ id: 't5', name: 'Full Body' }, { id: 't4', name: 'Cardio' }, { id: 't16', name: 'Distance' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex13',
//         name: 'Australian Mountain Climbers',
//         description: 'Start in plank. Bring one knee to the *opposite* elbow, then alternate. This is different from standard mountain climbers that bring knee to same-side elbow or chest.',
//         aliases: [],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't4', name: 'Cardio' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex14',
//         name: 'B O M B S',
//         description: 'A sequence: 5 rounds of 5 Bodyweight Over Merkins (BOM), 10 Big Boy Situps, 15 Merkins, 20 Big Boys (variation of sit-ups), 25 Squats. Often done with a partner, one runs while the other exercises.',
//         aliases: ['Bodyweight Over Merkins, Big Boy Situps, Merkins, Big Boys, Squats'],
//         tags: [{ id: 't6', name: 'Partner' }, { id: 't5', name: 'Full Body' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex15',
//         name: 'Backwards Run',
//         description: 'Running backwards. Good for a change of pace and working different muscles.',
//         aliases: ['Retro Run'],
//         tags: [{ id: 't4', name: 'Cardio' }, { id: 't9', name: 'Mosey' }, { id: 't16', name: 'Distance' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex16',
//         name: 'Banjo',
//         description: 'Stand with feet shoulder width apart, squat down with your left leg, while extending your right leg out to the side. Alternate legs.',
//         aliases: [],
//         tags: [{ id: 't2', name: 'Legs' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex17',
//         name: 'Bat Wings',
//         description: 'Start with arms at sides, palms facing forward. Raise arms to shoulder height, then squeeze shoulder blades together. Various arm movements can be incorporated (pulses, forward/backward, up/down).',
//         aliases: [],
//         tags: [{ id: 't1', name: 'Arms' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex18',
//         name: 'Bear Crawl',
//         description: 'Moving from one place to another while walking on hands and feet, facing forward.',
//         aliases: [],
//         tags: [{ id: 't5', name: 'Full Body' }, { id: 't4', name: 'Cardio' }, { id: 't16', name: 'Distance' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: 'https://www.youtube.com/watch?v=hoQyMGc6yS0'
//     },
//     {
//         id: 'ex19',
//         name: 'Bear Crawl Hops',
//         description: 'From a bear crawl position, hop forward with both hands and feet simultaneously.',
//         aliases: [],
//         tags: [{ id: 't5', name: 'Full Body' }, { id: 't4', name: 'Cardio' }, { id: 't16', name: 'Distance' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex20',
//         name: 'Bear Necessities',
//         description: 'A combination of Bear Crawl for a distance, then perform 5 Merkins, then Crab Walk back to start and perform 5 Dips (if a surface is available, otherwise LBCs). Repeat.',
//         aliases: [],
//         tags: [{ id: 't5', name: 'Full Body' }, { id: 't4', name: 'Cardio' }, { id: 't16', name: 'Distance' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex21',
//         name: 'Bermuda Triangle',
//         description: 'Three PAX line up in a triangle, about 10-15 yards apart. PAX 1 runs to PAX 2 and does 5 burpees. PAX 2 runs to PAX 3 and does 10 merkins. PAX 3 runs to PAX 1 and does 15 squats. Rotate positions or exercises.',
//         aliases: [],
//         tags: [{ id: 't6', name: 'Partner' }, { id: 't4', name: 'Cardio' }, { id: 't5', name: 'Full Body' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex22',
//         name: 'Big Boy Sit-ups (BBSU)',
//         description: 'A full sit-up where you come all the way up to a seated position. Hands can be behind the head or across the chest.',
//         aliases: ['BBSUs'],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex23',
//         name: 'Bird Dog',
//         description: 'Start on all fours. Extend one arm straight forward and the opposite leg straight back, keeping core engaged and back flat. Hold, then switch sides.',
//         aliases: [],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't10', name: 'Static' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
//     {
//         id: 'ex24',
//         name: 'Blockees',
//         description: 'A burpee performed while holding a coupon (block/cinder block). The coupon is typically lifted overhead during the jump phase.',
//         aliases: ['Coupon Burpees'],
//         tags: [{ id: 't5', name: 'Full Body' }, { id: 't7', name: 'Coupon' }, { id: 't4', name: 'Cardio' }, { id: 't14', name: 'Reps' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: 'https://www.youtube.com/watch?v=PztKJekH2uY'
//     },
//     {
//         id: 'ex25',
//         name: 'Boat/Canoe',
//         description: 'PAX lie on their six, feet and shoulders off the ground (forming a "boat"). On Q’s command "canoe", PAX paddle with hands as if in a canoe. This is often a timed or counted exercise where PAX hold the boat position while others might be running or performing another exercise.',
//         aliases: [],
//         tags: [{ id: 't3', name: 'Core' }, { id: 't6', name: 'Partner' }, { id: 't10', name: 'Static' }, { id: 't15', name: 'Timed' }],
//         type: ENTRY_TYPE_EXICON,
//         videoLink: ''
//     },
// ];

// const initialLexiconEntries: InitialEntry[] = [
//     {
//         id: 'lex1',
//         name: 'AO (Area of Operation)',
//         description: 'The specific location where an F3 workout takes place. Each AO typically has a name, often related to its geographical location or a local landmark (e.g., "The Forge," "Rebel Yell," "The Mothership").',
//         aliases: ['Workout Location'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex2',
//         name: 'Backblast',
//         description: 'A written account of an F3 workout, usually posted online by the QIC (the leader of the workout). It serves as a record of the workout, recognizes participants, and often includes humor or reflections.',
//         aliases: ['Workout Recap', 'BB'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex3',
//         name: 'Beatdown',
//         description: 'A term for an F3 workout, especially one that is particularly challenging or intense. It emphasizes the physical exertion involved.',
//         aliases: ['Workout', 'Painfest'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex4',
//         name: 'COT (Circle of Trust)',
//         description: 'The closing circle at the end of every F3 workout. It includes a count-off (Name-O-Rama), announcements, intentions/praises, and often a prayer or moment of reflection. It is a key element of F3 fellowship.',
//         aliases: ['Circle Up'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex5',
//         name: 'CSAUP (Completely Stupid and Utterly Pointless)',
//         description: 'An F3 event that is exceptionally challenging, often involving long distances, heavy carries, or other arduous tasks, designed to push PAX to their limits and build strong bonds.',
//         aliases: ['Suckfest', 'Gut Check'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex6',
//         name: 'DRP (Daily Red Pill)',
//         description: 'The F3 concept of committing daily to Fitness, Fellowship, and Faith. It encourages consistent effort in all three Fs.',
//         aliases: ['Daily Commitment'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex7',
//         name: 'EH (Emotional Headlock)',
//         description: 'The act of inviting or encouraging a man to join F3, often persistently but in a friendly manner. It refers to overcoming a man\'s initial reluctance or excuses.',
//         aliases: ['Recruit', 'Invite'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex8',
//         name: 'FNG (Friendly New Guy)',
//         description: 'A man attending his first F3 workout. FNGs are welcomed and typically given an F3 nickname at the end of their first workout.',
//         aliases: ['Newbie', 'First Timer'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex9',
//         name: 'Gloom',
//         description: 'The pre-dawn darkness in which F3 workouts typically occur. It symbolizes overcoming comfort and starting the day with discipline.',
//         aliases: ['Dark', 'Early Morning'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex10',
//         name: 'HC (Hard Commit)',
//         description: 'A firm commitment to attend a workout or event. Publicly stating an HC increases accountability.',
//         aliases: ['Commit', 'I\'m In'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex11',
//         name: 'HIM (High Impact Man)',
//         description: 'A man who strives to be a leader in his family, community, and workplace. F3 aims to develop HIMs through its principles and activities.',
//         aliases: ['Leader', 'Impact Man'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex12',
//         name: 'M (The M)',
//         description: 'A PAX\'s wife or significant other. Often referred to with respect and acknowledgement of her support or tolerance of F3 activities.',
//         aliases: ['Wife', 'Spouse'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex13',
//         name: 'Mumblechatter',
//         description: 'The talk, jokes, and banter that occur during an F3 workout. It is a key part of the fellowship and helps PAX push through the pain.',
//         aliases: ['Chatter', 'Banter'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex14',
//         name: 'PAX (Plural of HIM)',
//         description: 'The men of F3; the participants in a workout or the members of the F3 community.',
//         aliases: ['Men', 'Group', 'Guys'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex15',
//         name: 'Q / QIC (The Q / Q In Charge)',
//         description: 'The leader of a specific F3 workout. The Q designs and leads the workout, and rotates among the PAX. Being the Q is a core component of F3 leadership development.',
//         aliases: ['Leader', 'Workout Leader'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex16',
//         name: 'Sad Clown',
//         description: 'A man who is unhappy, unfulfilled, or disconnected, often before discovering F3 or if he drifts away from its principles. F3 aims to help Sad Clowns become HIMs.',
//         aliases: ['Unhappy Man'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex17',
//         name: 'Second F (Fellowship)',
//         description: 'One of the three Fs of F3. It refers to the bonds of brotherhood and community built among PAX, often through coffeeteria after workouts, social events, or supporting each other in times of need.',
//         aliases: ['Fellowship'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex18',
//         name: 'Shield Lock',
//         description: 'A concept emphasizing the horizontal relationships and bonds between men in F3, supporting each other side-by-side.',
//         aliases: ['Brotherhood', 'Support Network'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex19',
//         name: 'The Six',
//         description: 'A term referring to a PAX\'s back or the area behind them. "Covering the Six" means ensuring no man is left behind during a workout. It can also refer to the slowest PAX in a group.',
//         aliases: ['Rear', 'Back'],
//         type: ENTRY_TYPE_LEXICON,
//     },
//     {
//         id: 'lex20',
//         name: 'VQ (Virgin Q)',
//         description: 'A PAX\'s first time leading a workout as the Q. It is a significant milestone in F3 leadership development.',
//         aliases: ['First Q'],
//         type: ENTRY_TYPE_LEXICON,
//     },
// ];


// --- Main Processing Function ---

async function processCSVImport(filePath: string): Promise<void> {
    let client: PoolClient | undefined; // Declare client for finally block
    try {
        // IMPORTANT: Ensure your database schema is up-to-date by running migrations first!
        // npm run db:migrate:up
        // This script assumes 'entries', 'tags', and 'user_submissions' tables already exist
        // with schemas matching your node-pg-migrate setup.

        client = await getClient(); // Use your existing getClient from lib/db
        console.log('Database client acquired.');

        const entries = await readCsvFile(filePath);
        console.log(`Starting import of ${entries.length} entries...`);

        for (const row of entries) {
            const title = row.Title?.trim();
            const definition = cleanForDbInsertion(row.Text?.trim());

            if (!title || !definition) {
                console.warn(`⚠️ Skipping row due to missing Title or Text:`, row);
                continue;
            }

            // Generate a unique, text-based ID consistent with your node-pg-migrate schema
            const entryId = `${ENTRY_TYPE_LEXICON}-${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

            // Insert the entry into the 'entries' table
            // USE ENTRY_TYPE_LEXICON HERE
            const insertedEntryId = await insertEntry(client, entryId, title, definition, ENTRY_TYPE_LEXICON, DEFAULT_ALIASES, DEFAULT_VIDEO_LINK); // <--- FIXED LINE

            // Create a submission record for tracking (optional, but good for auditing)
            const submissionPayload = {
                title,
                definition,
                type: ENTRY_TYPE_LEXICON, // <--- FIXED LINE
                tags: [],
                aliases: DEFAULT_ALIASES,
                video_link: DEFAULT_VIDEO_LINK,
            };
            await insertSubmission(client, submissionPayload);
        }


        console.log('🎉 Lexicon CSV import complete.');
    } catch (error: any) {
        console.error('❌ An error occurred during the CSV processing:', error);
        // Provide more specific guidance if common errors occur
        if (error.message && String(error.message).toLowerCase().includes('relation "entries" does not exist')) {
            console.error('HINT: The "entries" table might be missing. Did you run `npm run db:migrate:up`?');
        }
        if (error.message && String(error.message).toLowerCase().includes('connect econnnrefused')) {
            console.error('HINT: Database connection refused. Is your PostgreSQL server running and accessible?');
        }
    } finally {
        if (client) {
            client.release(); // Ensure the client is released back to the pool
            console.log('Database client released.');
        }
    }
}

// --- Run the script ---
(async () => {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ Error: CSV file not found at ${CSV_FILE_PATH}. Please check the path.`);
        process.exit(1); // Exit with an error code
    }
    await processCSVImport(CSV_FILE_PATH);
})();
