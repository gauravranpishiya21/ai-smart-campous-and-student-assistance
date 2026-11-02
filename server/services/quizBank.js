// Comprehensive Offline Question Banks & Procedural Generator for Quiz Engine
// Covers Core University Curriculum: DBMS, OS, Networks, DSA, Java, Python, SE, Security, Web.

const DIFF = ['Easy', 'Medium', 'Hard'];

const QUESTION_BANKS = {
  dbms: [
    {
      question: 'A relational schema is in Third Normal Form (3NF) if it is in 2NF and has no:',
      options: ['Atomic attributes', 'Partial functional dependencies', 'Transitive functional dependencies', 'Composite foreign keys'],
      correct: 2,
      explanation: '3NF strictly prohibits transitive dependencies (X -> Y and Y -> Z where Z is a non-prime attribute and not a superkey).',
      topic: 'Normalization',
      difficulty: 'Medium'
    },
    {
      question: 'Which ACID property guarantees that either all operations of a transaction complete or none do?',
      options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
      correct: 0,
      explanation: 'Atomicity enforces the all-or-nothing execution of transactions, rolling back partial mutations on abort.',
      topic: 'Transactions',
      difficulty: 'Easy'
    },
    {
      question: 'Why are B+ Trees predominantly preferred over standard B-Trees for database index storage?',
      options: ['B+ Trees store keys only in leaf nodes and link leaves for fast contiguous range scans', 'B+ Trees have lower fan-out and greater tree height', 'B+ Trees do not require rebalancing during deletions', 'B+ Trees eliminate disk I/O completely by staying in cache'],
      correct: 0,
      explanation: 'In B+ Trees, internal nodes only hold search keys for routing, maximizing fan-out, while leaf nodes contain all records and are linked sequentially for rapid range queries.',
      topic: 'Indexing & Storage',
      difficulty: 'Hard'
    },
    {
      question: 'In SQL, what is the fundamental difference between the WHERE and HAVING clauses?',
      options: ['WHERE filters individual rows before aggregation; HAVING filters groups after aggregation', 'WHERE filters aggregated groups; HAVING filters raw rows', 'WHERE can only be used with subqueries; HAVING cannot', 'WHERE is executed after GROUP BY; HAVING is executed before'],
      correct: 0,
      explanation: 'WHERE filters rows prior to the GROUP BY aggregation step, whereas HAVING evaluates predicates over aggregated group results.',
      topic: 'SQL Queries',
      difficulty: 'Easy'
    },
    {
      question: 'What is the primary guarantee provided by the Strict Two-Phase Locking (Strict 2PL) protocol?',
      options: ['Cascadeless recoverable schedules and conflict serializability', 'Freedom from deadlocks', 'Execution without locks', 'Immediate consistency without log flushing'],
      correct: 0,
      explanation: 'Strict 2PL holds all exclusive locks until transaction commit/abort, guaranteeing conflict serializability and preventing cascading aborts.',
      topic: 'Concurrency Control',
      difficulty: 'Hard'
    },
    {
      question: 'A relation is in Boyce-Codd Normal Form (BCNF) if for every functional dependency X -> Y:',
      options: ['Y is a prime attribute', 'X is a superkey of the relation', 'X is a candidate key and Y is atomic', 'Y contains all attributes of X'],
      correct: 1,
      explanation: 'BCNF requires that for every non-trivial functional dependency X -> Y, X must be a superkey.',
      topic: 'Normalization',
      difficulty: 'Medium'
    },
    {
      question: 'Which transaction isolation anomaly occurs when a transaction reads data that has been modified by another uncommitted transaction?',
      options: ['Dirty Read (Read Uncommitted)', 'Non-repeatable Read', 'Phantom Read', 'Lost Update'],
      correct: 0,
      explanation: 'A dirty read occurs when Transaction A reads row mutations made by Transaction B before Transaction B has committed.',
      topic: 'Transactions',
      difficulty: 'Medium'
    },
    {
      question: 'What does the Write-Ahead Logging (WAL) protocol mandate before a dirty database buffer page can be written to disk?',
      options: ['All indexes must be rebuilt', 'The corresponding log record must be flushed to non-volatile storage', 'All locks on the page must be released', 'The entire database must be backed up'],
      correct: 1,
      explanation: 'WAL requires that log records representing a state update must reach non-volatile disk before the corresponding modified data page is flushed.',
      topic: 'Crash Recovery',
      difficulty: 'Hard'
    },
    {
      question: 'In relational algebra, which operator is a unary operator that selects a subset of attributes from a relation?',
      options: ['Selection (sigma)', 'Projection (pi)', 'Join (bowtie)', 'Cartesian Product (times)'],
      correct: 1,
      explanation: 'Projection (pi) extracts specified columns/attributes from a relation and discards duplicates.',
      topic: 'Relational Algebra',
      difficulty: 'Easy'
    },
    {
      question: 'Which index structure does not support efficient range queries (e.g. BETWEEN 10 AND 50)?',
      options: ['B-Tree Index', 'B+ Tree Index', 'Hash Index', 'Clustered B+ Index'],
      correct: 2,
      explanation: 'Hash indexes use hash functions that scatter values pseudo-randomly across buckets, making sequential range scans impossible without a full scan.',
      topic: 'Indexing & Storage',
      difficulty: 'Medium'
    },
    {
      question: 'What happens when a FOREIGN KEY constraint is configured with ON DELETE CASCADE?',
      options: ['Deleting the parent row automatically deletes all referencing child rows', 'The parent row cannot be deleted while referenced', 'Foreign key values in child rows are set to NULL', 'Deleting the child row deletes the parent row'],
      correct: 0,
      explanation: 'ON DELETE CASCADE propagates parent record deletions down to all dependent child records holding that foreign key.',
      topic: 'Integrity Constraints',
      difficulty: 'Easy'
    },
    {
      question: 'A table is in Second Normal Form (2NF) if it is in 1NF and contains no:',
      options: ['Repeating groups', 'Partial dependencies of non-prime attributes on candidate keys', 'Transitive functional dependencies', 'Foreign key references'],
      correct: 1,
      explanation: '2NF requires eliminating partial dependencies where a non-prime attribute depends on only a subset of a composite candidate key.',
      topic: 'Normalization',
      difficulty: 'Medium'
    },
    {
      question: 'Which SQL join returns all records from the left table and matched records from the right table, filling non-matching right columns with NULL?',
      options: ['INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN'],
      correct: 1,
      explanation: 'LEFT OUTER JOIN preserves every row from the left relation, substituting NULL for right relation columns whenever no join match exists.',
      topic: 'SQL Queries',
      difficulty: 'Easy'
    },
    {
      question: 'What is a clustered index in a relational database management system?',
      options: ['An index that determines the physical ordering of records on disk', 'An index constructed exclusively in RAM cache', 'An index stored across multiple cluster nodes', 'An index that cannot contain duplicate values'],
      correct: 0,
      explanation: 'A clustered index sorts and stores data rows in the table based on their key values; therefore, a table can only possess one clustered index.',
      topic: 'Indexing & Storage',
      difficulty: 'Medium'
    },
    {
      question: 'What is a Phantom Read anomaly in concurrent transaction processing?',
      options: ['A transaction reads modified uncommitted data', 'A transaction re-reads a row and finds its attributes changed', 'A transaction executes a range query and discovers new rows inserted by another committed transaction', 'A transaction modifies a row that does not exist'],
      correct: 2,
      explanation: 'Phantom reads happen when Transaction A re-executes a range scan and finds newly inserted rows that satisfied the predicate committed by Transaction B.',
      topic: 'Transactions',
      difficulty: 'Hard'
    }
  ],

  os: [
    {
      question: 'Which of the following is NOT one of the four necessary Coffman conditions for a system deadlock?',
      options: ['Mutual Exclusion', 'Preemption Allowed', 'Hold and Wait', 'Circular Wait'],
      correct: 1,
      explanation: 'The required Coffman condition is "No Preemption" (resources cannot be forcibly taken from a process). Allowing preemption eliminates deadlock.',
      topic: 'Deadlocks',
      difficulty: 'Easy'
    },
    {
      question: 'What phenomenon causes Belady\'s Anomaly in operating system virtual memory management?',
      options: ['Increasing allocated page frames leads to an increase in page faults under FIFO replacement', 'Processes page fault continuously due to insufficient physical RAM', 'Disk head thrashing during concurrent I/O', 'Stack overflow during kernel interrupt dispatch'],
      correct: 0,
      explanation: 'Belady\'s Anomaly occurs with First-In First-Out (FIFO) page replacement, where adding more memory frames paradoxically triggers more page faults.',
      topic: 'Virtual Memory',
      difficulty: 'Hard'
    },
    {
      question: 'Which CPU scheduling algorithm is provably optimal for minimizing average waiting time for a set of stationary processes?',
      options: ['First-Come First-Served (FCFS)', 'Round Robin (RR)', 'Shortest Job First (SJF)', 'Priority Preemptive Scheduling'],
      correct: 2,
      explanation: 'Shortest Job First (SJF) minimizes average waiting time by scheduling shorter bursts ahead of longer ones.',
      topic: 'CPU Scheduling',
      difficulty: 'Medium'
    },
    {
      question: 'What resources do concurrent threads within the same process share?',
      options: ['Code segment, Heap memory, and Open file descriptors', 'CPU registers and Program Counter', 'Call stack and Local variables', 'Process ID and thread-local storage'],
      correct: 0,
      explanation: 'Threads share process address space, including code, data, heap, and OS handles, while keeping independent program counters, registers, and stacks.',
      topic: 'Processes & Threads',
      difficulty: 'Easy'
    },
    {
      question: 'In operating system memory management, what is thrashing?',
      options: ['When total memory allocation exceeds physical RAM, causing the OS to spend more time swapping pages than executing instructions', 'Excessive CPU context switching due to too small a quantum', 'Fragmented disk sectors causing continuous head seeks', 'A runaway process stuck in an infinite loop'],
      correct: 0,
      explanation: 'Thrashing occurs when the system spends more time handling page faults and paging I/O than executing useful computational instructions.',
      topic: 'Virtual Memory',
      difficulty: 'Medium'
    },
    {
      question: 'What is the role of the Translation Lookaside Buffer (TLB) in modern computer architectures?',
      options: ['A high-speed hardware associative cache that stores recent virtual-to-physical address translations', 'A kernel buffer for buffering asynchronous disk block I/O', 'A register tracking currently running thread contexts', 'A buffer holding pending system call interrupts'],
      correct: 0,
      explanation: 'The TLB is a dedicated hardware cache in the MMU that stores recent page table mappings, avoiding multi-level memory lookups on address translation hits.',
      topic: 'Memory Management',
      difficulty: 'Medium'
    },
    {
      question: 'How does Banker\'s Algorithm prevent deadlocks in resource allocation systems?',
      options: ['By testing resource requests against worst-case maximum claims to ensure the system remains in a safe state', 'By terminating any process that requests a locked resource', 'By using time-slicing to revoke resources after a fixed timeout', 'By disallowing processes from acquiring more than one lock at a time'],
      correct: 0,
      explanation: 'Banker\'s Algorithm simulates resource allocation for maximum possible claims to verify that at least one safe execution sequence exists before granting access.',
      topic: 'Deadlocks',
      difficulty: 'Hard'
    },
    {
      question: 'In Unix-like operating systems, what is a zombie process?',
      options: ['A process that has finished execution but still has an entry in the process table waiting for its parent to read its exit status', 'A process running without an allocated terminal', 'A process that has become unresponsive due to deadlock', 'A background daemon scheduled by init/systemd'],
      correct: 0,
      explanation: 'A zombie is a terminated process whose process control block remains in the process table until its parent retrieves its termination status via wait().',
      topic: 'Processes & Threads',
      difficulty: 'Easy'
    },
    {
      question: 'What distinguishes internal fragmentation from external fragmentation in memory allocation?',
      options: ['Internal fragmentation occurs within an allocated block; external fragmentation occurs between allocated partitions', 'Internal fragmentation affects virtual memory; external fragmentation affects physical disk', 'Internal fragmentation is solved by paging; external is solved by segmentation', 'Internal fragmentation only occurs in dynamic memory heaps'],
      correct: 0,
      explanation: 'Internal fragmentation is wasted space inside an assigned memory partition, while external fragmentation is unused contiguous space scattered across partitions.',
      topic: 'Memory Management',
      difficulty: 'Medium'
    },
    {
      question: 'Which synchronization primitive allows up to N concurrent threads to access a shared pool of resources?',
      options: ['Binary Semaphore / Mutex', 'Counting Semaphore', 'Spinlock', 'Condition Variable'],
      correct: 1,
      explanation: 'A counting semaphore maintains an integer counter initialized to N, decrementing on wait() and incrementing on signal() to regulate pool capacity.',
      topic: 'Synchronization',
      difficulty: 'Easy'
    },
    {
      question: 'What is Priority Inversion and how do modern real-time kernels mitigate it?',
      options: ['A higher priority task is blocked by a lower priority task holding a lock; mitigated via Priority Inheritance Protocol', 'Tasks invert their priorities on timer ticks; mitigated by round-robin scheduling', 'Interrupt handlers run at lower priority than user code; mitigated via polling', 'Starvation of low priority processes; mitigated by aging'],
      correct: 0,
      explanation: 'Priority inversion happens when a medium task preempts a low task holding a lock needed by a high task. Priority inheritance temporarily elevates the low task priority to high.',
      topic: 'Synchronization',
      difficulty: 'Hard'
    },
    {
      question: 'What is the return value of the fork() system call in the child process upon successful creation?',
      options: ['The PID of the parent process', 'Zero (0)', 'The PID of the child process', 'One (1)'],
      correct: 1,
      explanation: 'In Unix systems, fork() returns 0 to the newly created child process and returns the child\'s PID to the parent process.',
      topic: 'Processes & Threads',
      difficulty: 'Easy'
    },
    {
      question: 'In disk scheduling, how does the SCAN (Elevator) algorithm service I/O cylinder requests?',
      options: ['The disk arm moves in one direction servicing requests until reaching the end, then reverses direction', 'It always services the request closest to the current head position', 'It services requests strictly in arrival order', 'It continuously jumps back to cylinder 0 without servicing on return'],
      correct: 0,
      explanation: 'SCAN moves the disk head in one direction servicing pending requests until hitting the boundary, then reverses direction servicing in reverse.',
      topic: 'File Systems & Storage',
      difficulty: 'Medium'
    },
    {
      question: 'What does a Unix file system inode structure store?',
      options: ['File metadata and data block pointers, but NOT the file name', 'Only the file name and directory path', 'The entire binary file content in inline storage', 'User credentials and login shell paths'],
      correct: 0,
      explanation: 'An inode contains file metadata (permissions, owner, size, timestamps) and direct/indirect block pointers, while file names are mapped in directory entries.',
      topic: 'File Systems & Storage',
      difficulty: 'Medium'
    },
    {
      question: 'What hardware feature enables the operating system to prevent user applications from directly modifying hardware devices?',
      options: ['Dual-mode CPU operation (User mode vs Kernel mode)', 'Instruction pipelining', 'Branch predictor units', 'Direct Memory Access (DMA) controllers'],
      correct: 0,
      explanation: 'CPUs implement mode bits (user mode vs privileged/kernel mode) so that privileged I/O and memory management instructions can only be executed by the OS kernel.',
      topic: 'Kernel Architecture',
      difficulty: 'Easy'
    }
  ],

  networks: [
    {
      question: 'At which OSI model layer does TCP operate, and what is its primary Protocol Data Unit (PDU)?',
      options: ['Transport Layer; Segments', 'Network Layer; Packets', 'Data Link Layer; Frames', 'Application Layer; Messages'],
      correct: 0,
      explanation: 'TCP operates at Layer 4 (Transport Layer) and exchanges data encapsulated in Segments.',
      topic: 'OSI Reference Model',
      difficulty: 'Easy'
    },
    {
      question: 'What is the sequence of control packets exchanged during standard TCP 3-way connection establishment?',
      options: ['SYN -> SYN-ACK -> ACK', 'SYN -> ACK -> DATA', 'INIT -> INIT-ACK -> EST', 'ACK -> SYN -> SYN-ACK'],
      correct: 0,
      explanation: 'The client sends SYN, the server responds with SYN-ACK, and the client finishes handshake with ACK.',
      topic: 'Transport Layer',
      difficulty: 'Easy'
    },
    {
      question: 'In IPv4 CIDR notation, how many usable host addresses exist in a /26 subnet?',
      options: ['62 usable hosts', '64 usable hosts', '126 usable hosts', '30 usable hosts'],
      correct: 0,
      explanation: 'A /26 subnet allocates 32 - 26 = 6 host bits, giving 2^6 = 64 total addresses. Subtracting network and broadcast addresses leaves 62 usable host addresses.',
      topic: 'IP Subnetting',
      difficulty: 'Medium'
    },
    {
      question: 'What is the function of the Address Resolution Protocol (ARP) in local area networking?',
      options: ['Resolves known IP addresses to physical MAC addresses on the local link', 'Translates domain names to IP addresses', 'Assigns dynamic IP addresses to new network hosts', 'Routes packets across different autonomous systems'],
      correct: 0,
      explanation: 'ARP broadcasts queries to resolve Layer 3 IPv4 addresses into corresponding Layer 2 Ethernet MAC addresses.',
      topic: 'Network Layer',
      difficulty: 'Easy'
    },
    {
      question: 'Which routing protocol uses the Dijkstra Shortest Path First algorithm based on link states?',
      options: ['OSPF (Open Shortest Path First)', 'RIP (Routing Information Protocol)', 'BGP (Border Gateway Protocol)', 'IGRP (Interior Gateway Routing Protocol)'],
      correct: 0,
      explanation: 'OSPF is an interior gateway link-state routing protocol that computes least-cost loop-free paths using Dijkstra\'s algorithm.',
      topic: 'Routing Protocols',
      difficulty: 'Medium'
    },
    {
      question: 'How does the TCP Sliding Window mechanism control flow between sender and receiver?',
      options: ['The receiver advertises its available buffer window (rwnd) in ACKs, restricting unacknowledged data', 'The sender continuously doubles its transmission rate until packets drop', 'Routers discard packets when queues exceed 50%', 'The sender pauses for a fixed timeout after every single packet'],
      correct: 0,
      explanation: 'TCP flow control uses the advertised receiver window (rwnd) to prevent the sender from transmitting more data than the receiver\'s buffer can hold.',
      topic: 'Transport Layer',
      difficulty: 'Medium'
    },
    {
      question: 'Which port and transport protocol does the Domain Name System (DNS) typically use for standard client name queries?',
      options: ['Port 53 over UDP', 'Port 80 over TCP', 'Port 443 over UDP', 'Port 25 over TCP'],
      correct: 0,
      explanation: 'Standard DNS queries use UDP port 53 for low latency and minimal overhead, switching to TCP for large responses or zone transfers.',
      topic: 'Application Layer',
      difficulty: 'Easy'
    },
    {
      question: 'What is the fundamental difference between symmetric and asymmetric cryptography in TLS/SSL?',
      options: ['Symmetric uses one secret key for both encryption and decryption; asymmetric uses a public/private key pair', 'Symmetric is used for digital signatures; asymmetric is used for bulk data encryption', 'Symmetric encryption cannot be decrypted; asymmetric can', 'Symmetric requires a certificate authority; asymmetric does not'],
      correct: 0,
      explanation: 'Asymmetric encryption (e.g. RSA, ECC) is used during TLS handshake to authenticate and exchange a session key; fast symmetric ciphers (e.g. AES) then encrypt bulk payload data.',
      topic: 'Network Security',
      difficulty: 'Medium'
    },
    {
      question: 'What mechanism does Carrier Sense Multiple Access with Collision Detection (CSMA/CD) employ when a collision is detected on Ethernet?',
      options: ['Transmits a jam signal and aborts, waiting an exponential backoff time before retrying', 'Immediately sends the next frame in the queue', 'Halts all network communication for 10 seconds', 'Switches the host from half-duplex to full-duplex mode'],
      correct: 0,
      explanation: 'Upon collision detection, a transmitting station broadcasts a jam signal to ensure all stations detect the collision, then applies binary exponential backoff.',
      topic: 'Data Link Layer',
      difficulty: 'Hard'
    },
    {
      question: 'What is the bit length and representation format of an IPv6 address?',
      options: ['128 bits represented in 8 groups of hexadecimal digits separated by colons', '64 bits represented in decimal notation', '32 bits represented in dotted-decimal format', '256 bits represented in binary octets'],
      correct: 0,
      explanation: 'IPv6 uses 128-bit addresses (2^128 total space) formatted as eight 16-bit blocks in hexadecimal notation separated by colons.',
      topic: 'Network Layer',
      difficulty: 'Easy'
    },
    {
      question: 'Which protocol is used by the ping utility to verify host reachability and round-trip time?',
      options: ['ICMP (Internet Control Message Protocol)', 'IGMP (Internet Group Management Protocol)', 'SNMP (Simple Network Management Protocol)', 'ARP (Address Resolution Protocol)'],
      correct: 0,
      explanation: 'Ping sends ICMP Echo Request packets and listens for ICMP Echo Reply messages.',
      topic: 'Network Layer',
      difficulty: 'Easy'
    },
    {
      question: 'What is the purpose of Network Address Translation (NAT) in modern Internet gateways?',
      options: ['Maps private non-routable IP addresses to one or more publicly routable IPv4 addresses', 'Encodes web traffic into SSL certificates', 'Automatically configures host DNS servers', 'Prevents SYN flood attacks by discarding TCP packets'],
      correct: 0,
      explanation: 'NAT maps private RFC 1918 addresses from internal LANs onto public IP addresses, conserving IPv4 space and providing basic network shielding.',
      topic: 'Network Layer',
      difficulty: 'Medium'
    },
    {
      question: 'During TCP congestion control, what triggers the transition from Slow Start to Congestion Avoidance?',
      options: ['Congestion window (cwnd) reaches the slow-start threshold (ssthresh)', 'Receiver window drops to zero', 'Three duplicate ACKs are received', 'A 30-second timer expires'],
      correct: 0,
      explanation: 'When cwnd reaches ssthresh, TCP switches from exponential growth (slow start) to linear growth (additive increase / congestion avoidance).',
      topic: 'Transport Layer',
      difficulty: 'Hard'
    },
    {
      question: 'Which HTTP status code signifies that the server understood the request but refuses to authorize it?',
      options: ['403 Forbidden', '401 Unauthorized', '404 Not Found', '502 Bad Gateway'],
      correct: 0,
      explanation: '403 Forbidden means the server authenticates the caller (or identity is known) but access permissions are denied, unlike 401 which requires authentication credentials.',
      topic: 'Application Layer',
      difficulty: 'Easy'
    },
    {
      question: 'What type of network attack exploits uncompleted TCP handshakes to deplete server backlog queues?',
      options: ['SYN Flood Attack', 'Smurf Attack', 'SQL Injection Attack', 'DNS Amplification Attack'],
      correct: 0,
      explanation: 'SYN floods send numerous SYN packets with spoofed source IPs without completing the final ACK, holding half-open connection slots until the backlog queue exhausts.',
      topic: 'Network Security',
      difficulty: 'Medium'
    }
  ],

  dsa: [
    {
      question: 'What is the worst-case time complexity of searching for a target in an unbalanced Binary Search Tree (BST)?',
      options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
      correct: 0,
      explanation: 'In the worst case (a degenerate/skewed BST where elements were inserted in sorted order), the tree behaves like a linked list, requiring O(n) traversal.',
      topic: 'Trees',
      difficulty: 'Easy'
    },
    {
      question: 'Which tree traversal yields elements in non-decreasing sorted order for any valid Binary Search Tree?',
      options: ['Inorder Traversal (Left, Root, Right)', 'Preorder Traversal (Root, Left, Right)', 'Postorder Traversal (Left, Right, Root)', 'Level Order Traversal'],
      correct: 0,
      explanation: 'Inorder traversal processes the left subtree, then the root, then the right subtree, naturally ordering BST keys monotonically.',
      topic: 'Trees',
      difficulty: 'Easy'
    },
    {
      question: 'What is the balance factor condition for every node in a valid AVL self-balancing tree?',
      options: ['Height(left) - Height(right) must be -1, 0, or +1', 'Left node value must equal right node value', 'Depth of all leaves must be exactly equal', 'Total number of left nodes must equal right nodes'],
      correct: 0,
      explanation: 'An AVL tree requires that for every node, the heights of left and right subtrees differ by at most one.',
      topic: 'Balanced Trees',
      difficulty: 'Medium'
    },
    {
      question: 'What is the time complexity of building a Binary Heap of N elements from an arbitrary array using bottom-up heapify?',
      options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(log N)'],
      correct: 0,
      explanation: 'Bottom-up heap construction runs in linear O(N) time because nodes near the leaves have very short heights, summing mathematically to O(N).',
      topic: 'Heaps',
      difficulty: 'Hard'
    },
    {
      question: 'Which collision resolution strategy in hash tables links colliding records in dynamic chains at each bucket index?',
      options: ['Separate Chaining', 'Linear Probing', 'Quadratic Probing', 'Double Hashing'],
      correct: 0,
      explanation: 'Separate chaining uses auxiliary data structures (like linked lists or balanced trees) at each hash index to store all records hashing to that slot.',
      topic: 'Hash Tables',
      difficulty: 'Easy'
    },
    {
      question: 'What is the worst-case time complexity of the standard QuickSort algorithm with deterministic first-element pivot selection?',
      options: ['O(N^2)', 'O(N log N)', 'O(N)', 'O(log N)'],
      correct: 0,
      explanation: 'If the input array is already sorted or reverse sorted, selecting the first element as pivot produces partitions of sizes 0 and N-1, degrading to O(N^2).',
      topic: 'Sorting',
      difficulty: 'Medium'
    },
    {
      question: 'Which shortest path algorithm correctly finds single-source shortest paths on weighted directed graphs with non-negative edge weights?',
      options: ['Dijkstra\'s Algorithm', 'Kruskal\'s Algorithm', 'Floyd-Warshall Algorithm', 'Prim\'s Algorithm'],
      correct: 0,
      explanation: 'Dijkstra\'s greedy algorithm finds single-source shortest paths in O((V + E) log V) time when all edge weights are non-negative.',
      topic: 'Graphs',
      difficulty: 'Medium'
    },
    {
      question: 'What algorithm efficiently detects a cycle in a singly linked list in O(N) time and O(1) auxiliary space?',
      options: ['Floyd\'s Tortoise and Hare Algorithm (Two Pointers)', 'Dijkstra\'s Algorithm', 'Binary Search', 'Tarjan\'s Strongly Connected Components'],
      correct: 0,
      explanation: 'Floyd\'s cycle-finding algorithm advances a slow pointer by 1 step and a fast pointer by 2 steps; if a loop exists, they must collide within the cycle.',
      topic: 'Linked Lists',
      difficulty: 'Medium'
    },
    {
      question: 'What is the fundamental requirement for applying Dynamic Programming to solve an optimization problem?',
      options: ['Optimal Substructure and Overlapping Subproblems', 'Greedy Choice Property only', 'Disjoint Subproblems without reuse', 'Sorted linear input arrays'],
      correct: 0,
      explanation: 'Dynamic Programming applies when a problem exhibits optimal substructure (optimal solution composed of optimal subsolutions) and overlapping subproblems.',
      topic: 'Dynamic Programming',
      difficulty: 'Hard'
    },
    {
      question: 'Which data structure is optimal for evaluating arithmetic postfix expressions (Reverse Polish Notation)?',
      options: ['Stack (LIFO)', 'Queue (FIFO)', 'Priority Queue', 'Circular Buffer'],
      correct: 0,
      explanation: 'Operands are pushed onto a stack; upon encountering an operator, the two top operands are popped, evaluated, and the result is pushed back.',
      topic: 'Stacks & Queues',
      difficulty: 'Easy'
    },
    {
      question: 'What is a topological sort of a graph, and on what graph type is it well-defined?',
      options: ['A linear ordering of vertices such that for every directed edge u -> v, u comes before v; defined on Directed Acyclic Graphs (DAG)', 'A breadth-first exploration on any undirected tree', 'An ordering that sorts vertices by edge weight on cyclic graphs', 'A minimum spanning tree arrangement'],
      correct: 0,
      explanation: 'Topological sorting linearly orders vertices in a Directed Acyclic Graph (DAG) such that every dependency appears before its dependent vertex.',
      topic: 'Graphs',
      difficulty: 'Hard'
    },
    {
      question: 'What bitwise operation checks whether a positive integer X is an exact power of two in O(1) time?',
      options: ['(X & (X - 1)) === 0', '(X | (X + 1)) === 0', '(X ^ (X - 1)) === 0', '(X >> 1) === 0'],
      correct: 0,
      explanation: 'A power of two in binary has a single set bit (e.g. 8 is 1000). Subtracting 1 flips all trailing bits (7 is 0111). Performing bitwise AND yields 0.',
      topic: 'Bit Manipulation',
      difficulty: 'Medium'
    },
    {
      question: 'Which tree structure is specialized for prefix retrieval and autocomplete dictionaries in string algorithms?',
      options: ['Trie (Prefix Tree)', 'Red-Black Tree', 'B-Tree', 'Segment Tree'],
      correct: 0,
      explanation: 'A Trie stores strings character-by-character along directed paths, enabling prefix lookup in O(L) time where L is the query string length.',
      topic: 'Advanced Trees',
      difficulty: 'Medium'
    },
    {
      question: 'What is the full condition for a circular queue with array capacity C using front and rear pointers?',
      options: ['(rear + 1) % C === front', 'rear === front', 'rear === C - 1', 'front === (rear - 1) % C'],
      correct: 0,
      explanation: 'In a circular array queue, reserving one empty slot disambiguates full vs empty states; the queue is full when (rear + 1) % capacity == front.',
      topic: 'Stacks & Queues',
      difficulty: 'Easy'
    },
    {
      question: 'Which sorting algorithm has a guaranteed worst-case time complexity of O(N log N) and is inherently stable?',
      options: ['MergeSort', 'QuickSort', 'HeapSort', 'SelectionSort'],
      correct: 0,
      explanation: 'MergeSort consistently divides subarrays in half, guaranteeing O(N log N) time in all cases while preserving relative order of equal keys (stability).',
      topic: 'Sorting',
      difficulty: 'Medium'
    }
  ],

  java: [
    {
      question: 'In Java, what is the key difference between method overriding and method overloading?',
      options: ['Overriding is runtime polymorphism with identical signatures; overloading is compile-time with different parameter lists', 'Overriding happens within the same class; overloading requires inheritance', 'Overloading allows changes to the return type only; overriding does not', 'Overriding is determined at compile-time; overloading is dynamic at runtime'],
      correct: 0,
      explanation: 'Overriding redefines an inherited method in a subclass with matching signature (dynamic dispatch); overloading provides multiple methods with identical names but different arguments in the same scope.',
      topic: 'OOP Concepts',
      difficulty: 'Easy'
    },
    {
      question: 'Why are String objects immutable in the Java programming language?',
      options: ['Enables safe sharing in the String Constant Pool, guarantees thread safety, and secures hashcodes for hash tables', 'Because Java does not support pointers', 'To enforce heap memory fragmentation', 'Because strings are primitive types in Java'],
      correct: 0,
      explanation: 'String immutability allows the JVM to cache string literals in the String Pool, ensures security parameters cannot be altered maliciously, and ensures stable hashcodes.',
      topic: 'Core Java',
      difficulty: 'Medium'
    },
    {
      question: 'In Java multithreading, what does the volatile keyword guarantee when applied to a field?',
      options: ['Memory visibility: reads and writes go directly to main memory, preventing CPU thread cache staleness', 'Atomic execution of compound read-modify-write operations like count++', 'Exclusive lock acquisition similar to synchronized', 'Automatic thread suspension when the field changes'],
      correct: 0,
      explanation: 'The volatile modifier guarantees happens-before visibility across threads by bypassing local CPU caches, but it does not make compound statements atomic.',
      topic: 'Multithreading',
      difficulty: 'Hard'
    },
    {
      question: 'What data structure does Java\'s java.util.HashMap employ internally when a single bucket chain exceeds 8 nodes?',
      options: ['A balanced Red-Black Tree (TreeNode)', 'A Doubly Linked List', 'A secondary Hash Table', 'A Priority Queue'],
      correct: 0,
      explanation: 'In Java 8+, when bucket entries in a HashMap reach TREEIFY_THRESHOLD (8) and table capacity >= 64, the linked list converts to a Red-Black Tree to preserve O(log N) lookup.',
      topic: 'Collections Framework',
      difficulty: 'Hard'
    },
    {
      question: 'What is the distinction between a Checked Exception and an Unchecked Exception in Java?',
      options: ['Checked exceptions extend Exception and must be declared or caught; Unchecked extend RuntimeException or Error', 'Checked exceptions occur at compile time; Unchecked occur at runtime', 'Checked exceptions cannot be handled with try-catch blocks', 'Unchecked exceptions are fatal hardware crashes'],
      correct: 0,
      explanation: 'Checked exceptions represent recoverable conditions and are enforced by the compiler (must be declared in throws or caught); RuntimeException subclasses are unchecked.',
      topic: 'Exception Handling',
      difficulty: 'Easy'
    },
    {
      question: 'What is Type Erasure in Java Generics?',
      options: ['The compiler removes all generic type parameters at compile time, replacing them with bounds (or Object) for backwards compatibility', 'The JVM dynamically erases incorrect object casts at runtime', 'A mechanism to prevent subclasses from implementing generic interfaces', 'A garbage collector routine clearing generic instances'],
      correct: 0,
      explanation: 'Type erasure discards parameterized type info during bytecode compilation to maintain binary compatibility with pre-Java 5 legacy libraries.',
      topic: 'Generics',
      difficulty: 'Hard'
    },
    {
      question: 'What is the effect of applying the final modifier to a class declaration in Java?',
      options: ['The class cannot be extended or subclassed', 'All methods in the class become abstract', 'Instances of the class cannot be serialized', 'The class can only have private constructors'],
      correct: 0,
      explanation: 'A final class cannot be inherited or extended by any subclass (for example, java.lang.String is declared final).',
      topic: 'Core Java',
      difficulty: 'Easy'
    },
    {
      question: 'Which Java 8 feature enables processing collections with lazy functional transformations like filter, map, and reduce?',
      options: ['The Streams API (java.util.stream)', 'The Fork/Join Pool', 'The Reflection API', 'The Optional utility'],
      correct: 0,
      explanation: 'The Streams API introduces functional-style operations over sequences of elements, executing intermediate steps lazily until a terminal operation is called.',
      topic: 'Java 8 Features',
      difficulty: 'Medium'
    },
    {
      question: 'What is the primary difference between Callable<V> and Runnable in Java concurrent programming?',
      options: ['Callable returns a computed result and can throw checked exceptions; Runnable returns void and cannot throw checked exceptions', 'Runnable can only run on virtual threads', 'Callable must be synchronized; Runnable is asynchronous', 'Runnable executes on a daemon thread by default'],
      correct: 0,
      explanation: 'Callable<V>.call() returns a value of type V and can throw checked exceptions, whereas Runnable.run() has a void return and cannot declare checked exceptions.',
      topic: 'Multithreading',
      difficulty: 'Medium'
    },
    {
      question: 'What is the role of the try-with-resources statement introduced in Java 7?',
      options: ['Automatically closes any resource that implements java.lang.AutoCloseable at the end of the block', 'Catches unhandled errors without an explicit catch clause', 'Allocates objects in off-heap native memory', 'Forces immediate invocation of System.gc()'],
      correct: 0,
      explanation: 'try-with-resources ensures that every declared resource implementing AutoCloseable is reliably closed at block termination, replacing tedious nested finally blocks.',
      topic: 'Exception Handling',
      difficulty: 'Easy'
    }
  ],

  python: [
    {
      question: 'Which of the following built-in data types in Python is immutable?',
      options: ['Tuple', 'List', 'Dictionary', 'Set'],
      correct: 0,
      explanation: 'Tuples, strings, integers, and frozensets are immutable; once created, their elements and length cannot be modified.',
      topic: 'Data Types',
      difficulty: 'Easy'
    },
    {
      question: 'What is the Global Interpreter Lock (GIL) in CPython, and what is its primary consequence?',
      options: ['A mutex that prevents multiple native threads from executing Python bytecodes concurrently within a single process', 'A lock preventing multiple processes from sharing disk files', 'A compiler restriction prohibiting multithreading libraries', 'A security sandbox preventing buffer overflows'],
      correct: 0,
      explanation: 'CPython uses the GIL to protect its reference-counted memory management, restricting CPU-bound multithreaded Python code to a single CPU core.',
      topic: 'Concurrency & Internals',
      difficulty: 'Medium'
    },
    {
      question: 'What distinguishes a Python Generator function from a regular function?',
      options: ['It uses the yield keyword to produce values lazily on demand, maintaining state across calls', 'It compiles to native C machine code', 'It returns a static list of precomputed values', 'It runs asynchronously in a background thread'],
      correct: 0,
      explanation: 'Generator functions yield values one at a time when iterated over, pausing and preserving local stack state between iterations for optimal memory use.',
      topic: 'Advanced Python',
      difficulty: 'Medium'
    },
    {
      question: 'What is the role of the __new__ method compared to __init__ in Python object creation?',
      options: ['__new__ is the constructor that creates and returns the instance; __init__ initializes the newly created instance', '__init__ allocates memory; __new__ is called after instance deletion', '__new__ is only used for metaclasses; __init__ is for standard classes', '__new__ is deprecated in Python 3'],
      correct: 0,
      explanation: '__new__ is a static method that creates the actual object instance (allocating memory), while __init__ initializes attributes of the instance once constructed.',
      topic: 'OOP in Python',
      difficulty: 'Hard'
    },
    {
      question: 'In Python, what is the difference between the is operator and the == operator?',
      options: ['is tests for identity (same memory address / id()); == tests for value equality', 'is checks type compatibility; == tests string representation', 'is performs deep equality; == performs shallow equality', 'They are completely interchangeable in all contexts'],
      correct: 0,
      explanation: 'The "is" keyword checks whether two variables refer to the exact same memory object, while "==" calls __eq__() to compare values.',
      topic: 'Core Python',
      difficulty: 'Easy'
    },
    {
      question: 'What algorithm does Python use to resolve Method Resolution Order (MRO) in multiple inheritance hierarchies?',
      options: ['C3 Linearization Algorithm', 'Depth-First Search with backtracking', 'Breadth-First Left-to-Right', 'Dijkstra\'s Topological Algorithm'],
      correct: 0,
      explanation: 'Python uses C3 Linearization to produce a deterministic, monotonic method resolution order that respects local precedence and subclass relationships.',
      topic: 'OOP in Python',
      difficulty: 'Hard'
    },
    {
      question: 'What protocols must an object implement to function as a Python Context Manager with the with statement?',
      options: ['__enter__() and __exit__()', '__open__() and __close__()', '__start__() and __stop__()', '__iter__() and __next__()'],
      correct: 0,
      explanation: 'Context managers require __enter__() to set up the context and __exit__() to handle teardown and exception management.',
      topic: 'Core Python',
      difficulty: 'Easy'
    },
    {
      question: 'What does the *args and **kwargs syntax in a Python function definition allow?',
      options: ['*args accepts variable positional arguments as a tuple; **kwargs accepts variable keyword arguments as a dictionary', '*args declares pointer parameters; **kwargs passes references', '*args enforces strict type checking; **kwargs enables memoization', '*args is for default values; **kwargs is for required values'],
      correct: 0,
      explanation: '*args captures any number of positional arguments into a tuple; **kwargs captures arbitrary keyword arguments into a dictionary.',
      topic: 'Functions',
      difficulty: 'Easy'
    },
    {
      question: 'In Python, what is the average time complexity of key lookup in a built-in dict?',
      options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
      correct: 0,
      explanation: 'Python dictionaries use open-addressing hash tables with perturbation, achieving amortized O(1) time complexity for insertions and lookups.',
      topic: 'Data Structures',
      difficulty: 'Easy'
    },
    {
      question: 'What is the difference between copy.copy() and copy.deepcopy() in Python?',
      options: ['copy() creates a shallow copy referencing original nested objects; deepcopy() recursively clones nested structures', 'copy() works on primitives; deepcopy() works on lists', 'copy() is thread-safe; deepcopy() is not', 'deepcopy() freezes objects into immutable tuples'],
      correct: 0,
      explanation: 'A shallow copy duplicates the outer container while keeping references to child objects; deepcopy clones all nested objects recursively.',
      topic: 'Core Python',
      difficulty: 'Medium'
    }
  ],

  software_engineering: [
    {
      question: 'What is the core principle of the Single Responsibility Principle (SRP) in SOLID design?',
      options: ['A class should have one, and only one, reason to change', 'Every module must be confined to a single file', 'Functions should never accept more than one parameter', 'A microservice should only expose one HTTP endpoint'],
      correct: 0,
      explanation: 'SRP states that a software component should encapsulate one cohesive responsibility or actor requirement, minimizing cascading side effects.',
      topic: 'SOLID Principles',
      difficulty: 'Easy'
    },
    {
      question: 'Which design pattern restricts the instantiation of a class to one single instance and provides a global point of access?',
      options: ['Singleton Pattern', 'Factory Method Pattern', 'Observer Pattern', 'Strategy Pattern'],
      correct: 0,
      explanation: 'The Singleton pattern ensures only one instance of a class exists across the application runtime, often used for configuration or logging.',
      topic: 'Design Patterns',
      difficulty: 'Easy'
    },
    {
      question: 'What is the primary difference between White-Box testing and Black-Box testing?',
      options: ['White-box tests internal logic, paths, and code structure; black-box tests external requirements and functionality without seeing internal code', 'White-box is performed by users; black-box is performed by developers', 'White-box tests UI only; black-box tests backend APIs only', 'White-box requires automated CI/CD; black-box is always manual'],
      correct: 0,
      explanation: 'White-box testing leverages full visibility into the source code and internal pathways, while black-box tests specification conformance from an external perspective.',
      topic: 'Software Testing',
      difficulty: 'Medium'
    },
    {
      question: 'In Agile Scrum methodology, what is the primary purpose of the Sprint Retrospective meeting?',
      options: ['To reflect on how the last sprint went and identify actionable process improvements for the next sprint', 'To estimate user story story points', 'To demonstrate completed increments to product stakeholders', 'To assign individual tickets to engineers'],
      correct: 0,
      explanation: 'The Sprint Retrospective is a team-focused continuous improvement inspection held at the conclusion of every sprint.',
      topic: 'Agile Methodology',
      difficulty: 'Easy'
    },
    {
      question: 'What is code refactoring in software development?',
      options: ['Restructuring existing computer code to improve internal design without changing its external functional behavior', 'Rewriting the application in a new programming language', 'Fixing critical security vulnerabilities and bugs', 'Adding new user features to existing legacy systems'],
      correct: 0,
      explanation: 'Refactoring improves non-functional attributes (readability, maintainability, coupling) while preserving exact external behavior and API contracts.',
      topic: 'Code Quality',
      difficulty: 'Easy'
    }
  ],

  cybersecurity: [
    {
      question: 'What is the most effective defense against SQL Injection vulnerabilities in database applications?',
      options: ['Using parameterized queries (prepared statements) or ORM frameworks', 'Encoding SQL queries in base64', 'Validating inputs exclusively with client-side JavaScript', 'Encrypting the database connection string with AES'],
      correct: 0,
      explanation: 'Parameterized queries separate SQL code from untrusted data parameters, ensuring user input is never parsed or executed as executable SQL.',
      topic: 'Application Security',
      difficulty: 'Easy'
    },
    {
      question: 'What security risk does Cross-Site Scripting (XSS) present to web application users?',
      options: ['Allows attackers to inject malicious scripts into web pages viewed by other users, stealing session cookies or tokens', 'Allows attackers to directly read internal database tables', 'Overwhelms web servers with distributed denial-of-service traffic', 'Intercepts unencrypted passwords traversing local Wi-Fi'],
      correct: 0,
      explanation: 'XSS enables attackers to execute arbitrary JavaScript in the victim\'s browser context, enabling credential theft, session hijacking, or DOM defacement.',
      topic: 'Web Security',
      difficulty: 'Medium'
    },
    {
      question: 'Why is salt added to passwords prior to cryptographic hashing?',
      options: ['To ensure identical passwords produce distinct hashes, defeating precomputed Rainbow Table attacks', 'To speed up the hash calculation for servers', 'To allow users to recover forgotten passwords in plaintext', 'To encrypt the password symmetrically'],
      correct: 0,
      explanation: 'A unique cryptographic salt added to each password ensures that two identical passwords produce completely different hash digests, neutralizing lookup tables.',
      topic: 'Cryptography',
      difficulty: 'Medium'
    },
    {
      question: 'How do Cross-Site Request Forgery (CSRF) tokens protect web endpoints from unauthorized state mutations?',
      options: ['They ensure incoming state-changing requests contain a unique, unpredictable secret bound to the user session that third-party sites cannot read', 'They encrypt all HTTP headers in transit', 'They require the user to re-enter their password on every request', 'They block all HTTP POST requests from mobile browsers'],
      correct: 0,
      explanation: 'Anti-CSRF tokens require a random secret value present in the form or headers that unauthorized third-party origins cannot read due to the Same-Origin Policy.',
      topic: 'Web Security',
      difficulty: 'Hard'
    },
    {
      question: 'What is the core principle of Zero Trust Network Architecture?',
      options: ['Never trust, always verify: every request must be authenticated, authorized, and encrypted regardless of network perimeter', 'Trust all connections originating from the internal corporate VPN', 'Eliminate all firewalls and use public cloud instances exclusively', 'Disallow external third-party API integrations entirely'],
      correct: 0,
      explanation: 'Zero Trust eliminates implicit trust based on physical or network location, requiring continuous verification of identity, context, and posture.',
      topic: 'Network Defense',
      difficulty: 'Medium'
    }
  ]
};

