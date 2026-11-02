// Smart Campus RAG Knowledge Engine
// Vector retrieval over Notices, Syllabus, and Institutional Policies with SQLite embedding persistence.
// Enforces mandatory bracketed citations in format: [Notice: ...], [Syllabus: ...], [Policy: ...]

const { db } = require('../db');
const prompts = require('../prompts');
const gemini = require('./gemini');

// Curated Institutional Policies
const INSTITUTIONAL_POLICIES = [
  {
    title: 'UGC/AICTE 75% Mandatory Attendance Rule',
    source: 'policy',
    category: 'Attendance & Academic Eligibility',
    chunk: `Under UGC Circular 14-3/2020 and AICTE Model Regulations, every enrolled undergraduate student must maintain a minimum of 75.0% attendance in each registered theory and practical laboratory course.
Any student with overall attendance below 75.0% is disqualified and debarred from appearing in Semester End Examinations (SEE).
Condonation of shortage between 65.0% and 74.9% is permitted strictly on valid medical grounds (certified by a registered medical practitioner within 3 working days) or authorized university sports/cultural representation approved by the Dean of Academic Affairs.
Shortages below 65.0% cannot be condoned under any circumstance and require course repetition in the subsequent academic session.`
  },
  {
    title: 'Continuous Internal Evaluation (CIE) & Semester End Examination (SEE) Scheme',
    source: 'policy',
    category: 'Examinations & Grading',
    chunk: `Academic performance evaluation follows a 50:50 distribution pattern:
1. Continuous Internal Evaluation (CIE) accounts for 50 Marks, comprising CIE-1 (30 marks descriptive written test), CIE-2 / Model Exam (30 marks full-syllabus simulation), and Continuous Assessments (20 marks quizzes, assignments, and mini-project reviews). Best two written tests or cumulative average is computed.
2. Semester End Examination (SEE) accounts for 50 Marks conducted centrally by the University Examination Cell with external question paper setting and double evaluation.
A student must score a minimum of 35% (18/50) in the SEE theory paper and an overall aggregate of 40% (40/100 combined CIE + SEE) to earn course credits.`
  },
  {
    title: 'SGPA/CGPA 10-Point Letter Grading Scale',
    source: 'policy',
    category: 'Academic Regulations',
    chunk: `Academic results are awarded on a 10-point semester grade point average (SGPA) scale:
• Outstanding (O): 90%–100% (Grade Point 10)
• Excellent (A+): 80%–89% (Grade Point 9)
• Very Good (A): 70%–79% (Grade Point 8)
• Good (B+): 60%–69% (Grade Point 7)
• Above Average (B): 50%–59% (Grade Point 6)
• Average (C): 45%–49% (Grade Point 5)
• Pass (P): 40%–44% (Grade Point 4)
• Fail (F): <40% (Grade Point 0, Backlog registered).
Degree award with Distinction requires CGPA >= 8.5 with no standing backlogs in any semester.`
  },
  {
    title: 'Fee Payment Timelines, Late Fine & Clearance Policy',
    source: 'policy',
    category: 'Finance & Student Accounts',
    chunk: `Semester tuition and development fees must be cleared within the first 15 calendar days of semester commencement.
A grace period is provided from Day 16 through Day 30 with a mandatory late fine of ₹100 per day.
Non-clearance beyond Day 30 results in immediate automated withholding of examination hall tickets, suspension of student portal credentials, and forfeiture of course registration until full settlement with Accounts Office clearance.`
  },
  {
    title: 'Hostel Curfew, Mess Services & Biometric RFID Security',
    source: 'policy',
    category: 'Campus Living & Safety',
    chunk: `Hostel gates close strictly at 9:30 PM for all undergraduate resident students.
Entry and exit require biometric facial authentication or student RFID card tap at campus security turnstiles.
Mess operating hours: Breakfast (07:30 AM – 09:15 AM), Lunch (12:15 PM – 01:45 PM), Evening Snacks (05:00 PM – 06:00 PM), Dinner (07:30 PM – 09:30 PM).
Night-out passes must be applied online via the Student Portal at least 24 hours in advance and require parent SMS/email consent verification.`
  },
  {
    title: 'UGC Anti-Ragging Zero-Tolerance Protocol',
    source: 'policy',
    category: 'Safety & Discipline',
    chunk: `In strict compliance with UGC Regulation 2009 and Supreme Court directives, ragging in any form (physical, psychological, verbal, or cyber) is a non-bailable cognizable offense on campus.
Penalties include immediate suspension, cancellation of admission, debarment from campus placements, and lodging of an immediate police FIR.
Students in distress can trigger the emergency SOS alert button in the Student Portal, dial campus security control at extension 100, or call National Anti-Ragging Helpline 1800-180-5522 (24x7 toll-free).`
  },
  {
    title: 'Library Issue Limits, Loan Periods & Overdue Schedule',
    source: 'policy',
    category: 'Library & Academic Resources',
    chunk: `Undergraduate students are entitled to borrow up to 4 volumes concurrently for a 14-day loan period using their smart student RFID card.
One online renewal is permitted if no reservation hold exists.
Overdue books attract a late fine of ₹5 per volume per day.
Reference textbooks, standard question banks, and master project theses are restricted to the reference reading room. Digital library databases and IEEE/Scopus e-journals are accessible 24x7 on campus Wi-Fi and student VPN.`
  },
  {
    title: 'Mini-Project & Capstone Major Project Evaluation Charter',
    source: 'policy',
    category: 'Project Guidelines',
    chunk: `Engineering project guidelines:
1. 2nd Year Mini-Project: Formed in 3-member squads. Review 1 (Architecture, ER diagram & REST API schema defense - 20 marks CIE); Review 2 (Working software prototype, test coverage & code walkthrough viva - 20 marks CIE).
2. 4th Year Major Capstone Project: Requires industry/faculty mentor SOW agreement, Turnitin plagiarism audit (< 10% similarity threshold), technical research paper submission for IEEE/Scopus conference, and final defense before an external university examiner (100 marks).`
  }
];

