require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { initDb } = require('./init');

const SALT_ROUNDS = 10;

async function seed() {
  console.log('Initializing database...');
  const db = initDb();

  // Insert locations
  console.log('Seeding locations...');
  db.prepare(`INSERT OR IGNORE INTO locations (name, slug) VALUES (?, ?)`).run('Code Ninjas Yorba Linda', 'yorba-linda');
  db.prepare(`INSERT OR IGNORE INTO locations (name, slug) VALUES (?, ?)`).run('Code Ninjas Fullerton', 'fullerton');
  db.prepare(`INSERT OR IGNORE INTO locations (name, slug) VALUES (?, ?)`).run('Code Ninjas Cerritos', 'cerritos');

  // Build locMap from slug -> id
  const locRows = db.prepare('SELECT id, slug FROM locations').all();
  const locMap = {};
  for (const row of locRows) {
    locMap[row.slug] = row.id;
  }
  console.log('Location map:', locMap);

  // Check if any users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('Users already exist, skipping seed.');
    db.close();
    return;
  }

  console.log('Seeding users...');

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role, location_id) VALUES (?, ?, ?, ?, ?)'
  );

  // Center Directors (role: 'manager'), one per location
  const managers = [
    { username: 'cd_yorbalinda', display_name: 'Director – Yorba Linda', location_id: locMap['yorba-linda'] },
    { username: 'cd_fullerton', display_name: 'Director – Fullerton', location_id: locMap['fullerton'] },
    { username: 'cd_cerritos', display_name: 'Director – Cerritos', location_id: locMap['cerritos'] },
  ];

  for (const m of managers) {
    const hash = await bcrypt.hash('ninja123', SALT_ROUNDS);
    insertUser.run(m.username, hash, m.display_name, 'manager', m.location_id);
    console.log(`Created manager: ${m.username}`);
  }

  // Senseis, 2 per location
  const senseis = [
    { username: 'sensei_yl1', display_name: 'Sensei Alex (YL)', location_id: locMap['yorba-linda'] },
    { username: 'sensei_yl2', display_name: 'Sensei Jordan (YL)', location_id: locMap['yorba-linda'] },
    { username: 'sensei_fl1', display_name: 'Sensei Taylor (FL)', location_id: locMap['fullerton'] },
    { username: 'sensei_fl2', display_name: 'Sensei Morgan (FL)', location_id: locMap['fullerton'] },
    { username: 'sensei_cr1', display_name: 'Sensei Riley (CR)', location_id: locMap['cerritos'] },
    { username: 'sensei_cr2', display_name: 'Sensei Casey (CR)', location_id: locMap['cerritos'] },
  ];

  for (const s of senseis) {
    const hash = await bcrypt.hash('ninja123', SALT_ROUNDS);
    insertUser.run(s.username, hash, s.display_name, 'sensei', s.location_id);
    console.log(`Created sensei: ${s.username}`);
  }

  // Seed 4 CREATE students per location (12 total)
  console.log('Seeding sample students...');
  const insertStudent = db.prepare(
    'INSERT INTO students (full_name, program, belt_level, belt_sublevel, location_id) VALUES (?, ?, ?, ?, ?)'
  );

  const beltLevels = ['White', 'Yellow', 'Orange'];

  const studentsByLocation = [
    {
      location_id: locMap['yorba-linda'],
      students: [
        { full_name: 'Alex Johnson', belt_level: 'White', belt_sublevel: 1 },
        { full_name: 'Sam Williams', belt_level: 'Yellow', belt_sublevel: 2 },
        { full_name: 'Jordan Lee', belt_level: 'Orange', belt_sublevel: 3 },
        { full_name: 'Taylor Brown', belt_level: 'White', belt_sublevel: 2 },
      ],
    },
    {
      location_id: locMap['fullerton'],
      students: [
        { full_name: 'Morgan Davis', belt_level: 'Yellow', belt_sublevel: 1 },
        { full_name: 'Riley Martinez', belt_level: 'Orange', belt_sublevel: 2 },
        { full_name: 'Casey Wilson', belt_level: 'White', belt_sublevel: 3 },
        { full_name: 'Drew Anderson', belt_level: 'Yellow', belt_sublevel: 3 },
      ],
    },
    {
      location_id: locMap['cerritos'],
      students: [
        { full_name: 'Quinn Thomas', belt_level: 'Orange', belt_sublevel: 1 },
        { full_name: 'Avery Jackson', belt_level: 'White', belt_sublevel: 2 },
        { full_name: 'Blake White', belt_level: 'Yellow', belt_sublevel: 1 },
        { full_name: 'Skyler Harris', belt_level: 'Orange', belt_sublevel: 3 },
      ],
    },
  ];

  for (const loc of studentsByLocation) {
    for (const student of loc.students) {
      insertStudent.run(student.full_name, 'CREATE', student.belt_level, student.belt_sublevel, loc.location_id);
      console.log(`Created student: ${student.full_name}`);
    }
  }

  console.log('Seed complete!');
  db.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
