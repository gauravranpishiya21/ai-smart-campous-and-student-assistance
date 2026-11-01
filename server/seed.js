// Demo data. Run automatically on first start, or `npm run seed` to reset.
const bcrypt = require('bcryptjs');
const { db, rec, notify } = require('./db');
const ai = require('./ai');

const d = (off = 0) => { const x = new Date(); x.setDate(x.getDate() + off); return x.toISOString().slice(0, 10); };
const pick = (a, i) => a[i % a.length];

// code|name|credits|category|modules(;)
const CATALOG = {
  1: ['MA101|Engineering Mathematics I|4|Core|Matrices & eigenvalues;Differential calculus;Integral calculus;Multivariable calculus;Sequences & series', 'PH101|Engineering Physics|4|Core|Oscillations & waves;Optics;Quantum mechanics basics;Lasers & fibre optics;Semiconductors', 'CS101|Programming in C|4|Core|Introduction & control flow;Functions & recursion;Arrays & strings;Pointers;Structures & file I/O', 'EE101|Basic Electrical Engineering|3|Core|DC circuits;AC fundamentals;Transformers;Electrical machines;Safety & power systems', 'HS101|Communication Skills|2|Humanities|Listening & speaking;Reading comprehension;Technical writing;Presentations;Group discussion'],
  2: ['MA102|Engineering Mathematics II|4|Core|Ordinary differential equations;Laplace transforms;Fourier series;Vector calculus;Complex variables', 'CH101|Engineering Chemistry|4|Core|Water technology;Electrochemistry;Polymers;Fuels & combustion;Corrosion', 'CS102|Data Structures|4|Core|Arrays & linked lists;Stacks & queues;Trees;Graphs;Hashing', 'ME101|Engineering Graphics|3|Core|Projection basics;Orthographic views;Sections;Isometric views;CAD basics', 'CS103|Digital Logic Design|3|Core|Number systems;Boolean algebra;Combinational circuits;Sequential circuits;Memory & PLDs'],
  3: ['MA201|Discrete Mathematics|4|Core|Logic & proofs;Sets & relations;Combinatorics;Graph theory;Algebraic structures', 'CS201|Object Oriented Programming|4|Core|Classes & objects;Inheritance;Polymorphism;Exceptions & generics;Design patterns', 'CS202|Computer Organization|4|Core|Instruction sets;Processor design;Pipelining;Memory hierarchy;I/O organization', 'CS203|Database Management Systems|4|Core|ER modelling;Relational algebra & SQL;Normalization;Transactions;Indexing & recovery', 'HS201|Economics for Engineers|2|Humanities|Demand & supply;Cost analysis;Market structures;Macro basics;Project economics'],
  4: ['CS401|Operating Systems|4|Core|Processes & threads;CPU scheduling;Memory management;File systems;Deadlocks & security', 'CS402|Design & Analysis of Algorithms|4|Core|Asymptotic analysis;Divide & conquer;Greedy methods;Dynamic programming;NP-completeness', 'CS403|Computer Networks|4|Core|OSI & TCP/IP;Data link layer;Network layer & routing;Transport layer;Application protocols', 'CS404|Software Engineering|3|Core|SDLC models;Requirements;Design & UML;Testing;Maintenance & DevOps', 'CS405|Theory of Computation|3|Core|Finite automata;Regular expressions;Context-free grammars;Turing machines;Decidability'],
  5: ['CS501|Compiler Design|4|Core|Lexical analysis;Parsing;Semantic analysis;Intermediate code;Code optimisation', 'CS502|Artificial Intelligence|4|Core|Search strategies;Knowledge representation;Reasoning;Planning;Learning basics', 'CS503|Web Technologies|3|Elective|HTML/CSS/JS;Server-side programming;REST APIs;Databases for web;Deployment', 'CS504|Information Security|3|Core|Cryptography basics;Authentication;Network security;Web security;Security policies', 'CS505|Cloud Computing|3|Elective|Virtualization;Cloud models;Containers;Serverless;Cloud security'],
  6: ['CS601|Machine Learning|4|Core|Regression;Classification;Clustering;Neural networks;Model evaluation', 'CS602|Big Data Analytics|3|Elective|Hadoop & MapReduce;Spark;NoSQL;Stream processing;Data pipelines', 'CS603|Mobile App Development|3|Elective|Android/iOS basics;UI design;Storage & networking;Sensors;Publishing', 'CS604|Distributed Systems|4|Core|Communication;Consensus;Replication;Fault tolerance;Distributed storage', 'CS605|Mini Project|2|Project|Problem selection;Design;Implementation;Testing;Report & demo'],
  7: ['CS701|Deep Learning|4|Core|Perceptrons & backprop;CNNs;RNNs & LSTMs;Transformers;Deployment', 'CS702|Natural Language Processing|3|Elective|Text processing;Language models;Embeddings;Sequence tasks;Applications', 'CS703|Internet of Things|3|Elective|Sensors;Protocols;Edge computing;IoT cloud;Smart campus use cases', 'CS704|Cyber Security|3|Elective|Threat models;Malware;Forensics;Ethical hacking;Incident response', 'CS705|Project Phase I|4|Project|Literature survey;Design;Prototype;Review;Documentation'],
  8: ['CS801|Blockchain Technology|3|Elective|Ledgers;Consensus;Smart contracts;Applications;Security', 'CS802|Professional Ethics|2|Humanities|Engineering ethics;Responsibility;Safety;IPR;Global issues', 'CS803|Industry Internship|4|Project|Placement;Mentoring;Weekly logs;Report;Viva', 'CS804|Project Phase II|6|Project|Implementation;Evaluation;Paper writing;Demo;Final viva'],
};

