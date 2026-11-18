/**
 * WORKFLOW SAMPLES: 10 original questions that demonstrate the review pipeline. Pure data.
 *
 * These are NOT authentic PYQs and are not copied from any paper or coaching material.
 *  - ADVANCED: original higher-order questions.
 *  - PYQ_INSPIRED: original questions built on a concept PATTERN common in GATE. No specific previous-year
 *    question is referenced (the question bank holds no PYQs yet), so `inspiredByQuestionId` is empty and
 *    the inspirationNote says so honestly.
 * They are seeded as drafts awaiting review: an admin has to verify and publish them, which is the point.
 * Every numerical answer is re-derived in tests/sampleContent.test.js.
 */
const KEYS = 'ABCDEF';
const opts = (texts) => texts.map((text, i) => ({ key: KEYS[i], text }));

export const SAMPLE_QUESTIONS = [
  {
    subject: 'Algorithms', topic: 'Dynamic Programming', source: 'ADVANCED', type: 'NAT', marks: 2, difficulty: 'hard',
    statement: String.raw`Four matrices $M_1$ ($10 \times 20$), $M_2$ ($20 \times 5$), $M_3$ ($5 \times 30$) and $M_4$ ($30 \times 8$) are multiplied in the order $M_1 M_2 M_3 M_4$. The minimum number of scalar multiplications over all parenthesisations is ______.`,
    natAnswer: { min: 2600, max: 2600 },
    explanation: 'Matrix-chain dynamic programming gives m[1][4] = 2600, achieved by the parenthesisation (M1 M2)(M3 M4).',
    solutionSteps: [
      'Let the dimension array be p = [10, 20, 5, 30, 8]. Then m[i][i] = 0 and m[i][j] = min over k of m[i][k] + m[k+1][j] + p[i-1]·p[k]·p[j].',
      'Chains of length 2: m[1][2] = 10·20·5 = 1000, m[2][3] = 20·5·30 = 3000, m[3][4] = 5·30·8 = 1200.',
      'Chains of length 3: m[1][3] = min(0 + 3000 + 6000, 1000 + 0 + 1500) = 2500; m[2][4] = min(0 + 1200 + 800, 3000 + 0 + 4800) = 2000.',
      'Full chain: m[1][4] = min(0 + 2000 + 1600, 1000 + 1200 + 400, 2500 + 0 + 2400) = min(3600, 2600, 4900) = 2600.',
    ],
    commonMistakes: ['Multiplying left to right ((M1 M2) M3) M4 costs 1000 + 1500 + 2400 = 4900, which is not the minimum.', 'Using p[i]·p[k]·p[j] with the wrong index offsets.'],
    conceptTags: ['matrix chain multiplication', 'dynamic programming', 'optimal substructure'], relatedConcepts: ['optimal parenthesisation', 'memoisation'],
    estimatedTimeSeconds: 200, learningObjective: 'Fill the matrix-chain cost table by chain length and read off the optimal cost.',
  },
  {
    subject: 'Programming and Data Structures', topic: 'Programming in C', source: 'ADVANCED', type: 'NAT', marks: 2, difficulty: 'medium',
    statement: 'The value printed by the following program is ______.',
    code: `#include <stdio.h>
int main(void) {
    int c = 0;
    for (int i = 1; i <= 10; i++)
        for (int j = i; j <= 10; j += i)
            c++;
    printf("%d", c);
    return 0;
}`,
    natAnswer: { min: 27, max: 27 },
    explanation: 'For each i the inner loop runs floor(10 / i) times, so the program prints 10 + 5 + 3 + 2 + 2 + 1 + 1 + 1 + 1 + 1 = 27.',
    solutionSteps: [
      'The inner loop starts at j = i and steps by i up to 10, so it visits the multiples of i that do not exceed 10.',
      'The number of such multiples is floor(10 / i).',
      'Add over i = 1..10: 10, 5, 3, 2, 2, 1, 1, 1, 1, 1.',
      'The total is 27 (equivalently, the number of pairs (i, j) with i dividing j, for j up to 10).',
    ],
    commonMistakes: ['Starting the inner loop at j = 1 instead of j = i.', 'Counting j = 0 as a visit.'],
    conceptTags: ['nested loops', 'loop tracing', 'divisor counting'], relatedConcepts: ['harmonic sum', 'time complexity of nested loops'],
    estimatedTimeSeconds: 120, learningObjective: 'Trace a nested loop with a data-dependent step and count its iterations.',
  },
  {
    subject: 'Operating Systems', topic: 'CPU Scheduling', source: 'ADVANCED', type: 'NAT', marks: 2, difficulty: 'hard',
    statement: 'Four processes arrive at the times shown and need the given CPU bursts: P1 (arrival 0 ms, burst 8 ms), P2 (arrival 1 ms, burst 4 ms), P3 (arrival 2 ms, burst 9 ms), P4 (arrival 3 ms, burst 5 ms). The CPU uses Shortest Remaining Time First (preemptive SJF). The average waiting time in ms is ______.',
    natAnswer: { min: 6.5, max: 6.5 },
    explanation: 'Simulating SRTF gives completion times P2 = 5, P4 = 10, P1 = 17, P3 = 26, so the waiting times are 9, 0, 15 and 2 ms, an average of 6.5 ms.',
    solutionSteps: [
      'At t = 0 only P1 is present and runs. At t = 1, P2 arrives with burst 4 < P1 remaining 7, so P2 preempts P1.',
      'At t = 2 and t = 3, P3 (9) and P4 (5) arrive, but P2 has the shortest remaining time (3, then 2), so it runs to completion at t = 5.',
      'At t = 5 the remaining times are P1 = 7, P3 = 9, P4 = 5, so P4 runs 5 to 10, then P1 runs 10 to 17, then P3 runs 17 to 26.',
      'Waiting time = completion − arrival − burst: P1 = 17 − 0 − 8 = 9, P2 = 5 − 1 − 4 = 0, P3 = 26 − 2 − 9 = 15, P4 = 10 − 3 − 5 = 2.',
      'Average = (9 + 0 + 15 + 2) / 4 = 6.5 ms.',
    ],
    commonMistakes: ['Forgetting that a new arrival can preempt the running process.', 'Computing turnaround time instead of waiting time.'],
    conceptTags: ['SRTF', 'preemptive scheduling', 'waiting time'], relatedConcepts: ['SJF', 'turnaround time', 'starvation'],
    estimatedTimeSeconds: 240, learningObjective: 'Simulate a preemptive scheduler and compute average waiting time.',
  },
  {
    subject: 'Computer Networks', topic: 'Transport Layer', source: 'ADVANCED', type: 'NAT', marks: 2, difficulty: 'hard',
    statement: 'A sender uses a sliding-window protocol over an 8 Mbps link with a one-way propagation delay of 25 ms. Frames are 1000 bytes long, and the transmission time of an acknowledgement is negligible. The minimum window size, in frames, that lets the sender transmit continuously without idling is ______.',
    natAnswer: { min: 51, max: 51 },
    explanation: 'The frame transmission time is 1 ms and the round trip is 50 ms, so the sender needs 1 + 50 / 1 = 51 frames in flight.',
    solutionSteps: [
      'Transmission time Tt = (1000 × 8 bits) / (8 × 10^6 bits/s) = 1 ms.',
      'The first acknowledgement returns after Tt + 2·Tp = 1 + 50 = 51 ms.',
      'To keep sending until it arrives, the sender needs 51 / Tt = 51 frames in the window.',
    ],
    commonMistakes: ['Using 2·Tp / Tt = 50 and forgetting the frame that is being transmitted (the "+1").', 'Mixing up bits and bytes when computing Tt.'],
    conceptTags: ['sliding window', 'bandwidth-delay product', 'link utilisation'], relatedConcepts: ['Go-Back-N', 'selective repeat'],
    estimatedTimeSeconds: 150, learningObjective: 'Find the window size needed for 100% link utilisation.',
  },
  {
    subject: 'Theory of Computation', topic: 'Context-Free Languages and Pushdown Automata', source: 'ADVANCED', type: 'MSQ', marks: 2, difficulty: 'hard',
    statement: 'Which of the following decision problems are decidable?',
    options: opts([
      'Given a context-free grammar G, is L(G) empty?',
      'Given two DFAs, do they accept the same language?',
      'Given two context-free grammars G1 and G2, is L(G1) = L(G2)?',
      'Given a context-free grammar G and a string w, is w in L(G)?',
    ]),
    correctOptions: ['A', 'B', 'D'],
    explanation: 'The correct options are A, B and D. Emptiness of a CFG, equivalence of DFAs and CFG membership are decidable; equivalence of two CFGs is undecidable.',
    solutionSteps: [
      'A: emptiness of a CFG is decidable by marking which variables can derive a terminal string and checking the start symbol.',
      'B: equivalence of DFAs is decidable (build the product automaton for the symmetric difference and test emptiness).',
      'C: equivalence of two CFGs is undecidable, a standard result.',
      'D: membership for a CFG is decidable (for example with the CYK algorithm after converting to Chomsky normal form).',
    ],
    optionAnalysis: [
      { key: 'A', analysis: 'Decidable: mark productive variables.' },
      { key: 'B', analysis: 'Decidable: symmetric-difference automaton and an emptiness check.' },
      { key: 'C', analysis: 'Undecidable: CFG equivalence cannot be decided.' },
      { key: 'D', analysis: 'Decidable: CYK parsing.' },
    ],
    commonMistakes: ['Assuming that because DFA equivalence is decidable, CFG equivalence is too.'],
    conceptTags: ['decidability', 'context-free grammars', 'closure and decision problems'], relatedConcepts: ['CYK algorithm', 'Rice\'s theorem'],
    estimatedTimeSeconds: 120, learningObjective: 'Separate decidable from undecidable questions about regular and context-free languages.',
  },
  {
    subject: 'Databases', topic: 'Normalization', source: 'ADVANCED', type: 'NAT', marks: 2, difficulty: 'hard',
    statement: 'A relation R(A, B, C, D, E) has the functional dependencies AB → C, C → D, D → E and E → A. The number of candidate keys of R is ______.',
    natAnswer: { min: 4, max: 4 },
    explanation: 'B never appears on a right-hand side, so it is in every key. Adding any one of A, C, D or E gives a key, so there are 4 candidate keys: AB, BC, BD and BE.',
    solutionSteps: [
      'B does not appear on the right of any dependency, so every candidate key contains B.',
      'Closure of {B} is {B} alone, so B by itself is not a key.',
      'AB: AB → C, C → D, D → E gives all attributes. BC: C → D → E → A, then AB → C holds. BD: D → E → A, AB → C. BE: E → A, AB → C, C → D.',
      'Each of these has two attributes and no proper subset is a key, so all four are candidate keys: AB, BC, BD, BE.',
    ],
    commonMistakes: ['Stopping after finding AB and concluding there is a single key.', 'Forgetting that the cycle C → D → E → A makes A, C, D and E interchangeable once B is present.'],
    conceptTags: ['candidate keys', 'attribute closure', 'functional dependencies'], relatedConcepts: ['BCNF', 'prime attributes'],
    estimatedTimeSeconds: 180, learningObjective: 'Find all candidate keys when dependencies form a cycle.',
  },
  {
    subject: 'Digital Logic', topic: 'Number Representation', source: 'ADVANCED', type: 'MSQ', marks: 2, difficulty: 'medium',
    statement: 'Two 8-bit two\'s complement numbers are added with an 8-bit adder. For which of the following additions does signed overflow occur?',
    options: opts(['100 + 27', '100 + 28', '(−100) + (−28)', '(−100) + (−29)']),
    correctOptions: ['B', 'D'],
    explanation: 'The correct options are B and D. The representable range is −128 to 127: 100 + 28 = 128 and (−100) + (−29) = −129 fall outside it, while 127 and −128 are representable.',
    solutionSteps: [
      '8-bit two\'s complement represents −128 to 127.',
      'A: 100 + 27 = 127, in range. B: 100 + 28 = 128, above 127, so overflow.',
      'C: (−100) + (−28) = −128, in range. D: (−100) + (−29) = −129, below −128, so overflow.',
    ],
    optionAnalysis: [
      { key: 'A', analysis: '127 is the largest representable value, so there is no overflow.' },
      { key: 'B', analysis: '128 cannot be represented, so overflow occurs.' },
      { key: 'C', analysis: '−128 is the smallest representable value, so there is no overflow.' },
      { key: 'D', analysis: '−129 is below the range, so overflow occurs.' },
    ],
    commonMistakes: ['Treating −128 as out of range because its magnitude exceeds 127.', 'Confusing signed overflow with a carry out of the top bit.'],
    conceptTags: ['two\'s complement', 'overflow', 'signed addition'], relatedConcepts: ['carry vs overflow'],
    estimatedTimeSeconds: 90, learningObjective: 'Decide overflow by comparing the true sum with the representable range.',
  },
  {
    subject: 'Algorithms', topic: 'Asymptotic Analysis', source: 'PYQ_INSPIRED', type: 'MCQ', marks: 2, difficulty: 'hard',
    inspirationNote: 'Pattern level only: a master-theorem recurrence whose driving function carries an extra logarithmic factor (extended case 2). No specific previous-year question is referenced or reproduced.',
    statement: String.raw`The running time of an algorithm satisfies $T(n) = 3\,T(n/3) + n \log_2 n$ for $n > 1$, with $T(1) = 1$. Which of the following is the tightest asymptotic bound on $T(n)$?`,
    options: opts([String.raw`$\Theta(n \log n)$`, String.raw`$\Theta(n \log^2 n)$`, String.raw`$\Theta(n^2)$`, String.raw`$\Theta(n^{1.5})$`]),
    correctOptions: ['B'],
    explanation: 'Here n^(log_3 3) = n and f(n) = n log n has an extra log factor, so the extended master theorem gives T(n) = Θ(n log² n). The correct option is B.',
    solutionSteps: [
      'Identify a = 3, b = 3, so the critical exponent is log_3 3 = 1 and n^(log_b a) = n.',
      'The driving function is f(n) = n log n = Θ(n^(log_b a) · log^k n) with k = 1.',
      'For f(n) = Θ(n^(log_b a) log^k n) with k ≥ 0, the solution is Θ(n^(log_b a) log^(k+1) n).',
      'So T(n) = Θ(n log² n).',
    ],
    optionAnalysis: [
      { key: 'A', analysis: 'This ignores the extra log factor that accumulates over the log n levels.' },
      { key: 'B', analysis: 'Correct: each of the log n levels costs about n log n, giving n log² n.' },
      { key: 'C', analysis: 'Far too large: the work per level is only about n log n.' },
      { key: 'D', analysis: 'Not the critical exponent here; the recursion tree sums to near-linear work per level.' },
    ],
    commonMistakes: ['Applying case 3 of the basic master theorem because f(n) looks larger than n.', 'Applying the basic case 2 and forgetting the log^k factor.'],
    conceptTags: ['master theorem', 'recurrences', 'extended case 2'], relatedConcepts: ['recursion tree', 'divide and conquer'],
    estimatedTimeSeconds: 150, learningObjective: 'Solve a divide-and-conquer recurrence whose driving function has a logarithmic factor.',
  },
  {
    subject: 'Discrete Mathematics', topic: 'Combinatorics', source: 'PYQ_INSPIRED', type: 'NAT', marks: 2, difficulty: 'hard',
    inspirationNote: 'Pattern level only: counting integer solutions of a linear equation with a lower bound and an upper bound (stars and bars with inclusion-exclusion). No specific previous-year question is referenced or reproduced.',
    statement: String.raw`The number of non-negative integer solutions of $x_1 + x_2 + x_3 + x_4 = 12$ with $x_1 \ge 2$ and $x_2 \le 3$ is ______.`,
    natAnswer: { min: 202, max: 202 },
    explanation: 'Substitute y1 = x1 − 2 to get y1 + x2 + x3 + x4 = 10, which has C(13,3) = 286 solutions; remove those with x2 ≥ 4, which number C(9,3) = 84, leaving 202.',
    solutionSteps: [
      'Remove the lower bound: let y1 = x1 − 2 ≥ 0. The equation becomes y1 + x2 + x3 + x4 = 10.',
      'Without the upper bound, stars and bars gives C(10 + 3, 3) = C(13, 3) = 286 solutions.',
      'Count the violators x2 ≥ 4: let z2 = x2 − 4 ≥ 0, so y1 + z2 + x3 + x4 = 6, giving C(6 + 3, 3) = C(9, 3) = 84.',
      'Valid solutions = 286 − 84 = 202.',
    ],
    commonMistakes: ['Subtracting 2 from the right-hand side but also from x2.', 'Counting x2 ≥ 3 instead of x2 ≥ 4 as the violating case.'],
    conceptTags: ['stars and bars', 'inclusion-exclusion', 'integer solutions'], relatedConcepts: ['generating functions'],
    estimatedTimeSeconds: 150, learningObjective: 'Count bounded integer solutions by shifting variables and subtracting the violators.',
  },
  {
    subject: 'Computer Organization and Architecture', topic: 'Memory Hierarchy and Cache', source: 'PYQ_INSPIRED', type: 'NAT', marks: 2, difficulty: 'medium',
    inspirationNote: 'Pattern level only: average memory access time in a multi-level cache hierarchy using local miss rates. No specific previous-year question is referenced or reproduced.',
    statement: 'A system has an L1 cache (hit time 1 ns, miss rate 8%), an L2 cache (hit time 6 ns, local miss rate 25%) and main memory (access time 80 ns). The average memory access time, in ns, correct to two decimal places, is ______.',
    natAnswer: { min: 3.07, max: 3.09 },
    explanation: 'AMAT = 1 + 0.08 × (6 + 0.25 × 80) = 1 + 0.08 × 26 = 3.08 ns.',
    solutionSteps: [
      'The L1 miss penalty is the average time to get the block from L2 and below.',
      'L2 average access time = 6 + 0.25 × 80 = 26 ns, because 25% of L2 accesses miss and go to memory.',
      'AMAT = L1 hit time + L1 miss rate × L2 average access time = 1 + 0.08 × 26 = 3.08 ns.',
    ],
    commonMistakes: ['Using the L2 local miss rate as if it were a global miss rate (multiplying it by the L1 miss rate again).', 'Forgetting to add the L2 hit time to the memory term.'],
    conceptTags: ['AMAT', 'multi-level cache', 'local miss rate'], relatedConcepts: ['global miss rate', 'CPI with stalls'],
    estimatedTimeSeconds: 100, learningObjective: 'Compute average memory access time with two cache levels.',
  },
];
