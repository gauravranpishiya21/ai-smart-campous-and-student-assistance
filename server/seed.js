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
  { name: 'Dr. Rajesh Sharma', roll_no: 'FAC001', dept: 'Computer Science & Engineering', role: 'Professor & HOD', email: 'rajesh.sharma@smartcampus.edu', expertise: 'Operating Systems & Distributed Systems' },
  { name: 'Prof. Ananya Iyer', roll_no: 'FAC002', dept: 'Information Technology', role: 'Associate Professor', email: 'ananya.iyer@smartcampus.edu', expertise: 'Cloud Computing & Web Technologies' },
  { name: 'Dr. Vikram Rao', roll_no: 'FAC003', dept: 'Computer Science & Engineering', role: 'Professor', email: 'vikram.rao@smartcampus.edu', expertise: 'Artificial Intelligence & Machine Learning' },
  { name: 'Prof. Meera Nair', roll_no: 'FAC004', dept: 'Information Technology', role: 'Associate Professor', email: 'meera.nair@smartcampus.edu', expertise: 'Database Management & Cyber Security' },
  { name: 'Dr. Suresh Kulkarni', roll_no: 'FAC005', dept: 'Computer Science & Engineering', role: 'Professor', email: 'suresh.kulkarni@smartcampus.edu', expertise: 'Algorithms & Discrete Mathematics' }
];

// 10 CSE Students
const CSE_STUDENTS = [
  ['2024CS0042', 'Gaurav Sharma', 'gaurav.cs@smartcampus.edu', 1260, 0.82],
  ['2024CS0011', 'Pooja Verma', 'pooja.cs@smartcampus.edu', 1480, 0.88],
  ['2024CS0023', 'Rahul Nair', 'rahul.cs@smartcampus.edu', 1190, 0.80],
  ['2024CS0031', 'Aarav Mehta', 'aarav.cs@smartcampus.edu', 960, 0.77],
  ['2024CS0056', 'Sneha Kulkarni', 'sneha.cs@smartcampus.edu', 1340, 0.85],
  ['2024CS0068', 'Ishaan Gupta', 'ishaan.cs@smartcampus.edu', 720, 0.64], // Low attendance deficit
  ['2024CS0077', 'Neha Reddy', 'neha.cs@smartcampus.edu', 880, 0.76],
  ['2024CS0084', 'Aditya Rao', 'aditya.cs@smartcampus.edu', 1050, 0.81],
  ['2024CS0092', 'Ananya Deshmukh', 'ananya.cs@smartcampus.edu', 1210, 0.84],
  ['2024CS0098', 'Varun Sen', 'varun.cs@smartcampus.edu', 840, 0.68]  // Low attendance deficit
];

// 10 IT Students
const IT_STUDENTS = [
  ['2024IT0001', 'Arjun Singhania', 'arjun.it@smartcampus.edu', 1390, 0.86],
  ['2024IT0002', 'Riya Mukherjee', 'riya.it@smartcampus.edu', 1420, 0.89],
  ['2024IT0003', 'Karthik Venkat', 'karthik.it@smartcampus.edu', 1150, 0.79],
  ['2024IT0004', 'Divya Patel', 'divya.it@smartcampus.edu', 1280, 0.83],
  ['2024IT0005', 'Rohan Joshi', 'rohan.it@smartcampus.edu', 690, 0.62], // Low attendance deficit
  ['2024IT0006', 'Tanvi Bansal', 'tanvi.it@smartcampus.edu', 1310, 0.85],
  ['2024IT0007', 'Siddharth Roy', 'siddharth.it@smartcampus.edu', 990, 0.78],
  ['2024IT0008', 'Kavya Menon', 'kavya.it@smartcampus.edu', 1440, 0.90],
  ['2024IT0009', 'Manish Chawla', 'manish.it@smartcampus.edu', 740, 0.66], // Low attendance deficit
  ['2024IT0010', 'Shreya Pillai', 'shreya.it@smartcampus.edu', 1180, 0.81]
];

function reset() {
  for (const t of ['users', 'subjects', 'attendance', 'attendance_log', 'marks', 'notices', 'notifications', 'records', 'automation_log']) {
    db.exec(`DELETE FROM ${t}`);
  }
  db.exec("DELETE FROM sqlite_sequence");
}