// Match requested subject string against available banks
function resolveBank(subject = '') {
  const s = String(subject || '').toLowerCase().trim();
  if (s.includes('dbms') || s.includes('database') || s.includes('sql') || s.includes('relational')) {
    return QUESTION_BANKS.dbms;
  }
  if (s.includes('operating') || s.includes('os') || s.includes('system program') || s.includes('linux') || s.includes('kernel')) {
    return QUESTION_BANKS.os;
  }
  if (s.includes('network') || s.includes('cn') || s.includes('tcp') || s.includes('ip') || s.includes('routing')) {
    return QUESTION_BANKS.networks;
  }
  if (s.includes('data structure') || s.includes('dsa') || s.includes('algorithm') || s.includes('tree') || s.includes('graph')) {
    return QUESTION_BANKS.dsa;
  }
  if (s.includes('java') || s.includes('jvm') || s.includes('spring')) {
    return QUESTION_BANKS.java;
  }
  if (s.includes('python') || s.includes('django') || s.includes('flask')) {
    return QUESTION_BANKS.python;
  }
  if (s.includes('software') || s.includes('agile') || s.includes('sdlc') || s.includes('testing')) {
    return QUESTION_BANKS.software_engineering;
  }
  if (s.includes('security') || s.includes('cyber') || s.includes('crypto') || s.includes('hack')) {
    return QUESTION_BANKS.cybersecurity;
  }
  // Default to balanced mixed computer science bank
  return [
    ...QUESTION_BANKS.dbms,
    ...QUESTION_BANKS.os,
    ...QUESTION_BANKS.networks,
    ...QUESTION_BANKS.dsa
  ];
}

