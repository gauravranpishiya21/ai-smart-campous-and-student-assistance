// Comprehensive Academic Calendar & Working Mechanism Engine
// Aligned with AICTE / UGC Autonomous Engineering Guidelines

const HOLIDAYS_2026_2027 = [
  { date: '2026-08-15', title: 'Independence Day', type: 'holiday', category: 'National Holiday', desc: 'Flag hoisting ceremony and national observance.' },
  { date: '2026-08-25', title: 'Janmashtami', type: 'holiday', category: 'Festival Holiday', desc: 'University holiday.' },
  { date: '2026-09-07', title: 'Ganesh Chaturthi', type: 'holiday', category: 'Festival Holiday', desc: 'Campus celebration & holiday.' },
  { date: '2026-09-16', title: 'Milad-un-Nabi', type: 'holiday', category: 'Gazetted Holiday', desc: 'University holiday.' },
  { date: '2026-10-02', title: 'Mahatma Gandhi Jayanti', type: 'holiday', category: 'National Holiday', desc: 'Swachh Campus drive & observance.' },
  { date: '2026-10-11', title: 'Maha Navami / Ayudha Puja', type: 'holiday', category: 'Festival Holiday', desc: 'Laboratory equipment blessings & holiday.' },
  { date: '2026-10-12', title: 'Vijaya Dashami (Dussehra)', type: 'holiday', category: 'Festival Holiday', desc: 'University closed.' },
  { date: '2026-10-17', title: 'Maharishi Valmiki Jayanti', type: 'holiday', category: 'Gazetted Holiday', desc: 'Institutional holiday.' },
  { date: '2026-10-31', title: 'Naraka Chaturdashi / Diwali Break', type: 'holiday', category: 'Festival Recess', desc: 'Autumn festival break begins.' },
  { date: '2026-11-01', title: 'Kannada Rajyotsava / Deepavali', type: 'holiday', category: 'State Holiday', desc: 'Karnataka foundation day & Deepavali.' },
  { date: '2026-11-02', title: 'Diwali Balipadyami', type: 'holiday', category: 'Festival Recess', desc: 'Festival holiday.' },
  { date: '2026-11-15', title: 'Guru Nanak Jayanti', type: 'holiday', category: 'Gazetted Holiday', desc: 'University closed.' },
  { date: '2026-12-25', title: 'Christmas Day', type: 'holiday', category: 'Festival Holiday', desc: 'Winter recess commences.' },
  { date: '2027-01-01', title: 'New Year Day', type: 'holiday', category: 'University Holiday', desc: 'Campus closed for New Year.' },
  { date: '2027-01-14', title: 'Makar Sankranti / Pongal', type: 'holiday', category: 'Harvest Festival', desc: 'Traditional harvest festival holiday.' },
  { date: '2027-01-26', title: 'Republic Day', type: 'holiday', category: 'National Holiday', desc: 'Republic day parade & ceremonial assembly.' },
  { date: '2027-02-26', title: 'Maha Shivratri', type: 'holiday', category: 'Gazetted Holiday', desc: 'University holiday.' },
  { date: '2027-03-25', title: 'Holi Festival of Colors', type: 'holiday', category: 'Festival Holiday', desc: 'Campus festival holiday.' },
  { date: '2027-04-02', title: 'Good Friday', type: 'holiday', category: 'Gazetted Holiday', desc: 'University holiday.' },
  { date: '2027-04-10', title: 'Id-ul-Fitr', type: 'holiday', category: 'Gazetted Holiday', desc: 'University holiday.' },
  { date: '2027-04-14', title: 'Dr. B.R. Ambedkar Jayanti', type: 'holiday', category: 'National Observance', desc: 'Institutional remembrance day.' },
  { date: '2027-05-01', title: 'International Workers Day (May Day)', type: 'holiday', category: 'Gazetted Holiday', desc: 'University closed.' },
];

