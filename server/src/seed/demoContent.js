/**
 * DEMO / PRACTICE CONTENT. Pure data, no database access.
 *
 * Every question below was written for development and testing. NONE is an official GATE question
 * or a previous-year question: they are all source "ADMIN" and carry no year/session, and each
 * explanation ends with a demo notice. Do not present them to students as real GATE content.
 *
 * Shape: 12 subjects x 2 topics x 3 questions (MCQ, MSQ, NAT) = 72 questions.
 * Subject and topic names must match the names created by seed.js (matched there by slug).
 */
const KEYS = 'ABCDEF';
const NOTICE = '\n\n[Demo practice question written for development. Not an official GATE question.]';
const options = (texts) => texts.map((text, i) => ({ key: KEYS[i], text }));

/** correct: index of the right option. */
const mcq = (statement, texts, correct, explanation, { marks = 1, difficulty = 'easy', code } = {}) => ({
  type: 'MCQ', statement, code, options: options(texts), correctOptions: [KEYS[correct]], explanation: explanation + NOTICE, marks, difficulty,
});

/** correct: array of indexes of the right options. */
const msq = (statement, texts, correct, explanation, { marks = 2, difficulty = 'medium' } = {}) => ({
  type: 'MSQ', statement, options: options(texts), correctOptions: correct.map((i) => KEYS[i]), explanation: explanation + NOTICE, marks, difficulty,
});

/** Accepted range [min, max] is the NAT tolerance. */
const nat = (statement, [min, max], explanation, { marks = 2, difficulty = 'medium', code } = {}) => ({
  type: 'NAT', statement, code, natAnswer: { min, max }, explanation: explanation + NOTICE, marks, difficulty,
});

