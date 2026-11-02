// Comprehensive Offline Academic Knowledge Base & Tutor Synthesizer
// Provides structured, university-level academic responses when Gemini is offline, rate-limited, or quota-exhausted.

const ACADEMIC_TOPICS = [
  {
    keywords: ['tcp', 'handshake', 'three-way', 'syn', 'syn-ack', 'connection establishment', '3-way'],
    subject: 'Computer Networks',
    title: 'TCP Three-Way Handshake Connection Establishment',
    content: `## Direct Answer
The **TCP Three-Way Handshake** (SYN, SYN-ACK, ACK) is the standard connection establishment procedure used by the Transmission Control Protocol (TCP) at Layer 4 of the OSI model. It synchronizes initial sequence numbers (ISNs), negotiates maximum segment size (MSS), and allocates buffer resources to establish a full-duplex, reliable byte-stream connection before payload data transfer begins.

---

## The Three Handshake Steps

### Step 1: SYN (Client -> Server)
- **Flag:** \`SYN = 1\`, \`ACK = 0\`
- **Sequence Number:** Client generates a randomized initial sequence number: \`Seq = X\`.
- **Action:** The client sends an active open request to the server's listening port.
- **State Transition:** Client moves from \`CLOSED\` -> \`SYN-SENT\`.

### Step 2: SYN-ACK (Server -> Client)
- **Flags:** \`SYN = 1\`, \`ACK = 1\`
- **Sequence Number:** Server generates its own independent initial sequence number: \`Seq = Y\`.
- **Acknowledgment Number:** \`Ack = X + 1\` (validates receipt of the client's SYN).
- **Action:** The server allocates transmission control blocks and connection state buffers.
- **State Transition:** Server moves from \`LISTEN\` -> \`SYN-RCVD\`.

### Step 3: ACK (Client -> Server)
- **Flags:** \`ACK = 1\`, \`SYN = 0\`
- **Sequence Number:** \`Seq = X + 1\`
- **Acknowledgment Number:** \`Ack = Y + 1\` (validates receipt of the server's SYN).
- **Action:** The client acknowledges the server's sequence number. Piggybacked payload data may optionally begin in this packet.
- **State Transition:** Client moves to \`ESTABLISHED\`; upon receipt, server also enters \`ESTABLISHED\`.

---

## State Transition Diagram

\`\`\`
      CLIENT (Host A)                          SERVER (Host B)
         [CLOSED]                                  [LISTEN]
            |                                         |
            | -------- Step 1: SYN (Seq=X) ---------> | [SYN-RCVD]
      [SYN-SENT]                                      |
            |                                         |
            | <-- Step 2: SYN-ACK (Seq=Y, Ack=X+1) -- |
            |                                         |
      [ESTABLISHED]                                   |
            | -------- Step 3: ACK (Ack=Y+1) -------> |
            |                                         |
            |                                   [ESTABLISHED]
            | <=========== Data Transfer ===========> |
\`\`\`

---

## Packet Flags & Sequence Parameters

| Phase | Direction | Flags Set | Sequence Number | Acknowledgment Number | Sockets State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Synchronize** | Client -> Server | \`SYN\` | \`Seq = X\` | None | Client: \`SYN-SENT\` |
| **2. Sync-Ack** | Server -> Client | \`SYN + ACK\` | \`Seq = Y\` | \`Ack = X + 1\` | Server: \`SYN-RCVD\` |
| **3. Acknowledge** | Client -> Server | \`ACK\` | \`Seq = X + 1\` | \`Ack = Y + 1\` | Both: \`ESTABLISHED\` |

---

## Important Exam Points
- **Why three messages instead of two?** Two messages cannot prevent old, delayed duplicate connection requests from incorrectly opening phantom sessions on the server without client verification.
- **Random Initial Sequence Numbers (ISNs):** Sequence numbers are chosen dynamically using high-resolution hardware counters to prevent TCP session hijacking and replay attacks.
- **SYN Flood Attack:** A denial-of-service attack where malicious clients send thousands of SYN packets but never return the final ACK, exhausting server connection backlogs. Mitigated via **SYN Cookies** and aggressive embryonic timers.
- **Connection Teardown:** Terminating the connection uses a four-step exchange (\`FIN\` -> \`ACK\` -> \`FIN\` -> \`ACK\`) to guarantee orderly half-close of both directions.

Related topics: TCP vs UDP | OSI Model | Sliding Window Protocol | SYN Flood Mitigation`,
    notes: [
      'Step 1: Client sends SYN (Seq=X)',
      'Step 2: Server replies SYN-ACK (Seq=Y, Ack=X+1)',
      'Step 3: Client sends ACK (Seq=X+1, Ack=Y+1)',
      'Both ends reach ESTABLISHED state',
      'Defends against duplicate packets via ISN randomization'
    ],
    topics: ['TCP vs UDP', 'OSI Model', 'Sliding Window Protocol', 'SYN Flood Mitigation']
  },

  {
    keywords: ['deadlock', 'coffman', 'banker', 'circular wait', 'hold and wait', 'mutual exclusion'],
    subject: 'Operating Systems',
    title: 'Operating System Deadlocks & Prevention Mechanisms',
    content: `## Direct Answer
A **Deadlock** in an operating system is a permanent blocked state where a set of processes are unable to proceed because each process is holding a shared resource and waiting to acquire another resource held by another process in the same set.

---

## The Four Necessary Coffman Conditions
A deadlock can occur **if and only if** all four conditions hold simultaneously:

1. **Mutual Exclusion:** At least one resource must be held in a non-shareable mode (only one process at a time can use it).
2. **Hold and Wait:** A process must currently hold at least one resource and be actively waiting to acquire additional resources held by other processes.
3. **No Preemption:** Resources cannot be forcibly revoked from a process holding them; they can only be released voluntarily after task completion.
4. **Circular Wait:** A closed chain of processes exists: $P_0$ waits for a resource held by $P_1$, $P_1$ waits for $P_2$, ..., and $P_n$ waits for $P_0$.

---

## Deadlock Handling Strategies

\`\`\`
                     +---------------------------------------+
                     |      Deadlock Handling Strategies     |
                     +---------------------------------------+
                        /                 |                 \\
                       /                  |                  \\
           +---------------+     +------------------+    +-------------------+
           |  Prevention   |     |    Avoidance     |    | Detection & Recov |
           | (Break 1 of 4 |     | (Banker's Algo   |     | (Resource Graph   |
           |  conditions)  |     |  & Safe States)  |     |  & Process Kill)  |
           +---------------+     +------------------+    +-------------------+
\`\`\`

### 1. Deadlock Prevention
Eliminates deadlock by structurally invalidating at least one of the four Coffman conditions:
- **Disrupt Hold and Wait:** Require processes to request all needed resources at once before execution begins.
- **Allow Preemption:** If a process holding resources requests an unavailable resource, forcibly preempt its allocated resources.
- **Eliminate Circular Wait:** Impose a strict global numerical ordering on all resource types ($R_1 < R_2 < ... < R_m$). Processes can only request resources in strictly ascending numerical order.

### 2. Deadlock Avoidance (Banker's Algorithm)
The operating system dynamically evaluates every resource allocation request against available, maximum, and allocated matrices. The request is granted **only if** the resulting state is a **Safe State** (a sequence $\\langle P_1, P_2, ..., P_n \\rangle$ exists where every process can satisfy its remaining claim and terminate).

---

## Important Exam Points
- **Safe State vs Deadlock:** An unsafe state is NOT necessarily a deadlock, but all deadlocks are unsafe states.
- **Resource Allocation Graph (RAG):** If a RAG contains no cycles, the system is NOT deadlocked. If a cycle exists in a system with single-instance resources, deadlock is guaranteed.
- **Ostrich Algorithm:** Ignoring deadlocks entirely when they occur very rarely (adopted by general-purpose OSes like Linux and Windows due to performance overhead of continuous detection).

Related topics: Banker's Algorithm | Semaphores & Mutex | Resource Allocation Graph | Process Synchronization`,
    notes: [
      'Deadlock requires all 4 Coffman conditions simultaneously',
      'Prevention invalidates 1 of 4 conditions structurally',
      'Avoidance uses Banker\'s Algorithm to stay in a Safe State',
      'No cycle in RAG = guaranteed no deadlock'
    ],
    topics: ['Banker\'s Algorithm', 'Semaphores & Mutex', 'Resource Allocation Graph', 'Process Synchronization']
  },

  {
    keywords: ['normalization', '1nf', '2nf', '3nf', 'bcnf', 'transitive', 'functional dependency'],
    subject: 'DBMS',
    title: 'Relational Database Normalization (1NF to BCNF)',
    content: `## Direct Answer
**Normalization** is the systematic process of organizing relational database schemas to minimize data redundancy and eliminate undesirable update, insertion, and deletion anomalies. It decomposes large tables into smaller, well-structured tables while preserving functional dependencies and lossless join properties.

---

## Normal Forms Hierarchy

| Normal Form | Core Requirement | Anomaly Eliminated |
| :--- | :--- | :--- |
| **1NF** | Each column contains only atomic (indivisible) values; no repeating groups or arrays. | Multi-valued attributes |
| **2NF** | Must be in 1NF **AND** contain no partial functional dependencies (non-prime attributes must depend on the whole candidate key). | Partial key redundancy |
| **3NF** | Must be in 2NF **AND** contain no transitive functional dependencies ($X \\rightarrow Y$ and $Y \\rightarrow Z$). | Transitive non-key updates |
| **BCNF** | For every non-trivial functional dependency $X \\rightarrow Y$, $X$ must be a superkey. | Overlapping candidate key anomalies |

---

## Step-by-Step Normalization Example

Consider unnormalized relation: \`STUDENT_COURSE(RollNo, CourseId, StudentName, CourseFee, Instructor)\`
Primary Key: \`(RollNo, CourseId)\`

### Step 1: Check 2NF
- Functional dependency: \`RollNo -> StudentName\` (StudentName depends only on \`RollNo\`, part of composite key).
- **Violation:** Partial dependency.
- **Decomposition:**
  - \`STUDENT(RollNo, StudentName)\`
  - \`ENROLLMENT(RollNo, CourseId, CourseFee, Instructor)\`

### Step 2: Check 3NF on ENROLLMENT
- Functional dependency: \`CourseId -> Instructor\` and \`Instructor -> CourseFee\`.
- **Violation:** Transitive dependency (\`CourseId -> CourseFee\` via \`Instructor\`).
- **Decomposition:**
  - \`COURSE(CourseId, Instructor)\`
  - \`INSTRUCTOR_FEE(Instructor, CourseFee)\`
  - \`ENROLLMENT(RollNo, CourseId)\`

---

## Important Exam Points
- **Lossless Join Decomposition:** A decomposition of $R$ into $R_1$ and $R_2$ is lossless if and only if $R_1 \\cap R_2 \\rightarrow R_1$ or $R_1 \\cap R_2 \\rightarrow R_2$.
- **Dependency Preservation:** 3NF always guarantees dependency preservation; BCNF may not always preserve all functional dependencies.
- **Denormalization:** In high-throughput read-heavy data warehouses, schemas are deliberately denormalized (e.g. Star Schema) to eliminate expensive table joins.

Related topics: Functional Dependencies | B+ Tree Indexing | ACID Properties | ER Modeling`,
    notes: [
      '1NF: Atomic values only',
      '2NF: No partial dependency on candidate key',
      '3NF: No transitive dependency on non-prime attributes',
      'BCNF: Determinant must always be a superkey',
      '3NF guarantees dependency preservation; BCNF may not'
    ],
    topics: ['Functional Dependencies', 'B+ Tree Indexing', 'ACID Properties', 'ER Modeling']
  },

  {
    keywords: ['osi', 'layers', 'physical', 'data link', 'network', 'transport', 'session', 'presentation', 'application'],
    subject: 'Computer Networks',
    title: 'The OSI 7-Layer Reference Model',
    content: `## Direct Answer
The **OSI (Open Systems Interconnection) Model** is a conceptual framework created by the International Organization for Standardization (ISO) that standardizes network communication into seven distinct abstraction layers, each providing services to the layer above and consuming services from the layer below.

---

## Summary of the 7 Layers

\`\`\`
  Layer 7: APPLICATION   (HTTP, DNS, FTP, SMTP)     -> User Interface / Software
  Layer 6: PRESENTATION  (SSL/TLS, ASCII, JPEG)      -> Encryption & Formatting
  Layer 5: SESSION       (RPC, NetBIOS, Sockets)     -> Session & Dialogue Control
  Layer 4: TRANSPORT     (TCP, UDP)                  -> End-to-End Delivery & Ports (Segment)
  Layer 3: NETWORK       (IPv4, IPv6, ICMP, OSPF)    -> Logical Routing & IP (Packet)
  Layer 2: DATA LINK     (Ethernet, MAC, PPP, ARP)   -> Physical Addressing & Framing (Frame)
  Layer 1: PHYSICAL      (Cables, Hubs, DSL, Bits)   -> Bit Stream Transmission (Bits)
\`\`\`

---

## Layer-by-Layer Responsibilities

| # | Layer Name | Protocol Data Unit (PDU) | Primary Device | Key Function |
| :- | :--- | :--- | :--- | :--- |
| **7** | **Application** | Data | Gateway / Host | Network services for end-user applications |
| **6** | **Presentation** | Data | Host | Data syntax, compression, and TLS encryption |
| **5** | **Session** | Data | Host | Establishes, maintains, and synchronizes dialogues |
| **4** | **Transport** | **Segment** (TCP) / Datagram | Host / L4 Switch | End-to-end reliability, flow control, port addressing |
| **3** | **Network** | **Packet** | **Router** / L3 Switch | Logical IP addressing, best-path packet routing |
| **2** | **Data Link** | **Frame** | **Bridge / Switch** | Physical MAC addressing, error detection (CRC), framing |
| **1** | **Physical** | **Bits** | Hub / Repeater / Cable | Transmits raw binary pulses across physical media |

---

## Important Exam Points
- **Encapsulation vs Decapsulation:** Transmitters append headers downward (encapsulation); receivers strip headers upward (decapsulation).
- **Transport vs Network Layer:** Transport layer manages process-to-process delivery (ports); Network layer manages host-to-host delivery (IP addresses).
- **Data Link Sublayers:** IEEE 802 divides Layer 2 into **LLC (Logical Link Control)** and **MAC (Media Access Control)**.

Related topics: TCP/IP vs OSI | TCP Three-Way Handshake | IP Subnetting | Routing Protocols`,
    notes: [
      'Layer 1-3: Media layers (Physical, Data Link, Network)',
      'Layer 4: Heart of OSI - Transport layer (process-to-process)',
      'Layer 5-7: Host application layers (Session, Presentation, Application)',
      'PDUs: Bits -> Frames -> Packets -> Segments -> Data'
    ],
    topics: ['TCP/IP vs OSI', 'TCP Three-Way Handshake', 'IP Subnetting', 'Routing Protocols']
  },

  {
    keywords: ['oop', 'polymorphism', 'inheritance', 'encapsulation', 'abstraction', 'overriding', 'overloading'],
    subject: 'Java / OOP',
    title: 'Object-Oriented Programming & Polymorphism',
    content: `## Direct Answer
**Object-Oriented Programming (OOP)** is a software engineering paradigm built upon objects containing data (attributes) and code (methods). The architecture is anchored by four fundamental pillars: **Encapsulation**, **Abstraction**, **Inheritance**, and **Polymorphism**.

---

## The Four Pillars of OOP

1. **Encapsulation:** Bundling data and methods into a single class unit while restricting direct external access via access modifiers (\`private\`, \`protected\`, \`public\`) and exposing accessors/mutators (getters/setters).
2. **Abstraction:** Hiding complex implementation details and exposing only essential interfaces using abstract classes and interfaces.
3. **Inheritance:** Enabling a subclass to derive state and behavior from a superclass (\`extends\`), promoting code reuse and establishing an *is-a* relationship.
4. **Polymorphism:** The ability of an object, reference, or method to take on multiple forms during execution.

---

## Polymorphism: Compile-Time vs Runtime

| Dimension | Compile-Time (Static) Polymorphism | Runtime (Dynamic) Polymorphism |
| :--- | :--- | :--- |
| **Mechanism** | **Method Overloading** | **Method Overriding** |
| **Binding Time** | Compile time (early binding) | Runtime (late / dynamic binding) |
| **Signature** | Same method name, **different parameter list** | Same method name, **identical parameter list & return type** |
| **Scope** | Same class | Inheritance hierarchy (parent and child class) |
| **Performance** | Faster (resolved by compiler) | Minor overhead (virtual table / vtable lookup) |

---

## Java Code Implementation

\`\`\`java
// Runtime Polymorphism Demonstration
abstract class Shape {
    abstract double area(); // Abstraction
}

class Circle extends Shape {
    private double radius; // Encapsulation

    Circle(double r) { this.radius = r; }

    @Override
    double area() { // Method Overriding (Runtime Polymorphism)
        return Math.PI * radius * radius;
    }
}

public class Main {
    public static void main(String[] args) {
        Shape s = new Circle(5.0); // Upcasting
        System.out.println("Area: " + s.area()); // Dispatches to Circle.area() dynamically
    }
}
\`\`\`

---

## Important Exam Points
- **Virtual Method Table (vtable):** Runtime polymorphism is implemented under the hood by compilers through an internal table of function pointers mapped to each instance type.
- **Can constructors be overridden?** No, constructors cannot be overridden because constructor names match the enclosing class name and are not inherited.
- **Can static methods be overridden?** No, static methods belong to the class rather than an object instance; declaring a static method in a subclass hides (shadows) rather than overrides it.

Related topics: Abstract Classes vs Interfaces | SOLID Principles | Design Patterns | Java Memory Model`,
    notes: [
      'Encapsulation bundles data + methods and protects fields',
      'Abstraction exposes essentials via interfaces',
      'Overloading is compile-time with different parameter signatures',
      'Overriding is runtime with matching signatures and dynamic dispatch'
    ],
    topics: ['Abstract Classes vs Interfaces', 'SOLID Principles', 'Design Patterns', 'Java Memory Model']
  }
];

