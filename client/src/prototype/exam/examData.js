/**
 * PROTOTYPE · SAMPLE DATA
 * Original sample questions written only to test the exam layout (maths rendering, code blocks,
 * the three question types). They are NOT real GATE questions and carry NO answer keys,
 * mirroring the "student view" the real API will return. Delete this folder in Phase 3/4.
 */
export const sampleExam = {
  title: 'GATE CSE Mock Test 01 (sample)',
  subtitle: 'Layout preview, not a real test',
  durationMinutes: 180,
  candidate: { name: 'Aarav Sharma', rollNo: 'SAMPLE-0001' },
  sections: [
    { id: 'ga', name: 'General Aptitude' },
    { id: 'cs', name: 'Computer Science and Information Technology' },
  ],
  questions: [
    {
      id: 'q1',
      sectionId: 'ga',
      type: 'MCQ',
      marks: 1,
      negativeMarks: 1 / 3,
      statement: 'Choose the word that is most nearly OPPOSITE in meaning to "ephemeral".',
      options: [
        { key: 'A', text: 'Enduring' },
        { key: 'B', text: 'Brief' },
        { key: 'C', text: 'Fragile' },
        { key: 'D', text: 'Vivid' },
      ],
    },
    {
      id: 'q2',
      sectionId: 'ga',
      type: 'MCQ',
      marks: 1,
      negativeMarks: 1 / 3,
      statement:
        'A train 120 m long passes a signal pole in 6 seconds. At the same speed, how long will it take to completely cross a platform 180 m long?',
      options: [
        { key: 'A', text: '9 seconds' },
        { key: 'B', text: '12 seconds' },
        { key: 'C', text: '15 seconds' },
        { key: 'D', text: '18 seconds' },
      ],
    },
    {
      id: 'q3',
      sectionId: 'ga',
      type: 'NAT',
      marks: 2,
      negativeMarks: 0,
      statement: String.raw`If $3x + 2y = 18$ and $x - y = 1$, the value of $xy$ is ______.`,
    },
    {
      id: 'q4',
      sectionId: 'cs',
      type: 'MCQ',
      marks: 1,
      negativeMarks: 1 / 3,
      statement: String.raw`The running time of an algorithm satisfies the recurrence $T(n) = 2T(n/2) + n$ with $T(1) = 1$. Which of the following gives its asymptotic running time?`,
      options: [
        { key: 'A', text: String.raw`$\Theta(n)$` },
        { key: 'B', text: String.raw`$\Theta(n \log n)$` },
        { key: 'C', text: String.raw`$\Theta(n^2)$` },
        { key: 'D', text: String.raw`$\Theta(\log n)$` },
      ],
    },
    {
      id: 'q5',
      sectionId: 'cs',
      type: 'MSQ',
      marks: 2,
      negativeMarks: 0,
      statement: String.raw`Let $G$ be a simple undirected graph with $n \ge 3$ vertices. Which of the following statements are TRUE?`,
      options: [
        { key: 'A', text: String.raw`If $G$ is a tree, then $G$ has exactly $n - 1$ edges.` },
        { key: 'B', text: String.raw`Every connected graph $G$ has a Hamiltonian cycle.` },
        { key: 'C', text: String.raw`If $G$ is connected and has more than $n - 1$ edges, then $G$ contains a cycle.` },
        { key: 'D', text: 'Every bipartite graph is a tree.' },
      ],
    },
    {
      id: 'q6',
      sectionId: 'cs',
      type: 'NAT',
      marks: 2,
      negativeMarks: 0,
      statement:
        'A direct-mapped cache has a capacity of 64 KB and a block size of 32 bytes. The number of bits in the index field of a memory address is ______.',
    },
    {
      id: 'q7',
      sectionId: 'cs',
      type: 'MCQ',
      marks: 2,
      negativeMarks: 2 / 3,
      statement: 'Consider the following C function. What value does f(5) return?',
      code: `int f(int n) {
    if (n <= 1)
        return 1;
    return f(n - 1) + f(n - 2);
}`,
      options: [
        { key: 'A', text: '5' },
        { key: 'B', text: '8' },
        { key: 'C', text: '13' },
        { key: 'D', text: '21' },
      ],
    },
    {
      id: 'q8',
      sectionId: 'cs',
      type: 'MSQ',
      marks: 2,
      negativeMarks: 0,
      statement: 'Which of the following statements about database transactions are correct?',
      options: [
        { key: 'A', text: 'Atomicity guarantees that either all operations of a transaction are applied or none are.' },
        { key: 'B', text: 'Isolation guarantees that a transaction never needs to be rolled back.' },
        { key: 'C', text: 'Durability means that committed changes survive a system crash.' },
        { key: 'D', text: 'Consistency means every transaction runs in constant time.' },
      ],
    },
    {
      id: 'q9',
      sectionId: 'cs',
      type: 'NAT',
      marks: 1,
      negativeMarks: 0,
      statement:
        'A 1250-byte frame is sent over a 10 Mbps link whose propagation delay is 20 ms. The transmission time of the frame, in milliseconds, is ______.',
    },
    {
      id: 'q10',
      sectionId: 'cs',
      type: 'MCQ',
      marks: 2,
      negativeMarks: 2 / 3,
      statement: String.raw`Which of the following languages over the alphabet $\{a, b\}$ is regular?`,
      options: [
        { key: 'A', text: String.raw`$\{a^n b^n \mid n \ge 0\}$` },
        { key: 'B', text: String.raw`$\{ww \mid w \in \{a, b\}^*\}$` },
        { key: 'C', text: String.raw`$\{a^n b^m \mid n, m \ge 0\}$` },
        { key: 'D', text: String.raw`$\{a^{n^2} \mid n \ge 0\}$` },
      ],
    },
  ],
};
