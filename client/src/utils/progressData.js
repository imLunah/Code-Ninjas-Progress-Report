// Sub-programs for programs that split into multiple kits/curricula.
// null means no sub-program selection needed.
export const SUB_PROGRAMS = {
  'CREATE': null,
  'AI Academy': null,
  'Robotics Academy': ['LEGO Spike Essentials', 'LEGO Spike Prime', 'VEX GO', 'Ozobot Evo'],
  'JR': ['JR Coding', 'Snap Circuits'],
};

// Curriculum indexed by sub-program name (or program name for programs with no sub-programs).
// Each entry is an array of { module, lessons[] }.
export const CURRICULUM = {
  'AI Academy': [
    { module: 'Module 1', lessons: ['1. What is AI? How does it work?', '2. What are the different types of AI? What do they do?', '3. What is data? How does AI use data?', '4. What is an LLM? How does it work?', '5. How do I get what I want from AI?', '6. Can we trust AI?'] },
    { module: 'Module 2', lessons: ['1. Draw something with AI!', '2. How AI Creates Pictures', '3. Prompting an Image', '4. Image Fusion', '5. Animate your Drawings', '6. AI Music Generation', '7. AI Copyright and Ethics', '8. Choose your own AI Adventure!'] },
    { module: 'Module 3', lessons: ['1. Writing with AI, Part 1', '2. Writing with AI, Part 2', '3. AI Writing Assistants', '4. AI-Driven Podcast / Video Scripts', '5. Collaborative Book Creation with AI', '6. How does AI write?', '7. Deep Research with AI', '8. AI-Generated Writing Portfolios'] },
    { module: 'Module 4', lessons: ['1. How Is AI Transforming Life?', '2. How Is AI Transforming Life Online?', '3. Motion and Facial Recognition', '4. Image and Object Recognition', '5. How Is AI Used to Learn New Things?', '6. Create An AI Chatbot', '7. Making Predictions with AI', '8. Navigation and Pathfinding with AI'] },
    { module: 'Module 5', lessons: ['1. How AI Upgrades Coding', '2. Learn to Code with AI', '3. Debugging AI', '4. Pair Programming with AI', '5. What is Vibe Coding?', '6. Vibe Coding a Platformer Game', '7. Vibe Coding a Website', '8. Capping it Off (with a Capstone Project)'] },
    { module: 'Module 6', lessons: ['1. Introduction to AI in Gaming', '2. AI Computer Vision in Games', '3. Rule-Based AI and Finite State Machines', '4. AI Movement in Games', '5. AI Perception in Games', '6. Procedural Generation in Games', '7. NPCs, Memory, and Learning-Based AI', '8. Rule-Based vs Learning-Based AI'] },
    { module: 'Module 7', lessons: ['1. How is AI Changing Robotics?', '2. AI-Powered Sensors (Micro:bit)', '3. AI Movement Tracker (Micro:bit)', '4. AI Robotic Friend (Micro:bit + Climate Action Kit)', '5. Exploring AI Ethics + Introduction to Ozobot Color Codes (Ozobot)', '6. Coding with the Ozobot Editor\'s LLM Block (Ozobot)', '7. Ozobot + Computer Vision (Ozobot)', '8. AI Quality Inspection on the Assembly Line (Ozobot)', '9. Autonomous Driving Intelligence (Ozobot)'] },
    { module: 'Module 8', lessons: ['1. How has AI Changed Our Lives?', '2. Humans + AI, Working Together', '3. Can Humans Be Smarter than AI?', '4. Can AI Be Misleading?', '5. Can AI Harm Humans?', '6. Solving Future Problems with AI', '7. Solving Common AI Training Bugs', '8. Solving Problems with AI Assistants'] },
    { module: 'Module 9', lessons: ['1. Introduction To Design Thinking', '2. tldraw Computer', '3. The Ask Phase', '4. The Imagine Phase', '5. The Plan Phase', '6. The Prototype Phase', '7. The Test, Improve, Repeat Phase', '8. The Share Phase'] },
  ],

  'LEGO Spike Essentials': [
    { module: 'E 1', lessons: ['1. Intro to Lego Spike Essentials', '2. River Ferry', '3. Taxi! Taxi!', '4. Hovering Helicopter', '5. Swamp Boat', '6. Cable Car', '7. Big Bus', '8. Get Around Town'] },
    { module: 'E 2', lessons: ['1. Good Morning Machine', '2. Big Little Helper', '3. High-Tech Playground', '4. Trash Monster Machine', '5. Winning Goal', '6. Literary Randomizer', '7. Your Dojo Creation (Part 1)', '8. Your Dojo Creation (Part 2)'] },
    { module: 'E 3', lessons: ['1. Mini Mini-Golf', '2. Bowling Fun', '3. High Stick Hockey', '4. A-Maze-Ing', '5. Avoid The Edge', '6. Junior Pinball', '7. Creative Carnival Games (Part 1)', '8. Creative Carnival Games (Part 2)'] },
    { module: '1. Great Adventure', lessons: ['1. Boat Trip', '2. Cave Car', '3. Animal Alarm', '4. Underwater Quest', '5. The Great Desert Adventure'] },
    { module: '2. Amazing Amusement Park', lessons: ['1. The Fast Lane', '2. Classic Carousel', '3. Twiling Teacups', '4. The Most Amazing Amusement Park'] },
    { module: '3. Reimagine the World', lessons: ['1. Surfing', '2. Dancer Model', '3. Gymnastics Boy', '4. Basketball Game', '5. Sit Up', '6. Rollo the Robot', '7. Pirate Ship', '8. Scott the Skier', '9. Perry the Plane', '10. My World Reimagined'] },
    { module: '4. Useful Inventions', lessons: ['1. Automatic Feeder', '2. Smart Roof', '3. Smart Bin', '4. Harvestor', '5. Wake Up Giant', '6. Vertical Farm', '7. My Amazing Invention'] },
    { module: '5. Animal Friends', lessons: ['1. Crabby the Crab', '2. Sammi the Seal', '3. Sally the Spider', '4. Freddy the Fish', '5. Undersea Creature', '6. Gregory the Gorilla', '7. Peggy the Penguin', '8. Manny the Manta Ray', '9. Danny the Dino', '10. Elli the Elephant', '11. Bernie the Bird', '12. My Animal Friend'] },
  ],

  'LEGO Spike Prime': [
    { module: 'P 1', lessons: ['1. Intro to LEGO Spike Prime', '2. Pass The Brick', '3. Going The Distance', '4. Ready, Set, Goal!'] },
    { module: 'P 2', lessons: ['1. Help! Help!', '2. Hopper Race', '3. Super Cleanup', '4. Broken', '5. Rain or Shine?', '6. Wind Speed', '7. Veggie Lover', '8. Break Dancer'] },
    { module: 'P 3', lessons: ['1. Place Your Order', '2. Out Of Order', '3. Track Your Packages', '4. Keep It Safe', '5. Keep It Really Safe', '6. Automate It', '7. Automatoe It More'] },
    { module: 'P 4', lessons: ['1. Training Camp 1: Driving Around', '2. Training Camp 2: Playing With Objects', '3. Training Camp 3: Reacting To Lines'] },
  ],

  'VEX GO': [
    { module: 'VG 1', lessons: ['1. Introduction to Building with VEX GO', '2. Intro to Building: Outer Space Exploration Part 1', '3. Intro to Building: Outer Space Exploration Part 2', '4. Simple Machines: Inclined Plane', '5. Simple Machines: Lever', '6. Simple Machines: Wheel & Axle', '7. Simple Machines: Gears', '8. Physical Science: Unpowered Super Car', '9. Physical Science: Super Car', '10. Physical Science: Motorized Super Car'] },
    { module: 'VG 2', lessons: ['1. Mars Rover Surface Operations: Collect a Sample', '2. Mars Rover Surface Operations: Collect and Bury Mission', '3. Mars Rover Landing Challenge: Detect Obstacles', '4. Mars Rover Landing Challenge: Clear the Landing Area', '5. Exploring Mars Geology: Collect a Martian Rock Sample', '6. Exploring Mars Geology: Study Your Martian Rock Sample', '7. Exploring Mars Geology: Sort Your Samples', '8. Exploring Mars Geology: Planetary Geologist'] },
    { module: 'VG 3', lessons: ['1. Remote Control Robot', '2. Code and Drive', '3. Using the LED Bumper', '4. Color Disk Maze', '5. Self-Driving Code Base: Move Until Line', '6. Self-Driving Code Base: Stop Sign', '7. Self-Driving Code Base: Construction Zone'] },
    { module: 'VG 4', lessons: ['1. Robot Jobs: Sewer Robot', '2. Robot Jobs: Warehouse Robot', '3. Robot Jobs: Dangerous and Dirty Jobs!', '4. Ocean Emergency', '5. Robot Arm: Introduction', '6. Robot Arm: Using the Electromagnet', '7. Robot Arm: Using the Eye Sensor', '8. Robot Arm: Decision Making'] },
  ],

  'Ozobot Evo': [
    { module: 'O 1', lessons: ['1. Introduction to Color Codes: Basic Training', '2. Introduction to Color Codes: Speed', '3. Introduction to Color Codes: Special Moves & Win/Exit', '4. Introduction to Color Codes: Direction', '5. Write Your Name With Color Codes', '6. Loop My Day', '7. Ozobot Race Track', '8. Polar Animals', '9. Clean Energy Cruise'] },
    { module: 'O 2', lessons: ['1. Introduction to Color Codes: Skills Check 1', '2. Introduction to Color Codes: Timers', '3. Introduction to Color Codes: Line Switch', '4. Introduction to Color Codes: Skills Check 2', '5. How to Make Earth Happy', '6. Stargazing with Ozobot', '7. Skater Safety', '8. Pollination Garden', '9. What\'s the Object?'] },
  ],

  'JR Coding': [
    { module: 'Module 1', lessons: ['1. Dance Party', '2. Algorithms and Sequencing Lesson 1.1', '3. Dance Party (3 Stars)', '4. Algorithms and Sequencing Lesson 1.2', '5. Sound Farm', '6. Algorithms and Sequencing Lesson 1.2', '7. Unplugged Day', '8. Algorithms and Sequencing Lesson 1.3 (Unplugged Activities)', '9. My World', '10. Algorithms and Sequencing Lesson 1.3'] },
    { module: 'Module 2', lessons: ['1. Bump, You\'re It!', '2. Debugging Lesson 2.1', '3. Bump, You\'re It! (3 Stars)', '4. Debugging Lesson 2.2', '5. Seasons', '6. Debugging Lesson 2.2', '7. Unplugged Day', '8. Debugging Lesson 2.3', '9. Ocean of Code', '10. Debugging Lesson 2.3'] },
    { module: 'Module 3', lessons: ['1. Repeat Repeat Repeat', '2. Loops Lesson 3.1', '3. Unplugged Day!', '4. Loops Lesson 3.1', '5. Dribble Dribble', '6. Loops Lesson 3.2', '7. Close and Far', '8. Loops Lesson 3.2', '9. Close and Far (3 Stars)', '10. Loops Lesson 3.3'] },
    { module: 'Module 4', lessons: ['1. Unplugged Day!', '2. Decomposition 4.1', '3. Catch Me If You Can!', '4. Decomposition 4.2', '5. Custom Characters!', '6. Decomposition 4.2 (Go for 3 Stars!)', '7. Stage of Code', '8. Decomposition 4.2 (Go for 3 Stars!)', '9. Stage of Code (3 Stars)', '10. Decomposition 4.2 (Go for 3 Stars!)'] },
    { module: 'Module 5', lessons: ['1. My House', '2. Advanced Sequencing Lesson 5.1', '3. Unplugged Day!', '4. Advanced Sequencing Lesson 5.2', '5. Safari Adventure', '6. Advanced Sequencing Lesson 5.2', '7. Safari Adventure (3 Stars)', '8. Advanced Sequencing Lesson 5.2', '9. Where Am I?', '10. Advanced Sequencing Lesson 5.3'] },
    { module: 'Module 6', lessons: ['1. Say it!', '2. Events Lesson 6.1', '3. Say It! (3 Stars)', '4. Events Lesson 6.1', '5. Unplugged Day!', '6. Events Lesson 6.2', '7. School Story!', '8. Events Lesson 6.2', '9. Hot Potato!', '10. Events Lesson 6.2'] },
    { module: 'Module 7', lessons: ['1. Enter the Castle', '2. Conditional Lesson 7.1', '3. Space Station', '4. Conditional Lesson 7.1', '5. Unplugged Day!', '6. Conditional Lesson 7.2', '7. Turn the Page', '8. Conditional Lesson 7.2', '9. Turn the Page (3 Stars)', '10. Conditional Lesson 7.3'] },
    { module: 'Module 8', lessons: ['1. One of These Things', '2. Stacks and Queues Lesson 8.1', '3. Choose Your Own Adventure', '4. Stacks and Queues Lesson 8.1', '5. Choose Your Own Adventure (3 Stars)', '6. Stacks and Queues Lesson 8.2', '7. Makey Makey Synchronization', '8. Stacks and Queues Lesson 8.2', '9. Flying Fish', '10. Stacks and Queues Lesson 8.2'] },
    { module: 'Module 9', lessons: ['1. Keep Away', '2. Pair Programming Lesson 9.1', '3. Keep Away (Switch Roles)', '4. Pair Programming Lesson 9.1', '5. Super Wheelie', '6. Pair Programming Lesson 9.1', '7. Super Wheelie (Switch Roles)', '8. Pair Programming Lesson 9.2', '9. Crossy Road', '10. Pair Programming Lesson 9.2'] },
    { module: 'Module 10', lessons: ['1. Underwater Treasures', '2. Game Make Lesson 10.2', '3. Underwater Treasures (3 Stars)', '4. Game Make Lesson 10.2', '5. Unplugged Day!', '6. Game Make Lesson 10.2', '7. My Story', '8. Game Make Lesson 10.2', '9. My Game', '10. Game Make Lesson 10.2'] },
  ],

  'Snap Circuits': [
    { module: 'Elenco', lessons: Array.from({ length: 24 }, (_, i) => `Project ${i + 1}`) },
  ],
};

export function getCurriculum(program, subProgram) {
  if (subProgram) return CURRICULUM[subProgram] || null;
  return CURRICULUM[program] || null;
}