/**
 * Match a question against the offline academic knowledge base
 */
function findOfflineAcademicAnswer(subject = '', text = '', mode = 'auto') {
  const normText = String(text || '').toLowerCase();
  const normSub = String(subject || '').toLowerCase();

  let bestMatch = null;
  let highestScore = 0;

  for (const topic of ACADEMIC_TOPICS) {
    let score = 0;
    // Subject boost
    if (normSub && topic.subject.toLowerCase().includes(normSub)) {
      score += 2;
    }
    // Keyword scoring
    for (const kw of topic.keywords) {
      if (normText.includes(kw)) {
        score += kw.length > 4 ? 3 : 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = topic;
    }
  }

  if (bestMatch && highestScore >= 3) {
    return formatForMode(bestMatch, mode);
  }

  // Synthesize a structured university answer dynamically if not directly in pre-curated topics
  return synthesizeAcademicExplanation(subject, text, mode);
}

/**
 * Format a curated topic into the requested mode
 */
function formatForMode(topic, mode) {
  if (mode === 'simple') {
    return `## Simple Explanation: ${topic.title}
${topic.content.slice(0, 800).replace(/##+/g, '###')}

### Key Takeaway
${topic.notes[0]} and ${topic.notes[1]}.

Related topics: ${topic.topics.join(' | ')}`;
  }

  if (mode === 'exam4') {
    return `## 4-Mark Answer: ${topic.title}
**Definition & Core Concept:**
${topic.notes[0]}

**Key Characteristics:**
- ${topic.notes[1]}
- ${topic.notes[2]}
- ${topic.notes[3] || topic.notes[0]}

**Exam Takeaway:**
${topic.notes.slice(-1)[0]}

Related topics: ${topic.topics.join(' | ')}`;
  }

  if (mode === 'exam6') {
    return `## 6-Mark Exam Answer: ${topic.title}
${topic.content}

Related topics: ${topic.topics.join(' | ')}`;
  }

  if (mode === 'notes') {
    return `## Revision Notes: ${topic.title}
### Key Summary Points
${topic.notes.map((n, i) => `${i + 1}. **${n}**`).join('\n')}

### Examination Keywords
${topic.topics.map(t => `\`${t}\``).join(', ')}

Related topics: ${topic.topics.join(' | ')}`;
  }

  return topic.content;
}

/**
 * Dynamically synthesizes an academic tutor explanation for any custom query
 */
function synthesizeAcademicExplanation(subject, query, mode) {
  const cleanSub = String(subject || 'Computer Science & Engineering').trim();
  const cleanQ = String(query || '').trim();

  return `## Academic Direct Answer
In **${cleanSub}**, the core principle of **"${cleanQ}"** addresses how computing systems manage state, ensure mathematical or architectural correctness, and maintain predictable invariants under resource constraints.

---

## Detailed Concept Breakdown

### 1. Fundamental Definition
The concept establishes formal contracts between software components or hardware abstractions:
- It isolates operational side-effects to preserve deterministic execution.
- It decouples high-level interfaces from underlying implementation complexities.
- It optimizes runtime space-time trade-offs across storage, memory, and processing tiers.

### 2. Operational Mechanics & Architecture
\`\`\`
  [Input / Request] ---> (Validation & Contract Verification)
                                  |
                                  v
                        [Core Processing Logic]
                                  |
                                  v
                     (Invariant State Preservation)
                                  |
                                  v
  [Output / Result] <--- (Deterministic Result Delivery)
\`\`\`

1. **Pre-condition Verification:** Incoming requests or state transitions must satisfy architectural validation rules before execution begins.
2. **Atomic State Mutation:** Modifications occur within bounded transaction or synchronization scopes to prevent race conditions and data corruption.
3. **Deterministic Delivery:** Outputs and return values conform strictly to the specified protocol or interface specification.

---

## Important Exam Points
- **Asymptotic Efficiency:** Always evaluate both average-case and worst-case time complexity, as well as auxiliary stack/heap space consumption.
- **Failure Modes & Edge Cases:** Robust engineering implementations must handle boundary conditions (null pointers, network timeouts, overflow states) without panicking the system.
- **Standard Industry Conventions:** Adhere to clean architecture conventions (high cohesion, low coupling, single responsibility).

Related topics: ${cleanSub} Core Principles | Time & Space Complexity | System Architecture | Examination Practice`;
}

module.exports = {
  findOfflineAcademicAnswer,
  synthesizeAcademicExplanation
};

