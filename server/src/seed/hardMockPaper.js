/**
 * FULL-LENGTH GATE CSE HARD MOCK TEST (65 Questions, 100 Marks, 180 Minutes).
 * Pure data module, no database access.
 *
 * Structure matches GATE_FULL_MOCK in modules/content/testBuilder.js:
 *  - Section 1: General Aptitude — 10 questions (5 x 1 mark + 5 x 2 marks = 15 marks)
 *  - Section 2: Computer Science and Information Technology — 55 questions (25 x 1 mark + 30 x 2 marks = 85 marks)
 *
 * All questions are original higher-order practice questions (source: 'ADVANCED',
 * difficulty: 'hard' or 'very_hard') with full step-by-step explanations.
 */
const KEYS = 'ABCDEF';
const options = (texts) => texts.map((text, i) => ({ key: KEYS[i], text }));

const mcq = (subject, topic, marks, statement, texts, correct, explanation, { difficulty = 'hard', code, estimatedTimeSeconds } = {}) => ({
  subject,
  topic,
  type: 'MCQ',
  marks,
  difficulty,
  statement,
  ...(code ? { code } : {}),
  options: options(texts),
  correctOptions: [KEYS[correct]],
  explanation,
  ...(estimatedTimeSeconds ? { estimatedTimeSeconds } : {}),
});

const msq = (subject, topic, marks, statement, texts, correct, explanation, { difficulty = 'hard', code, estimatedTimeSeconds } = {}) => ({
  subject,
  topic,
  type: 'MSQ',
  marks,
  difficulty,
  statement,
  ...(code ? { code } : {}),
  options: options(texts),
  correctOptions: correct.map((i) => KEYS[i]),
  explanation,
  ...(estimatedTimeSeconds ? { estimatedTimeSeconds } : {}),
});

const nat = (subject, topic, marks, statement, [min, max], explanation, { difficulty = 'hard', code, estimatedTimeSeconds } = {}) => ({
  subject,
  topic,
  type: 'NAT',
  marks,
  difficulty,
  statement,
  ...(code ? { code } : {}),
  natAnswer: { min, max },
  explanation,
  ...(estimatedTimeSeconds ? { estimatedTimeSeconds } : {}),
});

export const HARD_MOCK_TEST_META = {
  title: 'GATE CSE Full-Length Hard Mock 1',
  description:
    'Full-length GATE CSE hard-level mock paper: 65 questions, 100 marks, 180 minutes (15 marks General Aptitude + 85 marks Core CS across MCQ, MSQ, and NAT). Original high-difficulty questions.',
  kind: 'mock',
  mode: 'competitive',
  durationMinutes: 180,
};