// 5 Official Faculty Members
const FACULTY = [
  { name: 'Dr. Rajesh Sharma', roll_no: 'FAC001', dept: 'Computer Science & Engineering', role: 'Professor & HOD', email: 'rajesh.sharma@smartcampus.edu', cabin: 'Block A, Room 304', officeHours: 'Mon-Wed 14:00 - 16:00', expertise: 'Operating Systems & Distributed Systems' },
  { name: 'Prof. Ananya Iyer', roll_no: 'FAC002', dept: 'Information Technology', role: 'Associate Professor', email: 'ananya.iyer@smartcampus.edu', cabin: 'Block B, Room 212', officeHours: 'Tue-Thu 11:00 - 13:00', expertise: 'Cloud Computing & Web Technologies' },
  { name: 'Dr. Vikram Rao', roll_no: 'FAC003', dept: 'Computer Science & Engineering', role: 'Professor', email: 'vikram.rao@smartcampus.edu', cabin: 'Block A, Room 408', officeHours: 'Mon-Fri 15:00 - 17:00', expertise: 'Artificial Intelligence & Machine Learning' },
  { name: 'Prof. Meera Nair', roll_no: 'FAC004', dept: 'Information Technology', role: 'Associate Professor', email: 'meera.nair@smartcampus.edu', cabin: 'Block B, Room 105', officeHours: 'Wed-Fri 10:00 - 12:00', expertise: 'Database Management & Cyber Security' },
  { name: 'Dr. Suresh Kulkarni', roll_no: 'FAC005', dept: 'Computer Science & Engineering', role: 'Professor', email: 'suresh.kulkarni@smartcampus.edu', cabin: 'Block A, Room 201', officeHours: 'Mon-Thu 13:00 - 15:00', expertise: 'Algorithms & Discrete Mathematics' }
];

// 10 CSE Students - Gaurav is the primary sample demo student
const CSE_STUDENTS = [
  ['2024CS0042', 'Gaurav', 'gaurav.cs@smartcampus.edu', 1260, 0.82, '+91 98765 43210', 'B.Tech CSE Student focused on distributed systems and cloud engineering.'],
  ['2024CS0011', 'Pooja Verma', 'pooja.cs@smartcampus.edu', 1480, 0.88, '', ''],
  ['2024CS0023', 'Rahul Nair', 'rahul.cs@smartcampus.edu', 1190, 0.80, '', ''],
  ['2024CS0031', 'Aarav Mehta', 'aarav.cs@smartcampus.edu', 960, 0.77, '', ''],
  ['2024CS0056', 'Sneha Kulkarni', 'sneha.cs@smartcampus.edu', 1340, 0.85, '', ''],
  ['2024CS0068', 'Ishaan Gupta', 'ishaan.cs@smartcampus.edu', 720, 0.64, '', ''],
  ['2024CS0077', 'Neha Reddy', 'neha.cs@smartcampus.edu', 880, 0.76, '', ''],
  ['2024CS0084', 'Aditya Rao', 'aditya.cs@smartcampus.edu', 1050, 0.81, '', ''],
  ['2024CS0092', 'Ananya Deshmukh', 'ananya.cs@smartcampus.edu', 1210, 0.84, '', ''],
  ['2024CS0098', 'Varun Sen', 'varun.cs@smartcampus.edu', 840, 0.68, '', '']
];