// Institutional Annual Working Mechanism Stages by Student Year
const YEAR_MECHANISMS = {
  1: {
    year: 1,
    title: '1st Year: Freshmen & Engineering Foundation',
    badge: 'Foundation & SIP',
    description: 'AICTE Mandatory 3-Week Induction, Foundation sciences & mathematics, basic C programming, engineering workshop practices, and first-year academic audit.',
    keyDeliverables: 'SIP Certification, Diagnostic aptitude test, Programming laboratory sign-off, Bridge course completion.',
    evaluationSplit: 'CIE: 50 Marks (Tests + Assignments + Quiz) · SEE: 50 Marks (University Theory + Viva)',
    stages: [
      {
        stageNumber: 1,
        title: 'AICTE Student Induction Program (SIP)',
        period: 'Aug 01, 2026 – Aug 21, 2026',
        instructionalDays: 'Days 1–18',
        targetSyllabus: 'Orientation & Diagnostic',
        category: 'Induction',
        status: 'Completed',
        details: 'Universal human values, campus tours, diagnostic testing, language lab, and faculty mentor allotment.',
        guidelines: 'Mandatory 100% presence required for SIP certificate issuance.'
      },
      {
        stageNumber: 2,
        title: 'Core Foundation Instruction Block 1',
        period: 'Aug 22, 2026 – Sep 19, 2026',
        instructionalDays: 'Days 19–42',
        targetSyllabus: '35% Syllabus Coverage',
        category: 'Academics',
        status: 'Completed',
        details: 'Units 1 & 2 in Engineering Mathematics I, Physics/Chemistry, Basic Electrical, and C Programming fundamentals.',
        guidelines: 'Weekly problem sets and laboratory logbook verification.'
      },
      {
        stageNumber: 3,
        title: 'Continuous Internal Evaluation 1 (CIE-1)',
        period: 'Sep 21, 2026 – Sep 26, 2026',
        instructionalDays: 'Days 43–48',
        targetSyllabus: 'CIE-1 Formal Assessment',
        category: 'Examination',
        status: 'Completed',
        details: 'Written descriptive assessment (30 marks) covering Unit 1 & Unit 2 across all 5 registered theory courses.',
        guidelines: 'Minimum qualifying mark: 40% (12/30). Centralized seating in Exam Block A.'
      },
      {
        stageNumber: 4,
        title: 'Mid-Term Academic Review & 75% Attendance Check',
        period: 'Oct 05, 2026 – Oct 09, 2026',
        instructionalDays: 'Day 55 Audit',
        targetSyllabus: 'Mid-Term Progress Audit',
        category: 'Audit',
        status: 'Completed',
        details: 'Official publication of attendance shortages. Students below 75% attendance summoned for Dean counseling; peer tutorials scheduled.',
        guidelines: 'Mandatory attendance compliance under UGC circular 14-3/2020.'
      },
      {
        stageNumber: 5,
        title: 'Core Foundation Instruction Block 2 & Lab Sprints',
        period: 'Oct 27, 2026 – Nov 20, 2026',
        instructionalDays: 'Days 56–75',
        targetSyllabus: '80% Syllabus Coverage',
        category: 'Academics',
        status: 'In Progress',
        details: 'Units 3 & 4 in all subjects; hardware workshop practices, soldering, CAD modeling, and pointer/arrays programming labs.',
        guidelines: 'All practical experiment journals must be verified by lab in-charge.'
      },
      {
        stageNumber: 6,
        title: 'Continuous Internal Evaluation 2 (CIE-2 / Model Pre-SEE)',
        period: 'Nov 23, 2026 – Nov 28, 2026',
        instructionalDays: 'Days 76–81',
        targetSyllabus: 'Full Syllabus Simulation',
        category: 'Examination',
        status: 'Upcoming',
        details: 'Comprehensive 50-mark model exam mirroring end-semester question paper pattern with internal choice.',
        guidelines: 'Best of 2 CIE scores or cumulative average computed for final 30 CIE marks.'
      },
      {
        stageNumber: 7,
        title: 'First-Year Lab Practical Exams & Viva Voce',
        period: 'Dec 01, 2026 – Dec 08, 2026',
        instructionalDays: 'Days 82–88',
        targetSyllabus: 'Practical Exam (50 Marks)',
        category: 'Laboratory',
        status: 'Upcoming',
        details: 'Programming in C external viva, Engineering Physics/Chemistry experiment demonstration and viva.',
        guidelines: 'External examiner appointed by university; submission of signed laboratory manual mandatory.'
      },
      {
        stageNumber: 8,
        title: 'Term Conduction Sign-Off & Last Instructional Day',
        period: 'Dec 10, 2026',
        instructionalDays: 'Day 90 of 90',
        targetSyllabus: '100% Instructional Sign-off',
        category: 'Academic Milestone',
        status: 'Upcoming',
        details: 'Final attendance lock at 5:00 PM. Issuance of Hall Tickets / Admit Cards for eligible candidates (>=75%).',
        guidelines: 'No-dues and library clearance verified online.'
      },
      {
        stageNumber: 9,
        title: 'Preparation & Study Leave',
        period: 'Dec 11, 2026 – Dec 14, 2026',
        instructionalDays: 'Study Recess',
        targetSyllabus: 'Self Revision',
        category: 'Study Leave',
        status: 'Upcoming',
        details: 'Campus library open 24x7; faculty available for doubt clarification clinics.',
        guidelines: 'Rest and revision sprint before university exams.'
      },
      {
        stageNumber: 10,
        title: 'Semester 1 University End Exams (SEE)',
        period: 'Dec 15, 2026 – Dec 30, 2026',
        instructionalDays: 'University SEE',
        targetSyllabus: 'Central Evaluation (100 Marks)',
        category: 'SEE Finals',
        status: 'Upcoming',
        details: 'University theoretical written examinations across all foundation disciplines.',
        guidelines: 'Grading on 10-point SGPA scale; grade cards dispatched in January 2027.'
      }
    ]
  },

  2: {
    year: 2,
    title: '2nd Year: Core Engineering & Mini-Projects',
    badge: 'Core Tech & Mini-Project',
    description: 'Transition into specialized branch fundamentals (DSA, DBMS, OS, Computer Architecture), Mini-Project execution in teams of 3, Tech Club Hackathons, and Mid-Sem assessments.',
    keyDeliverables: 'Mini-Project Synopsis & Architecture, Working Prototype, Code Audit Report, NPTEL/MOOC course enrollment.',
    evaluationSplit: 'CIE: 50 Marks (CIE-1 + CIE-2 + Mini Project Reviews) · SEE: 50 Marks (Theory + Practical Viva)',
    stages: [
      {
        stageNumber: 1,
        title: 'Core Curriculum Kickoff & Mini-Project Guide Allotment',
        period: 'Aug 01, 2026 – Aug 14, 2026',
        instructionalDays: 'Days 1–12',
        targetSyllabus: 'Syllabus Onboarding',
        category: 'Academics',
        status: 'Completed',
        details: 'Orientation for Data Structures, DBMS, and OOP. Team formation (max 3 students) and faculty project guide assignment.',
        guidelines: 'Submit team registration form with 3 chosen project domains to HOD office.'
      },
      {
        stageNumber: 2,
        title: 'Core Teaching Block 1 & Project Synopsis Defense',
        period: 'Aug 17, 2026 – Sep 18, 2026',
        instructionalDays: 'Days 13–41',
        targetSyllabus: '35% Core Syllabus',
        category: 'Academics',
        status: 'Completed',
        details: 'Data structures (linked lists, trees, heaps), Relational calculus, Schema design. Mini-project problem statement defense.',
        guidelines: 'Guide approval required for project problem definition and architecture diagram.'
      },
      {
        stageNumber: 3,
        title: 'Continuous Internal Evaluation 1 (CIE-1)',
        period: 'Sep 21, 2026 – Sep 26, 2026',
        instructionalDays: 'Days 42–47',
        targetSyllabus: 'CIE-1 Theory & Problem Solving',
        category: 'Examination',
        status: 'Completed',
        details: '30-mark mid-term exam covering foundational modules of core computer science courses.',
        guidelines: 'Internal assessment marks entered into University ERP within 72 hours.'
      },
      {
        stageNumber: 4,
        title: 'Mid-Term Attendance Audit & Tech Club Hackathon',
        period: 'Oct 05, 2026 – Oct 14, 2026',
        instructionalDays: 'Days 48–54',
        targetSyllabus: 'Audit & Hackathon',
        category: 'Events',
        status: 'Completed',
        details: 'Mandatory 75% attendance audit; 24-hour campus hackathon ("Build for Campus 2026"). 10 teams shortlisted for cash awards.',
        guidelines: 'Participants awarded 5 activity points towards degree honor program.'
      },
      {
        stageNumber: 5,
        title: 'Industrial Tech Visit & Cloud Infra Workshop',
        period: 'Nov 02, 2026 – Nov 06, 2026',
        instructionalDays: 'Days 55–65',
        targetSyllabus: 'Industry Exposure',
        category: 'Industry Visit',
        status: 'Completed',
        details: '1-day visit to IT Park / Cloud Data Center in Bengaluru; hands-on Docker & Linux networking session.',
        guidelines: 'Submit 2-page industrial observation brief to faculty coordinator.'
      },
      {
        stageNumber: 6,
        title: 'Mini-Project Review 1: Architecture & Backend Audit',
        period: 'Nov 11, 2026',
        instructionalDays: 'Day 69 Review',
        targetSyllabus: '50% Implementation Milestone',
        category: 'Project Review',
        status: 'In Progress',
        details: 'Demonstration of SQLite/Postgres DB schema, REST API endpoints, and Git repository commit progression.',
        guidelines: 'Scored out of 20 marks by internal project review committee.'
      },
      {
        stageNumber: 7,
        title: 'Continuous Internal Evaluation 2 (CIE-2 / Model Exam)',
        period: 'Nov 23, 2026 – Nov 28, 2026',
        instructionalDays: 'Days 76–81',
        targetSyllabus: 'Comprehensive Syllabus',
        category: 'Examination',
        status: 'Upcoming',
        details: 'Model university examination covering advanced graph algorithms, indexing, concurrency, and virtual memory.',
        guidelines: 'Crucial for internal grade calculation; accounts for 30 marks.'
      },
      {
        stageNumber: 8,
        title: 'Mini-Project Review 2 & Final Code Viva',
        period: 'Dec 02, 2026',
        instructionalDays: 'Day 84 Review',
        targetSyllabus: '100% Working Software',
        category: 'Project Review',
        status: 'Upcoming',
        details: 'Full functional demo, responsive UI, database integration, test coverage, and documentation presentation.',
        guidelines: 'Team viva conducted with code walkthrough; accounts for 20 marks.'
      },
      {
        stageNumber: 9,
        title: 'Lab Practical Examinations & Last Instructional Day',
        period: 'Dec 03, 2026 – Dec 10, 2026',
        instructionalDays: 'Days 85–90',
        targetSyllabus: '90 Working Days Reached',
        category: 'Laboratory',
        status: 'Upcoming',
        details: 'DSA laboratory programming exam and DBMS SQL execution viva. Attendance finalized and hall tickets unlocked.',
        guidelines: 'Student must achieve >= 75% overall attendance to appear in SEE.'
      },
      {
        stageNumber: 10,
        title: 'Semester End University Examinations (SEE)',
        period: 'Dec 15, 2026 – Dec 30, 2026',
        instructionalDays: 'University Finals',
        targetSyllabus: 'End Semester Theory (50 Marks)',
        category: 'SEE Finals',
        status: 'Upcoming',
        details: 'University theory examinations across all 3rd semester core courses.',
        guidelines: 'Results released second week of January 2027; winter break until Jan 10.'
      }
    ]
  },

  3: {
    year: 3,
    title: '3rd Year: Specialization, Pre-Placement & Corporate Internships',
    badge: 'Pre-Placement & Specialization',
    description: 'Advanced electives (AI/ML, Cloud, Cyber Security), intensive Pre-Placement Training (PPT), Capstone Major Project Phase-I ideation, and summer corporate internship drives.',
    keyDeliverables: 'Capstone Phase-I Synopsis & Prototype, 50 LeetCode/DSA problems logged, Verified Resume, Summer Internship Offer.',
    evaluationSplit: 'CIE: 50 Marks (CIE-1 + CIE-2 + Capstone Phase-I) · SEE: 50 Marks (Theory + Practical)',
    stages: [
      {
        stageNumber: 1,
        title: 'Specialization Track Selection & Pre-Placement Kickoff',
        period: 'Aug 01, 2026 – Aug 14, 2026',
        instructionalDays: 'Days 1–12',
        targetSyllabus: 'Elective Track Lock',
        category: 'Academics',
        status: 'Completed',
        details: 'Selection of Professional Electives (AI/ML, Cyber Security, Cloud). Daily 1-hour aptitude & competitive coding training commences.',
        guidelines: 'Attendance in PPT modules is mandatory for on-campus internship placement eligibility.'
      },
      {
        stageNumber: 2,
        title: 'Advanced Core Instruction & Capstone Guide Allocation',
        period: 'Aug 17, 2026 – Sep 18, 2026',
        instructionalDays: 'Days 13–41',
        targetSyllabus: '35% Advanced Curriculum',
        category: 'Academics',
        status: 'Completed',
        details: 'Distributed systems, machine learning pipelines, network security. Capstone Major Project Phase-I problem formulation.',
        guidelines: 'Projects must address real-world industrial or societal engineering challenges.'
      },
      {
        stageNumber: 3,
        title: 'Continuous Internal Evaluation 1 (CIE-1)',
        period: 'Sep 21, 2026 – Sep 26, 2026',
        instructionalDays: 'Days 42–47',
        targetSyllabus: 'CIE-1 Assessment',
        category: 'Examination',
        status: 'Completed',
        details: 'Theory evaluation for AI, Software Engineering, and Advanced Networks.',
        guidelines: 'Scores uploaded to departmental portal within 3 days.'
      },
      {
        stageNumber: 4,
        title: 'Day-0 Summer Internship Hiring Drives (Tier-1 Firms)',
        period: 'Oct 05, 2026 – Oct 20, 2026',
        instructionalDays: 'Days 48–58',
        targetSyllabus: 'Corporate Recruitment',
        category: 'Placement',
        status: 'Completed',
        details: 'Online assessment rounds & technical interviews by top tech recruiters (Zoho, Razorpay, Amazon, Microsoft, Infosys).',
        guidelines: 'Students maintain verified LinkedIn and GitHub profiles for interviewers.'
      },
      {
        stageNumber: 5,
        title: 'Capstone Project Phase-I Review 1: SRS & Feasibility',
        period: 'Nov 09, 2026',
        instructionalDays: 'Day 67 Review',
        targetSyllabus: 'Requirements & Architecture',
        category: 'Project Review',
        status: 'In Progress',
        details: 'Literature survey of minimum 5 IEEE/Springer publications, system architecture and technology stack defense.',
        guidelines: 'Graded by Departmental Research Committee (DRC); accounts for 20 marks.'
      },
      {
        stageNumber: 6,
        title: 'National Hackathons & Innovation Challenge',
        period: 'Nov 14, 2026 – Nov 20, 2026',
        instructionalDays: 'Days 70–75',
        targetSyllabus: 'Innovation & Co-curricular',
        category: 'Events',
        status: 'Upcoming',
        details: 'Campus participation in Smart India Hackathon internal qualifier and institutional hackathon.',
        guidelines: 'Teams provided 48-hour access to innovation labs and cloud servers.'
      },
      {
        stageNumber: 7,
        title: 'Continuous Internal Evaluation 2 (CIE-2 / Pre-SEE)',
        period: 'Nov 23, 2026 – Nov 28, 2026',
        instructionalDays: 'Days 76–81',
        targetSyllabus: '100% Syllabus Coverage',
        category: 'Examination',
        status: 'Upcoming',
        details: 'Comprehensive pre-SEE test across all advanced and elective disciplines.',
        guidelines: 'Final internal evaluation tabulation and student sign-off.'
      },
      {
        stageNumber: 8,
        title: 'Capstone Phase-I Prototype Demo & External Lab Vivas',
        period: 'Dec 01, 2026 – Dec 08, 2026',
        instructionalDays: 'Days 82–88',
        targetSyllabus: 'Phase-I Prototype Defense',
        category: 'Project Review',
        status: 'Upcoming',
        details: 'Demonstration of functional proof-of-concept module and lab exams in AI/ML and Networks.',
        guidelines: 'Satisfactory completion needed to register for Semester 6.'
      },
      {
        stageNumber: 9,
        title: 'Attendance Freeze & Last Instructional Day',
        period: 'Dec 10, 2026',
        instructionalDays: 'Day 90 Reached',
        targetSyllabus: '90 Working Days',
        category: 'Academic Milestone',
        status: 'Upcoming',
        details: 'Audited attendance roster published; minimum 75% attendance mandatory for SEE hall ticket.',
        guidelines: 'Admit cards downloadable through student dashboard.'
      },
      {
        stageNumber: 10,
        title: 'Semester 5 University End Examinations (SEE)',
        period: 'Dec 15, 2026 – Dec 30, 2026',
        instructionalDays: 'University SEE',
        targetSyllabus: 'Final Theory Exam',
        category: 'SEE Finals',
        status: 'Upcoming',
        details: 'Semester-end examinations followed by mandatory summer internship prep in Semester 6.',
        guidelines: '8-week summer corporate internship required between Sem 6 and Sem 7.'
      }
    ]
  },

  4: {
    year: 4,
    title: '4th Year: Senior / Capstone Thesis, Placements & Convocation',
    badge: 'Placements & Degree Thesis',
    description: 'On-campus placement marathon (Day-1 & Core IT), Capstone Major Project Phase-II implementation, research paper publication in indexed conference/journal, external thesis viva, and convocation.',
    keyDeliverables: 'Signed Job Offer Letter, Capstone Project Thesis (Plagiarism < 10%), IEEE/Scopus Paper Acceptance, No-Dues Certificate.',
    evaluationSplit: 'CIE: 50 Marks (CIE-1 + CIE-2 + Thesis Progress) · SEE: 50 Marks (External Viva + Final Thesis)',
    stages: [
      {
        stageNumber: 1,
        title: 'Tier-1 Campus Placement Season (Super-Dream & Core Drives)',
        period: 'Aug 01, 2026 – Sep 15, 2026',
        instructionalDays: 'Days 1–35',
        targetSyllabus: 'Campus Hiring Marathon',
        category: 'Placement',
        status: 'Completed',
        details: 'On-campus placement drives by Tier-1 product tech companies and global service integrators. Daily interview slots.',
        guidelines: 'Eligible students (CGPA >= 7.0, no active backlogs) participate in multiple recruitment rounds.'
      },
      {
        stageNumber: 2,
        title: 'Capstone Phase-II Project Deployment Kickoff',
        period: 'Aug 16, 2026 – Sep 18, 2026',
        instructionalDays: 'Days 12–41',
        targetSyllabus: 'Project Implementation',
        category: 'Academics',
        status: 'Completed',
        details: 'Full system engineering, cloud deployment, hardware testing, and experimental dataset validation.',
        guidelines: 'Weekly project progress logs signed by guide and industry co-mentor.'
      },
      {
        stageNumber: 3,
        title: 'Continuous Internal Evaluation 1 (CIE-1)',
        period: 'Sep 21, 2026 – Sep 26, 2026',
        instructionalDays: 'Days 42–47',
        targetSyllabus: 'CIE-1 Theory',
        category: 'Examination',
        status: 'Completed',
        details: '7th semester elective courses internal evaluation.',
        guidelines: 'Internal assessment uploaded to exam branch.'
      },
      {
        stageNumber: 4,
        title: 'Capstone Mid-Term Review & Research Paper Drafting',
        period: 'Oct 05, 2026 – Oct 16, 2026',
        instructionalDays: 'Days 48–56',
        targetSyllabus: 'Paper Draft & Architecture',
        category: 'Project Review',
        status: 'Completed',
        details: 'Defense of preliminary results; submission of research paper draft for submission to Scopus/IEEE conference.',
        guidelines: 'Publication draft mandatory for final year project thesis submission.'
      },
      {
        stageNumber: 5,
        title: 'Off-Campus Recruitment Drives & GATE / Higher Studies Cohorts',
        period: 'Oct 27, 2026 – Nov 15, 2026',
        instructionalDays: 'Days 57–72',
        targetSyllabus: 'Career Acceleration',
        category: 'Career / Exams',
        status: 'In Progress',
        details: 'Support cell for unplaced candidates; weekend mock test series for GATE/CAT/GRE aspirants.',
        guidelines: 'Placement cell operates daily 9:00 AM - 6:00 PM.'
      },
      {
        stageNumber: 6,
        title: 'Continuous Internal Evaluation 2 (CIE-2) & Plagiarism Screening',
        period: 'Nov 23, 2026 – Nov 28, 2026',
        instructionalDays: 'Days 76–81',
        targetSyllabus: 'Full Syllabus & Plagiarism Check',
        category: 'Examination',
        status: 'Upcoming',
        details: 'CIE-2 final exams. Capstone project thesis report submitted to Turnitin/Urkund (similarity index must be < 10%).',
        guidelines: 'Thesis reports with > 10% similarity rejected automatically.'
      },
      {
        stageNumber: 7,
        title: 'Major Project Viva Voce by External University Examiner',
        period: 'Dec 02, 2026 – Dec 08, 2026',
        instructionalDays: 'Days 83–88',
        targetSyllabus: '100% Defense & Demo',
        category: 'Project Defense',
        status: 'Upcoming',
        details: 'Formal presentation and live demonstration in front of external university examiner and industrial expert.',
        guidelines: 'Final marks entered directly into University Controller portal.'
      },
      {
        stageNumber: 8,
        title: 'Instructional Sign-Off & Semester 7 SEE',
        period: 'Dec 10, 2026 – Dec 30, 2026',
        instructionalDays: 'Days 90 + SEE',
        targetSyllabus: 'SEE Examination',
        category: 'SEE Finals',
        status: 'Upcoming',
        details: 'Final instructional day followed by 7th semester university examinations.',
        guidelines: 'Results released in early January 2027.'
      },
      {
        stageNumber: 9,
        title: 'Semester 8 Full-Semester Industry Internship / Project Deployment',
        period: 'Jan 11, 2027 – Apr 30, 2027',
        instructionalDays: 'Full Term Internship',
        targetSyllabus: 'Corporate On-site / Research Lab',
        category: 'Internship',
        status: 'Upcoming',
        details: 'Full-time industrial internship at hired corporate firms (or in-house research laboratory). Bi-weekly mentor signoffs.',
        guidelines: 'Corporate offer letter and monthly progress certificates required.'
      },
      {
        stageNumber: 10,
        title: 'Final Degree Clearance, No-Dues & Annual Convocation',
        period: 'May 10, 2027 – Jun 20, 2027',
        instructionalDays: 'Degree Award',
        targetSyllabus: 'Graduation Ceremony',
        category: 'Convocation',
        status: 'Upcoming',
        details: 'Institutional no-dues clearance across library, labs, sports, and hostels. Annual University Convocation & degree scroll award.',
        guidelines: 'Admission into Global Alumni Association.'
      }
    ]
  }
};

