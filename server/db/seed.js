require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { initDb } = require('./init');

const SALT_ROUNDS = 10;

async function seed() {
  console.log('Initializing database...');
  const db = initDb();

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('Users already exist, skipping seed.');
    db.close();
    return;
  }

  console.log('Seeding users...');

  const users = [
    { username: 'manager', password: 'ninja123', display_name: 'Manager', role: 'manager' },
    { username: 'sensei1', password: 'ninja123', display_name: 'Sensei Alex', role: 'sensei' },
    { username: 'sensei2', password: 'ninja123', display_name: 'Sensei Jordan', role: 'sensei' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
  );

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
    insertUser.run(user.username, hash, user.display_name, user.role);
    console.log(`Created user: ${user.username} (${user.role})`);
  }

  // Seed some sample students
  console.log('Seeding sample students...');
  const insertStudent = db.prepare(
    `INSERT INTO students (full_name, program, belt_level, belt_sublevel, current_project, project_status)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const students = [
    { full_name: 'Alex Johnson', program: 'CREATE', belt_level: 'Yellow', belt_sublevel: 3, current_project: 'Build 1', project_status: 'Working On' },
    { full_name: 'Sam Williams', program: 'CREATE', belt_level: 'Orange', belt_sublevel: 5, current_project: 'Solve 1', project_status: 'Started' },
    { full_name: 'Jordan Lee', program: 'Robotics Academy', belt_level: null, belt_sublevel: null, current_project: null, project_status: null },
    { full_name: 'Taylor Brown', program: 'AI Academy', belt_level: null, belt_sublevel: null, current_project: null, project_status: null },
    { full_name: 'Morgan Davis', program: 'JR', belt_level: null, belt_sublevel: null, current_project: null, project_status: null },
    { full_name: 'Riley Martinez', program: 'CREATE', belt_level: 'White', belt_sublevel: 2, current_project: 'Build 1', project_status: 'Started' },
  ];

  for (const student of students) {
    insertStudent.run(
      student.full_name,
      student.program,
      student.belt_level,
      student.belt_sublevel,
      student.current_project,
      student.project_status
    );
    console.log(`Created student: ${student.full_name}`);
  }

  console.log('Seed complete!');
  db.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
