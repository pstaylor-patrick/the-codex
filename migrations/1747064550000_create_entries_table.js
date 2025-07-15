/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  console.log('[MIGRATION_LOG] Starting migration: 1747064550000_create_entries_table.js UP');
  pgm.createTable('entries', {
    id: { type: 'text', primaryKey: true },
    title: { type: 'text', notNull: true }, // Changed from name
    definition: { type: 'text', notNull: true }, // Changed from description
    type: { type: 'text', notNull: true }, // 'exicon' or 'lexicon'
    aliases: { type: 'jsonb' },
    // tags column removed, will be handled by entry_tags join table
    video_link: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('entries', 'title'); // Changed from name
  pgm.createIndex('entries', 'type');

  // Create entry_tags join table
  pgm.createTable('entry_tags', {
    entry_id: {
      type: 'text',
      notNull: true,
      references: '"entries"',
      onDelete: 'CASCADE',
    },
    tag_id: {
      type: 'text', // Ensure this matches the type of tags.id
      notNull: true,
      references: '"tags"',
      onDelete: 'CASCADE',
    },
    primaryKey: ['entry_id', 'tag_id'],
  });

  // Helper to clean text for SQL insertion
  const cleanTextForSql = (text) => {
    if (typeof text !== 'string') return '';
    let cleaned = text;
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi, "'");
    cleaned = cleaned.replace(/â€¦/g, '...');
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/\s\s+/g, ' ');
    return cleaned.trim().replace(/'/g, "''"); // Escape single quotes for SQL
  };

  const initialExiconEntries = [
      {
        id: 'ex1',
        name: '21s',
        description: 'A type of curls, usually with a coupon, where you do 7 reps of the bottom half of the movement, 7 reps of the top half, and then 7 full reps.',
        aliases: ['Sevens'],
        tags: [{id: 't1', name: 'Arms'}, {id: 't7', name: 'Coupon'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex2',
        name: 'AINOs',
        description: 'Squats with Arms In & Out in front of the body, like youâ€™re pulling something.',
        aliases: [],
        tags: [{id: 't1', name: 'Arms'}, {id: 't2', name: 'Legs'}, {id: 't3', name: 'Core'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex3',
        name: 'Air Claps',
        description: 'Jump in the air and clap hands above head.',
        aliases: [],
        tags: [{id: 't4', name: 'Cardio'}, {id: 't2', name: 'Legs'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex4',
        name: 'Air Squats',
        description: 'Squatting with no additional weight.',
        aliases: ['Bodyweight Squats'],
        tags: [{id: 't2', name: 'Legs'}, {id: 't3', name: 'Core'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex5',
        name: 'Alligators (Merkins)',
        description: 'Merkins where you walk forward with your hands, dragging your feet like an alligator. Also a type of walking merkin.',
        aliases: ['Alligator Push-ups', 'Gator Merkins'],
        tags: [{id: 't1', name: 'Arms'}, {id: 't3', name: 'Core'}, {id: 't5', name: 'Full Body'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex6',
        name: 'Alphabet (The)',
        description: 'Legs straight out in front of you while on your six, and spell the alphabet with your feet.',
        aliases: [],
        tags: [{id: 't3', name: 'Core'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex7',
        name: 'American Hammers (AH)',
        description: 'Sit on your six, lean back slightly, and twist your torso from side to side, touching the ground with your hands (or a coupon). Feet can be on the ground or elevated for more challenge.',
        aliases: ['Twisting Crunches', 'Russian Twists (without weight often)'],
        tags: [{id: 't3', name: 'Core'}, {id: 't7', name: 'Coupon'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: 'https://www.youtube.com/watch?v=LliverIuN5A'
      },
      {
        id: 'ex8',
        name: 'AMRAP',
        description: 'A workout format where you complete as many rounds or repetitions of a set of exercises as possible within a given time limit.',
        aliases: ['As Many Rounds As Possible', 'As Many Reps As Possible'],
        tags: [{id: 't12', name: 'AMRAP'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex9',
        name: 'Apollo Onos',
        description: 'Speed skaters. Right leg back and to the left, left arm forward. Left leg back and to the right, right arm forward.',
        aliases: [],
        tags: [{id: 't2', name: 'Legs'}, {id: 't3', name: 'Core'}, {id: 't4', name: 'Cardio'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex10',
        name: 'Arm Circles',
        description: 'Extend arms out to the sides and make small or large circles forward or backward.',
        aliases: [],
        tags: [{id: 't1', name: 'Arms'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex11',
        name: 'Ass Wipers',
        description: 'Lying on your back with legs straight up, lower them side to side like windshield wipers, but focusing on the glute engagement.',
        aliases: ['Windshield Wipers (variation)'],
        tags: [{id: 't3', name: 'Core'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex12',
        name: 'Australian Crawl',
        description: 'Like a bear crawl, but on your belly. Use arms and legs to propel forward.',
        aliases: [],
        tags: [{id: 't5', name: 'Full Body'}, {id: 't4', name: 'Cardio'}, {id: 't16', name: 'Distance'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex13',
        name: 'Australian Mountain Climbers',
        description: 'Start in plank. Bring one knee to the *opposite* elbow, then alternate. This is different from standard mountain climbers that bring knee to same-side elbow or chest.',
        aliases: [],
        tags: [{id: 't3', name: 'Core'}, {id: 't4', name: 'Cardio'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex14',
        name: 'B O M B S',
        description: 'A sequence: 5 rounds of 5 Bodyweight Over Merkins (BOM), 10 Big Boy Situps, 15 Merkins, 20 Big Boys (variation of sit-ups), 25 Squats. Often done with a partner, one runs while the other exercises.',
        aliases: ['Bodyweight Over Merkins, Big Boy Situps, Merkins, Big Boys, Squats'],
        tags: [{id: 't6', name: 'Partner'}, {id: 't5', name: 'Full Body'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex15',
        name: 'Backwards Run',
        description: 'Running backwards. Good for a change of pace and working different muscles.',
        aliases: ['Retro Run'],
        tags: [{id: 't4', name: 'Cardio'}, {id: 't9', name: 'Mosey'}, {id: 't16', name: 'Distance'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex16',
        name: 'Banjo',
        description: 'Stand with feet shoulder width apart, squat down with your left leg, while extending your right leg out to the side. Alternate legs.',
        aliases: [],
        tags: [{id: 't2', name: 'Legs'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex17',
        name: 'Bat Wings',
        description: 'Start with arms at sides, palms facing forward. Raise arms to shoulder height, then squeeze shoulder blades together. Various arm movements can be incorporated (pulses, forward/backward, up/down).',
        aliases: [],
        tags: [{id: 't1', name: 'Arms'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex18',
        name: 'Bear Crawl',
        description: 'Moving from one place to another while walking on hands and feet, facing forward.',
        aliases: [],
        tags: [{id: 't5', name: 'Full Body'}, {id: 't4', name: 'Cardio'}, {id: 't16', name: 'Distance'}],
        type: 'exicon',
        videoLink: 'https://www.youtube.com/watch?v=hoQyMGc6yS0'
      },
      {
        id: 'ex19',
        name: 'Bear Crawl Hops',
        description: 'From a bear crawl position, hop forward with both hands and feet simultaneously.',
        aliases: [],
        tags: [{id: 't5', name: 'Full Body'}, {id: 't4', name: 'Cardio'}, {id: 't16', name: 'Distance'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex20',
        name: 'Bear Necessities',
        description: 'A combination of Bear Crawl for a distance, then perform 5 Merkins, then Crab Walk back to start and perform 5 Dips (if a surface is available, otherwise LBCs). Repeat.',
        aliases: [],
        tags: [{id: 't5', name: 'Full Body'}, {id: 't4', name: 'Cardio'}, {id: 't16', name: 'Distance'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex21',
        name: 'Bermuda Triangle',
        description: 'Three PAX line up in a triangle, about 10-15 yards apart. PAX 1 runs to PAX 2 and does 5 burpees. PAX 2 runs to PAX 3 and does 10 merkins. PAX 3 runs to PAX 1 and does 15 squats. Rotate positions or exercises.',
        aliases: [],
        tags: [{id: 't6', name: 'Partner'}, {id: 't4', name: 'Cardio'}, {id: 't5', name: 'Full Body'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex22',
        name: 'Big Boy Sit-ups (BBSU)',
        description: 'A full sit-up where you come all the way up to a seated position. Hands can be behind the head or across the chest.',
        aliases: ['BBSUs'],
        tags: [{id: 't3', name: 'Core'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex23',
        name: 'Bird Dog',
        description: 'Start on all fours. Extend one arm straight forward and the opposite leg straight back, keeping core engaged and back flat. Hold, then switch sides.',
        aliases: [],
        tags: [{id: 't3', name: 'Core'}, {id: 't10', name: 'Static'}],
        type: 'exicon',
        videoLink: ''
      },
      {
        id: 'ex24',
        name: 'Blockees',
        description: 'A burpee performed while holding a coupon (block/cinder block). The coupon is typically lifted overhead during the jump phase.',
        aliases: ['Coupon Burpees'],
        tags: [{id: 't5', name: 'Full Body'}, {id: 't7', name: 'Coupon'}, {id: 't4', name: 'Cardio'}, {id: 't14', name: 'Reps'}],
        type: 'exicon',
        videoLink: 'https://www.youtube.com/watch?v=PztKJekH2uY'
      },
      {
        id: 'ex25',
        name: 'Boat/Canoe',
        description: 'PAX lie on their six, feet and shoulders off the ground (forming a "boat"). On Qâ€™s command "canoe", PAX paddle with hands as if in a canoe. This is often a timed or counted exercise where PAX hold the boat position while others might be running or performing another exercise.',
        aliases: [],
        tags: [{id: 't3', name: 'Core'}, {id: 't6', name: 'Partner'}, {id: 't10', name: 'Static'}, {id: 't15', name: 'Timed'}],
        type: 'exicon',
        videoLink: ''
      },
    ];

  for (const entry of initialExiconEntries) {
    const cleanedTitle = cleanTextForSql(entry.name); // Use entry.name for title
    const cleanedDefinition = cleanTextForSql(entry.description); // Use entry.description for definition
    const aliasesString = entry.aliases ? JSON.stringify(entry.aliases.map(a => cleanTextForSql(a))) : '[]';
    const videoLink = entry.videoLink ? `'${cleanTextForSql(entry.videoLink)}'` : 'NULL';

    pgm.sql(`INSERT INTO entries (id, title, definition, type, aliases, video_link) VALUES ('${entry.id}', '${cleanedTitle}', '${cleanedDefinition}', 'exicon', '${aliasesString}', ${videoLink});`);

    if (entry.tags && entry.tags.length > 0) {
      for (const tag of entry.tags) {
        // Assuming tag.id is the correct foreign key to tags.id
        pgm.sql(`INSERT INTO entry_tags (entry_id, tag_id) VALUES ('${entry.id}', '${tag.id}');`);
      }
    }
  }

  const initialLexiconEntries = [
    {
      id: 'lex1',
      name: 'AO (Area of Operation)',
      description: 'The specific location where an F3 workout takes place. Each AO typically has a name, often related to its geographical location or a local landmark (e.g., "The Forge," "Rebel Yell," "The Mothership").',
      aliases: ['Workout Location'],
      type: 'lexicon',
    },
    {
      id: 'lex2',
      name: 'Backblast',
      description: 'A written account of an F3 workout, usually posted online by the QIC (the leader of the workout). It serves as a record of the workout, recognizes participants, and often includes humor or reflections.',
      aliases: ['Workout Recap', 'BB'],
      type: 'lexicon',
    },
    {
      id: 'lex3',
      name: 'Beatdown',
      description: 'A term for an F3 workout, especially one that is particularly challenging or intense. It emphasizes the physical exertion involved.',
      aliases: ['Workout', 'Painfest'],
      type: 'lexicon',
    },
    {
      id: 'lex4',
      name: 'COT (Circle of Trust)',
      description: 'The closing circle at the end of every F3 workout. It includes a count-off (Name-O-Rama), announcements, intentions/praises, and often a prayer or moment of reflection. It is a key element of F3 fellowship.',
      aliases: ['Circle Up'],
      type: 'lexicon',
    },
    {
      id: 'lex5',
      name: 'CSAUP (Completely Stupid and Utterly Pointless)',
      description: 'An F3 event that is exceptionally challenging, often involving long distances, heavy carries, or other arduous tasks, designed to push PAX to their limits and build strong bonds.',
      aliases: ['Suckfest', 'Gut Check'],
      type: 'lexicon',
    },
    {
      id: 'lex6',
      name: 'DRP (Daily Red Pill)',
      description: 'The F3 concept of committing daily to Fitness, Fellowship, and Faith. It encourages consistent effort in all three Fs.',
      aliases: ['Daily Commitment'],
      type: 'lexicon',
    },
    {
      id: 'lex7',
      name: 'EH (Emotional Headlock)',
      description: 'The act of inviting or encouraging a man to join F3, often persistently but in a friendly manner. It refers to overcoming a man\'s initial reluctance or excuses.',
      aliases: ['Recruit', 'Invite'],
      type: 'lexicon',
    },
    {
      id: 'lex8',
      name: 'FNG (Friendly New Guy)',
      description: 'A man attending his first F3 workout. FNGs are welcomed and typically given an F3 nickname at the end of their first workout.',
      aliases: ['Newbie', 'First Timer'],
      type: 'lexicon',
    },
    {
      id: 'lex9',
      name: 'Gloom',
      description: 'The pre-dawn darkness in which F3 workouts typically occur. It symbolizes overcoming comfort and starting the day with discipline.',
      aliases: ['Dark', 'Early Morning'],
      type: 'lexicon',
    },
    {
      id: 'lex10',
      name: 'HC (Hard Commit)',
      description: 'A firm commitment to attend a workout or event. Publicly stating an HC increases accountability.',
      aliases: ['Commit', 'I\'m In'],
      type: 'lexicon',
    },
    {
      id: 'lex11',
      name: 'HIM (High Impact Man)',
      description: 'A man who strives to be a leader in his family, community, and workplace. F3 aims to develop HIMs through its principles and activities.',
      aliases: ['Leader', 'Impact Man'],
      type: 'lexicon',
    },
    {
      id: 'lex12',
      name: 'M (The M)',
      description: 'A PAX\'s wife or significant other. Often referred to with respect and acknowledgement of her support or tolerance of F3 activities.',
      aliases: ['Wife', 'Spouse'],
      type: 'lexicon',
    },
    {
      id: 'lex13',
      name: 'Mumblechatter',
      description: 'The talk, jokes, and banter that occur during an F3 workout. It is a key part of the fellowship and helps PAX push through the pain.',
      aliases: ['Chatter', 'Banter'],
      type: 'lexicon',
    },
    {
      id: 'lex14',
      name: 'PAX (Plural of HIM)',
      description: 'The men of F3; the participants in a workout or the members of the F3 community.',
      aliases: ['Men', 'Group', 'Guys'],
      type: 'lexicon',
    },
    {
      id: 'lex15',
      name: 'Q / QIC (The Q / Q In Charge)',
      description: 'The leader of a specific F3 workout. The Q designs and leads the workout, and rotates among the PAX. Being the Q is a core component of F3 leadership development.',
      aliases: ['Leader', 'Workout Leader'],
      type: 'lexicon',
    },
    {
      id: 'lex16',
      name: 'Sad Clown',
      description: 'A man who is unhappy, unfulfilled, or disconnected, often before discovering F3 or if he drifts away from its principles. F3 aims to help Sad Clowns become HIMs.',
      aliases: ['Unhappy Man'],
      type: 'lexicon',
    },
    {
      id: 'lex17',
      name: 'Second F (Fellowship)',
      description: 'One of the three Fs of F3. It refers to the bonds of brotherhood and community built among PAX, often through coffeeteria after workouts, social events, or supporting each other in times of need.',
      aliases: ['Fellowship'],
      type: 'lexicon',
    },
    {
      id: 'lex18',
      name: 'Shield Lock',
      description: 'A concept emphasizing the horizontal relationships and bonds between men in F3, supporting each other side-by-side.',
      aliases: ['Brotherhood', 'Support Network'],
      type: 'lexicon',
    },
    {
      id: 'lex19',
      name: 'The Six',
      description: 'A term referring to a PAX\'s back or the area behind them. "Covering the Six" means ensuring no man is left behind during a workout. It can also refer to the slowest PAX in a group.',
      aliases: ['Rear', 'Back'],
      type: 'lexicon',
    },
    {
      id: 'lex20',
      name: 'VQ (Virgin Q)',
      description: 'A PAX\'s first time leading a workout as the Q. It is a significant milestone in F3 leadership development.',
      aliases: ['First Q'],
      type: 'lexicon',
    },
  ];

  for (const entry of initialLexiconEntries) {
    const cleanedTitle = cleanTextForSql(entry.name); // Use entry.name for title
    const cleanedDefinition = cleanTextForSql(entry.description); // Use entry.description for definition
    const aliasesString = entry.aliases ? JSON.stringify(entry.aliases.map(a => cleanTextForSql(a))) : '[]';

    pgm.sql(`INSERT INTO entries (id, title, definition, type, aliases) VALUES ('${entry.id}', '${cleanedTitle}', '${cleanedDefinition}', 'lexicon', '${aliasesString}');`);
  }
  console.log('[MIGRATION_LOG] Finished migration: 1747064550000_create_entries_table.js UP');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log('[MIGRATION_LOG] Starting migration: 1747064550000_create_entries_table.js DOWN');
  pgm.dropTable('entry_tags');
  pgm.dropTable('entries');
  console.log('[MIGRATION_LOG] Finished migration: 1747064550000_create_entries_table.js DOWN');
};
