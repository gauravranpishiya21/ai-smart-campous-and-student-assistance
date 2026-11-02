// Smart Campus Quiz & Flashcard Generator
// Produces curriculum-aligned MCQs and active-recall revision flashcards in structured JSON.

const prompts = require('../prompts');
const gemini = require('./gemini');

// Curated Educational Question & Concept Banks for Offline Fallback
const OFFLINE_BANKS = {
  'data structures': {
    quizzes: [
      {
        id: 'q-ds-1',
        question: 'Which of the following data structures is optimal for implementing an undo buffer in a text editor?',
        options: ['Queue (FIFO)', 'Stack (LIFO)', 'Singly Linked List', 'Binary Search Tree'],
        correct_option: 'Stack (LIFO)',
        explanation: 'A stack operates on Last-In-First-Out order, making the most recent text edit the first operation popped during undo.',
        difficulty: 'Easy'
      },
      {
        id: 'q-ds-2',
        question: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correct_option: 'O(n)',
        explanation: 'When a BST degenerates into a linear chain (skewed tree), search degrades from logarithmic O(log n) to linear O(n).',
        difficulty: 'Medium'
      },
      {
        id: 'q-ds-3',
        question: 'Which collision resolution technique in hash tables stores conflicting keys in an external linked list at each bucket?',
        options: ['Linear Probing', 'Quadratic Probing', 'Separate Chaining', 'Double Hashing'],
        correct_option: 'Separate Chaining',
        explanation: 'Separate chaining maintains an auxiliary linked list (or dynamic array) at each hash index to store all colliding entries.',
        difficulty: 'Medium'
      }
    ],
    flashcards: [
      {
        id: 'fc-ds-1',
        concept: 'AVL Tree Rotation',
        front: 'What triggers an LL (Left-Left) rotation in an AVL balanced tree?',
        back: 'When an insertion occurs in the left subtree of the left child of a node with balance factor +2.',
        key_takeaway: 'Restores the balance factor to 0 or ±1 with a single right rotation.',
        difficulty: 'Core'
      },
      {
        id: 'fc-ds-2',
        concept: 'Max-Heap Invariant',
        front: 'State the fundamental structural and value property of a Max-Heap.',
        back: 'It must be a complete binary tree where the key at any node is greater than or equal to the keys of its children.',
        key_takeaway: 'Guarantees the maximum element is always accessible at the root in O(1) time.',
        difficulty: 'Core'
      },
      {
        id: 'fc-ds-3',
        concept: 'Breadth-First Search (BFS)',
        front: 'Which auxiliary data structure does standard BFS graph traversal require?',
        back: 'A FIFO Queue to explore nodes in concentric level-by-level distance order.',
        key_takeaway: 'Discovers the shortest path in unweighted graphs in O(V + E) time.',
        difficulty: 'Advanced'
      }
    ]
  },
  'operating systems': {
    quizzes: [
      {
        id: 'q-os-1',
        question: 'Which of the following is NOT one of the four necessary Coffman conditions for system deadlock?',
        options: ['Mutual Exclusion', 'Preemption Allowed', 'Hold and Wait', 'Circular Wait'],
        correct_option: 'Preemption Allowed',
        explanation: 'The condition is "No Preemption" (resources cannot be forcibly taken away). Allowing preemption actively prevents deadlock.',
        difficulty: 'Easy'
      },
      {
        id: 'q-os-2',
        question: 'What page replacement algorithm suffers from Belady\'s Anomaly (where increasing page frames increases page faults)?',
        options: ['Optimal (OPT)', 'Least Recently Used (LRU)', 'First-In First-Out (FIFO)', 'Least Frequently Used (LFU)'],
        correct_option: 'First-In First-Out (FIFO)',
        explanation: 'FIFO does not belong to the class of stack algorithms, which causes Belady\'s Anomaly on certain memory reference strings.',
        difficulty: 'Hard'
      },
      {
        id: 'q-os-3',
        question: 'Which scheduling algorithm guarantees minimum average waiting time for a set of stationary processes?',
        options: ['First-Come First-Served (FCFS)', 'Round Robin (RR)', 'Shortest Job First (SJF)', 'Priority Scheduling'],
        correct_option: 'Shortest Job First (SJF)',
        explanation: 'SJF is mathematically optimal for minimizing average process waiting time.',
        difficulty: 'Medium'
      }
    ],
    flashcards: [
      {
        id: 'fc-os-1',
        concept: 'Process vs Thread',
        front: 'What resources do multiple threads of the same process share?',
        back: 'Threads share the code segment, data segment, open file descriptors, and heap, but maintain distinct program counters and stacks.',
        key_takeaway: 'Lightweight creation and low context-switch overhead.',
        difficulty: 'Core'
      },
      {
        id: 'fc-os-2',
        concept: 'Thrashing',
        front: 'What causes thrashing in virtual memory systems?',
        back: 'When total process memory allocation exceeds available physical frames, causing processes to spend more time paging in/out than executing code.',
        key_takeaway: 'Solved by local page replacement or increasing physical RAM.',
        difficulty: 'Advanced'
      }
    ]
  },
  'database': {
    quizzes: [
      {
        id: 'q-db-1',
        question: 'A relational table is in 3NF if it is in 2NF and has no:',
        options: ['Atomic values', 'Partial functional dependencies', 'Transitive functional dependencies', 'Foreign keys'],
        correct_option: 'Transitive functional dependencies',
        explanation: '3NF removes transitive dependencies (X -> Y and Y -> Z where Z is a non-prime attribute).',
        difficulty: 'Medium'
      },
      {
        id: 'q-db-2',
        question: 'Which ACID property guarantees that all operations in a transaction succeed or none take effect?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correct_option: 'Atomicity',
        explanation: 'Atomicity guarantees the "all-or-nothing" execution of database transactions.',
        difficulty: 'Easy'
      }
    ],
    flashcards: [
      {
        id: 'fc-db-1',
        concept: 'B+ Tree Indexing',
        front: 'Why are B+ Trees favored over standard BSTs for database disk storage?',
        back: 'High fan-out reduces tree height and disk I/O operations; linked leaf nodes allow fast contiguous range scans.',
        key_takeaway: 'Minimizes disk block reads.',
        difficulty: 'Advanced'
      }
    ]
  }
};