export const DEMO_CONTENT = [
  {
    subject: 'Engineering Mathematics',
    topics: [
      { topic: 'Linear Algebra', questions: [
        mcq(String.raw`The determinant of the matrix $\begin{pmatrix} 2 & 1 \\ 4 & 3 \end{pmatrix}$ is`, ['2', '6', '10', '−2'], 0, 'det = 2·3 − 1·4 = 2.'),
        msq('Let A be a 3×3 real matrix. Which of the following statements are always true?', [
          String.raw`$\det(A^T) = \det(A)$`, 'If det(A) = 0, then 0 is an eigenvalue of A.', String.raw`$\det(A + B) = \det(A) + \det(B)$ for every 3×3 matrix B`, 'A is invertible if and only if its rank is 3.',
        ], [0, 1, 3], 'The determinant is unchanged by transposition; a singular matrix has eigenvalue 0; A is invertible exactly when its rank is 3. The determinant is not additive.'),
        nat(String.raw`The rank of the matrix $\begin{pmatrix} 1 & 2 & 3 \\ 2 & 4 & 6 \\ 1 & 0 & 1 \end{pmatrix}$ is ______.`, [2, 2], 'Row 2 is twice row 1, and row 3 is independent of row 1, so the rank is 2.'),
      ] },
      { topic: 'Probability and Statistics', questions: [
        mcq('A fair six-sided die is rolled once. The probability of getting a prime number is', ['1/6', '1/3', '1/2', '2/3'], 2, 'Primes on a die are 2, 3 and 5, so the probability is 3/6 = 1/2.'),
        msq('For two events A and B with P(A) > 0 and P(B) > 0, which of the following are true?', [
          'If A and B are independent, then P(A ∩ B) = P(A)·P(B).', 'If A and B are mutually exclusive, then P(A ∪ B) = P(A) + P(B).', 'Mutually exclusive events with positive probabilities are independent.', 'P(A ∪ B) ≤ P(A) + P(B).',
        ], [0, 1, 3], 'Mutually exclusive events with positive probability have P(A ∩ B) = 0 ≠ P(A)P(B), so they are not independent.'),
        nat('Let X be the number of heads in 6 tosses of a fair coin. The variance of X is ______.', [1.5, 1.5], 'X is binomial with n = 6 and p = 1/2, so Var(X) = np(1 − p) = 6 · 1/4 = 1.5.'),
      ] },
    ],
  },
  {
    subject: 'Discrete Mathematics',
    topics: [
      { topic: 'Graph Theory', questions: [
        mcq('A tree has 10 vertices. How many edges does it have?', ['8', '9', '10', '11'], 1, 'A tree on n vertices has n − 1 edges, so 9.'),
        msq('Which of the following are true for a simple undirected graph with n vertices?', [
          'The sum of all vertex degrees equals twice the number of edges.', 'The number of vertices with odd degree is even.', 'Every connected graph has at least n edges.', 'The complete graph K_n has n(n − 1)/2 edges.',
        ], [0, 1, 3], 'This is the handshake lemma and its corollary. A connected graph needs only n − 1 edges (a tree).'),
        nat(String.raw`The number of edges in the complete graph $K_7$ is ______.`, [21, 21], 'K_7 has 7·6/2 = 21 edges.'),
      ] },
      { topic: 'Combinatorics', questions: [
        mcq('In how many ways can 4 distinct books be arranged in a row on a shelf?', ['12', '16', '24', '64'], 2, '4! = 24.'),
        msq('Which of the following statements about binomial coefficients and factorials are true?', [
          String.raw`$\binom{n}{r} = \binom{n}{n-r}$ for $0 \le r \le n$`, String.raw`$\binom{5}{2} = 10$`, '5! = 100', 'The number of ordered selections of 2 items from 5 distinct items is 20.',
        ], [0, 1, 3], '5! = 120, not 100. Ordered selections of 2 from 5 are 5·4 = 20.'),
        nat('A committee of 3 members is to be chosen from 8 people. The number of possible committees is ______.', [56, 56], 'C(8,3) = 8·7·6 / 3! = 56.'),
      ] },
    ],
  },
  {
    subject: 'Digital Logic',
    topics: [
      { topic: 'Boolean Algebra and Minimization', questions: [
        mcq(String.raw`The simplified form of $A + \overline{A}B$ is`, ['A', 'B', 'A + B', 'AB'], 2, 'By the absorption identity A + A̅B = A + B.'),
        msq('Which of the following gates are universal gates?', ['NAND', 'NOR', 'XOR', 'AND'], [0, 1], 'Any Boolean function can be built using only NAND gates or only NOR gates. XOR and AND are not universal.'),
        nat('A Boolean function of 4 variables has a truth table with ______ rows.', [16, 16], '2^4 = 16 input combinations.', { marks: 1, difficulty: 'easy' }),
      ] },
      { topic: 'Number Representation', questions: [
        mcq('The decimal value of the binary number 101101 is', ['43', '45', '47', '49'], 1, '32 + 8 + 4 + 1 = 45.'),
        msq('Which of the following statements about 8-bit two\'s complement numbers are correct?', [
          'The range of representable values is −128 to 127.', 'The pattern 10000000 represents −128.', 'The pattern 01111111 represents 127.', 'The value 128 can be represented.',
        ], [0, 1, 2], 'The largest value is 127, so 128 cannot be represented.'),
        nat('The 8-bit two\'s complement representation of −5 is read as an unsigned number. Its value is ______.', [251, 251], '−5 is stored as 256 − 5 = 251 (11111011).'),
      ] },
    ],
  },
  {
    subject: 'Computer Organization and Architecture',
    topics: [
      { topic: 'Memory Hierarchy and Cache', questions: [
        mcq('A direct-mapped cache has 256 blocks. How many address bits form the index field?', ['6', '7', '8', '9'], 2, '256 = 2^8 blocks, so the index needs 8 bits.'),
        msq('Which of the following statements about caches are correct?', [
          'Temporal locality means recently used items are likely to be used again soon.', 'A write-through cache updates main memory on every write.', 'A direct-mapped cache never suffers conflict misses.', 'Increasing associativity can reduce conflict misses.',
        ], [0, 1, 3], 'Direct-mapped caches suffer the most conflict misses because each block has exactly one possible location.'),
        nat('A cache has a hit time of 2 ns, a miss rate of 10% and a miss penalty of 50 ns. The average memory access time, in ns, is ______.', [7, 7], 'AMAT = 2 + 0.10 × 50 = 7 ns.'),
      ] },
      { topic: 'Pipelining', questions: [
        mcq('A non-pipelined processor needs 5 ns per instruction. It is replaced by a 5-stage pipeline with equal stage delays of 1 ns. Ignoring hazards, the speedup for a very large number of instructions approaches', ['1', '2', '5', '10'], 2, 'Steady state completes one instruction per 1 ns instead of per 5 ns, a speedup of 5.', { marks: 2, difficulty: 'medium' }),
        msq('Which of the following are types of pipeline hazards?', ['Structural hazard', 'Data hazard', 'Control hazard', 'Semantic hazard'], [0, 1, 2], 'The three classic hazard types are structural, data and control.', { difficulty: 'easy' }),
        nat('A 4-stage pipeline (1 cycle per stage) executes 10 instructions with no stalls. The total number of cycles needed is ______.', [13, 13], 'Cycles = k + n − 1 = 4 + 10 − 1 = 13.'),
      ] },
    ],
  },
  {
    subject: 'Programming and Data Structures',
    topics: [
      { topic: 'Programming in C', questions: [
        mcq('What does the following program fragment print?', ['10', '20', '30', '100'], 2, 'The loop adds 1 + 4 + 9 + 16 = 30.', {
          code: `int s = 0;
for (int i = 1; i <= 4; i++)
    s += i * i;
printf("%d", s);`,
        }),
        msq('Which of the following statements about C are correct?', [
          'Array indices start at 0.', 'sizeof(char) is always 1.', 'The operators = and == have the same meaning.', 'A function can return a pointer.',
        ], [0, 1, 3], '= assigns while == compares.', { difficulty: 'easy' }),
        nat('What value does f(6) return?', [21, 21], 'f(6) = 6 + 5 + 4 + 3 + 2 + 1 + 0 = 21.', {
          code: `int f(int n) {
    if (n == 0)
        return 0;
    return n + f(n - 1);
}`,
        }),
      ] },
      { topic: 'Trees and Binary Search Trees', questions: [
        mcq('An inorder traversal of a binary search tree visits the keys in', ['ascending order', 'descending order', 'level order', 'no particular order'], 0, 'Left subtree < node < right subtree, so inorder gives sorted ascending order.'),
        msq('Which of the following statements about binary trees are true?', [
          'A binary tree with n nodes has n − 1 edges.', 'Every node has at most two children.', 'A full binary tree with L leaves has L − 1 internal nodes.', 'Every binary tree is a binary search tree.',
        ], [0, 1, 2], 'A binary tree is a binary search tree only if keys satisfy the ordering property.'),
        nat('The maximum number of nodes in a binary tree of height 3 (the root is at height 0) is ______.', [15, 15], '1 + 2 + 4 + 8 = 15.'),
      ] },
    ],
  },
  {
    subject: 'Algorithms',
    topics: [
      { topic: 'Asymptotic Analysis', questions: [
        mcq('The worst-case running time of binary search on a sorted array of n elements is', [String.raw`$\Theta(1)$`, String.raw`$\Theta(\log n)$`, String.raw`$\Theta(n)$`, String.raw`$\Theta(n \log n)$`], 1, 'The search range halves at every step, giving Θ(log n).'),
        msq('Which of the following asymptotic statements are true?', [String.raw`$n^2 = O(n^3)$`, String.raw`$2^{n+1} = O(2^n)$`, String.raw`$\log n = \Omega(n)$`, String.raw`$n = \Theta(n + 10)$`], [0, 1, 3], 'log n grows slower than n, so it is not Ω(n).'),
        nat('Two sorted arrays of sizes 4 and 5 are merged. In the worst case the merge step performs ______ comparisons.', [8, 8], 'Merging m and n elements needs at most m + n − 1 = 8 comparisons.'),
      ] },
      { topic: 'Dynamic Programming', questions: [
        mcq('The length of a longest common subsequence of the strings ABCD and ACBD is', ['2', '3', '4', '1'], 1, 'ABD (and ACD) is a common subsequence of length 3, and no common subsequence of length 4 exists.', { marks: 2, difficulty: 'medium' }),
        msq('Which of the following problems are typically solved with dynamic programming?', ['0/1 knapsack', 'Matrix chain multiplication', 'Binary search', 'Longest common subsequence'], [0, 1, 3], 'Binary search is a divide-and-conquer search and needs no table of sub-results.', { difficulty: 'easy' }),
        nat('The number of distinct ways to climb 5 stairs taking 1 or 2 steps at a time is ______.', [8, 8], 'ways(n) = ways(n−1) + ways(n−2): 1, 2, 3, 5, 8.'),
      ] },
    ],
  },
  {
    subject: 'Theory of Computation',
    topics: [
      { topic: 'Regular Languages and Finite Automata', questions: [
        mcq(String.raw`Which of the following languages over $\{a, b\}$ is regular?`, [String.raw`$\{a^n b^n \mid n \ge 0\}$`, 'The set of strings with an even number of a\'s', String.raw`$\{ww \mid w \in \{a, b\}^*\}$`, String.raw`$\{a^n \mid n \text{ is prime}\}$`], 1, 'A two-state DFA tracking the parity of a\'s accepts the second language. The others are not regular.'),
        msq('Regular languages are closed under which of the following operations?', ['Union', 'Intersection', 'Complement', 'Infinite union of arbitrary regular languages'], [0, 1, 2], 'An infinite union of regular languages can be non-regular, so closure fails there.'),
        nat('The minimum number of states in a DFA over {0, 1} accepting exactly the strings that end with 01 is ______.', [3, 3], 'States track: no progress, last symbol 0, last two symbols 01.'),
      ] },
      { topic: 'Context-Free Languages and Pushdown Automata', questions: [
        mcq('Which of the following machines recognises exactly the context-free languages?', ['Finite automaton', 'Nondeterministic pushdown automaton', 'Mealy machine', 'Combinational circuit'], 1, 'Context-free languages are recognised by nondeterministic pushdown automata.', { difficulty: 'easy' }),
        msq('Which of the following languages are context-free?', [String.raw`$\{a^n b^n \mid n \ge 0\}$`, String.raw`$\{a^n b^n c^n \mid n \ge 0\}$`, 'Palindromes over {a, b}', String.raw`$\{a^n b^m \mid n, m \ge 0\}$`], [0, 2, 3], 'a^n b^n c^n needs two independent counters and is not context-free.'),
        nat('A grammar is in Chomsky Normal Form. A string of length 5 is derived in exactly ______ steps.', [9, 9], 'A CNF derivation of a length-n string takes 2n − 1 steps: n − 1 binary rules and n terminal rules.'),
      ] },
    ],
  },
  {
    subject: 'Compiler Design',
    topics: [
      { topic: 'Parsing', questions: [
        mcq('Which of the following is a bottom-up parser?', ['Recursive descent parser', 'LL(1) parser', 'SLR parser', 'Predictive parser'], 2, 'SLR is an LR-family bottom-up parser. The others are top-down.'),
        msq('Which of the following are true for LL(1) grammars?', ['They cannot be left-recursive.', 'Each cell of the parsing table has at most one entry.', 'Every context-free grammar is LL(1).', 'The input is scanned left to right and a leftmost derivation is produced.'], [0, 1, 3], 'Many context-free grammars (for example left-recursive ones) are not LL(1).'),
        nat('The statement  int x = a + 10;  contains ______ tokens.', [7, 7], 'int, x, =, a, +, 10, ; are 7 tokens.', { marks: 1, difficulty: 'easy' }),
      ] },
      { topic: 'Lexical Analysis', questions: [
        mcq('Which compiler phase converts a stream of characters into a stream of tokens?', ['Lexical analysis', 'Syntax analysis', 'Semantic analysis', 'Code generation'], 0, 'The lexical analyser (scanner) produces tokens.'),
        msq('Which of the following are tasks of a lexical analyser?', ['Removing whitespace and comments', 'Recognising tokens', 'Checking type compatibility of operands', 'Reporting lexical errors'], [0, 1, 3], 'Type checking belongs to semantic analysis.', { difficulty: 'easy' }),
        nat('The statement  while (i < 10) i = i + 1;  contains ______ lexemes.', [12, 12], 'while ( i < 10 ) i = i + 1 ; is 12 lexemes.', { marks: 1, difficulty: 'easy' }),
      ] },
    ],
  },
  {
    subject: 'Operating Systems',
    topics: [
      { topic: 'CPU Scheduling', questions: [
        mcq('Which of the following scheduling algorithms can cause starvation of long processes?', ['First Come First Served', 'Round Robin', 'Shortest Job First', 'None of these'], 2, 'A steady stream of short jobs can keep postponing a long job under SJF.'),
        msq('Which of the following statements about Round Robin scheduling are true?', ['It is preemptive.', 'With a very large time quantum it behaves like FCFS.', 'It can starve a process indefinitely.', 'It uses a fixed time quantum.'], [0, 1, 3], 'Every ready process gets a turn each round, so none starves.'),
        nat('Three processes arrive at time 0 with CPU bursts of 5, 3 and 2 ms and run in that order under FCFS. The average waiting time in ms, correct to two decimals, is ______.', [4.33, 4.34], 'Waiting times are 0, 5 and 8, so the average is 13/3 ≈ 4.33.'),
      ] },
      { topic: 'Memory Management', questions: [
        mcq('The page size is 4 KB. The logical address 20000 (decimal) lies in page number', ['3', '4', '5', '6'], 1, '20000 / 4096 ≈ 4.88, so the page number is 4.', { marks: 2, difficulty: 'medium' }),
        msq('Which of the following statements about paging are correct?', ['It eliminates external fragmentation.', 'It can cause internal fragmentation.', 'A page table maps pages to frames.', 'It requires a process to occupy contiguous physical memory.'], [0, 1, 2], 'Paging lets a process occupy non-contiguous frames.'),
        nat('A system has 32-bit logical addresses and 4 KB pages. The number of bits used for the page number is ______.', [20, 20], '4 KB = 2^12, so the offset is 12 bits and the page number is 32 − 12 = 20 bits.'),
      ] },
    ],
  },
  {
    subject: 'Databases',
    topics: [
      { topic: 'SQL', questions: [
        mcq('Which SQL clause is used to filter groups after aggregation?', ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'], 1, 'HAVING filters groups; WHERE filters individual rows before grouping.'),
        msq('Which of the following are aggregate functions in SQL?', ['COUNT', 'SUM', 'JOIN', 'AVG'], [0, 1, 3], 'JOIN combines tables; it is not an aggregate function.', { difficulty: 'easy' }),
        nat('Table Employee has 5 rows and table Dept has 3 rows. The query  SELECT * FROM Employee, Dept  returns ______ rows.', [15, 15], 'Listing two tables without a condition gives the Cartesian product: 5 × 3 = 15.', { marks: 1, difficulty: 'easy' }),
      ] },
      { topic: 'Normalization', questions: [
        mcq('A relation is in First Normal Form (1NF) if', ['every attribute holds atomic (indivisible) values', 'it has no partial dependency', 'it has no transitive dependency', 'every determinant is a candidate key'], 0, '1NF only requires atomic attribute values.'),
        msq('Which of the following statements are correct?', ['Every relation in BCNF is also in 3NF.', 'A lossless decomposition produces no spurious tuples on natural join.', 'Every relation with exactly two attributes is in BCNF.', '2NF removes all transitive dependencies.'], [0, 1, 2], '2NF removes partial dependencies; 3NF removes transitive dependencies.'),
        nat('R(A, B, C, D) has the functional dependencies A → B, B → C and C → D. The number of candidate keys of R is ______.', [1, 1], 'A determines every other attribute, and no other attribute determines A, so the only candidate key is {A}.'),
      ] },
    ],
  },
  {
    subject: 'Computer Networks',
    topics: [
      { topic: 'Routing and IP', questions: [
        mcq('How many usable host addresses are there in an IPv4 /26 subnet?', ['30', '62', '64', '126'], 1, 'A /26 leaves 6 host bits: 2^6 − 2 = 62 usable addresses.', { marks: 2, difficulty: 'medium' }),
        msq('Which of the following are routing protocols?', ['RIP', 'OSPF', 'HTTP', 'BGP'], [0, 1, 3], 'HTTP is an application-layer protocol.', { difficulty: 'easy' }),
        nat('The total number of addresses (including network and broadcast addresses) in an IPv4 /22 block is ______.', [1024, 1024], '32 − 22 = 10 host bits, so 2^10 = 1024 addresses.'),
      ] },
      { topic: 'Transport Layer', questions: [
        mcq('Which of the following protocols provides reliable, connection-oriented delivery?', ['UDP', 'TCP', 'IP', 'ICMP'], 1, 'TCP provides reliable, ordered, connection-oriented delivery.', { difficulty: 'easy' }),
        msq('Which of the following are features of TCP?', ['Flow control', 'Congestion control', 'Connectionless delivery', 'Three-way handshake'], [0, 1, 3], 'TCP is connection-oriented, not connectionless.', { difficulty: 'easy' }),
        nat('In a stop-and-wait protocol the frame transmission time is 2 ms and the one-way propagation delay is 3 ms. The link utilisation, as a fraction, is ______.', [0.25, 0.25], 'Utilisation = Tt / (Tt + 2·Tp) = 2 / (2 + 6) = 0.25.'),
      ] },
    ],
  },
  {
    subject: 'General Aptitude',
    topics: [
      { topic: 'Numerical Ability', questions: [
        mcq('The price of an item is increased by 20% and the new price is then decreased by 20%. Compared with the original price, the final price is', ['unchanged', '4% lower', '4% higher', '2% lower'], 1, '1.20 × 0.80 = 0.96, which is 4% lower.'),
        msq('Which of the following numbers are prime?', ['17', '21', '29', '39'], [0, 2], '21 = 3 × 7 and 39 = 3 × 13.', { difficulty: 'easy' }),
        nat('A car travels 60 km at 30 km/h and returns the same 60 km at 60 km/h. Its average speed for the whole round trip, in km/h, is ______.', [40, 40], 'Total distance 120 km, total time 2 h + 1 h = 3 h, so 40 km/h.'),
      ] },
      { topic: 'Verbal Ability', questions: [
        mcq('Choose the grammatically correct sentence.', ['Each of the students have submitted the form.', 'Each of the students has submitted the form.', 'Each of the student has submitted the form.', 'Each of the students are submitting the form.'], 1, '"Each" is singular and takes "has"; "of the students" takes the plural noun.', { difficulty: 'easy' }),
        msq('Which of the following word pairs are synonyms?', ['Brief – Concise', 'Generous – Stingy', 'Abundant – Plentiful', 'Rapid – Swift'], [0, 2, 3], 'Generous and stingy are opposites.', { difficulty: 'easy' }),
        nat('The number of vowels (A, E, I, O, U) in the word EXAMINATION is ______.', [6, 6], 'E, A, I, A, I, O: six vowels.', { marks: 1, difficulty: 'easy' }),
      ] },
    ],
  },
];

/** Flattened list: each item gets its subject, topic and position (0..5) within its subject. */
export function flattenDemoContent() {
  return DEMO_CONTENT.flatMap((s) =>
    s.topics.flatMap((t, ti) =>
      t.questions.map((q, qi) => ({ ...q, subject: s.subject, topic: t.topic, topicIndex: ti, position: ti * 3 + qi })),
    ),
  );
}

const GA = 'General Aptitude';
const CS_SECTION = 'Computer Science and Information Technology';
const DEMO_NOTE = 'Generated sample content for development and practice. Not an official GATE paper and not made of previous-year questions.';

/**
 * Pure description of the demo tests. Questions are referenced as { subject, position } and resolved
 * to real database ids by seedDemoContent.js.
 *   2 full mocks (competitive), 12 subject-wise tests and 12 topic-wise tests (practice).
 */
export function buildTestPlans() {
  const subjects = DEMO_CONTENT.map((s) => s.subject);
  const csSubjects = subjects.filter((s) => s !== GA);
  const plans = [];

  // Mock 1 takes positions 0, 2, 4 of every subject; mock 2 takes 1, 3, 5. They never share a question.
  [[1, [0, 2, 4]], [2, [1, 3, 5]]].forEach(([n, positions]) => {
    plans.push({
      title: `Demo Full Mock ${n} (practice content)`,
      description: `${DEMO_NOTE} A shortened mock: 36 questions in 120 minutes.`,
      kind: 'mock',
      mode: 'competitive',
      durationMinutes: 120,
      sections: [
        { name: GA, items: positions.map((position) => ({ subject: GA, position })) },
        { name: CS_SECTION, items: csSubjects.flatMap((subject) => positions.map((position) => ({ subject, position }))) },
      ],
    });
  });

  for (const s of DEMO_CONTENT) {
    const count = s.topics.reduce((n, t) => n + t.questions.length, 0);
    plans.push({
      title: `Demo Subject Test: ${s.subject}`,
      description: `${DEMO_NOTE} All ${count} sample questions of this subject.`,
      kind: 'subject',
      mode: 'practice',
      durationMinutes: count * 3,
      scope: { subject: s.subject },
      sections: [{ name: s.subject, items: Array.from({ length: count }, (_, position) => ({ subject: s.subject, position })) }],
    });
  }

  // One topic test per subject: its first topic (3 questions, positions 0..2).
  for (const s of DEMO_CONTENT) {
    const t = s.topics[0];
    plans.push({
      title: `Demo Topic Test: ${t.topic}`,
      description: `${DEMO_NOTE} Subject: ${s.subject}.`,
      kind: 'topic',
      mode: 'practice',
      durationMinutes: t.questions.length * 3,
      scope: { subject: s.subject, topic: t.topic },
      sections: [{ name: t.topic, items: t.questions.map((_, position) => ({ subject: s.subject, position })) }],
    });
  }
  return plans;
}