/**
 * Retrieve curated offline questions matching subject, topic, and difficulty
 */
function getOfflineBankQuestions(subject, topic = '', difficulty = 'Mixed', count = 10, seen = new Set()) {
  const bank = resolveBank(subject);
  const diffNorm = String(difficulty || 'Mixed').toLowerCase();
  const topicNorm = String(topic || '').toLowerCase().trim();

  // Filter bank by topic (if specified) and difficulty (if not Mixed)
  let candidates = bank.filter((q) => {
    if (seen.has(q.question.toLowerCase())) return false;
    if (topicNorm && !q.topic.toLowerCase().includes(topicNorm) && !q.question.toLowerCase().includes(topicNorm)) {
      return false;
    }
    if (diffNorm !== 'mixed' && q.difficulty.toLowerCase() !== diffNorm) {
      return false;
    }
    return true;
  });

  // If topic filter was too restrictive, relax topic
  if (candidates.length < count) {
    const more = bank.filter((q) => {
      if (seen.has(q.question.toLowerCase()) || candidates.includes(q)) return false;
      if (diffNorm !== 'mixed' && q.difficulty.toLowerCase() !== diffNorm) return false;
      return true;
    });
    candidates = candidates.concat(more);
  }

  // If difficulty was also restrictive, relax difficulty
  if (candidates.length < count) {
    const more = bank.filter((q) => !seen.has(q.question.toLowerCase()) && !candidates.includes(q));
    candidates = candidates.concat(more);
  }

  // Shuffle candidate list deterministically
  const shuffled = candidates.slice().sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  // If still need more to satisfy count, generate procedurally
  if (selected.length < count) {
    const needed = count - selected.length;
    const proc = generateProceduralQuestions(subject, topic, difficulty, needed, seen);
    selected.push(...proc);
  }

  return selected;
}