// 10 IT Students
const IT_STUDENTS = [
  ['2024IT0001', 'Arjun Singhania', 'arjun.it@smartcampus.edu', 1390, 0.86],
  ['2024IT0002', 'Riya Mukherjee', 'riya.it@smartcampus.edu', 1420, 0.89],
  ['2024IT0003', 'Karthik Venkat', 'karthik.it@smartcampus.edu', 1150, 0.79],
  ['2024IT0004', 'Divya Patel', 'divya.it@smartcampus.edu', 1280, 0.83],
  ['2024IT0005', 'Rohan Joshi', 'rohan.it@smartcampus.edu', 690, 0.62],
  ['2024IT0006', 'Tanvi Bansal', 'tanvi.it@smartcampus.edu', 1310, 0.85],
  ['2024IT0007', 'Siddharth Roy', 'siddharth.it@smartcampus.edu', 990, 0.78],
  ['2024IT0008', 'Kavya Menon', 'kavya.it@smartcampus.edu', 1440, 0.90],
  ['2024IT0009', 'Manish Chawla', 'manish.it@smartcampus.edu', 740, 0.66],
  ['2024IT0010', 'Shreya Pillai', 'shreya.it@smartcampus.edu', 1180, 0.81]
];

function reset() {
  for (const t of ['users', 'subjects', 'attendance', 'attendance_log', 'marks', 'notices', 'notifications', 'records', 'automation_log', 'study_materials', 'planner_tasks', 'vehicles']) {
    try { db.exec(`DELETE FROM ${t}`); } catch {}
  }
  try { db.exec("DELETE FROM sqlite_sequence"); } catch {}
}