// Tokenizer & Vocabulary Helper for vector embeddings
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Compute normalized term frequency vector
function computeEmbedding(text, vocab) {
  const tokens = tokenize(text);
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  const vector = vocab.map((v) => tf[v] || 0);
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Math.round((v / norm) * 1000) / 1000);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

// Synchronize and embed all knowledge documents into SQLite
let isSeeded = false;
function ensureKnowledgeBase() {
  if (isSeeded) return;
  try {
    const count = db.prepare('SELECT count(*) as count FROM document_chunks').get()?.count || 0;
    if (count > 0) {
      isSeeded = true;
      return;
    }

    console.log('[rag] Ingesting and embedding notices, syllabus, and institutional policies into SQLite...');
    const chunks = [];

    // 1. Ingest Policies
    INSTITUTIONAL_POLICIES.forEach((p) => {
      chunks.push({
        source: 'policy',
        title: p.title,
        chunk: p.chunk,
        metadata: JSON.stringify({ category: p.category })
      });
    });

    // 2. Ingest Notices from database
    const notices = db.prepare('SELECT * FROM notices').all();
    notices.forEach((n) => {
      chunks.push({
        source: 'notice',
        title: n.title,
        chunk: `Notice: ${n.title}\nCategory: ${n.category || 'General'}\nDate: ${n.created_at || 'Recent'}\n${n.body || n.summary || ''}`,
        metadata: JSON.stringify({ category: n.category, priority: n.priority })
      });
    });

    // 3. Ingest Course Syllabi from subjects database
    const subjects = db.prepare('SELECT * FROM subjects').all();
    subjects.forEach((s) => {
      chunks.push({
        source: 'syllabus',
        title: `${s.code} - ${s.name}`,
        chunk: `Course Code: ${s.code}\nCourse Name: ${s.name}\nSemester: ${s.sem} (${s.category || 'Core'})\nCredits: ${s.credits} Credits\nFaculty: ${s.faculty || 'Department Faculty'}\nPrerequisites: ${s.prereq || 'None'}\nSyllabus Modules: ${s.modules || 'Standard unit-wise engineering syllabus'}\nEvaluation Scheme: 50 Marks CIE + 50 Marks SEE (Minimum 40% aggregate required for pass credit).`,
        metadata: JSON.stringify({ code: s.code, sem: s.sem, credits: s.credits })
      });
    });

    // Build vocabulary from all chunks
    const allWords = new Set();
    chunks.forEach((c) => {
      tokenize(c.chunk).forEach((w) => allWords.add(w));
    });
    const vocab = Array.from(allWords).slice(0, 300); // Top 300 term dimensions

    // Insert chunks with vector embeddings into document_chunks
    const insertStmt = db.prepare(`
      INSERT INTO document_chunks (source, title, chunk, embedding, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    chunks.forEach((c) => {
      const vec = computeEmbedding(c.chunk, vocab);
      insertStmt.run(c.source, c.title, c.chunk, JSON.stringify(vec), c.metadata);
    });

    isSeeded = true;
    console.log(`[rag] Successfully embedded ${chunks.length} chunks into document_chunks table.`);
  } catch (err) {
    console.error('[rag] Error seeding document chunks:', err?.message);
  }
}

/**
 * Retrieve top-K relevant chunks using vector cosine similarity
 */
function retrieveChunks(query, topK = 4) {
  ensureKnowledgeBase();
  const rows = db.prepare('SELECT id, source, title, chunk, embedding, metadata FROM document_chunks').all();
  if (!rows.length) return [];

  // Build query embedding from corpus vocabulary
  const allWords = new Set();
  rows.forEach((r) => {
    tokenize(r.chunk).slice(0, 50).forEach((w) => allWords.add(w));
  });
  const vocab = Array.from(allWords).slice(0, 300);
  const qVec = computeEmbedding(query, vocab);

  // Compute similarities & keyword boosts
  const queryTokens = tokenize(query);
  const scored = rows.map((r) => {
    let vec = [];
    try { vec = JSON.parse(r.embedding); } catch {}
    let sim = cosineSimilarity(qVec, vec);

    // Keyword matching boost on titles and content
    const textLower = (r.title + ' ' + r.chunk).toLowerCase();
    let kwMatches = 0;
    queryTokens.forEach((qt) => {
      if (textLower.includes(qt)) kwMatches++;
    });
    const finalScore = sim * 0.6 + Math.min(1.0, kwMatches * 0.2);

    return { ...r, score: finalScore };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Format citation tag for a chunk
 */
function formatCitation(chunk) {
  if (chunk.source === 'notice') return `[Notice: ${chunk.title}]`;
  if (chunk.source === 'syllabus') return `[Syllabus: ${chunk.title}]`;
  return `[Policy: ${chunk.title}]`;
}

/**
 * Main RAG Chat query execution
 */
async function queryRagChat(query, { userId = null, history = [] } = {}) {
  ensureKnowledgeBase();
  const relevantChunks = retrieveChunks(query, 3);

  // Build context payload with source labels
  const contextText = relevantChunks.map((c, i) => {
    const tag = formatCitation(c);
    return `--- DOCUMENT CHUNK ${i + 1} ${tag} ---\nSource: ${c.source.toUpperCase()}\nTitle: ${c.title}\nContent:\n${c.chunk}`;
  }).join('\n\n');

  // Build citations array
  const citations = relevantChunks.map((c) => ({
    source: c.source,
    title: c.title,
    tag: formatCitation(c)
  }));

  // Define offline synthesizer
  const offlineFallback = () => {
    if (!relevantChunks.length) {
      return {
        reply: `I could not locate specific notices or syllabus records matching "${query}". Please check the Student Portal notices or consult your Academic Advisor.`,
        citations: [],
        engine: 'offline'
      };
    }

    // Synthesize structured offline answer from top chunks
    const top = relevantChunks[0];
    const topCitation = formatCitation(top);
    const secondary = relevantChunks[1] ? formatCitation(relevantChunks[1]) : '';

    // Extract first 2-3 substantive sentences from top chunk
    const sentences = top.chunk
      .split(/\n+/)
      .filter((s) => s.trim().length > 15 && !s.includes('Course Code:') && !s.includes('---'))
      .slice(0, 3)
      .join(' ');

    const reply = `According to official university documentation ${topCitation}${secondary ? ' and ' + secondary : ''}:\n\n${sentences || top.chunk.slice(0, 240)}...\n\nFor full regulatory clauses, inspect the official documentation ${topCitation}.`;

    return {
      reply,
      citations,
      engine: 'offline'
    };
  };

  // If Gemini is available, run grounded generation
  const systemInstruction = prompts.ragChatbot;
  const userPrompt = `RETRIEVED INSTITUTIONAL CONTEXT:\n${contextText}\n\nSTUDENT QUESTION:\n${query}\n\nPlease answer the question concisely and include the bracketed source citations [Notice: ...], [Syllabus: ...], or [Policy: ...] for all facts.`;

  const geminiResponse = await gemini.generateContent({
    system: systemInstruction,
    prompt: userPrompt,
    messages: [
      ...(history || []).slice(-4).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userPrompt }
    ],
    maxTokens: 500,
    temperature: 0.2, // Low temperature for high factual accuracy
    userId,
    feature: 'rag_chatbot',
    offlineFallback
  });

  if (typeof geminiResponse === 'string') {
    return {
      reply: geminiResponse,
      citations,
      engine: 'gemini'
    };
  }

  return geminiResponse || offlineFallback();
}

module.exports = {
  ensureKnowledgeBase,
  retrieveChunks,
  queryRagChat,
  formatCitation
};