// Year-Specific Calendar Events for 2026–2027
function getScheduledEventsForYear(year) {
  const y = Number(year) || 2;
  const common = [
    // Month 1: August 2026
    { id: 'ev-01', date: '2026-08-01', title: 'Odd Semester 2026–27 Academic Term Begins', type: 'class', year: 'all', sem: 'odd', time: '09:00 AM', location: 'Campus Wide', details: 'Instructional Day 1. Registration and course syllabus orientation.', weight: 'Mandatory Attendance' },
    { id: 'ev-02', date: '2026-08-15', title: 'Independence Day Observance & Flag Hoisting', type: 'holiday', year: 'all', sem: 'odd', time: '08:30 AM', location: 'Main Quadrangle', details: 'Patriotic address by Vice-Chancellor followed by cultural choir.', weight: 'National Holiday' },
    { id: 'ev-03', date: '2026-08-25', title: 'Janmashtami (Gazetted Holiday)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'University academic holiday.', weight: 'Holiday' },
    
    // Month 2: September 2026
    { id: 'ev-04', date: '2026-09-05', title: 'Teachers Day & Faculty Excellence Awards', type: 'meeting', year: 'all', sem: 'odd', time: '02:00 PM', location: 'Auditorium', details: 'Felicitation of distinguished educators and research mentors.', weight: 'Campus Event' },
    { id: 'ev-05', date: '2026-09-07', title: 'Ganesh Chaturthi (University Holiday)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'Institutional holiday.', weight: 'Holiday' },
    { id: 'ev-06', date: '2026-09-16', title: 'Milad-un-Nabi (Gazetted Holiday)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'Institutional holiday.', weight: 'Holiday' },
    { id: 'ev-07', date: '2026-09-21', title: 'Continuous Internal Evaluation 1 (CIE-1) Commences', type: 'exam', year: 'all', sem: 'odd', time: '10:00 AM - 12:00 PM', location: 'Examination Hall A & B', details: 'Written assessment across 5 core theory subjects. Covers 35% syllabus.', weight: '30 Marks CIE' },
    { id: 'ev-08', date: '2026-09-26', title: 'CIE-1 Concludes & Centralized Evaluation Begins', type: 'exam', year: 'all', sem: 'odd', time: '01:00 PM', location: 'Exam Control Division', details: 'End of CIE-1 written examinations. Scripts assigned for double evaluation.', weight: '30 Marks CIE' },

    // Month 3: October 2026
    { id: 'ev-09', date: '2026-10-02', title: 'Mahatma Gandhi Jayanti (National Holiday)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'National holiday. Swachh Bharat campus pledge.', weight: 'National Holiday' },
    { id: 'ev-10', date: '2026-10-05', title: 'Mandatory Mid-Term 75% Attendance Review', type: 'class', year: 'all', sem: 'odd', time: '11:00 AM', location: 'Dean Academic Office', details: 'Audit of subject-wise attendance rosters. Shortage notices issued.', weight: 'UGC 75% Rule' },
    { id: 'ev-11', date: '2026-10-11', title: 'Maha Navami / Ayudha Puja', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'Campus machinery & lab blessings ceremony.', weight: 'Festival Holiday' },
    { id: 'ev-12', date: '2026-10-12', title: 'Vijaya Dashami (Dussehra)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'University holiday.', weight: 'Festival Holiday' },
    { id: 'ev-13', date: '2026-10-17', title: 'Maharishi Valmiki Jayanti', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'Gazetted university holiday.', weight: 'Holiday' },
    { id: 'ev-14', date: '2026-10-31', title: 'Diwali Autumn Recess (Oct 31 – Nov 03)', type: 'holiday', year: 'all', sem: 'odd', time: '4 Days', location: 'Campus', details: 'Deepavali festival break for faculty and students.', weight: 'Vacation' },

    // Month 4: November 2026
    { id: 'ev-15', date: '2026-11-01', title: 'Kannada Rajyotsava & Deepavali', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'State', details: 'Karnataka state foundation day celebration.', weight: 'State Holiday' },
    { id: 'ev-16', date: '2026-11-02', title: 'Diwali Balipadyami (Campus Recess)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'Festival recess day 3.', weight: 'Holiday' },
    { id: 'ev-17', date: '2026-11-06', title: 'Internal Assessment Marks & Attendance Verification', type: 'exam', year: 'all', sem: 'odd', time: '02:00 PM', location: 'Student Portal ERP', details: 'Verification of consolidated CIE-1 scores and attendance compliance.', weight: 'ERP Check' },
    { id: 'ev-18', date: '2026-11-08', title: 'Mid-Semester Examination Window Opens', type: 'exam', year: 'all', sem: 'odd', time: '09:30 AM', location: 'LHC-201 to LHC-208', details: 'Theory assessments and practical tests begin.', weight: 'Exams' },
    { id: 'ev-19', date: '2026-11-14', title: 'AI/ML & Cloud Computing Applied Workshop', type: 'class', year: 'all', sem: 'odd', time: '10:00 AM - 04:00 PM', location: 'Seminar Hall 3', details: 'Deep Dive into LLMs, Vector Databases, and PyTorch deployment on AWS.', weight: 'Workshop' },
    { id: 'ev-20', date: '2026-11-15', title: 'Guru Nanak Jayanti (Gazetted Holiday)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'University closed.', weight: 'Holiday' },
    { id: 'ev-21', date: '2026-11-17', title: 'Industry Leadership Lecture: Cloud Architect Careers', type: 'class', year: 'all', sem: 'odd', time: '03:00 PM - 05:00 PM', location: 'Main Auditorium', details: 'Keynote by Vice President of Engineering, Google Cloud.', weight: 'Industry Talk' },
    { id: 'ev-22', date: '2026-11-23', title: 'Continuous Internal Evaluation 2 (CIE-2 / Model SEE)', type: 'exam', year: 'all', sem: 'odd', time: '10:00 AM - 01:00 PM', location: 'Exam Block A', details: 'Model semester examination simulating 100% course syllabus and pattern.', weight: '50 Marks Model' },
    { id: 'ev-23', date: '2026-11-28', title: 'CIE-2 Concludes & Remedial Batches Announced', type: 'exam', year: 'all', sem: 'odd', time: '01:00 PM', location: 'Exam Control', details: 'Consolidation of final CIE score (best 2 of 3 components).', weight: 'Final CIE' },

    // Month 5: December 2026
    { id: 'ev-24', date: '2026-12-01', title: 'University Laboratory Practical Exams & Viva Voce', type: 'exam', year: 'all', sem: 'odd', time: '09:00 AM - 05:00 PM', location: 'Departmental Labs', details: 'Laboratory experiments and oral viva conducted with external examiners.', weight: '50 Marks Viva' },
    { id: 'ev-25', date: '2026-12-08', title: 'Laboratory Practical Exams Conclude', type: 'exam', year: 'all', sem: 'odd', time: '05:00 PM', location: 'All Labs', details: 'Submission of signed laboratory award lists to COE.', weight: 'Lab Signoff' },
    { id: 'ev-26', date: '2026-12-10', title: 'Odd Semester Last Instructional Working Day', type: 'class', year: 'all', sem: 'odd', time: '05:00 PM', location: 'Institution', details: 'Day 90 of 90 reached. Attendance registers locked. Hall tickets issued.', weight: 'Day 90 Complete' },
    { id: 'ev-27', date: '2026-12-11', title: 'Pre-SEE Study Leave & Preparation Recess', type: 'class', year: 'all', sem: 'odd', time: '4 Days', location: 'Library 24x7', details: 'Self-study and revision break prior to university theoretical examinations.', weight: 'Study Leave' },
    { id: 'ev-28', date: '2026-12-15', title: 'Semester End University Theory Exams (SEE) Begin', type: 'exam', year: 'all', sem: 'odd', time: '09:30 AM - 12:30 PM', location: 'University Centers', details: 'Formal written university degree examinations.', weight: '50 Marks SEE' },
    { id: 'ev-29', date: '2026-12-25', title: 'Christmas Day (Winter Recess)', type: 'holiday', year: 'all', sem: 'odd', time: 'Full Day', location: 'Campus', details: 'University closed for Christmas.', weight: 'Holiday' },
    { id: 'ev-30', date: '2026-12-30', title: 'Semester End University Exams Conclude', type: 'exam', year: 'all', sem: 'odd', time: '01:00 PM', location: 'Examination Center', details: 'End of odd-semester examinations. Central evaluation commences.', weight: 'Term Complete' },

    // Even Semester 2027 Highlights
    { id: 'ev-31', date: '2027-01-01', title: 'New Year Day (Institutional Holiday)', type: 'holiday', year: 'all', sem: 'even', time: 'Full Day', location: 'Campus', details: 'Happy New Year 2027.', weight: 'Holiday' },
    { id: 'ev-32', date: '2027-01-11', title: 'Even Semester 2026–27 Academic Term Begins', type: 'class', year: 'all', sem: 'even', time: '09:00 AM', location: 'Campus Wide', details: 'Instructional Day 1 of Even Semester (Semesters 2, 4, 6, 8).', weight: 'Day 1 Even Sem' },
    { id: 'ev-33', date: '2027-01-14', title: 'Makar Sankranti / Pongal Holiday', type: 'holiday', year: 'all', sem: 'even', time: 'Full Day', location: 'Campus', details: 'Harvest festival holiday.', weight: 'Holiday' },
    { id: 'ev-34', date: '2027-01-26', title: 'Republic Day Celebration', type: 'holiday', year: 'all', sem: 'even', time: '08:30 AM', location: 'Parade Grounds', details: 'Flag hoisting ceremony and patriotic cultural programme.', weight: 'National Holiday' },
    { id: 'ev-35', date: '2027-03-01', title: 'Even Semester CIE-1 Examination Week', type: 'exam', year: 'all', sem: 'even', time: '10:00 AM', location: 'Exam Block', details: 'Continuous Internal Evaluation 1 for even semester courses.', weight: '30 Marks CIE' },
    { id: 'ev-36', date: '2027-03-12', title: 'Annual Inter-College Technical & Cultural Fest', type: 'meeting', year: 'all', sem: 'even', time: '3 Days', location: 'Campus Ground', details: 'Hackathons, robotics combat, cultural music, and startup showcases.', weight: 'Fest' },
    { id: 'ev-37', date: '2027-04-21', title: 'Even Semester CIE-2 / Pre-SEE Examination', type: 'exam', year: 'all', sem: 'even', time: '10:00 AM', location: 'Exam Block', details: 'Pre-university model examinations across all departments.', weight: '50 Marks Model' },
    { id: 'ev-38', date: '2027-05-08', title: 'Even Semester Last Instructional Working Day', type: 'class', year: 'all', sem: 'even', time: '05:00 PM', location: 'Campus', details: '90 instructional days completed. Term sign-off.', weight: 'Day 90 Reached' },
    { id: 'ev-39', date: '2027-05-14', title: 'Even Semester University End Examinations (SEE)', type: 'exam', year: 'all', sem: 'even', time: '09:30 AM', location: 'Exam Centers', details: 'Final degree and semester theory examinations.', weight: '50 Marks SEE' },
    { id: 'ev-40', date: '2027-06-01', title: 'Summer Recess & Corporate Internship Window', type: 'holiday', year: 'all', sem: 'even', time: '8 Weeks', location: 'Corporate / Labs', details: 'Mandatory AICTE summer internship and industrial training block.', weight: 'Internship Window' },
  ];

  // Specific events per year
  const yearSpecific = {
    1: [
      { id: 'y1-01', date: '2026-08-03', title: 'AICTE Student Induction Program (SIP) Inaugural', type: 'meeting', year: 1, sem: 'odd', time: '10:00 AM', location: 'Main Auditorium', details: '3-week student induction program kickoff. Universal human values and campus tours.', weight: 'Year 1 Mandatory' },
      { id: 'y1-02', date: '2026-08-10', title: 'Diagnostic Mathematics & Computer Literacy Test', type: 'exam', year: 1, sem: 1, time: '11:00 AM', location: 'LHC-101', details: 'First-year aptitude diagnosis to identify candidates for bridge classes.', weight: 'Diagnostic' },
      { id: 'y1-03', date: '2026-09-12', title: 'First-Year Bridge Course in C Programming', type: 'class', year: 1, sem: 1, time: '02:00 PM', location: 'Lab 1 & 2', details: 'Intensive logic building and flowcharts for non-CS background freshers.', weight: 'Bridge Course' },
      { id: 'y1-04', date: '2026-10-08', title: 'First-Year Mentor-Mentee Counseling Sessions', type: 'meeting', year: 1, sem: 1, time: '03:00 PM', location: 'Faculty Cabins', details: 'One-on-one review of academic adjustment, attendance, and study habits.', weight: 'Mentorship' },
      { id: 'y1-05', date: '2026-11-10', title: 'Engineering Workshop & CAD Model Demonstration', type: 'assignment', year: 1, sem: 1, time: '09:30 AM', location: 'Central Workshop', details: 'Evaluation of wooden joints, sheet metal fitting, and 3D CAD models.', weight: 'Internal Marks' },
      { id: 'y1-06', date: '2026-12-04', title: 'First-Year C Programming Practical Viva', type: 'exam', year: 1, sem: 1, time: '09:00 AM', location: 'Computing Center', details: 'External viva and algorithm execution on Linux terminals.', weight: '50 Marks Viva' },
      { id: 'y1-07', date: '2027-02-15', title: 'Engineering Physics & Chemistry Project Expo', type: 'assignment', year: 1, sem: 2, time: '10:00 AM', location: 'Exhibition Hall', details: 'First-year hands-on science and engineering hardware exhibit.', weight: 'Sem 2 Milestone' },
    ],

    2: [
      { id: 'y2-01', date: '2026-08-08', title: 'Mini-Project Team Formation & Guide Allocation', type: 'assignment', year: 2, sem: 3, time: '02:00 PM', location: 'CS Department Hall', details: 'Formation of 3-member squads and allocation of faculty guides.', weight: 'Mini-Project' },
      { id: 'y2-02', date: '2026-09-11', title: 'Mini-Project Synopsis & SRS Defense', type: 'assignment', year: 2, sem: 3, time: '11:00 AM', location: 'CS Lab 3', details: 'Defense of system requirements, ER diagram, and UI wireframes.', weight: '10 Marks CIE' },
      { id: 'y2-03', date: '2026-10-10', title: '24-Hour Campus Hackathon: "Build for Campus"', type: 'meeting', year: 2, sem: 3, time: '09:00 AM', location: 'Tech Innovation Hub', details: 'Overnight coding competition. Teams create smart campus utilities.', weight: 'Hackathon Prize' },
      { id: 'y2-04', date: '2026-11-04', title: 'Industrial Tech Visit: Cloud & Data Center Facility', type: 'class', year: 2, sem: 3, time: '08:00 AM', location: 'Electronic City, Bengaluru', details: 'Field visit to tier-4 enterprise data center and cloud switching yard.', weight: 'Industry Credit' },
      { id: 'y2-05', date: '2026-11-11', title: 'Mini-Project Review 1: Architecture & DB Schema', type: 'assignment', year: 2, sem: 3, time: '02:00 PM', location: 'CS Lab 4', details: 'Verification of database normalization, REST API endpoints, and Git logs.', weight: '20 Marks CIE' },
      { id: 'y2-06', date: '2026-12-02', title: 'Mini-Project Review 2 & Final Software Viva', type: 'assignment', year: 2, sem: 3, time: '10:00 AM', location: 'Seminar Hall 2', details: 'Live application demonstration, error handling check, and code walkthrough.', weight: '20 Marks CIE' },
      { id: 'y2-07', date: '2027-02-20', title: 'NPTEL / MOOC Online Certification Mid-Review', type: 'class', year: 2, sem: 4, time: '03:00 PM', location: 'Online Portal', details: 'Submission of weekly assignment proof for mandatory 2-credit MOOC course.', weight: 'Honors Credit' },
      { id: 'y2-08', date: '2027-04-18', title: 'Database Systems & OS Lab Practical Examinations', type: 'exam', year: 2, sem: 4, time: '09:00 AM', location: 'Lab 2', details: 'SQL queries, stored procedures, and OS kernel thread simulations.', weight: '50 Marks SEE Lab' },
    ],

    3: [
      { id: 'y3-01', date: '2026-08-05', title: 'Pre-Placement Training (PPT) Sprint 1 Kickoff', type: 'class', year: 3, sem: 5, time: '08:00 AM - 09:30 AM', location: 'LHC-301', details: 'Daily quantitative aptitude, logical reasoning, and LeetCode algorithmic drills.', weight: 'Mandatory Placement' },
      { id: 'y3-02', date: '2026-09-08', title: 'Capstone Major Project Phase-I Synopsis Approval', type: 'assignment', year: 3, sem: 5, time: '02:30 PM', location: 'DRC Committee Room', details: 'Formal presentation of problem statement, societal relevance, and IEEE literature study.', weight: 'Capstone Phase I' },
      { id: 'y3-03', date: '2026-10-06', title: 'Day-0 Summer Internship Hiring Test: Tier-1 Tech Giants', type: 'placement', year: 3, sem: 5, time: '06:00 PM', location: 'Online Exam Lab', details: 'Online coding round by top tech product recruiters (Zoho, Razorpay, Amazon).', weight: 'Corporate Hiring' },
      { id: 'y3-04', date: '2026-10-18', title: 'Mock Technical & HR Interview Marathon', type: 'placement', year: 3, sem: 5, time: '10:00 AM', location: 'Placement Cell', details: 'One-on-one resume reviews and system design mock rounds with alumni engineers.', weight: 'Career Readiness' },
      { id: 'y3-05', date: '2026-11-09', title: 'Capstone Phase-I Architecture & Literature Review', type: 'assignment', year: 3, sem: 5, time: '02:00 PM', location: 'CS Conference Room', details: 'Evaluation of system architecture, modular decomposition, and IEEE paper citations.', weight: '20 Marks CIE' },
      { id: 'y3-06', date: '2026-11-20', title: 'Smart India Hackathon Internal College Qualifier', type: 'meeting', year: 3, sem: 5, time: '09:00 AM', location: 'Innovation Quad', details: 'Selection of top 5 campus teams for National SIH representation.', weight: 'National Stage' },
      { id: 'y3-07', date: '2026-12-03', title: 'Capstone Phase-I Working Prototype Demo', type: 'assignment', year: 3, sem: 5, time: '10:30 AM', location: 'Lab 5', details: 'Functional prototype demonstration to Department Research Committee.', weight: '30 Marks CIE' },
      { id: 'y3-08', date: '2027-04-25', title: 'Mandatory 8-Week Summer Internship Allotment', type: 'placement', year: 3, sem: 6, time: '04:00 PM', location: 'Placement Cell', details: 'Verification of corporate internship offer letters for June–July period.', weight: 'Degree Requirement' },
    ],

    4: [
      { id: 'y4-01', date: '2026-08-04', title: 'On-Campus Placement Season Inauguration (Super-Dream)', type: 'placement', year: 4, sem: 7, time: '09:00 AM', location: 'Main Auditorium', details: 'Day-1 placement drives commencement. High-package product companies recruitment.', weight: 'Placement Season' },
      { id: 'y4-02', date: '2026-08-20', title: 'Major Capstone Phase-II Guide Allocation & SOW Lock', type: 'assignment', year: 4, sem: 7, time: '03:00 PM', location: 'HOD Office', details: 'Scope of Work (SOW) agreement with industry co-mentors and research guides.', weight: 'Final Year Thesis' },
      { id: 'y4-03', date: '2026-09-15', title: 'Mass Hiring Drives: IT Majors & Consultancies', type: 'placement', year: 4, sem: 7, time: 'All Day', location: 'Placement Complex', details: 'Tier-1 service and enterprise software recruitment rounds.', weight: 'Job Offers' },
      { id: 'y4-04', date: '2026-10-14', title: 'Capstone Phase-II Mid-Term Progress Review', type: 'assignment', year: 4, sem: 7, time: '11:00 AM', location: 'Research Lab', details: 'Verification of 70% codebase completion, testbed metrics, and validation logs.', weight: '20 Marks CIE' },
      { id: 'y4-05', date: '2026-11-05', title: 'Research Paper Draft Submission for Scopus/IEEE Conference', type: 'assignment', year: 4, sem: 7, time: '05:00 PM', location: 'Research Cell', details: 'Mandatory technical paper submission based on Major Project innovations.', weight: 'Publication' },
      { id: 'y4-06', date: '2026-11-25', title: 'Major Project Plagiarism Audit (< 10% Threshold)', type: 'assignment', year: 4, sem: 7, time: '04:00 PM', location: 'Digital Library', details: 'Plagiarism verification report through Turnitin. Certification issued.', weight: 'Integrity Check' },
      { id: 'y4-07', date: '2026-12-05', title: 'Major Project Final Thesis Viva by External Examiner', type: 'exam', year: 4, sem: 7, time: '09:30 AM', location: 'Board Room', details: 'External University Examiner defense, live product deployment, thesis evaluation.', weight: '100 Marks Defense' },
      { id: 'y4-08', date: '2027-01-15', title: 'Semester 8 Corporate Full-Time Internship Deployment', type: 'placement', year: 4, sem: 8, time: 'Full Semester', location: 'Corporate Offices', details: '4-month full-time industry internship in lieu of campus course credits.', weight: 'Corporate Credits' },
      { id: 'y4-09', date: '2027-05-20', title: 'Institutional No-Dues Clearance & Degree Audit', type: 'meeting', year: 4, sem: 8, time: '10:00 AM', location: 'Student Affairs', details: 'Verification of library returns, lab clearance, hostel keys, and fee accounts.', weight: 'Clearance' },
      { id: 'y4-10', date: '2027-06-15', title: 'Annual University Convocation & Degree Award', type: 'meeting', year: 4, sem: 8, time: '10:00 AM', location: 'University Convention Center', details: 'Graduation ceremony, presentation of B.E. Degree Scrolls, Gold Medals, and Alumni Oath.', weight: 'Degree Award' },
    ]
  };

  const specific = yearSpecific[y] || yearSpecific[2];
  const allEvents = [...common, ...specific];
  // Sort by date
  return allEvents.sort((a, b) => a.date.localeCompare(b.date));
}

function getAcademicKpis(year = 2, sem = 4) {
  const y = Number(year) || 2;
  const s = Number(sem) || (y * 2);
  const isOdd = s % 2 === 1;

  // Semester bounds (Odd: Aug 1 to Dec 10, Even: Jan 11 to May 08)
  const termStart = isOdd ? '2026-08-01' : '2027-01-11';
  const termEnd = isOdd ? '2026-12-10' : '2027-05-08';
  const totalWorkingDays = 90;

  // Calculate elapsed working days relative to termStart
  const now = new Date();
  const startDate = new Date(termStart);
  const diffDays = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
  // Approximate 5 working days per 7 calendar days
  const elapsedWorkingDays = Math.min(totalWorkingDays, Math.max(1, Math.round(diffDays * (5 / 7))));
  const remainingWorkingDays = Math.max(0, totalWorkingDays - elapsedWorkingDays);
  const progressPercent = Math.min(100, Math.round((elapsedWorkingDays / totalWorkingDays) * 100));

  // Determine current active phase for this year
  const mech = YEAR_MECHANISMS[y] || YEAR_MECHANISMS[2];
  const activeStage = mech.stages.find(st => st.status === 'In Progress') || mech.stages[4];

  return {
    studentYear: y,
    semester: s,
    semesterType: isOdd ? 'Odd Semester' : 'Even Semester',
    academicYear: '2026–2027',
    termPeriod: `${termStart} to ${termEnd}`,
    totalWorkingDays,
    elapsedWorkingDays,
    remainingWorkingDays,
    progressPercent,
    activePhase: activeStage.title,
    activePhaseDetails: activeStage.details,
    attendanceCutoffDate: isOdd ? '2026-11-25' : '2027-04-20',
    attendanceRequirement: '75.0% Mandatory',
    nextExamTitle: isOdd ? 'CIE-2 / Model Pre-SEE' : 'Even Sem CIE-2',
    nextExamDate: isOdd ? '2026-11-23' : '2027-04-21',
    daysUntilNextExam: Math.max(0, Math.ceil((new Date(isOdd ? '2026-11-23' : '2027-04-21') - now) / (1000 * 60 * 60 * 24))),
    seeExamStartDate: isOdd ? '2026-12-15' : '2027-05-14',
    annualInstructionalDays: 180,
  };
}

function generateIcsCalendar(year = 2) {
  const events = getScheduledEventsForYear(year);
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Campus AI//Academic Calendar 2026-2027//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Smart Campus Academic Calendar - Year ' + year,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  events.forEach(e => {
    const dStr = e.date.replace(/-/g, '');
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${e.id}-${dStr}@smartcampus.edu`);
    ics.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    ics.push(`DTSTART;VALUE=DATE:${dStr}`);
    ics.push(`SUMMARY:[${(e.type || 'Academic').toUpperCase()}] ${e.title}`);
    ics.push(`DESCRIPTION:${(e.details || e.desc || '').replace(/\n/g, ' ')} | Location: ${e.location || 'Campus'}`);
    ics.push(`LOCATION:${e.location || 'Smart Campus'}`);
    ics.push(`STATUS:CONFIRMED`);
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

module.exports = {
  HOLIDAYS_2026_2027,
  YEAR_MECHANISMS,
  getScheduledEventsForYear,
  getAcademicKpis,
  generateIcsCalendar
};