function seed() {
  const hash = bcrypt.hashSync('student123', 8);

  const mkUser = (roll, name, email, extra = {}) => Number(db.prepare(`
    INSERT INTO users(roll_no, name, email, password_hash, xp, role, dept, year, semester, phone, bio)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roll,
    name,
    email,
    hash,
    extra.xp ?? 0,
    extra.role ?? 'student',
    extra.dept ?? 'Computer Science & Engineering',
    extra.year ?? 2,
    extra.semester ?? 4,
    extra.phone ?? '',
    extra.bio ?? ''
  ).lastInsertRowid);

  // 1. Seed 10 CSE Students (Year 2, Sem 4 default)
  const cseUserIds = CSE_STUDENTS.map(([roll, name, email, xp, pct, phone, bio]) => ({
    id: mkUser(roll, name, email, { xp, dept: 'Computer Science & Engineering', year: 2, semester: 4, phone, bio }),
    roll, name, email
  }));

  // 2. Seed 10 IT Students (Year 2, Sem 4 default)
  const itUserIds = IT_STUDENTS.map(([roll, name, email, xp]) => ({
    id: mkUser(roll, name, email, { xp, dept: 'Information Technology', year: 2, semester: 4 }),
    roll, name, email
  }));

  // Dedicated 1st-Year / 1st-Sem Demo Student: Aarav Sharma (Freshman Cohort)
  const freshmanId = mkUser('2026CS0001', 'Aarav Sharma', 'aarav.1st@smartcampus.edu', {
    xp: 950,
    dept: 'Computer Science & Engineering',
    year: 1,
    semester: 1,
    phone: '+91 98765 11001',
    bio: '1st Year B.Tech CSE student exploring mathematical foundations and C programming.'
  });

  // Primary user for student portal demo is Gaurav (first CSE student)
  const me = cseUserIds[0].id;

  // 3. Seed 5 Faculty Members (both in users table & records table)
  FACULTY.forEach((f) => {
    mkUser(f.roll_no, f.name, f.email, { role: 'faculty', dept: f.dept });
    rec.add('faculty', null, {
      name: f.name,
      dept: f.dept,
      role: f.role,
      email: f.email,
      cabin: f.cabin,
      officeHours: f.officeHours,
      expertise: f.expertise,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });
  });

  // 4. Seed Admin
  const admin = mkUser('ADMIN001', 'Institutional Admin', 'admin@smartcampus.edu', { role: 'admin', dept: 'Administration', xp: 5000 });

  // 5. Seed Catalog of Subjects for Semesters 1 through 8
  const subjectMap = {};
  for (const [sem, list] of Object.entries(CATALOG)) {
    const sInt = Number(sem);
    list.forEach((entry, idx) => {
      const [code, name, credits, category, modules] = entry.split('|');
      const fac = FACULTY[idx % FACULTY.length].name;
      const r = db.prepare('INSERT INTO subjects(code, name, credits, sem, category, modules, faculty) VALUES(?, ?, ?, ?, ?, ?, ?)')
        .run(code, name, Number(credits), sInt, category, modules, fac);
      const subId = Number(r.lastInsertRowid);
      subjectMap[code] = subId;
    });
  }

  // 6. Seed Attendance and Marks across both Sem 1 (1st Year) and Sem 4 (2nd Year)
  const cohortSubjects = db.prepare('SELECT * FROM subjects WHERE sem IN (1, 4)').all();
  const allStudents = [...cseUserIds, ...itUserIds, { id: freshmanId, roll: '2026CS0001' }];

  allStudents.forEach((student, sIdx) => {
    const isDeficit = (student.roll === '2024CS0068' || student.roll === '2024CS0098' || student.roll === '2024IT0005' || student.roll === '2024IT0009');
    const baseRate = isDeficit ? 0.65 : (student.roll === '2024CS0042' ? 0.82 : (student.roll === '2026CS0001' ? 0.85 : (0.78 + (sIdx % 10) * 0.015)));

    cohortSubjects.forEach((sub, subIdx) => {
      const total = 40 + (subIdx * 2);
      const attended = Math.round(total * (baseRate + (subIdx % 3 === 0 ? 0.03 : -0.02)));
      db.prepare('INSERT INTO attendance(user_id, subject_id, attended, total) VALUES(?, ?, ?, ?)')
        .run(student.id, sub.id, attended, total);

      // Marks
      const internal = 21 + (sIdx % 4) + (subIdx % 3);
      const endsem = 55 + (sIdx % 12) + (subIdx % 6);
      db.prepare('INSERT INTO marks(user_id, subject_id, internal, endsem, assign_done, assign_total) VALUES(?, ?, ?, ?, ?, ?)')
        .run(student.id, sub.id, internal, endsem, 4, 5);
    });
  });

  // 7. Seed Daily Attendance Log across Current and Previous Month for Gaurav and Aarav
  const now = new Date();
  for (let i = -45; i <= 0; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + i);
    const dayOfWeek = dt.getDay();
    if (dayOfWeek === 0) continue; // Sunday no regular class
    const dateStr = dt.toISOString().slice(0, 10);
    const isPresent = (Math.abs(i) % 5 !== 0);
    const status = isPresent ? 'present' : 'absent';
    const method = isPresent ? (dayOfWeek === 1 || dayOfWeek === 3 ? 'Biometric Face Recognition' : (dayOfWeek === 2 || dayOfWeek === 4 ? 'Rolling Dynamic QR' : 'RFID Smart Card')) : 'None';
    try {
      db.prepare('INSERT INTO attendance_log(user_id, date, status, method) VALUES(?, ?, ?, ?)').run(me, dateStr, status, method);
      db.prepare('INSERT INTO attendance_log(user_id, date, status, method) VALUES(?, ?, ?, ?)').run(freshmanId, dateStr, status, method);
    } catch {}
  }

  // 8. Seed Study Materials across all 4 Academic Years (1-4)
  const sampleMaterials = [
    // Year 1 (Sem 1) - Complete curriculum materials for all 5 subjects
    { title: 'Engineering Mathematics I - Calculus & Matrices Lecture Notes', description: 'Comprehensive handwritten lecture notes on eigenvalues, multivariable calculus and infinite series.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'MA101', type: 'Lecture Notes', file_name: 'MA101_Calculus_Notes.pdf' },
    { title: 'Programming in C - Pointers, Recursion & File I/O Handbook', description: 'Module-by-module reference guide with code snippets for memory pointers, structs and file streams.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'CS101', type: 'Study Guide', file_name: 'CS101_C_Programming_Guide.pdf' },
    { title: 'Engineering Physics - Quantum Mechanics & Laser Optics Manual', description: 'Wave packet derivation, Schrödinger equation basics, semiconductor band gaps and laser physics.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'PH101', type: 'Formula Sheet', file_name: 'PH101_Physics_Formula_Sheet.pdf' },
    { title: 'Basic Electrical Engineering - AC Circuits & Network Theorems Guide', description: 'Solved numericals on Thévenin theorem, Norton theorem, maximum power transfer and 3-phase circuits.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'EE101', type: 'Lab Manual', file_name: 'EE101_Electrical_Lab_Manual.pdf' },
    { title: 'Communication Skills - Professional Writing & Presentation Framework', description: 'Technical documentation guidelines, executive summary structuring, and oral presentation tips.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'HS101', type: 'Reference Book', file_name: 'HS101_Technical_Writing.pdf' },
    { title: 'Engineering Mathematics I - Solved Past Examination Papers', description: 'Step-by-step solutions for university end-semester questions across differential equations and matrices.', dept: 'Computer Science & Engineering', year: 1, semester: 1, subject: 'MA101', type: 'Past Paper Solutions', file_name: 'MA101_Past_Papers.pdf' },

    // Year 1 (Sem 2)
    { title: 'Data Structures - Balanced Trees & Graph Algorithms', description: 'Detailed visual explanations of AVL trees, Dijkstra algorithm and BFS/DFS.', dept: 'Computer Science & Engineering', year: 1, semester: 2, subject: 'CS102', type: 'Ebook', file_name: 'CS102_Data_Structures.pdf' },

    // Year 2 (Sem 3 & 4) - Gaurav is in Sem 4!
    { title: 'Operating Systems - Process Scheduling & Concurrency', description: 'Prof. Rajesh Sharma comprehensive slides on CPU scheduling, mutexes, semaphores and deadlocks.', dept: 'Computer Science & Engineering', year: 2, semester: 4, subject: 'CS401', type: 'Lecture Slides', file_name: 'CS401_OS_Concurrency.pdf' },
    { title: 'Design & Analysis of Algorithms - Dynamic Programming Formula Sheet', description: 'Quick revision formulas and recurrence relations for DP and Greedy design techniques.', dept: 'Computer Science & Engineering', year: 2, semester: 4, subject: 'CS402', type: 'Formula Sheet', file_name: 'CS402_Algorithms_DP_CheatSheet.pdf' },
    { title: 'Computer Networks - TCP/IP & Socket Programming Reference', description: 'Lab manual for TCP/UDP socket development in C/Python with Wireshark packet traces.', dept: 'Computer Science & Engineering', year: 2, semester: 4, subject: 'CS403', type: 'Lab Manual', file_name: 'CS403_Computer_Networks_Lab.pdf' },
    { title: 'Software Engineering - Clean Architecture & Agile Sprint Guide', description: 'Agile development handbook covering user stories, burn-down charts, and SOLID principles.', dept: 'Computer Science & Engineering', year: 2, semester: 4, subject: 'CS404', type: 'Reference Book', file_name: 'CS404_Software_Engineering_Guide.pdf' },
    { title: 'Theory of Computation - Regular Languages & Turing Machines', description: 'Grammar derivation rules, pumping lemma proofs, and Halting problem decider models.', dept: 'Computer Science & Engineering', year: 2, semester: 4, subject: 'CS405', type: 'Past Paper Solutions', file_name: 'CS405_TOC_Solutions.pdf' },

    // Year 3 (Sem 5 & 6)
    { title: 'Artificial Intelligence - Search Algorithms & Knowledge Graph', description: 'A* search, minimax tree pruning, and first-order predicate logic representations.', dept: 'Computer Science & Engineering', year: 3, semester: 5, subject: 'CS502', type: 'Lecture Notes', file_name: 'CS502_AI_Notes.pdf' },
    { title: 'Machine Learning - Supervised Regression & SVM Classifier', description: 'Mathematical foundations of gradient descent, loss functions, and kernel tricks.', dept: 'Computer Science & Engineering', year: 3, semester: 6, subject: 'CS601', type: 'Lecture Slides', file_name: 'CS601_Machine_Learning.pdf' },

    // Year 4 (Sem 7 & 8)
    { title: 'Deep Learning - Convolutional Neural Networks & Transformers', description: 'Architecture breakdown of ResNet, Attention mechanisms, and LLM fine-tuning techniques.', dept: 'Computer Science & Engineering', year: 4, semester: 7, subject: 'CS701', type: 'Ebook', file_name: 'CS701_Deep_Learning_Architectures.pdf' },
    { title: 'Cloud Computing & Distributed Systems - Consensus & Microservices', description: 'Paxos and Raft consensus protocols, Kubernetes deployment and API gateways.', dept: 'Computer Science & Engineering', year: 4, semester: 8, subject: 'CS801', type: 'Reference Book', file_name: 'CS801_Cloud_Distributed_Systems.pdf' }
  ];

  sampleMaterials.forEach(m => {
    const sId = subjectMap[m.subject] || null;
    db.prepare(`
      INSERT INTO study_materials(title, description, dept, year, semester, subject_id, material_type, file_name, uploaded_by, status)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(m.title, m.description, m.dept, m.year, m.semester, sId, m.type, m.file_name, admin, 'Published');
  });

  // 9. Seed Planner Tasks for Gaurav (Year 2) and Aarav (Year 1)
  const gauravTasks = [
    { title: 'Review CPU Scheduling Algorithms (Round Robin & Priority)', subject: 'Operating Systems', date: d(0), time: '17:30', priority: 'High', completed: 0 },
    { title: 'Implement Bellman-Ford shortest path algorithm in C++', subject: 'Algorithms', date: d(1), time: '18:00', priority: 'Medium', completed: 0 },
    { title: 'Analyze Wireshark three-way handshake PCAP file', subject: 'Computer Networks', date: d(2), time: '16:00', priority: 'Low', completed: 0 },
    { title: 'Draft UML Class Diagram for Library Management', subject: 'Software Engineering', date: d(3), time: '19:00', priority: 'Medium', completed: 0 },
    { title: 'Solve TOC problem set 4 (Pumping Lemma on CFLs)', subject: 'Theory of Computation', date: d(-1), time: '20:00', priority: 'High', completed: 1 }
  ];
  gauravTasks.forEach(t => {
    db.prepare(`INSERT INTO planner_tasks(user_id, title, subject, date, time, priority, completed) VALUES(?, ?, ?, ?, ?, ?, ?)`)
      .run(me, t.title, t.subject, t.date, t.time, t.priority, t.completed);
  });

  const freshmanTasks = [
    { title: 'Solve Calculus Assignment 3 on Eigenvalues & Cayley-Hamilton', subject: 'Engineering Mathematics I', date: d(0), time: '16:30', priority: 'High', completed: 0 },
    { title: 'Implement pointer-based string manipulation functions in C', subject: 'Programming in C', date: d(1), time: '17:30', priority: 'Medium', completed: 0 },
    { title: 'Write experiment report on He-Ne Laser wavelength measurement', subject: 'Engineering Physics', date: d(2), time: '18:00', priority: 'Low', completed: 0 },
    { title: 'Solve Mesh & Nodal analysis numericals for DC bridge circuit', subject: 'Basic Electrical Engineering', date: d(3), time: '19:30', priority: 'Medium', completed: 0 },
    { title: 'Prepare 5-minute technical presentation slides on Linux OS', subject: 'Communication Skills', date: d(-1), time: '15:00', priority: 'High', completed: 1 }
  ];
  freshmanTasks.forEach(t => {
    db.prepare(`INSERT INTO planner_tasks(user_id, title, subject, date, time, priority, completed) VALUES(?, ?, ?, ?, ?, ?, ?)`)
      .run(freshmanId, t.title, t.subject, t.date, t.time, t.priority, t.completed);
  });

  // 10. Seed Student Vehicles
  db.prepare(`INSERT INTO vehicles(user_id, vehicle_type, reg_number, model, slot_assigned) VALUES(?, ?, ?, ?, ?)`)
    .run(me, 'Two-Wheeler', 'MH-12-AB-4042', 'Yamaha FZ v3 (Matte Black)', 'P-04');
  db.prepare(`INSERT INTO vehicles(user_id, vehicle_type, reg_number, model, slot_assigned) VALUES(?, ?, ?, ?, ?)`)
    .run(freshmanId, 'Two-Wheeler', 'MH-12-CD-2026', 'Honda Activa 6G (Pearl White)', 'P-07');

  // 11. Seed Career Placement Openings with Honest Demo Label (Year 1 vs Upper Years)
  const sampleJobs = [
    // Year 1 Openings
    { title: 'Freshman Summer Coding Fellowship (1st Year Open)', company: 'Google DSC / Campus Innovation Labs', location: 'Campus / Remote', ctc: '20,000 / month', deadline: d(25), eligibleSem: 1, eligibleDept: 'Computer Science & Engineering', skills: 'C, Data Structures Basics, Problem Solving, Git', type: 'Internship', status: 'Active (Demo)' },
    { title: 'Junior Open-Source Contributor Sprint', company: 'Linux Foundation Campus Chapter', location: 'Remote', ctc: '15,000 Grant', deadline: d(30), eligibleSem: 1, eligibleDept: 'Computer Science & Engineering', skills: 'C, Linux, Markdown, Git', type: 'Internship', status: 'Active (Demo)' },

    // Year 2 / Sem 4 Openings
    { title: 'Software Engineer - Distributed Systems', company: 'Nexus Technologies', location: 'Pune / Hybrid', ctc: '14.5 LPA', deadline: d(15), eligibleSem: 4, eligibleDept: 'Computer Science & Engineering', skills: 'Go, Docker, Distributed Systems, Linux', type: 'Full Time', status: 'Active (Demo)' },
    { title: 'Cloud Platform Intern', company: 'Apex Cloud Solutions', location: 'Bengaluru / Remote', ctc: '45,000 / month', deadline: d(20), eligibleSem: 4, eligibleDept: 'Computer Science & Engineering', skills: 'Python, AWS, Terraform, CI/CD', type: 'Internship', status: 'Active (Demo)' },
    { title: 'Full-Stack Developer Trainee', company: 'InnoTech Labs', location: 'Hyderabad / On-site', ctc: '10.2 LPA', deadline: d(30), eligibleSem: 4, eligibleDept: 'Information Technology', skills: 'TypeScript, React, Node.js, PostgreSQL', type: 'Full Time', status: 'Active (Demo)' }
  ];
  sampleJobs.forEach(j => rec.add('job', null, j));

  // 12. Seed Institutional Notices with Cohort Isolation
  const sampleNotices = [
    // Year 1 Notices
    { title: 'First-Year Induction & Freshmen Orientation 2026', body: 'Welcome to Smart Campus. The mandatory induction program for all 1st Year B.Tech students will be held in the University Auditorium from 10:00 AM.', summary: 'Mandatory induction for 1st Year B.Tech students in University Auditorium.', category: 'Academic', priority: 'High', target_year: 1, target_dept: 'Computer Science & Engineering' },
    { title: 'Semester 1 Foundation Mathematics & C Programming Doubt Clinics', body: 'Department of CSE has arranged special evening tutorial sessions for 1st Year students in Computer Lab 1 every Tuesday and Thursday.', summary: 'Evening tutorial clinics in Computer Lab 1 for 1st Year CSE students.', category: 'Academic', priority: 'Medium', target_year: 1, target_dept: 'Computer Science & Engineering' },
    { title: 'Freshman Library Card & Digital Portal Activation Notice', body: 'All newly admitted 1st year students are requested to collect their physical smart ID cards and verify their digital library credentials at the central circulation desk.', summary: 'Smart ID and Digital Library credential verification for 1st Year cohort.', category: 'Services', priority: 'Low', target_year: 1, target_dept: null },

    // Year 2 Notices
    { title: 'Mid-Semester Examinations Commencement Schedule for Semester 4', body: 'The university examination cell has released the academic calendar and mid-term schedule for B.Tech Semester 4. Hall tickets will be verified online.', summary: 'Mid-term exams commence from November 20. Check syllabus roadmap for unit distributions.', category: 'Academic', priority: 'High', target_year: 2, target_dept: 'Computer Science & Engineering' },
    { title: 'Annual Inter-College Hackathon 2026 for Year 2 CSE/IT', body: 'Teams of 3-4 students from CSE and IT are invited to submit project proposals for the Smart City Innovation Sprint.', summary: 'Cash prizes of INR 2,00,000 for top 3 teams. Registration closes on November 15.', category: 'Events', priority: 'Medium', target_year: 2, target_dept: 'Computer Science & Engineering' },

    // General Notices (All students)
    { title: 'Campus Wi-Fi Maintenance Window Notice', body: 'Central IT infrastructure team will be upgrading access point controllers across Hostel Blocks and Academic Complexes this Sunday from 02:00 AM to 06:00 AM.', summary: 'Brief network disruptions expected on Sunday morning.', category: 'Maintenance', priority: 'Low', target_year: null, target_dept: null },
    { title: 'Institutional Clean Energy & Smart Transit Initiative', body: 'Electric campus shuttles now operate every 15 minutes between the Main Gate, Academic Blocks and Hostel Complex.', summary: 'Free electric transit active across campus every 15 minutes.', category: 'Services', priority: 'Low', target_year: null, target_dept: null }
  ];
  sampleNotices.forEach(n => {
    db.prepare('INSERT INTO notices(title, body, summary, category, priority, target_year, target_dept) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .run(n.title, n.body, n.summary, n.category, n.priority, n.target_year, n.target_dept);
  });

  // 13. Seed Fee Structure
  rec.add('fee', me, { title: 'Tuition Fee - Year 2 (Sem 4)', assessed: 65000, paid: 65000, due: 0, status: 'Paid', receipt: 'REC-2026-0428' });
  rec.add('fee', me, { title: 'Laboratory & Examination Fee', assessed: 12000, paid: 12000, due: 0, status: 'Paid', receipt: 'REC-2026-0429' });
  rec.add('fee', freshmanId, { title: 'Tuition Fee - Year 1 (Sem 1)', assessed: 60000, paid: 60000, due: 0, status: 'Paid', receipt: 'REC-2026-1001' });
  rec.add('fee', freshmanId, { title: 'Freshman Induction & Library Deposit', assessed: 10000, paid: 10000, due: 0, status: 'Paid', receipt: 'REC-2026-1002' });

  // 14. Seed Parking Slots (12 slots)
  for (let i = 1; i <= 12; i++) {
    rec.add('parking_slot', null, {
      slot: `P-${String(i).padStart(2, '0')}`,
      type: i <= 8 ? '2-wheeler' : '4-wheeler',
      taken: i === 4 ? true : (i % 3 === 0), // P-04 is Gaurav's slot
      reservedFor: i === 4 ? '2024CS0042' : null
    });
  }

  // 15. Seed Digital Library Textbooks & Reference Ebooks (Cohort Isolated)
  const sampleEbooks = [
    // Year 1 / Sem 1
    { title: 'Higher Engineering Mathematics - B.S. Grewal (10th Ed)', subject: 'Engineering Mathematics I', year: 1, sem: 1, description: 'Standard university textbook covering linear algebra, calculus, and vector spaces.', file_name: 'Grewal_Engineering_Math.pdf' },
    { title: 'The C Programming Language (ANSI C) - Kernighan & Ritchie', subject: 'Programming in C', year: 1, sem: 1, description: 'The definitive classic reference for C programming, pointers, and standard I/O library.', file_name: 'K_and_R_C_Programming.pdf' },
    { title: 'Concepts of Modern Physics - Arthur Beiser (6th Edition)', subject: 'Engineering Physics', year: 1, sem: 1, description: 'Core textbook for wave particle duality, quantum states, and solid state semiconductors.', file_name: 'Beiser_Modern_Physics.pdf' },
    { title: 'Basic Electrical Engineering - D.C. Kulshreshtha', subject: 'Basic Electrical Engineering', year: 1, sem: 1, description: 'Comprehensive analysis of AC circuits, transformer operations, and electric machines.', file_name: 'Kulshreshtha_Basic_EE.pdf' },
    { title: 'Technical Communication: Principles and Practice - Meenakshi Raman', subject: 'Communication Skills', year: 1, sem: 1, description: 'Practical guide for technical reports, professional correspondence, and group discussions.', file_name: 'Raman_Communication_Skills.pdf' },

    // Year 2 / Sem 4
    { title: 'Operating System Concepts - Silberschatz, Galvin & Gagne', subject: 'Operating Systems', year: 2, sem: 4, description: 'Standard dinosaur book on processes, memory virtualization, storage and deadlocks.', file_name: 'Silberschatz_Operating_Systems.pdf' },
    { title: 'Introduction to Algorithms - Cormen, Leiserson, Rivest & Stein (CLRS)', subject: 'Design & Analysis of Algorithms', year: 2, sem: 4, description: 'Authoritative algorithms manual covering greedy algorithms, dynamic programming, and graphs.', file_name: 'CLRS_Algorithms.pdf' },
    { title: 'Computer Networking: A Top-Down Approach - Kurose & Ross', subject: 'Computer Networks', year: 2, sem: 4, description: 'Layer-by-layer reference covering TCP/IP, routing algorithms, socket coding and security.', file_name: 'Kurose_Computer_Networking.pdf' },
    { title: 'Software Engineering: A Practitioner’s Approach - Roger Pressman', subject: 'Software Engineering', year: 2, sem: 4, description: 'Comprehensive guide to software architecture, UML modeling, agile sprints and CI/CD.', file_name: 'Pressman_Software_Engineering.pdf' },
    { title: 'Introduction to the Theory of Computation - Michael Sipser', subject: 'Theory of Computation', year: 2, sem: 4, description: 'Standard reference on regular languages, context-free grammars, Turing machines, and NP-completeness.', file_name: 'Sipser_Theory_Of_Computation.pdf' }
  ];
  sampleEbooks.forEach(b => rec.add('library_file', null, b));

  // 16. Seed Student Projects
  const pj = rec.add('project', me, { title: 'AI Smart Campus System', desc: 'Unified student services, attendance tracking and academic intelligence platform.', guide: 'Dr. Vikram Rao', status: 'Active', progress: 80 });
  rec.add('milestone', me, { project_id: pj.id, title: 'Requirements & Architecture Specification', due: d(-30), done: true });
  rec.add('milestone', me, { project_id: pj.id, title: 'Database Schema & Secure REST APIs', due: d(-10), done: true });
  rec.add('milestone', me, { project_id: pj.id, title: 'Student Portal & Admin Refinements', due: d(5), done: false });

  // 17. Seed Helpdesk Tickets
  rec.add('ticket', me, { title: 'Inquiry regarding dual-monitor setup in Lab 3', category: 'Academic / Lab', desc: 'Can students access secondary monitors for distributed computing simulations?', status: 'Resolved', resolution: 'Permitted during scheduled lab hours. Contact Lab Incharge.', priority: 'Low' });

  // 18. Initial Notification
  notify(me, 'Welcome to Smart Campus. Your semester 4 academic dashboard is ready.', 'info', 'welcome');
  notify(freshmanId, 'Welcome to Smart Campus! Your 1st-Year induction, schedule and foundation materials are ready.', 'info', 'welcome_1st');

  return { me, freshmanId, admin };
}

function ensureSeeded() {
  const n = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (!n) { seed(); console.log('[seed] demo data created'); return true; }
  return false;
}

if (require.main === module) {
  reset();
  seed();
  console.log('Seeded successfully with 10 CSE Students, 10 IT Students, 1st-Year Freshman, and 5 Faculty.');
  console.log('Demo student (Year 2): 2024CS0042 / student123');
  console.log('Demo student (Year 1): 2026CS0001 / student123');
  console.log('Demo admin login:      ADMIN001 / student123');
}
module.exports = { ensureSeeded, reset, seed };