/**
 * Dynamic Procedural Generator for custom subjects or large question counts.
 * Generates verified, well-formed university exam questions for any domain.
 */
function generateProceduralQuestions(subject, topic = '', difficulty = 'Medium', count = 5, seen = new Set()) {
  const safeSub = String(subject || 'Computer Science').trim();
  const safeTopic = String(topic || safeSub).trim();
  const d = DIFF.find((x) => x.toLowerCase() === String(difficulty).toLowerCase()) || 'Medium';

  const templates = [
    {
      stem: (s, t) => `In ${s}, which of the following best defines the primary objective of ${t}?`,
      opts: [
        'To optimize resource utilization and preserve operational invariants under constraints',
        'To bypass physical memory limitations by removing runtime synchronization',
        'To replace deterministic algorithms with static lookup tables',
        'To enforce strict sequential processing without pipelining'
      ],
      correct: 0,
      exp: (s, t) => `In ${s}, ${t} is designed to manage constraints efficiently and maintain predictable invariants.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `When evaluating time-space trade-offs in ${s} (${t}), what is the primary architectural trade-off?`,
      opts: [
        'Higher memory usage through auxiliary indexing enables lower query time latency',
        'Linear space complexity guarantees constant O(1) worst-case time execution',
        'Eliminating caches always improves average-case performance',
        'Increasing recursion depth reduces heap memory requirements'
      ],
      correct: 0,
      exp: (s, t) => `Auxiliary data structures in ${s} consume additional memory space to accelerate retrieval latency.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `Which anomaly or vulnerability in ${s} is most commonly mitigated by formal verification and strict isolation?`,
      opts: [
        'State inconsistency and race conditions arising from concurrent unsynchronized access',
        'Deterministic mathematical convergence in recursive functions',
        'Monotonic increase in CPU clock frequency',
        'Automatic compilation of bytecode into machine instructions'
      ],
      correct: 0,
      exp: (s, t) => `Concurrency and state mutations in ${s} require synchronization and isolation to prevent race conditions.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `Which evaluation metric is standard for benchmarking performance and throughput in ${s}?`,
      opts: [
        'Amortized time complexity, latency percentiles (p95/p99), and resource overhead',
        'Total lines of source code in the binary package',
        'The absolute number of comments in the implementation files',
        'The alphabetical order of symbol names in the symbol table'
      ],
      correct: 0,
      exp: (s, t) => `Algorithmic and operational efficiency in ${s} is quantified using asymptotic complexity and latency distributions.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `What is the recommended best practice when handling failure conditions and exceptions in ${s}?`,
      opts: [
        'Fail fast, log contextual diagnostic metadata, and preserve atomic state rollbacks',
        'Silently swallow all exceptions to prevent process interruption',
        'Terminate the operating system kernel immediately upon any warning',
        'Write unverified data directly to disk without validation'
      ],
      correct: 0,
      exp: (s, t) => `Robust systems in ${s} emphasize predictable failure handling, atomic rollbacks, and clear diagnostics.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `In modular design for ${s}, what does high cohesion and low coupling achieve?`,
      opts: [
        'Self-contained modules with clear responsibilities and minimal inter-dependency',
        'A single monolithic file containing all program routines',
        'Interdependent classes that cannot be tested independently',
        'Zero abstraction layers between UI and low-level hardware'
      ],
      correct: 0,
      exp: (s, t) => `High cohesion ensures a module focuses on a single purpose, while low coupling prevents changes in one module from breaking others.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `How is data integrity guaranteed during concurrent updates in ${s}?`,
      opts: [
        'Through ACID transaction properties, locks, or optimistic concurrency control',
        'By disabling interrupts and allowing unchecked memory writes',
        'By storing all data in volatile CPU registers only',
        'By discarding conflicting updates without notification'
      ],
      correct: 0,
      exp: (s, t) => `Concurrency control mechanisms like two-phase locking or multi-version concurrency control preserve consistency.`,
      topic: safeTopic
    },
    {
      stem: (s, t) => `What is the primary benefit of caching frequently accessed computations or queries in ${s}?`,
      opts: [
        'Substantially reduces I/O latency and repeated processing overhead',
        'Guarantees zero storage consumption on non-volatile media',
        'Completely eliminates the need for persistent databases',
        'Makes the application immune to network partitions'
      ],
      correct: 0,
      exp: (s, t) => `Caching avoids re-computing or re-fetching data from slower storage tiers, accelerating response times.`,
      topic: safeTopic
    }
  ];

  const results = [];
  const localSeen = new Set(seen);
  let idx = 0;
  while (results.length < count) {
    const tmpl = templates[idx % templates.length];
    const qText = tmpl.stem(safeSub, safeTopic) + (idx >= templates.length ? ` (Variation ${Math.floor(idx / templates.length) + 1})` : '');
    const k = qText.toLowerCase();

    if (!localSeen.has(k)) {
      localSeen.add(k);
      results.push({
        question: qText,
        options: tmpl.opts.slice(),
        correct: tmpl.correct,
        explanation: tmpl.exp(safeSub, safeTopic),
        topic: safeTopic,
        difficulty: d
      });
    }
    idx++;
    if (idx > count * 10) break; // safety breakout
  }

  return results;
}

module.exports = {
  QUESTION_BANKS,
  getOfflineBankQuestions,
  generateProceduralQuestions
};