function seed() {
  const hash = bcrypt.hashSync('student123', 8);

  const mkUser = (roll, name, email, extra = {}) => Number(db.prepare(`
    INSERT INTO users(roll_no, name, email, password_hash, xp, role, dept, year, semester)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roll,
    name,
    email,
    hash,
    extra.xp ?? 0,
    extra.role ?? 'student',
    extra.dept ?? 'Computer Science & Engineering',
    extra.year ?? 2,
    extra.semester ?? 4
  ).lastInsertRowid);

  // 1. Seed 10 CSE Students
  const cseUserIds = CSE_STUDENTS.map(([roll, name, email, xp]) => ({
    id: mkUser(roll, name, email, { xp, dept: 'Computer Science & Engineering' }),
    roll, name, email
  }));

  // 2. Seed 10 IT Students
  const itUserIds = IT_STUDENTS.map(([roll, name, email, xp]) => ({
    id: mkUser(roll, name, email, { xp, dept: 'Information Technology' }),
    roll, name, email
  }));

  // Primary user for student portal demo is Gaurav Sharma (first CSE student)
  const me = cseUserIds[0].id;

  // 3. Seed 5 Faculty Members (both in users table & records table)
  FACULTY.forEach((f) => {
    mkUser(f.roll_no, f.name, f.email, { role: 'faculty', dept: f.dept });
    rec.add('faculty', null, {
      name: f.name,
      dept: f.dept,
      role: f.role,
      email: f.email,
      expertise: f.expertise
    });
  });

  // 4. Seed Admin Account
  const admin = mkUser('ADMIN001', 'Campus Admin', 'admin@smartcampus.edu', { role: 'admin', dept: 'Institutional Administration' });

  // 4b. Seed Parent Account (linked to student 2024CS0042)
  mkUser('PARENT001', 'Sunita Sharma (Parent)', 'parent.sharma@family.org', { role: 'parent', dept: 'Parent & Guardian Council' });

  // 4c. Seed Security Staff Account
  mkUser('SEC001', 'Officer Vikram Singh', 'security.post1@smartcampus.edu', { role: 'security', dept: 'Campus Safety & Physical Security' });

  // 5. Seed Catalog Subjects
  const subIds = {};
  const ins = db.prepare('INSERT INTO subjects(code, name, credits, sem, category, modules, faculty, prereq) VALUES(?, ?, ?, ?, ?, ?, ?, ?)');
  let fi = 0;
  for (const [sem, list] of Object.entries(CATALOG)) {
    list.forEach((line, i) => {
      const [code, name, cr, cat, mods] = line.split('|');
      const id = Number(ins.run(
        code,
        name,
        Number(cr),
        Number(sem),
        cat,
        mods,
        pick(FACULTY, fi++).name,
        i === 0 || sem == 1 ? 'None' : pick(CATALOG[sem - 1], i).split('|')[1]
      ).lastInsertRowid);
      (subIds[sem] ||= []).push(id);
    });
  }

  // 6. Seed Marks + Attendance for all 20 Students
  const allStudents = [
    ...CSE_STUDENTS.map((item, idx) => ({ uid: cseUserIds[idx].id, targetAtt: item[4], index: idx, dept: 'CSE' })),
    ...IT_STUDENTS.map((item, idx) => ({ uid: itUserIds[idx].id, targetAtt: item[4], index: idx + 10, dept: 'IT' }))
  ];

  allStudents.forEach(({ uid, targetAtt, index }) => {
    // Sems 1, 2, 3 historical marks
    for (const sem of [1, 2, 3]) {
      subIds[sem].forEach((sid, i) => {
        const skill = targetAtt;
        const t = Math.min(97, Math.round(100 * (skill + (((i * 7 + index * 3) % 11) - 5) / 60)));
        const internal = Math.round((t * 0.25) * 2) / 2;
        const endsem = Math.round(t * 0.75);
        db.prepare('INSERT INTO marks VALUES(?, ?, ?, ?, ?, ?)').run(uid, sid, Math.min(25, internal), Math.min(75, endsem), 5, 5);
      });
    }

    // Sem 4 (Current Semester) Attendance and CIA Internals
    subIds[4].forEach((sid, i) => {
      const tot = [40, 42, 41, 38, 39][i];
      // compute attended classes according to student's target attendance
      const factor = (targetAtt + (((i * 3 + index) % 7) - 3) * 0.02);
      const att = Math.max(18, Math.min(tot, Math.round(tot * factor)));
      db.prepare('INSERT INTO attendance VALUES(?, ?, ?, ?)').run(uid, sid, att, tot);

      const baseInternal = targetAtt > 0.75 ? 18 : 13;
      const internal = Math.min(25, Math.max(10, baseInternal + ((index + i * 2) % 6)));
      const assignDone = targetAtt > 0.75 ? 4 + (i % 2) : 3;
      db.prepare('INSERT INTO marks(user_id, subject_id, internal, endsem, assign_done, assign_total) VALUES(?, ?, ?, NULL, ?, ?)')
        .run(uid, sid, internal, assignDone, 5);
    });

    // Seed fees for all students
    const hasDues = (index % 3 === 0);
    const paidSem4 = hasDues ? 50000 : 87000;
    [[1, 85000, 85000], [2, 85000, 85000], [3, 87000, 87000], [4, 87000, paidSem4]].forEach(([semester, assessed, paid]) => {
      rec.add('fee', uid, { semester, assessed, paid });
    });
    rec.add('receipt', uid, {
      no: `RCT-2026-${String(uid).padStart(4, '0')}`,
      amount: paidSem4,
      date: d(-25),
      txn: `TXN${8800000000 + uid}`,
      status: 'Paid'
    });
  });

  // 7. Attendance Log for primary student (last 42 days, weekdays)
  for (let i = 42; i >= 1; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    if ([0, 6].includes(dt.getDay())) continue;
    const present = i > 28 ? (i % 7 !== 0) : i > 14 ? (i % 4 !== 0) : (i % 5 !== 0);
    db.prepare('INSERT OR IGNORE INTO attendance_log(user_id, date, status) VALUES(?, ?, ?)').run(me, dt.toISOString().slice(0, 10), present ? 'present' : 'absent');
  }

  // 8. Timetable
  const s4 = CATALOG[4].map((l) => l.split('|')[1]);
  const rooms = ['LHC-201', 'LHC-203', 'Lab 4', 'LHC-105', 'Seminar Hall'];
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach((day, di) => {
    rec.add('timetable', null, {
      day,
      slots: [0, 1, 2, 3].map((k) => {
        const idx = (di + k) % 5;
        return { subject: s4[idx], room: rooms[(idx + di) % 5], faculty: pick(FACULTY, idx).name };
      })
    });
  });

  // 9. Notices
  const notices = [
    ['Mid-Semester Examination Schedule Released', 'The mid-semester examinations will commence on ' + d(9).split('-').reverse().join('/') + '. Students must carry their ID card and hall ticket. Detailed timetable is available in the Exam Schedule tab. Students with attendance below 75% must meet their mentor before the exams.', 'Exams', 'High'],
    ['Campus Placement Drive: TCS, Infosys & Wipro', 'The Training and Placement Cell announces the placement drive for final-year students on 15 Nov 2026. Eligible students must update their resume and register before 10 Nov 2026. Pre-placement talks will be held in the main auditorium.', 'Placement', 'Medium'],
    ['Library Timings Extended During Exams', 'The central library will remain open from 8 AM to 11 PM during the examination period. Digital library access is available 24x7 with your college credentials. Silence must be maintained in reading halls.', 'Library', 'Low'],
    ['Hackathon 2026: Build for Campus', 'The annual college hackathon "Build for Campus" is scheduled for 22 Nov 2026. Teams of up to four can register through the Community Hub. Winning teams receive cash prizes and internship opportunities.', 'Events', 'Medium'],
    ['Hostel Fee Payment Last Date', 'Hostel fee for the odd semester must be paid by 5 Nov 2026 to avoid a late fine of Rs. 500. Payment can be made online through the Academics & Fees section.', 'Fees', 'High']
  ];
  for (const [title, body, cat, pr] of notices) {
    db.prepare('INSERT INTO notices(title, body, summary, category, priority) VALUES(?, ?, ?, ?, ?)').run(title, body, ai.summarizeNotice(body), cat, pr);
  }

  // 10. Calendar Events + Exams
  [['Internal Assessment II', 7, 'exam'], ['Mid-Semester Exams Begin', 9, 'exam'], ['Project Review 1', 12, 'assignment'], ['AI/ML Workshop', 15, 'class'], ['Hackathon: Build for Campus', 24, 'meeting'], ['Project Review 2', 33, 'assignment'], ['Guest Lecture: Cloud Careers', 18, 'class'], ['Tech Fest Inauguration', 40, 'meeting'], ['End-Semester Exams Begin', 55, 'exam']]
    .forEach(([title, off, type]) => rec.add('event', null, { title, date: d(off), type }));
  CATALOG[4].forEach((l, i) => rec.add('exam', null, { subject: l.split('|')[1], type: i % 2 ? 'Mid-Sem' : 'Internal', date: d(9 + i * 2), time: i % 2 ? '14:00 - 16:00' : '10:00 - 12:00', room: pick(['Exam Hall A', 'Exam Hall B', 'LHC-201'], i) }));

  // 11. Initial student profile data
  rec.add('wallet', me, { balance: 1200 });
  rec.add('planner', me, { targetCgpa: 9, studyHours: 5 });
  rec.add('resume', me, { name: 'Gaurav Sharma', email: 'gaurav.cs@smartcampus.edu', summary: 'Second-year CSE student passionate about web development, distributed systems and AI. Built a campus attendance app with Node.js and SQL.' });

  // 12. Starter Campus Jobs & Services
  [['Software Engineer', 'TCS', 'full-time', '7 LPA', 'Java, SQL, Data Structures', 'Digital hiring drive for 2027 batch.'], ['Associate Developer', 'Infosys', 'full-time', '6.5 LPA', 'Python, SQL, Communication', 'Specialist programmer track.'], ['AI/ML Intern', 'Zoho', 'internship', '25k / month', 'Python, Machine Learning, NLP', '6-month paid internship.'], ['Web Dev Intern', 'Razorpay', 'internship', '30k / month', 'JavaScript, React, Node', 'Remote friendly.'], ['Cloud Engineer', 'Wipro', 'full-time', '6 LPA', 'AWS, Linux, Docker', 'Cloud infra role.'], ['Data Analyst Intern', 'Mu Sigma', 'internship', '20k / month', 'SQL, Excel, Power BI', 'Analytics bootcamp.']]
    .forEach(([title, company, type, pay, skills, desc]) => rec.add('job', null, { title, company, type, pay, skills, desc }));
  rec.add('interview', me, { company: 'Zoho', role: 'AI/ML Intern', date: d(6), mode: 'Online · Google Meet' });

  [['Operating Systems Notes', 'Computer Science', 'Processes, scheduling, memory and file systems - exam oriented notes.'], ['DBMS Quick Revision', 'Computer Science', 'ER diagrams, normalization and SQL cheat-sheet.'], ['Engineering Mathematics Formula Book', 'Mathematics', 'All key formulas for calculus, matrices and series.'], ['Computer Networks Unit Notes', 'Computer Science', 'OSI model, TCP/IP and routing explained.'], ['Algorithm Design Handbook', 'Computer Science', 'Greedy, DP and divide-and-conquer with worked examples.']]
    .forEach(([title, subject, description]) => rec.add('library_file', null, { title, subject, description }));
  rec.add('borrow', me, { title: 'Operating System Concepts (Silberschatz)', borrowed: d(-12), due: d(2), status: 'Borrowed' });
  rec.add('borrow', me, { title: 'Introduction to Algorithms (CLRS)', borrowed: d(-40), due: d(-26), status: 'Returned' });

  [['GATE', 'GATE CSE Full Mock 1', 180, 65], ['GATE', 'GATE Aptitude Sectional', 60, 30], ['GATE', 'GATE OS & DBMS Topic Test', 90, 40], ['NEET', 'NEET Biology Mock', 180, 90], ['UPSC', 'UPSC Prelims GS Paper I', 120, 100], ['CAT', 'CAT Quant Sectional', 40, 22]]
    .forEach(([exam, title, mins, qs]) => rec.add('mocktest', null, { exam, title, mins, qs }));

  [['Operating System Concepts', 'Book', 650], ['Algorithms Unlocked', 'Book', 520], ['Campus Hoodie', 'Merchandise', 799], ['College T-Shirt', 'Merchandise', 349], ['Notebook Pack (5)', 'Stationery', 250], ['Gel Pen Set', 'Stationery', 120]]
    .forEach(([name, category, price]) => rec.add('store_item', null, { name, category, price }));
  [['Masala Dosa', 60], ['Veg Biryani', 90], ['Paneer Wrap', 80], ['Filter Coffee', 25], ['Samosa (2)', 30], ['Fresh Lime Soda', 35]].forEach(([name, price]) => rec.add('menu_item', null, { name, price }));

  for (let i = 1; i <= 12; i++) rec.add('parking_slot', null, { slot: `P-${String(i).padStart(2, '0')}`, type: i <= 8 ? '2-wheeler' : '4-wheeler', taken: i % 3 === 0 });
  [['Cloud Careers Webinar', 3, 'Live'], ['AI in Healthcare Guest Lecture', 8, 'Upcoming'], ['Resume Workshop', 14, 'Upcoming']].forEach(([title, off, status]) => rec.add('live_event', null, { title, date: d(off), status }));

  // Sample Helpdesk Grievances
  rec.add('ticket', cseUserIds[5].id, { title: 'Wi-Fi connection drop in Hostel Block C', category: 'IT / Wi-Fi', desc: 'Frequent disconnections and low signal strength on the 2nd floor.', status: 'In Progress', priority: 'Medium' });
  rec.add('ticket', itUserIds[4].id, { title: 'Lab 4 workstation display flickering', category: 'Maintenance', desc: 'Desktop PC #12 screen flickers repeatedly during lab sessions.', status: 'Open', priority: 'High' });

  // Sample Student Leave Requests
  rec.add('leave', cseUserIds[2].id, { from: d(3), to: d(5), reason: 'Family medical emergency', status: 'Pending' });
  rec.add('leave', itUserIds[1].id, { from: d(-4), to: d(-2), reason: 'Attended Inter-College Tech Symposium', status: 'Approved', remarks: 'Duty Leave approved' });

  // Community posts
  [['general', 'Campus Admin', 'Welcome to the new academic session! All course syllabus and schedules have been updated.'], ['tech', 'Gaurav Sharma', 'Does anyone have good references for multivariable calculus practice questions?'], ['hostel', 'Rahul Nair', 'Mess committee meeting this Thursday at 6 PM.']]
    .forEach(([channel, name, message]) => rec.add('chat', null, { channel, name, message }));

  const pj = rec.add('project', me, { title: 'AI Powered Campus Assistant', desc: 'Chatbot, attendance analytics and service portals for university students.', guide: 'Dr. Vikram Rao', status: 'Active', progress: 55 });
  rec.add('milestone', me, { project_id: pj.id, title: 'Requirements & Architecture', due: d(-10), done: true });
  rec.add('milestone', me, { project_id: pj.id, title: 'Backend APIs & SQLite Database', due: d(-2), done: true });
  rec.add('milestone', me, { project_id: pj.id, title: 'Admin Console & Telemetry Dashboards', due: d(5), done: false });
  rec.add('update', me, { project_id: pj.id, value: 55, note: 'Completed Admin Panel and institutional database seeding.' });

  notify(me, 'Welcome to the AI-Powered Smart Campus System. Your AI advisor is ready.', 'info', 'welcome');
  return { me, admin };
}

function ensureSeeded() {
  const n = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (!n) { seed(); console.log('[seed] demo data created'); return true; }
  return false;
}

if (require.main === module) {
  if (process.argv.includes('--reset')) reset();
  seed();
  console.log('Seeded successfully with 10 CSE Students, 10 IT Students, and 5 Faculty.');
  console.log('Demo student login: 2024CS0042 / student123 (or 2024IT0001 / student123)');
  console.log('Demo admin login:   ADMIN001 / student123');
}
module.exports = { ensureSeeded, reset, seed };