/**
 * Generate Quizzes and Flashcards in Structured JSON
 */
async function generateStudyTools({ subject = 'Data Structures', topic = 'Core Concepts', count = 3, userId = null } = {}) {
  const subNorm = subject.toLowerCase();

  // Find best matching offline bank
  let bestBank = OFFLINE_BANKS['data structures'];
  for (const [k, v] of Object.entries(OFFLINE_BANKS)) {
    if (subNorm.includes(k) || k.includes(subNorm)) {
      bestBank = v;
      break;
    }
  }

  const offlineFallback = () => {
    return {
      subject,
      topic,
      quizzes: (bestBank.quizzes || []).slice(0, count),
      flashcards: (bestBank.flashcards || []).slice(0, count),
      engine: 'offline'
    };
  };

  const systemInstruction = prompts.quizFlashcards;
  const userPrompt = `Generate ${count} university engineering quiz MCQs and ${count} revision flashcards for:
Subject: ${subject}
Topic: ${topic}
Ensure questions test core conceptual understanding, include 4 distinct options, an explicit correct option, and a 1-sentence technical explanation. Return valid JSON only.`;

  const geminiResult = await gemini.generateContent({
    system: systemInstruction,
    prompt: userPrompt,
    responseMimeType: 'application/json',
    maxTokens: 800,
    temperature: 0.4,
    userId,
    feature: 'quiz_flashcards',
    offlineFallback
  });

  if (geminiResult && Array.isArray(geminiResult.quizzes)) {
    return {
      subject: geminiResult.subject || subject,
      topic: geminiResult.topic || topic,
      quizzes: geminiResult.quizzes,
      flashcards: geminiResult.flashcards || [],
      engine: 'gemini'
    };
  }

  return offlineFallback();
}

module.exports = {
  generateStudyTools,
  OFFLINE_BANKS
};