export const HARD_MOCK_QUESTIONS = [
  // =========================================================================
  // SECTION 1: GENERAL APTITUDE (10 Questions = 15 Marks: 5 x 1m + 5 x 2m)
  // =========================================================================

  // --- GA 1-mark (5 questions) ---
  mcq(
    'General Aptitude',
    'Verbal Ability',
    1,
    'Although the committee’s report was ______ in its critique of legacy infrastructure, its recommendations remained surprisingly ______ about funding timelines.',
    ['trenchant ... reticent', 'cursory ... vociferous', 'laudatory ... opaque', 'diffident ... explicit'],
    0,
    'The word "Although" signals a contrast between a sharp, incisive critique ("trenchant") and a reluctant or silent stance on timelines ("reticent"). Hence the correct option is A.',
  ),
  mcq(
    'General Aptitude',
    'Numerical Ability',
    1,
    String.raw`What is the remainder when $7^{2025}$ is divided by $100$?`,
    ['07', '43', '49', '93'],
    0,
    String.raw`Note that $7^4 = 2401 \equiv 1 \pmod{100}$. Since $2025 = 4 \times 506 + 1$, we have $7^{2025} = (7^4)^{506} \cdot 7^1 \equiv 1^{506} \cdot 7 \equiv 7 \pmod{100}$. Hence the correct option is A.`,
  ),
  mcq(
    'General Aptitude',
    'Analytical Reasoning',
    1,
    'Five servers P, Q, R, S, and T are arranged in a single rack from bottom (slot 1) to top (slot 5). P is immediately above Q. R is not in slot 1 or slot 5. S is somewhere above T, and there are exactly two servers between R and T. Which server MUST be in slot 3?',
    ['P', 'Q', 'R', 'S'],
    0,
    'Since R is not in slot 1 or 5, R is in {2, 3, 4}. Because there are two servers between R and T, |pos(R) - pos(T)| = 3, so R cannot be in slot 3. If R is in slot 2, T is in slot 5, leaving no slot above T for S. Thus R must be in slot 4 and T in slot 1. The remaining slots {2, 3, 5} must hold P immediately above Q and S above T, forcing Q in 2, P in 3, and S in 5. Therefore, P must be in slot 3. Hence the correct option is A.',
  ),
  mcq(
    'General Aptitude',
    'Numerical Ability',
    1,
    String.raw`If $\log_{2}(x - 3) + \log_{2}(x + 1) = 5$, then the sum of all real solutions for $x$ is`,
    ['2', '5', '7', '12'],
    2,
    String.raw`Domain requires $x > 3$. Combining logs gives $\log_2((x-3)(x+1)) = 5 \implies x^2 - 2x - 3 = 32 \implies x^2 - 2x - 35 = 0 \implies (x-7)(x+5) = 0$. Only $x = 7$ satisfies $x > 3$. Thus the sum of all real solutions is 7. Hence the correct option is C.`,
  ),
  mcq(
    'General Aptitude',
    'Verbal Ability',
    1,
    'In a certain code, if every vowel in a word is replaced by the next letter in the English alphabet and every consonant is replaced by the previous letter, how is the word "GATE" coded?',
    ['FBSF', 'FZSF', 'FBSD', 'HZUF'],
    0,
    'Each consonant shifts backward by 1 (G -> F, T -> S) and each vowel shifts forward by 1 (A -> B, E -> F), yielding FBSF. Hence the correct option is A.',
  ),

  // --- GA 2-mark (5 questions) ---
  mcq(
    'General Aptitude',
    'Data Interpretation',
    2,
    'A software team tracks bug counts across four quarters Q1, Q2, Q3, and Q4. The number of bugs in Q2 is 25% more than Q1, Q3 is 20% less than Q2, and Q4 is 50% more than Q3. If the average number of bugs per quarter over the year is 95, how many bugs were reported in Q4?',
    ['120', '135', '150', '180'],
    0,
    'Let Q1 = 4k. Then Q2 = 5k, Q3 = 0.8 × 5k = 4k, and Q4 = 1.5 × 4k = 6k. Total = 19k = 4 × 95 = 380, so k = 20. Thus Q4 = 6 × 20 = 120. Hence the correct option is A.',
  ),
  nat(
    'General Aptitude',
    'Spatial Reasoning',
    2,
    'A solid cube of side 5 cm is painted red on all six faces and then cut into 125 smaller cubes of side 1 cm each. How many of these smaller cubes have AT LEAST two faces painted red?',
    [44, 44],
    'Cubes with 3 painted faces (corners) = 8. Cubes with exactly 2 painted faces (edges, excluding corners) = 12 × (5 − 2) = 36. Total with at least two faces painted = 8 + 36 = 44.',
  ),
  msq(
    'General Aptitude',
    'Analytical Reasoning',
    2,
    'All researchers who publish in Tier-1 venues are rigorous. Some rigorous scholars are not tenured. No non-tenured scholar chairs the ethics board. Based ONLY on these statements, which of the following conclusions MUST hold?',
    [
      'Every chair of the ethics board is tenured.',
      'Some researchers who publish in Tier-1 venues are tenured.',
      'No non-tenured scholar is a chair of the ethics board.',
      'If a scholar is not rigorous, they do not publish in Tier-1 venues.',
    ],
    [0, 2, 3],
    'From "No non-tenured scholar chairs the ethics board", its contrapositive gives "Every chair is tenured" (A) and restatement (C). From "All Tier-1 publishers are rigorous", the contrapositive gives (D). We cannot conclude (B) because all Tier-1 publishers could be among the non-tenured rigorous scholars. Hence the correct options are A, C and D.',
  ),
  nat(
    'General Aptitude',
    'Numerical Ability',
    2,
    String.raw`Two trains A and B start simultaneously from stations X and Y towards each other at speeds of 54 km/h and 72 km/h respectively. They cross each other after 40 minutes, and after crossing, train A takes $t$ minutes to reach Y. The value of $t$ (rounded to two decimal places) is ______.`,
    [53.3, 53.35],
    String.raw`Ratio of speeds $v_A : v_B = 54 : 72 = 3 : 4$. Time to meet is 40 min, so the distance covered by B before meeting is covered by A after meeting in $40 \times (v_B / v_A) = 40 \times (4/3) = 160/3 \approx 53.33$ minutes.`,
  ),
  mcq(
    'General Aptitude',
    'Data Interpretation',
    2,
    'A dataset of 9 distinct positive integers has a median of 18, a mean of 20, and a range of 24. What is the maximum possible value of the largest integer in the dataset?',
    ['35', '36', '37', '38'],
    3,
    String.raw`Let the sorted integers be $x_1 < x_2 < \dots < x_9$ with $x_5 = 18$, $\sum x_i = 180$, and $x_9 - x_1 = 24 \implies x_1 = x_9 - 24$. Since $x_4 < 18$ and elements are distinct, $x_1 + 3 \le x_4 \le 17 \implies x_1 \le 14 \implies x_9 \le 38$. The valid dataset $\{14, 15, 16, 17, 18, 19, 20, 23, 38\}$ has median 18, range 24, and sum 180 (mean 20), achieving $x_9 = 38$. Hence the correct option is D.`,
  ),

  // =========================================================================
  // SECTION 2: COMPUTER SCIENCE & IT (55 Questions = 85 Marks: 25 x 1m + 30 x 2m)
  // =========================================================================

  // --- CS 1-mark (25 questions) ---
  // 1. Engineering Mathematics (2 x 1m)
  mcq(
    'Engineering Mathematics',
    'Linear Algebra',
    1,
    String.raw`Let $A$ be a $4 \times 4$ real matrix with eigenvalues $1, -1, 2, 0$. What is the determinant of $A^2 + 2I$?`,
    ['18', '54', '108', '162'],
    2,
    String.raw`If $\lambda$ is an eigenvalue of $A$, then $\lambda^2 + 2$ is an eigenvalue of $A^2 + 2I$. The eigenvalues of $A^2 + 2I$ are $1^2+2=3$, $(-1)^2+2=3$, $2^2+2=6$, and $0^2+2=2$. Their product is $\det(A^2 + 2I) = 3 \times 3 \times 6 \times 2 = 108$. Hence the correct option is C.`,
  ),
  nat(
    'Engineering Mathematics',
    'Calculus',
    1,
    String.raw`The value of $\lim_{x \to 0} \frac{e^{2x} - 1 - 2x}{x^2}$ is ______.`,
    [2, 2],
    String.raw`Using the Taylor expansion $e^{2x} = 1 + 2x + \frac{(2x)^2}{2!} + O(x^3) = 1 + 2x + 2x^2 + O(x^3)$, the numerator is $2x^2 + O(x^3)$, so the limit is $2$.`,
  ),

  // 2. Discrete Mathematics (3 x 1m)
  mcq(
    'Discrete Mathematics',
    'Propositional and First-Order Logic',
    1,
    String.raw`Which of the following first-order logic formulas is NOT logically equivalent to $\neg \exists x \, (P(x) \land \neg Q(x))$?`,
    [
      String.raw`$\forall x \, (P(x) \to Q(x))$`,
      String.raw`$\forall x \, (\neg P(x) \lor Q(x))$`,
      String.raw`$\neg \exists x \, (\neg Q(x) \land P(x))$`,
      String.raw`$\exists x \, (\neg P(x) \lor Q(x))$`,
    ],
    3,
    String.raw`$\neg \exists x (P(x) \land \neg Q(x)) \equiv \forall x (\neg P(x) \lor Q(x)) \equiv \forall x (P(x) \to Q(x))$. Replacing $\forall x$ with $\exists x$ in D weakens the statement and is not equivalent. Hence the correct option is D.`,
  ),
  nat(
    'Discrete Mathematics',
    'Graph Theory',
    1,
    'A simple connected planar graph has 12 vertices, and every face in its planar embedding is bounded by at least 4 edges. What is the maximum possible number of edges in this graph?',
    [20, 20],
    String.raw`For a connected planar graph without triangles (girth $\ge 4$), $e \le 2v - 4$. With $v = 12$, $e \le 2(12) - 4 = 20$.`,
  ),
  msq(
    'Discrete Mathematics',
    'Groups and Lattices',
    1,
    String.raw`Let $(G, *)$ be a finite group of order $15$. Which of the following statements MUST be true?`,
    [
      String.raw`Every proper subgroup of $G$ has order $1, 3,$ or $5$.`,
      String.raw`$G$ has an element of order $3$.`,
      String.raw`$G$ is abelian.`,
      String.raw`$G$ has a subgroup of order $10$.`,
    ],
    [0, 1, 2],
    String.raw`By Lagrange’s theorem, subgroup orders divide 15, so proper subgroups have order 1, 3, or 5 (A), and no subgroup of order 10 exists (D false). By Cauchy’s theorem, prime 3 divides 15 so an element of order 3 exists (B). Any group of order $pq$ ($p < q$ primes) with $p \nmid (q - 1)$ is cyclic, hence abelian; here $3 \nmid 4$, so $G \cong \mathbb{Z}_{15}$ is cyclic and abelian (C). Hence the correct options are A, B and C.`,
  ),

  // 3. Digital Logic (2 x 1m)
  nat(
    'Digital Logic',
    'Boolean Algebra and Minimization',
    1,
    String.raw`How many essential prime implicants does the Boolean function $f(A, B, C, D) = \sum m(0, 2, 5, 7, 8, 10, 13, 15)$ have?`,
    [2, 2],
    String.raw`Grouping $m(0,2,8,10)$ gives $\overline{B}\overline{D}$, and grouping $m(5,7,13,15)$ gives $BD$. These two prime implicants cover all 8 minterms disjointly, so both are essential prime implicants. The answer is 2.`,
  ),
  mcq(
    'Digital Logic',
    'Number Representation',
    1,
    'In IEEE 754 single-precision (32-bit) floating-point representation, what is the decimal value of the hex word `0xC1280000`?',
    ['−10.5', '−10.25', '−20.5', '10.5'],
    0,
    '0xC1280000 in binary has sign = 1 (negative), exponent = 10000010 = 130 (unbiased = 130 − 127 = 3), and mantissa = .0101000... = 0.25 + 0.0625 = 0.3125. Value = −1.3125 × 2^3 = −10.5. Hence the correct option is A.',
  ),

  // 4. Computer Organization and Architecture (2 x 1m)
  mcq(
    'Computer Organization and Architecture',
    'Machine Instructions and Addressing Modes',
    1,
    'A 32-bit byte-addressable RISC processor uses a 2-way set-associative L1 instruction cache of size 32 KB with 64-byte blocks. If physical addresses are 36 bits wide, what is the size of the tag field in bits?',
    ['20', '21', '22', '23'],
    2,
    'Block offset = log2(64) = 6 bits. Number of blocks = 32 KB / 64 B = 512. Number of sets = 512 / 2 = 256, so index = log2(256) = 8 bits. Tag = 36 − 8 − 6 = 22 bits. Hence the correct option is C.',
  ),
  nat(
    'Computer Organization and Architecture',
    'Pipelining',
    1,
    'A 5-stage instruction pipeline has stage delays of 12 ns, 18 ns, 15 ns, 22 ns, and 13 ns, with an inter-stage pipeline register overhead of 2 ns. What is the maximum clock frequency (in MHz, rounded to two decimal places) of this pipeline?',
    [41.65, 41.68],
    'Cycle time = max(stage delays) + register overhead = 22 + 2 = 24 ns. Maximum clock frequency = 1 / 24 ns = 1000 / 24 MHz ≈ 41.67 MHz.',
  ),

  // 5. Programming and Data Structures (3 x 1m)
  nat(
    'Programming and Data Structures',
    'Programming in C',
    1,
    'What is the output printed by the following C program?',
    [18, 18],
    'Static variable x starts at 0. f(5) sets x=2 and calls f(3); f(3) sets x=4 and calls f(1); f(1) sets x=6 and calls f(-1) which returns 0. Unwinding with x=6: f(1) returns 0+6=6, f(3) returns 6+6=12, f(5) returns 12+6=18.',
    {
      code: `#include <stdio.h>
int f(int n) {
    static int x = 0;
    if (n <= 0) return 0;
    x += 2;
    int y = f(n - 2);
    return y + x;
}
int main(void) {
    printf("%d", f(5));
    return 0;
}`,
    },
  ),
  mcq(
    'Programming and Data Structures',
    'Trees and Binary Search Trees',
    1,
    'The preorder traversal of a binary search tree is `15, 10, 8, 12, 20, 17, 25`. Which of the following is its postorder traversal?',
    [
      '8, 12, 10, 17, 25, 20, 15',
      '8, 10, 12, 17, 20, 25, 15',
      '12, 8, 10, 25, 17, 20, 15',
      '8, 12, 17, 25, 10, 20, 15',
    ],
    0,
    'Root is 15. Left subtree has {10, 8, 12} with root 10, left 8, right 12 -> postorder 8, 12, 10. Right subtree has {20, 17, 25} with root 20, left 17, right 25 -> postorder 17, 25, 20. Full postorder: 8, 12, 10, 17, 25, 20, 15. Hence the correct option is A.',
  ),
  nat(
    'Programming and Data Structures',
    'Binary Heaps',
    1,
    'An array `A[1..12]` represents a max-heap storing the distinct integers `1, 2, ..., 12`. What is the MAXIMUM possible value that can reside at `A[12]`?',
    [9, 9],
    'A[12] has 3 strict ancestors in the heap tree: A[6], A[3], and A[1]. Each ancestor must be strictly larger than A[12], so at least 3 elements (10, 11, 12) must be greater than A[12]. Thus the maximum possible value at A[12] is 12 − 3 = 9.',
  ),

  // 6. Algorithms (2 x 1m)
  mcq(
    'Algorithms',
    'Asymptotic Analysis',
    1,
    String.raw`Consider the recurrence $T(n) = 2T(\sqrt{n}) + \log_2 n$ for $n > 2$, with $T(2) = 1$. Which of the following is the tight asymptotic bound for $T(n)$?`,
    [
      String.raw`$\Theta(\log n)$`,
      String.raw`$\Theta(\log n \log \log n)$`,
      String.raw`$\Theta((\log n)^2)$`,
      String.raw`$\Theta(\sqrt{n})$`,
    ],
    1,
    String.raw`Let $m = \log_2 n$, so $n = 2^m$ and $\sqrt{n} = 2^{m/2}$. Setting $S(m) = T(2^m)$, we get $S(m) = 2S(m/2) + m$, which by the Master Theorem gives $S(m) = \Theta(m \log m) = \Theta(\log n \log \log n)$. Hence the correct option is B.`,
  ),
  msq(
    'Algorithms',
    'Graph Algorithms',
    1,
    'Let $G = (V, E)$ be a connected undirected graph with distinct positive edge weights. Which of the following statements are ALWAYS true?',
    [
      'G has a unique Minimum Spanning Tree (MST).',
      'The lightest edge in G must belong to the MST.',
      'The heaviest edge in any cycle of G cannot belong to the MST.',
      'The shortest path between any two vertices s and t must be part of the MST.',
    ],
    [0, 1, 2],
    'Distinct edge weights guarantee a unique MST (A). By the cut property, the globally lightest edge belongs to the MST (B). By the cycle property, the heaviest edge in any cycle is never in the MST (C). Shortest-path trees and MSTs need not coincide (D false). Hence the correct options are A, B and C.',
  ),

  // 7. Theory of Computation (2 x 1m)
  mcq(
    'Theory of Computation',
    'Regular Languages and Finite Automata',
    1,
    String.raw`What is the minimum number of states in a deterministic finite automaton (DFA) over $\Sigma = \{0, 1\}$ that accepts all binary strings whose decimal value is divisible by $5$ (with leading zeros allowed and the empty string accepted as $0$)?`,
    ['4', '5', '6', '10'],
    1,
    'The states track the remainder modulo 5 (0, 1, 2, 3, 4), all 5 of which are pairwise distinguishable by Myhill-Nerode. Thus the minimum DFA has 5 states. Hence the correct option is B.',
  ),
  msq(
    'Theory of Computation',
    'Turing Machines and Undecidability',
    1,
    'Which of the following decision problems for Turing machines (TMs) are decidable?',
    [
      String.raw`Given a TM $M$ and string $w$, does $M$ move its tape head at least 10 times on input $w$?`,
      String.raw`Given a TM $M$, is $L(M)$ regular?`,
      String.raw`Given a TM $M$ and string $w$, does $M$ halt on $w$ within 100 steps?`,
      String.raw`Given two TMs $M_1$ and $M_2$, is $L(M_1) = L(M_2)$?`,
    ],
    [0, 2],
    String.raw`Bounded-step or bounded-head-move properties can be decided by simulating $M$ for a fixed number of steps (if a TM does not move its head 10 times within $|Q| \cdot |\Gamma|$ steps in a stationary loop, it never will; and simulating 100 steps is finite). Both regularity of $L(M)$ and equivalence of TMs are undecidable. Hence the correct options are A and C.`,
  ),

  // 8. Compiler Design (2 x 1m)
  mcq(
    'Compiler Design',
    'Parsing',
    1,
    'Which of the following grammars is LL(1)?',
    [
      String.raw`$S \to Sa \mid b$`,
      String.raw`$S \to aS \mid a$`,
      String.raw`$S \to aSb \mid \varepsilon$`,
      String.raw`$S \to A \mid B,\; A \to a,\; B \to a$`,
    ],
    2,
    String.raw`Grammar A has left recursion; B has common prefix $a$ (not left-factored); D has $\text{FIRST}(A) \cap \text{FIRST}(B) = \{a\} \neq \emptyset$. Grammar C has $\text{FIRST}(aSb) = \{a\}$ and $\text{FOLLOW}(S) = \{\$, b\}$, which are disjoint, so C is LL(1). Hence the correct option is C.`,
  ),
  msq(
    'Compiler Design',
    'Code Optimization',
    1,
    'Which of the following compiler optimizations can be performed purely using local (within a single basic block) analysis?',
    [
      'Common subexpression elimination within a basic block',
      'Dead code elimination of unused temporaries defined and killed in the same block',
      'Loop-invariant code motion',
      'Constant folding',
    ],
    [0, 1, 3],
    'Local common subexpression elimination, local dead code elimination, and constant folding operate within a single basic block. Loop-invariant code motion requires loop detection and reaching definitions across basic blocks. Hence the correct options are A, B and D.',
  ),

  // 9. Operating Systems (3 x 1m)
  nat(
    'Operating Systems',
    'CPU Scheduling',
    1,
    'Four processes P1, P2, P3, P4 arrive at time 0 with CPU burst times 6, 8, 7, and 3 ms respectively. Under Shortest Job First (non-preemptive) scheduling, what is the average waiting time (in ms)?',
    [7, 7],
    'Execution order: P4 (3), P1 (6), P3 (7), P2 (8). Waiting times: P4 = 0, P1 = 3, P3 = 9, P2 = 16. Average = (0 + 3 + 9 + 16) / 4 = 28 / 4 = 7 ms.',
  ),
  mcq(
    'Operating Systems',
    'Synchronization and Deadlock',
    1,
    'A system has 3 identical instances of a resource R. Each process requires at most 2 instances of R to complete. What is the maximum number of processes that can be in the system such that deadlock is guaranteed NEVER to occur?',
    ['1', '2', '3', '4'],
    1,
    'Each process can hold at most 1 instance without completing; with $n$ processes, the maximum held before deadlock is $n(2-1) = n$. To guarantee no deadlock, $n < 3$, so $n = 2$. Hence the correct option is B.',
  ),
  mcq(
    'Operating Systems',
    'Virtual Memory',
    1,
    'A 32-bit virtual address space uses 4 KB pages. Each page table entry (PTE) is 4 bytes. What is the size of a single-level page table for one process?',
    ['1 MB', '2 MB', '4 MB', '8 MB'],
    2,
    String.raw`Number of pages = $2^{32} / 2^{12} = 2^{20}$ pages. Page table size = $2^{20} \times 4$ bytes = 4 MB. Hence the correct option is C.`,
  ),

  // 10. Databases (2 x 1m)
  mcq(
    'Databases',
    'Normalization',
    1,
    String.raw`A relation $R(A, B, C, D)$ has functional dependencies $A \to B$, $B \to C$, and $C \to D$. What is the highest normal form that $R$ satisfies?`,
    ['1NF', '2NF', '3NF', 'BCNF'],
    1,
    String.raw`The only candidate key is $A$ (since $A^+ = ABCD$). There are no partial dependencies on a proper subset of $A$ (since $A$ is a single attribute), so $R$ is in 2NF. However, $B \to C$ is a transitive dependency from non-prime $B$ to non-prime $C$, violating 3NF. Hence the correct option is B.`,
  ),
  msq(
    'Databases',
    'Transactions and Concurrency Control',
    1,
    'Which of the following statements about schedules and concurrency control protocols are TRUE?',
    [
      'Every conflict-serializable schedule is view-serializable.',
      'Every strict schedule is cascadeless.',
      'Strict Two-Phase Locking (Strict 2PL) guarantees conflict serializability and prevents cascading aborts.',
      'Every view-serializable schedule is conflict-serializable.',
    ],
    [0, 1, 2],
    'Conflict serializability implies view serializability (A), strictness implies cascadelessness (B), and Strict 2PL guarantees both conflict serializability and strictness (C). Blind-write schedules can be view-serializable without being conflict-serializable (D false). Hence the correct options are A, B and C.',
  ),

  // 11. Computer Networks (2 x 1m)
  nat(
    'Computer Networks',
    'Routing and IP',
    1,
    'A subnet has network address `192.168.40.0/22`. How many usable host IPv4 addresses are available in this subnet?',
    [1022, 1022],
    String.raw`A /22 prefix leaves $32 - 22 = 10$ host bits, giving $2^{10} - 2 = 1024 - 2 = 1022$ usable host addresses.`,
  ),
  mcq(
    'Computer Networks',
    'Data Link and MAC',
    1,
    'In a 10 Mbps Ethernet LAN using CSMA/CD, the maximum one-way propagation delay between any two stations is 25.6 microseconds. What is the minimum frame size (in bytes) required for collision detection to work properly?',
    ['32 bytes', '64 bytes', '128 bytes', '512 bytes'],
    1,
    String.raw`Minimum transmission time $T_t \ge 2 \times T_p = 51.2\;\mu\text{s}$. Minimum frame size = $51.2 \times 10^{-6} \times 10 \times 10^6 = 512$ bits = 64 bytes. Hence the correct option is B.`,
  ),

  // --- CS 2-mark (30 questions) ---
  // 1. Engineering Mathematics (3 x 2m)
  nat(
    'Engineering Mathematics',
    'Linear Algebra',
    2,
    String.raw`Consider the system of linear equations $x + y + z = 3$, $2x + 3y + kz = 7$, and $x + 2y + 4z = 4$. For what value of $k$ does the system have infinitely many solutions?`,
    [5, 5],
    String.raw`Subtracting equation 1 from equation 3 gives $y + 3z = 1$. Subtracting $2 \times \text{equation 1}$ from equation 2 gives $y + (k - 2)z = 1$. For infinitely many solutions, the two equations must be identical, so $k - 2 = 3 \implies k = 5$.`,
  ),
  mcq(
    'Engineering Mathematics',
    'Probability and Statistics',
    2,
    'A binary symmetric channel transmits bit 0 with probability 0.6 and bit 1 with probability 0.4. Each transmitted bit is flipped by noise independently with probability 0.1. Given that bit 1 is received, what is the probability that bit 1 was actually transmitted?',
    ['6/7', '4/7', '3/7', '1/7'],
    0,
    'P(R=1) = P(T=1)P(R=1|T=1) + P(T=0)P(R=1|T=0) = 0.4×0.9 + 0.6×0.1 = 0.36 + 0.06 = 0.42. By Bayes’ theorem, P(T=1|R=1) = 0.36 / 0.42 = 36/42 = 6/7. Hence the correct option is A.',
  ),
  nat(
    'Engineering Mathematics',
    'Calculus',
    2,
    String.raw`The minimum value of the function $f(x) = x^3 - 3x^2 - 9x + 12$ on the closed interval $[0, 4]$ is ______.`,
    [-15, -15],
    String.raw`$f'(x) = 3x^2 - 6x - 9 = 3(x-3)(x+1) = 0$, giving critical point $x = 3 \in [0, 4]$. Evaluating endpoints and critical point: $f(0) = 12$, $f(3) = 27 - 27 - 27 + 12 = -15$, $f(4) = 64 - 48 - 36 + 12 = -8$. The minimum value is $-15$.`,
  ),

  // 2. Discrete Mathematics (3 x 2m)
  nat(
    'Discrete Mathematics',
    'Combinatorics',
    2,
    String.raw`How many integer solutions exist to the equation $x_1 + x_2 + x_3 + x_4 = 15$ such that $x_1 \ge 1$, $x_2 \ge 2$, $x_3 \ge 0$, and $1 \le x_4 \le 4$?`,
    [244, 244],
    String.raw`Substitute $y_1 = x_1 - 1 \ge 0$, $y_2 = x_2 - 2 \ge 0$, $y_3 = x_3 \ge 0$, $y_4 = x_4 - 1 \ge 0$ with $y_4 \le 3$. Then $y_1 + y_2 + y_3 + y_4 = 11$. Total non-negative solutions = $\binom{14}{3} = 364$. Subtracting solutions with $y_4 \ge 4$ (set $z_4 = y_4 - 4 \ge 0$, giving $\binom{10}{3} = 120$) yields $364 - 120 = 244$.`,
  ),
  mcq(
    'Discrete Mathematics',
    'Sets, Relations and Functions',
    2,
    String.raw`Let $A = \{1, 2, 3, 4\}$. How many equivalence relations on $A$ contain the pairs $(1, 2)$ and $(2, 3)$?`,
    ['1', '2', '3', '5'],
    1,
    'Since the relation is an equivalence relation containing (1,2) and (2,3), by transitivity, symmetry, and reflexivity, {1, 2, 3} must lie in the same equivalence class. Element 4 can either join {1, 2, 3} (giving partition {{1,2,3,4}}) or form its own singleton class (giving partition {{1,2,3}, {4}}). Thus there are 2 such equivalence relations. Hence the correct option is B.',
  ),
  msq(
    'Discrete Mathematics',
    'Graph Theory',
    2,
    String.raw`Let $G$ be a complete bipartite graph $K_{m,n}$ with $m, n \ge 2$. Which of the following statements are ALWAYS true?`,
    [
      '$G$ is 2-colorable.',
      '$G$ has an Euler circuit if and only if both $m$ and $n$ are even.',
      '$G$ has a Hamiltonian cycle if and only if $m = n$.',
      '$G$ is planar for all $m, n \ge 2$.',
    ],
    [0, 1, 2],
    String.raw`Every bipartite graph with at least one edge is 2-colorable (A). All vertex degrees are $n$ in one part and $m$ in the other, so all degrees are even iff both $m$ and $n$ are even (B). Since $K_{m,n}$ is bipartite, a Hamiltonian cycle must alternate parts, requiring $m = n$ (C). $K_{3,3}$ is non-planar (D false). Hence the correct options are A, B and C.`,
  ),

  // 3. Digital Logic (2 x 2m)
  nat(
    'Digital Logic',
    'Sequential Circuits',
    2,
    'A synchronous mod-12 counter is designed using JK flip-flops. If the counter is clocked at 24 MHz and each flip-flop has a propagation delay of 10 ns, what is the frequency (in MHz) of the MSB output?',
    [2, 2],
    'A mod-12 counter divides the input clock frequency by 12. Output frequency = 24 MHz / 12 = 2 MHz.',
  ),
  mcq(
    'Digital Logic',
    'Combinational Circuits',
    2,
    String.raw`A 4-to-1 multiplexer has select lines $S_1 = A$ and $S_0 = B$, and data inputs $I_0 = C$, $I_1 = \overline{C}$, $I_2 = 0$, $I_3 = 1$. Which Boolean function $F(A, B, C)$ does it implement?`,
    [
      String.raw`$\sum m(1, 2, 6, 7)$`,
      String.raw`$\sum m(1, 3, 6, 7)$`,
      String.raw`$\sum m(0, 2, 6, 7)$`,
      String.raw`$\sum m(1, 2, 5, 7)$`,
    ],
    0,
    String.raw`For $(A,B)=(0,0)$, $F = C \implies m_1$; for $(0,1)$, $F = \overline{C} \implies m_2$; for $(1,0)$, $F = 0$; for $(1,1)$, $F = 1 \implies m_6, m_7$. Thus $F = \sum m(1, 2, 6, 7)$. Hence the correct option is A.`,
  ),

  // 4. Computer Organization and Architecture (2 x 2m)
  nat(
    'Computer Organization and Architecture',
    'Memory Hierarchy and Cache',
    2,
    'A processor has a 2-level cache hierarchy. L1 hit time is 1 cycle and L1 local miss rate is 10%. L2 hit time is 10 cycles and L2 local miss rate is 20%. Main memory access penalty is 100 cycles. What is the Average Memory Access Time (AMAT) in cycles?',
    [4, 4],
    'AMAT = L1_hit + L1_miss_rate × (L2_hit + L2_miss_rate × Mem_penalty) = 1 + 0.10 × (10 + 0.20 × 100) = 1 + 0.10 × 30 = 4 cycles.',
  ),
  nat(
    'Computer Organization and Architecture',
    'Pipelining',
    2,
    'Consider a 5-stage pipeline (IF, ID, EX, MEM, WB) with full operand forwarding (EX-to-EX and MEM-to-EX). How many total clock cycles are required to execute the following 4-instruction sequence?\n1. `LW R1, 0(R2)`\n2. `ADD R3, R1, R4`\n3. `SUB R5, R3, R6`\n4. `OR R7, R5, R8`',
    [9, 9],
    'LW produces R1 at the end of MEM, while ADD needs R1 at the start of EX, causing 1 load-use stall cycle. ADD->SUB and SUB->OR are resolved without stalls via EX-to-EX forwarding. Total cycles = 5 + (4 − 1) + 1 stall = 9 cycles.',
  ),

  // 5. Programming and Data Structures (3 x 2m)
  nat(
    'Programming and Data Structures',
    'Programming in C',
    2,
    'What is the output printed by the following C code?',
    [12, 12],
    'Pointer p starts at a[1] (4). `*p++` reads 4 into x and advances p to a[2] (6). `*++p` advances p to a[3] (8) and reads 8 into y. Thus x + y = 4 + 8 = 12.',
    {
      code: `#include <stdio.h>
int main(void) {
    int a[] = {2, 4, 6, 8, 10};
    int *p = a + 1;
    int x = *p++;
    int y = *++p;
    printf("%d", x + y);
    return 0;
}`,
    },
  ),
  mcq(
    'Programming and Data Structures',
    'Recursion',
    2,
    'What is the return value of `solve(4, 3)` in the following C function?',
    ['15', '20', '35', '56'],
    2,
    String.raw`The recurrence ` + '`solve(n, k) = solve(n-1, k) + solve(n, k-1)` with base cases `solve(0, k)=1` and `solve(n, 0)=1`' + String.raw` computes $\binom{n+k}{k}$. Thus $\text{solve}(4, 3) = \binom{7}{3} = 35$. Hence the correct option is C.`,
    {
      code: `int solve(int n, int k) {
    if (n == 0 || k == 0) return 1;
    return solve(n - 1, k) + solve(n, k - 1);
}`,
    },
  ),
  msq(
    'Programming and Data Structures',
    'Arrays, Stacks and Queues',
    2,
    'Which of the following permutations of `1, 2, 3, 4, 5` CANNOT be obtained as the output of a single stack when elements are pushed in the order `1, 2, 3, 4, 5`?',
    ['3, 4, 2, 1, 5', '4, 5, 2, 3, 1', '2, 5, 3, 4, 1', '1, 4, 3, 5, 2'],
    [1, 2],
    'A permutation is stack-obtainable iff it avoids the 312 pattern (no i < j < k with k output before i before j). In B (4, 5, 2, 3, 1), 4 is output before 2 before 3 (impossible). In C (2, 5, 3, 4, 1), 5 is output before 3 before 4 (impossible). A and D are valid. Hence the correct options are B and C.',
  ),

  // 6. Algorithms (3 x 2m)
  nat(
    'Algorithms',
    'Dynamic Programming',
    2,
    'Given two strings `X = "ABCBDAB"` and `Y = "BDCABA"`, what is the length of their Longest Common Subsequence (LCS)?',
    [4, 4],
    'One longest common subsequence is `"BCBA"` (or `"BDAB"`), which has length 4.',
  ),
  mcq(
    'Algorithms',
    'Greedy Method',
    2,
    'Six files have sizes 5, 10, 15, 20, 25, and 30 MB. Using optimal two-way merge (Huffman-like merge tree), what is the minimum total number of megabytes moved (total merge cost)?',
    ['205', '235', '255', '275'],
    2,
    'Merge (5,10)->15 (cost 15); remaining {15,15,20,25,30}. Merge (15,15)->30 (cost 30); remaining {20,25,30,30}. Merge (20,25)->45 (cost 45); remaining {30,30,45}. Merge (30,30)->60 (cost 60); remaining {45,60}. Merge (45,60)->105 (cost 105). Total cost = 15 + 30 + 45 + 60 + 105 = 255. Hence the correct option is C.',
  ),
  msq(
    'Algorithms',
    'Hashing',
    2,
    'Which of the following statements about open-addressed hash tables and universal hashing are TRUE?',
    [
      'Double hashing eliminates primary clustering and secondary clustering.',
      'Quadratic probing eliminates primary clustering but can suffer from secondary clustering.',
      String.raw`In universal hashing, the expected number of collisions for a key $x$ with $n$ stored keys in a table of size $m$ is at most $n/m$.`,
      String.raw`Linear probing has $O(1)$ worst-case search time for any load factor $\alpha < 1$.`,
    ],
    [0, 1, 2],
    String.raw`Double hashing uses a second hash for step size, eliminating both primary and secondary clustering (A). Quadratic probing avoids primary clustering but keys with the same initial hash follow the same probe sequence (B). Universal hashing guarantees collision probability $\le 1/m$, so expected collisions $\le n/m$ (C). Worst-case search in linear probing is $\Theta(n)$ (D false). Hence the correct options are A, B and C.`,
  ),

  // 7. Theory of Computation (3 x 2m)
  msq(
    'Theory of Computation',
    'Context-Free Languages and Pushdown Automata',
    2,
    String.raw`Which of the following languages over $\Sigma = \{a, b, c\}$ are context-free?`,
    [
      String.raw`$\{a^i b^j c^k \mid i = j \text{ or } j = k\}$`,
      String.raw`$\{a^i b^j c^k \mid i = j \text{ and } j = k\}$`,
      String.raw`$\{a^n b^m c^m d^n \mid n, m \ge 0\}$`,
      String.raw`$\{w \in \{a, b\}^* \mid n_a(w) = 2 n_b(w)\}$`,
    ],
    [0, 2, 3],
    String.raw`Language A is the union of two CFLs, hence CFL. Language B is $\{a^n b^n c^n\}$, which is not CFL. Language C is accepted by a PDA matching $a^n$ with $d^n$ and $b^m$ with $c^m$ in nested order, hence CFL. Language D is accepted by a deterministic PDA using stack counters, hence CFL. Hence the correct options are A, C and D.`,
  ),
  nat(
    'Theory of Computation',
    'Regular Languages and Finite Automata',
    2,
    String.raw`Let $L = \{w \in \{0, 1\}^* \mid w \text{ does not contain } 011 \text{ as a substring}\}$. What is the minimum number of states in a DFA accepting $L$?`,
    [4, 4],
    String.raw`States track the longest suffix of the input that is a prefix of "011": $\varepsilon$ (start, accepting), 0 (accepting), 01 (accepting), and 011 (dead/trap, non-accepting). All 4 states are pairwise distinguishable. The answer is 4.`,
  ),
  mcq(
    'Theory of Computation',
    'Turing Machines and Undecidability',
    2,
    String.raw`If $L$ is a recursively enumerable (RE) language and $F$ is a finite language, which of the following statements is ALWAYS true?`,
    [
      String.raw`$L \cup F$ is decidable.`,
      String.raw`$L \cap F$ is decidable.`,
      String.raw`$\overline{L} \cup F$ is recursively enumerable.`,
      String.raw`$L \setminus F$ is decidable.`,
    ],
    1,
    String.raw`Since $F$ is finite, $L \cap F$ is also finite. Every finite language is regular and therefore decidable (recursive). The other three statements can fail when $L$ is RE but not recursive. Hence the correct option is B.`,
  ),

  // 8. Compiler Design (2 x 2m)
  mcq(
    'Compiler Design',
    'Parsing',
    2,
    String.raw`Consider the augmented grammar:
$S' \to S$
$S \to L = R \mid R$
$L \to *R \mid \text{id}$
$R \to L$
Which of the following is true about this grammar?`,
    [
      'It is LL(1) and SLR(1).',
      'It is not SLR(1), but it is LALR(1).',
      'It is not LALR(1), but it is LR(1).',
      'It is ambiguous.',
    ],
    1,
    String.raw`The item $S \to L \cdot = R$ and $R \to L \cdot$ create a shift-reduce conflict in SLR(1) because ` + '`=`' + String.raw` is in FOLLOW($R$). In LALR(1), the lookahead for $R \to L \cdot$ in that state is only ` + '`end-of-input`' + String.raw` (not ` + '`=`' + '), so it is LALR(1) and LR(1). Hence the correct option is B.',
  ),
  msq(
    'Compiler Design',
    'Runtime Environments',
    2,
    'Which of the following statements about activation records and parameter passing are TRUE?',
    [
      'In static scoping, the access link (static link) in an activation record points to the activation record of the lexically enclosing procedure.',
      'Dynamic scoping resolves non-local names using the control link (dynamic link) chain on the runtime stack.',
      'Under call-by-value-result, aliasing between two parameters can produce different results than call-by-reference.',
      'Tail-call optimization requires allocating a new stack frame for every recursive call.',
    ],
    [0, 1, 2],
    'Static links follow lexical nesting (A), dynamic links follow the call stack (B), and call-by-value-result copies values back at return, diverging from call-by-reference when arguments are aliased (C). Tail-call optimization reuses the current stack frame (D false). Hence the correct options are A, B and C.',
  ),

  // 9. Operating Systems (3 x 2m)
  nat(
    'Operating Systems',
    'Virtual Memory',
    2,
    'A system has a 40-bit virtual address space, 16 KB pages, and 8-byte page table entries. A multi-level paging scheme is used such that each page table level fits within a single page frame. How many levels of page tables are required?',
    [3, 3],
    String.raw`Page size = 16 KB = $2^{14}$ bytes, giving a 14-bit offset. Virtual page number = $40 - 14 = 26$ bits. Entries per page = $2^{14} / 8 = 2^{11}$, giving 11 bits per level. With 2 levels, $22 < 26$; with 3 levels, $33 \ge 26$. Thus 3 levels are required.`,
  ),
  mcq(
    'Operating Systems',
    'Synchronization and Deadlock',
    2,
    String.raw`Three processes P1, P2, P3 execute concurrently using counting semaphores $S_1 = 1$, $S_2 = 0$, $S_3 = 0$:
- P1: ` + '`while(1) { wait(S1); print("A"); signal(S2); }`' + String.raw`
- P2: ` + '`while(1) { wait(S2); print("B"); signal(S3); }`' + String.raw`
- P3: ` + '`while(1) { wait(S3); print("C"); signal(S1); }`' + String.raw`
If each process runs for 2 iterations, what is the exact output string printed?`,
    ['ABCABC', 'AABBCC', 'ACBACB', 'Arbitrary interleaving of A, B, C'],
    0,
    String.raw`Only $S_1 = 1$ initially, so P1 runs first, printing A and signaling $S_2$. Then P2 prints B and signals $S_3$. Then P3 prints C and signals $S_1$. This repeats strictly in order: ABCABC. Hence the correct option is A.`,
  ),
  nat(
    'Operating Systems',
    'File Systems and I/O',
    2,
    'A Unix-like inode has 10 direct block pointers, 1 single-indirect pointer, 1 double-indirect pointer, and 1 triple-indirect pointer. If each disk block is 4 KB and each block pointer is 4 bytes, what is the maximum file size (in GB, rounded to the nearest integer) supported by the double-indirect pointer ALONE?',
    [4, 4],
    String.raw`Pointers per block = 4 KB / 4 B = 1024 = $2^{10}$. Double-indirect pointer addresses $2^{10} \times 2^{10} = 2^{20}$ data blocks. Size = $2^{20} \times 4$ KB = $2^{20} \times 2^{12}$ bytes = $2^{32}$ bytes = 4 GB.`,
  ),

  // 10. Databases (3 x 2m)
  nat(
    'Databases',
    'File Organization and Indexing',
    2,
    'A B+-tree index is built on a search key of size 12 bytes. Disk block size is 1024 bytes, block pointer size is 8 bytes, and record pointer size is 10 bytes. What is the maximum order (maximum number of block pointers) $p$ of an internal node?',
    [51, 51],
    String.raw`For an internal node of order $p$: $p \times 8 + (p - 1) \times 12 \le 1024 \implies 20p - 12 \le 1024 \implies 20p \le 1036 \implies p \le 51.8$. The maximum integer order is $p = 51$.`,
  ),
  mcq(
    'Databases',
    'SQL',
    2,
    'Consider a table `Emp(empId, deptId, salary)` with 100 rows across 5 departments. What does the following SQL query return?\n```sql\nSELECT e1.deptId\nFROM Emp e1\nWHERE e1.salary > ALL (\n    SELECT e2.salary FROM Emp e2 WHERE e2.deptId = e1.deptId\n);\n```',
    [
      'Departments whose average salary exceeds the company average',
      'The highest-paid employee in each department',
      'An empty result set (0 rows)',
      'All departments except the one with the lowest salary',
    ],
    2,
    'For every row e1, the correlated subquery includes e1 itself (since e1.deptId = e1.deptId), so e1.salary > ALL (...) requires e1.salary > e1.salary, which is never true (whether salaries are non-NULL or NULL, where > ALL yields UNKNOWN). Thus it returns 0 rows. Hence the correct option is C.',
  ),
  msq(
    'Databases',
    'Relational Model and Algebra',
    2,
    String.raw`Let $R(A, B)$ and $S(B, C)$ be two relations with $r$ and $s$ tuples respectively ($r > 0, s > 0$). Which of the following statements about the natural join $R \bowtie S$ are ALWAYS true?`,
    [
      String.raw`The number of tuples in $R \bowtie S$ is at most $r \cdot s$.`,
      String.raw`If $B$ is a primary key of $S$ and a non-null foreign key in $R$ referencing $S$, then $|R \bowtie S| = r$.`,
      String.raw`The number of tuples in $R \bowtie S$ is always at least $\min(r, s)$.`,
      String.raw`If $R$ and $S$ have no matching $B$ values, then $|R \bowtie S| = 0$.`,
    ],
    [0, 1, 3],
    String.raw`Natural join is a subset of the Cartesian product, so $|R \bowtie S| \le r \cdot s$ (A). If $B$ in $R$ is a non-null foreign key referencing primary key $B$ of $S$, every tuple of $R$ matches 1 tuple of $S$ (B). Disjoint $B$-values yield 0 tuples (D), which also disproves C. Hence the correct options are A, B and D.`,
  ),

  // 11. Computer Networks (3 x 2m)
  nat(
    'Computer Networks',
    'Transport Layer',
    2,
    'A TCP connection uses a 1 KB Maximum Segment Size (MSS) and currently has a congestion window (`cwnd`) of 32 KB when a timeout occurs. Assuming slow start threshold (`ssthresh`) is updated as per TCP Tahoe/Reno on timeout, how many RTTs (after the timeout) will it take for `cwnd` to reach 16 KB again?',
    [4, 4],
    'On timeout, ssthresh becomes 32 / 2 = 16 KB and cwnd resets to 1 MSS = 1 KB. In slow start, cwnd doubles every RTT: RTT 1 -> 2 KB, RTT 2 -> 4 KB, RTT 3 -> 8 KB, RTT 4 -> 16 KB. Thus it takes 4 RTTs.',
  ),
  nat(
    'Computer Networks',
    'Data Link and MAC',
    2,
    'A Go-Back-N ARQ protocol operates over a 2 Mbps link with a one-way propagation delay of 20 ms. Each data frame is 1000 bytes long, and ACK frames are negligible in size. What is the maximum link utilization (as a percentage, rounded to two decimal places) if the sender window size is 7?',
    [63.63, 63.65],
    String.raw`Transmission time $T_t = (1000 \times 8) / (2 \times 10^6) = 4$ ms. Round-trip propagation time $2 T_p = 40$ ms. Ratio $a = T_p / T_t = 20 / 4 = 5$, so $1 + 2a = 11$. Maximum utilization $U = \min(1, W / (1 + 2a)) = 7 / 11 \approx 63.64\%$.`,
  ),
  mcq(
    'Computer Networks',
    'Network Security',
    2,
    String.raw`In RSA, suppose the prime factors are $p = 7$ and $q = 11$, and the public exponent is $e = 13$. What is the private exponent $d$ ($1 < d < \phi(n)$)?`,
    ['17', '27', '37', '47'],
    2,
    String.raw`$n = 77$, $\phi(n) = (7-1)(11-1) = 60$. We need $13d \equiv 1 \pmod{60}$. Testing $d = 37$: $13 \times 37 = 481 = 8 \times 60 + 1 \equiv 1 \pmod{60}$. Hence the correct option is C.`,
  ),
];
