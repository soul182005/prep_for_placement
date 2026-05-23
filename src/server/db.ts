import fs from "fs";
import path from "path";
import {
  User,
  Resume,
  AptitudeQuestion,
  AptitudeAttempt,
  CodingProblem,
  CodingSession,
  InterviewSession,
  SkillScore
} from "../types";
import { db as fdb, handleFirestoreError, OperationType, doc, setDoc, deleteDoc } from "./firebase";

function safeFirestoreWrite(path: string, operation: OperationType, promise: Promise<any>) {
  promise.catch(err => {
    try {
      handleFirestoreError(err, operation, path);
    } catch (nestedErr) {
      console.error("Critical Firestore write failure logged:", nestedErr);
    }
  });
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "smart_db.json");

interface DatabaseSchema {
  users: User[];
  passwordHashes: Record<string, string>; // userId -> passwordHash
  resumes: Resume[];
  aptitudeQuestions: AptitudeQuestion[];
  aptitudeAttempts: AptitudeAttempt[];
  codingProblems: CodingProblem[];
  codingSessions: CodingSession[];
  interviewSessions: InterviewSession[];
  skillScores: SkillScore[];
}

// Robust seed data
const SEED_APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  // QUANT - EASY
  {
    id: "aq_quant_1",
    category: "quant",
    difficulty: "easy",
    questionText: "If a company increases its production by 20% in Year 1 and decreases it by 10% in Year 2, what is the net cumulative percentage change from the start?",
    options: ["Increase of 10%", "Increase of 8%", "Increase of 12%", "Decrease of 2%"],
    correctIndex: 1,
    explanation: "Let starting production be 100. Year 1 production = 100 * 1.20 = 120. Year 2 production = 120 * 0.90 = 108. Net change is 108 - 100 = 8% increase."
  },
  {
    id: "aq_quant_4",
    category: "quant",
    difficulty: "easy",
    questionText: "What is the ratio of 400ml to 1.6 liters?",
    options: ["1 : 4", "1 : 40", "4 : 1", "2 : 5"],
    correctIndex: 0,
    explanation: "1.6 liters is equivalent to 1600ml. The ratio of 400ml to 1600ml is 400 / 1600 = 1 / 4, which is 1 : 4."
  },
  {
    id: "aq_quant_5",
    category: "quant",
    difficulty: "easy",
    questionText: "A mobile phone purchased for $500 is sold for $425. What is the loss percentage?",
    options: ["15%", "12.5%", "20%", "10%"],
    correctIndex: 0,
    explanation: "Loss = Cost Price - Selling Price = $500 - $425 = $75. Loss Percentage = (Loss / Cost Price) * 100 = (75 / 500) * 100 = 15%."
  },
  {
    id: "aq_quant_6",
    category: "quant",
    difficulty: "easy",
    questionText: "The average of five consecutive odd numbers is 23. What is the greatest of these numbers?",
    options: ["23", "25", "27", "29"],
    correctIndex: 2,
    explanation: "The average of consecutive odd numbers is always the middle number. So the numbers are 19, 21, 23, 25, 27. The greatest of these is 27."
  },

  // QUANT - MEDIUM
  {
    id: "aq_quant_2",
    category: "quant",
    difficulty: "medium",
    questionText: "A train running at speed of 60 km/hr crosses a platform of length 200m in 24 seconds. What is the length of the train?",
    options: ["150 meters", "200 meters", "250 meters", "300 meters"],
    correctIndex: 1,
    explanation: "Speed of train = 60 km/hr = 60 * 5/18 = 50/3 m/s. Total distance covered in 24s = Speed * Time = (50/3) * 24 = 400 meters. Total distance = Train length + Platform length. Train length = 400 - platform length = 400 - 200 = 200m."
  },
  {
    id: "aq_quant_7",
    category: "quant",
    difficulty: "medium",
    questionText: "A can do a piece of work in 12 days, and B can do it in 18 days. If they work together for 4 days, what fraction of work is left?",
    options: ["1/3", "4/9", "5/9", "2/3"],
    correctIndex: 1,
    explanation: "A's 1-day work = 1/12. B's 1-day work = 1/18. Together 1-day work = 1/12 + 1/18 = 5/36. In 4 days, work completed = 4 * 5/36 = 20/36 = 5/9. Work remaining = 1 - 5/9 = 4/9."
  },
  {
    id: "aq_quant_8",
    category: "quant",
    difficulty: "medium",
    questionText: "Two pipes A and B can fill a tank in 15 minutes and 20 minutes respectively. If both are opened together, how long will it take to fill the tank?",
    options: ["7.5 minutes", "8.57 minutes", "10.33 minutes", "12 minutes"],
    correctIndex: 1,
    explanation: "Combined filling rate per minute = 1/15 + 1/20 = (4+3)/60 = 7/60. Thus, total time to fill = 60 / 7 ≈ 8.57 minutes."
  },
  {
    id: "aq_quant_9",
    category: "quant",
    difficulty: "medium",
    questionText: "At what price should a product worth $160 be marked so that after giving a discount of 20%, a profit of 10% is still made?",
    options: ["$180", "$200", "$220", "$240"],
    correctIndex: 2,
    explanation: "Selling Price = Cost Price * (1 + Profit%) = 160 * 1.10 = $176. Marked Price * (1 - Discount%) = Selling Price. Marked Price * 0.80 = 176 => Marked Price = 176 / 0.80 = $220."
  },

  // QUANT - HARD
  {
    id: "aq_quant_3",
    category: "quant",
    difficulty: "hard",
    questionText: "A box contains 5 red balls, 4 blue balls, and 3 green balls. If 3 balls are drawn at random without replacement, what is the probability that they are of different colors?",
    options: ["3/11", "6/11", "9/22", "3/22"],
    correctIndex: 0,
    explanation: "Total balls = 12. Ways to pick 3 balls = 12C3 = (12*11*10)/(3*2*1) = 220. Ways to draw 1 ball of each color = 5 * 4 * 3 = 60. Probability = 60 / 220 = 3/11."
  },
  {
    id: "aq_quant_10",
    category: "quant",
    difficulty: "hard",
    questionText: "The difference between compound interest (compounded annually) and simple interest on a sum of money for 2 years at 15% per annum is $180. What is the principal sum of money?",
    options: ["$6,000", "$8,000", "$10,000", "$12,000"],
    correctIndex: 1,
    explanation: "For 2 years, the difference between compound interest and simple interest is CI - SI = P * (R/100)^2. Here, 180 = P * (15/100)^2 => 180 = P * (225/10000) => P = (180 * 10000) / 225 = 8000. So the principal sum is $8,000."
  },
  {
    id: "aq_quant_11",
    category: "quant",
    difficulty: "hard",
    questionText: "How many positive integer solutions exist for the equation 3x + 4y = 120?",
    options: ["9", "8", "10", "11"],
    correctIndex: 0,
    explanation: "For positive integer solutions, x > 0 and y > 0. From 3x + 4y = 120 => 3x = 120 - 4y => 3x = 4(30 - y). Since 3 and 4 are co-prime, (30 - y) must be divisible by 3, which implies y must be a multiple of 3. Also, since x > 0, 30 - y > 0 => y < 30. The multiples of 3 less than 30 are 3, 6, 9, 12, 15, 18, 21, 24, and 27. This gives exactly 9 positive integer solutions."
  },
  {
    id: "aq_quant_12",
    category: "quant",
    difficulty: "hard",
    questionText: "A mixture of 40 liters of milk and water contains 10% water. How much water must be added to make it a 20% water mixture?",
    options: ["4 liters", "5 liters", "6 liters", "8 liters"],
    correctIndex: 1,
    explanation: "Initial water = 10% of 40 = 4 liters. Milk = 36 liters. Let x liters of water be added. Ratio of water to total = (4 + x) / (40 + x) = 20% = 1/5 => 5(4 + x) = 40 + x => 20 + 5x = 40 + x => 4x = 20 => x = 5 liters."
  },

  // LOGICAL - EASY
  {
    id: "aq_logic_1",
    category: "logical",
    difficulty: "easy",
    questionText: "Which number fits next in the series: 3, 7, 15, 31, 63, ...?",
    options: ["94", "127", "125", "128"],
    correctIndex: 1,
    explanation: "The pattern is 2x + 1. 3*2+1=7, 7*2+1=15, 15*2+1=31, 31*2+1=63, 63*2+1 = 127."
  },
  {
    id: "aq_logic_4",
    category: "logical",
    difficulty: "easy",
    questionText: "If 'CAT' is coded as 24 and 'SAD' is coded as 24, then what is 'SHE' coded as?",
    options: ["32", "37", "30", "34"],
    correctIndex: 0,
    explanation: "The code for each word is the sum of the alphabetical positions of its letters: C(3) + A(1) + T(20) = 24. S(19) + A(1) + D(4) = 24. Therefore, SHE = S(19) + H(8) + E(5) = 32."
  },
  {
    id: "aq_logic_5",
    category: "logical",
    difficulty: "easy",
    questionText: "Pointing to a photograph of a boy, a man says, 'He is the only son of my father's only son.' If the man has no siblings, how is the man related to the boy?",
    options: ["Brother", "Father", "Uncle", "Son"],
    correctIndex: 1,
    explanation: "Since the man has no siblings, 'my father's only son' is the man himself. Thus, the photograph is of the man's 'only son'. Therefore, the man is the boy's father."
  },
  {
    id: "aq_logic_6",
    category: "logical",
    difficulty: "easy",
    questionText: "Choose the odd one out from the options list below:",
    options: ["Oxygen", "Nitrogen", "Argon", "Water"],
    correctIndex: 3,
    explanation: "Oxygen, Nitrogen, and Argon are chemical elements and gases. Water is a compound (H2O) and a liquid at room temperature."
  },

  // LOGICAL - MEDIUM
  {
    id: "aq_logic_2",
    category: "logical",
    difficulty: "medium",
    questionText: "If 'COGNITIVE' is coded as 'FMJQHYLWF' by shifting each letter forward by 3 places, how is 'BINARY' coded under the same rules?",
    options: ["ELQDUB", "ELCCUV", "EMDDTV", "EMCCUV"],
    correctIndex: 0,
    explanation: "Each letter is shifted forward by 3 places in the alphabet: B (+3) -> E, I (+3) -> L, N (+3) -> Q, A (+3) -> D, R (+3) -> U, Y (+3) -> B. Thus, 'BINARY' is coded as 'ELQDUB'."
  },
  {
    id: "aq_logic_7",
    category: "logical",
    difficulty: "medium",
    questionText: "A man walks 6 km North, turns right and walks 4 km. He then turns right again and walks 9 km. How far is he from his starting point?",
    options: ["5 km", "7 km", "13 km", "10 km"],
    correctIndex: 0,
    explanation: "Using a Cartesian coordinates grid starting at (0,0): walking 6 km North reaches (0,6). Turning right and walking 4 km reaches (4,6). Turning right (South) and walking 9 km reaches (4,-3). The straight-line distance to (0,0) is √(4^2 + (-3)^2) = √(16+9) = √25 = 5 km."
  },
  {
    id: "aq_logic_8",
    category: "logical",
    difficulty: "medium",
    questionText: "Given the statements: (1) All poets are daydreamers. (2) Some artists are poets. Choose the conclusion(s) that logically follow:",
    options: [
      "All artists are daydreamers.",
      "Some artists are daydreamers.",
      "No artist is a daydreamer.",
      "None of the above conclusions match."
    ],
    correctIndex: 1,
    explanation: "Since 'Some artists are poets' and 'All poets are daydreamers', the artists who are poets must also be daydreamers. Therefore, 'Some artists are daydreamers' must logically follow."
  },
  {
    id: "aq_logic_9",
    category: "logical",
    difficulty: "medium",
    questionText: "Look at this series: U32, V29, __, X23, Y20... What should fill the blank space?",
    options: ["W26", "W25", "W27", "V26"],
    correctIndex: 0,
    explanation: "The alphabetical letters increase by 1 (U, V, W, X, Y) and the numerals decrease by 3 (32, 29, 26, 23, 20). So the missing term is W26."
  },

  // LOGICAL - HARD
  {
    id: "aq_logic_3",
    category: "logical",
    difficulty: "hard",
    questionText: "Six people (A, B, C, D, E, F) sit in a straight line facing north. B is exactly between F and D. E is second to the right of D. A is at the extreme left end. C is adjacent to F. Who is sitting at the extreme right end?",
    options: ["E", "C", "B", "F"],
    correctIndex: 0,
    explanation: "Placing A on left: 1: A. Since B is between F and D, and E is 2nd to right of D, let's try order: A, C, F, B, D, E. This perfectly satisfies: B between F and D, E is second right of D, C is adjacent to F. E is at the extreme right end."
  },
  {
    id: "aq_logic_10",
    category: "logical",
    difficulty: "hard",
    questionText: "In a family of six (P, Q, R, S, T, U), T is the daughter of S. Q is the husband of R. P is the brother of U. S is the father of P. R is the daughter-in-law of S. How is U related to S?",
    options: ["Son", "Daughter", "Grandson", "Son or Daughter"],
    correctIndex: 3,
    explanation: "S is the father of P, T is S's daughter. P is P, T is direct. Since Q is the husband of R, and R is the daughter-in-law of S, Q is S's son. P is the brother of U. This means P, T, Q, and U are siblings, all children of S. Since we know P and Q are boys and T is a girl, but the gender of U is not stated, U can be either a Son or a Daughter."
  },
  {
    id: "aq_logic_11",
    category: "logical",
    difficulty: "hard",
    questionText: "Three boxes contain fruits: Box 1 contains apples, Box 2 contains oranges, and Box 3 contains a mix. Every box is mislabeled. If you can pick exactly 1 fruit from exactly 1 box, which box should you pick from to correctly label all three boxes?",
    options: ["The box labeled Apples", "The box labeled Oranges", "The box labeled Mixed", "It is impossible with 1 pick"],
    correctIndex: 2,
    explanation: "Since all boxes are mislabeled, the 'Mixed' box must contain either only Apples or only Oranges. Pick a fruit from the 'Mixed' box. If it is an Apple, then this box must be the 'Apples' box. Since all are mislabeled, the box labeled 'Oranges' cannot be Oranges and cannot be Apples (since we found it), so it must be 'Mixed', and the box labeled 'Apples' must be 'Oranges'. Thus, picking from the Mixed box resolves everything."
  },
  {
    id: "aq_logic_12",
    category: "logical",
    difficulty: "hard",
    questionText: "If a logical statement 'If it rains, the grass is wet' is true, which of the following contrapositive or logical equivalents must also be true?",
    options: [
      "If it does not rain, the grass is not wet.",
      "If the grass is wet, it rained.",
      "If the grass is not wet, it did not rain.",
      "None of the above"
    ],
    correctIndex: 2,
    explanation: "For any implication p => q, its contrapositive ~q => ~p is logically equivalent. Therefore, the contrapositive 'If the grass is not wet, it did not rain' must be true."
  },

  // VERBAL - EASY
  {
    id: "aq_verbal_1",
    category: "verbal",
    difficulty: "easy",
    questionText: "Choose the word closest in meaning to the capitalized word: ESCHEW",
    options: ["Embrace", "Avoid", "Engage", "Praise"],
    correctIndex: 1,
    explanation: "Eschew means to deliberately avoid using; abstain from."
  },
  {
    id: "aq_verbal_3",
    category: "verbal",
    difficulty: "easy",
    questionText: "Choose the option that best fills the blank: She was ________ in her studies, which is why she scored top marks in all her quants.",
    options: ["diligent", "negligent", "indifferent", "apathetic"],
    correctIndex: 0,
    explanation: "Diligent means showing care and conscientiousness in one's work, which perfectly fits the context of scoring top marks."
  },
  {
    id: "aq_verbal_4",
    category: "verbal",
    difficulty: "easy",
    questionText: "Choose the antonym of the word: CAPRICIOUS",
    options: ["Fickle", "Stable", "Erratic", "Arbitrary"],
    correctIndex: 1,
    explanation: "Capricious means given to sudden and unaccountable changes of mood or behavior. Stable is the exact opposite."
  },
  {
    id: "aq_verbal_5",
    category: "verbal",
    difficulty: "easy",
    questionText: "Identify the preposition that best completes the sentence: The candidate was congratulated ________ her outstanding performance.",
    options: ["for", "on", "at", "about"],
    correctIndex: 1,
    explanation: "The standard idiomatic preposition to use with 'congratulated' is 'on'. So, one is congratulated on an achievement."
  },

  // VERBAL - MEDIUM
  {
    id: "aq_verbal_2",
    category: "verbal",
    difficulty: "medium",
    questionText: "Select the sentence with correct grammatical structure and subject-verb agreement:",
    options: [
      "The board of directors have approved the allocation of quarterly funds.",
      "Neither the engineers nor the project manager are satisfied with the current sprint metrics.",
      "The performance of our primary servers, combined with database replication speeds, are critical.",
      "Every candidate who successfully solves the dynamic programming modules receives an invitation."
    ],
    correctIndex: 3,
    explanation: "Option 4 is correct. 'Every candidate' is singular, so it takes singular verbs 'solves' and 'receives'. Option 1 mistake: 'board' is a collective noun acting as a single unit (requires 'has'). Option 2 mistake: 'manager' is singular (requires 'is'). Option 3 mistake: subject is 'performance' (requires 'is')."
  },
  {
    id: "aq_verbal_6",
    category: "verbal",
    difficulty: "medium",
    questionText: "Identify the correct spelling of the word meaning 'temporary or fleeting':",
    options: ["Ephemeral", "Euphemeral", "Ephemral", "Ephimeral"],
    correctIndex: 0,
    explanation: "The correct spelling is 'Ephemeral', which refers to something lasting for a very short time."
  },
  {
    id: "aq_verbal_7",
    category: "verbal",
    difficulty: "medium",
    questionText: "Choose the phrase that best completes the sentence: Had I known about the changes in the curriculum, I ________ my preparation earlier.",
    options: ["will have started", "should start", "would have started", "had started"],
    correctIndex: 2,
    explanation: "This is a third conditional sentence expressing a hypothetical situation in the past. The structure is 'Had I + past participle, I would have + past participle'."
  },
  {
    id: "aq_verbal_8",
    category: "verbal",
    difficulty: "medium",
    questionText: "Identify the meaning of the idiom: 'To throw a wrench in the works'",
    options: [
      "To assist with repairs",
      "To sabotage or disrupt a project",
      "To introduce high productivity tools",
      "To build a robust mechanism"
    ],
    correctIndex: 1,
    explanation: "To throw a wrench in the works means to cause a sudden disruption or block a plan or activity from proceeding smoothly."
  },

  // VERBAL - HARD
  {
    id: "aq_verbal_9",
    category: "verbal",
    difficulty: "hard",
    questionText: "Read the sentence: 'The manager’s explanation was so circuitous that it served only to obfuscate the real issues.' What is the meaning of 'obfuscate'?",
    options: ["To clarify", "To simplify", "To confuse or make obscure", "To resolve"],
    correctIndex: 2,
    explanation: "Obfuscate means to make obscure, unclear, or unintelligible. In this context, a circuitous explanation would make the issues harder to understand."
  },
  {
    id: "aq_verbal_10",
    category: "verbal",
    difficulty: "hard",
    questionText: "Which of the following sentences exhibits the most precise and elegant usage of subjunctive mood?",
    options: [
      "If the candidate was to apply today, they will get hired immediately.",
      "It is imperative that the candidate submits their application on time.",
      "The interviewer requested that the applicant write a short essay.",
      "I wish I was preparing for the assessment last week."
    ],
    correctIndex: 2,
    explanation: "Option 3 correctly uses the subjunctive mood 'request that the applicant write' (bare infinitive). Option 2 is incorrect because it uses 'submits' instead of 'submit'. Option 4 should be 'wish I were'. Option 1 should be 'If the candidate were to apply..., they would'."
  },
  {
    id: "aq_verbal_11",
    category: "verbal",
    difficulty: "hard",
    questionText: "Rearrange the following sentences (P, Q, R, S) to form a coherent paragraph:\n(P) Nevertheless, they must be cautiously calibrated to prevent bias.\n(Q) Large Language Models have revolutionized tech recruitment automation.\n(R) Consequently, hiring workflows have become ten times faster.\n(S) They do this by evaluating complex technical resumes in real-time.",
    options: ["Q - S - R - P", "Q - R - S - P", "S - Q - R - P", "Q - S - P - R"],
    correctIndex: 0,
    explanation: "Q introduces the main topic (Large Language Models in recruitment). S explains how they do it (by evaluating complex technical resumes in real-time). R states the consequence of this evaluation (consequently, workflows are 10x faster). P begins with 'Nevertheless' to offer a cautionary qualification to the statement."
  },
  {
    id: "aq_verbal_12",
    category: "verbal",
    difficulty: "hard",
    questionText: "Identify the logical fallacy committed in the argument: 'Our mock interview platform must be highly effective because thousands of software engineering candidates use it every day.'",
    options: ["Ad Hominem", "Bandwagon Fallacy (Ad Populum)", "Red Herring", "Post Hoc Ergo Propter Hoc"],
    correctIndex: 1,
    explanation: "The argument claims that the platform must be effective because it is popular ('thousands use it'). This is a classic Bandwagon Fallacy (Ad Populum), which assumes that something is good, true, or effective just because many people do it."
  },
  // QUANT - ADDITIONS
  {
    id: "aq_quant_13",
    category: "quant",
    difficulty: "medium",
    questionText: "A car travels at 80 km/h for the first 2 hours and 100 km/h for the next 3 hours of its journey. What is the average speed of the car for the entire journey?",
    options: ["90 km/h", "92 km/h", "88 km/h", "94 km/h"],
    correctIndex: 1,
    explanation: "Total distance = (80 * 2) + (100 * 3) = 160 + 300 = 460 km. Total time = 2 + 3 = 5 hours. Average speed = Total Distance / Total Time = 460 / 5 = 92 km/h."
  },
  {
    id: "aq_quant_14",
    category: "quant",
    difficulty: "hard",
    questionText: "In how many ways can the letters of the word 'LEADER' be arranged such that the vowels always come together?",
    options: ["72", "144", "360", "120"],
    correctIndex: 0,
    explanation: "Word is LEADER. Vowels are E, A, E (3 vowels). Consonants are L, D, R (3 consonants). Treating the vowels (E,A,E) as a single unit, we have 4 units to arrange (L, D, R, and [EAE]). These 4 units can be arranged in 4! = 24 ways. The vowels themselves (E, A, E) can be arranged in 3!/2! (since E repeats twice) = 3 ways. Total arrangements = 24 * 3 = 72 ways."
  },
  {
    id: "aq_quant_15",
    category: "quant",
    difficulty: "easy",
    questionText: "A sum of money doubles itself in 10 years at simple interest. What is the rate of interest per annum?",
    options: ["5%", "8%", "10%", "12%"],
    correctIndex: 2,
    explanation: "Let principal be P. It doubles, so Amount = 2P, which means Simple Interest (SI) = P. Formula for SI is Principal * Rate * Time / 100. So P = P * R * 10 / 100 => 10R = 100 => R = 10%."
  },
  // LOGICAL - ADDITIONS
  {
    id: "aq_logic_13",
    category: "logical",
    difficulty: "easy",
    questionText: "Find the missing number in the sequence: 10, 20, 31, 43, 56, __",
    options: ["68", "72", "70", "74"],
    correctIndex: 2,
    explanation: "The difference between consecutive numbers increases by 1: 20-10 = 10; 31-20 = 11; 43-31 = 12; 56-43 = 13. Next difference must be 14, so the next term is 56 + 14 = 70."
  },
  {
    id: "aq_logic_14",
    category: "logical",
    difficulty: "medium",
    questionText: "At what angle are the hands of a clock inclined at 4 hours 20 minutes?",
    options: ["10 degrees", "15 degrees", "20 degrees", "0 degrees"],
    correctIndex: 0,
    explanation: "Angle formula: |(30 * H) - (5.5 * M)|. For H=4, M=20: |(30 * 4) - (5.5 * 20)| = |120 - 110| = 10 degrees."
  },
  {
    id: "aq_logic_15",
    category: "logical",
    difficulty: "hard",
    questionText: "In a certain code language: 'sky is blue' is written as 'de ko lo', 'blue and red' is written as 'lo pa ni', and 'roses are red' is written as 'pa te su'. What is the code for 'and' in that language?",
    options: ["pa", "ni", "lo", "de"],
    correctIndex: 1,
    explanation: "Comparing 'sky is blue' and 'blue and red', they share 'blue' and the code 'lo', so 'blue' = 'lo'. Comparing 'blue and red' and 'roses are red', they share 'red' and the code 'pa', so 'red' = 'pa'. Since 'blue and red' corresponds to 'lo pa ni', and 'blue' = 'lo' and 'red' = 'pa', the remaining word 'and' must be coded as 'ni'."
  },
  // VERBAL - ADDITIONS
  {
    id: "aq_verbal_13",
    category: "verbal",
    difficulty: "easy",
    questionText: "Choose the word closest in meaning to the capitalized word: LACONIC",
    options: ["verbose", "brief", "unclear", "joyful"],
    correctIndex: 1,
    explanation: "'Laconic' means using very few words; concise or brief."
  },
  {
    id: "aq_verbal_14",
    category: "verbal",
    difficulty: "medium",
    questionText: "What is the meaning of the idiom: 'To burn the midnight oil'?",
    options: ["To waste electricity", "To work or study late into the night", "To start a fire accidentally", "To cook late at night"],
    correctIndex: 1,
    explanation: "'To burn the midnight oil' is an idiomatic expression that means to sleep late or to read/work/study late into the night."
  },
  {
    id: "aq_verbal_15",
    category: "verbal",
    difficulty: "hard",
    questionText: "Choose the sentence that has NO grammatical or punctuation errors:",
    options: [
      "Each of the candidate are expected to bring their own laptop for the technical round.",
      "None of the developers has completed their assignment on time.",
      "The team, despite having numerous internal conflicts, was able to secure first place.",
      "Whom do you think is going to win the coding championship?"
    ],
    correctIndex: 2,
    explanation: "Option 3 is correct (singular collective subject 'team' takes singular verb 'was'). Option 1 is incorrect because 'Each' is singular and requires 'is expected' and 'his/her'. Option 2 should be 'has completed his/her'. Option 4 should use 'Who' instead of 'Whom' as it's the subject of 'is going'."
  }
];

const SEED_CODING_PROBLEMS: CodingProblem[] = [
  // DSA Problems (1 to 20)
  {
    id: "cp_1",
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "easy",
    topic: "dsa",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    starterCode: JSON.stringify({
      javascript: "function twoSum(nums, target) {\n  // Write your code here\n  return [];\n}",
      python: "def twoSum(nums, target):\n    # Write your code here\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[2,7,11,15], 9", expectedOutput: "[0,1]" },
      { input: "[3,2,4], 6", expectedOutput: "[1,2]" }
    ])
  },
  {
    id: "cp_2",
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    difficulty: "easy",
    topic: "dsa",
    description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    starterCode: JSON.stringify({
      javascript: "function containsDuplicate(nums) {\n  return false;\n}",
      python: "def containsDuplicate(nums):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,1]", expectedOutput: "true" },
      { input: "[1,2,3,4]", expectedOutput: "false" }
    ])
  },
  {
    id: "cp_3",
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    difficulty: "easy",
    topic: "dsa",
    description: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`-th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve.",
    starterCode: JSON.stringify({
      javascript: "function maxProfit(prices) {\n  return 0;\n}",
      python: "def max_profit(prices):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[7,1,5,3,6,4]", expectedOutput: "5" },
      { input: "[7,6,4,3,1]", expectedOutput: "0" }
    ])
  },
  {
    id: "cp_4",
    title: "Merge Sorted Array",
    slug: "merge-sorted-array",
    difficulty: "easy",
    topic: "dsa",
    description: "You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order, and two integers `m` and `n`, representing the number of elements in `nums1` and `nums2` respectively. Merge `nums2` into `nums1` as one sorted array.",
    starterCode: JSON.stringify({
      javascript: "function merge(nums1, m, nums2, n) {\n  // Merge in-place\n}",
      python: "def merge(nums1, m, nums2, n):\n    pass"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,0,0,0], 3, [2,5,6], 3", expectedOutput: "[1,2,2,3,5,6]" }
    ])
  },
  {
    id: "cp_5",
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "easy",
    topic: "dsa",
    description: "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
    starterCode: JSON.stringify({
      javascript: "function reverseList(head) {\n  return null;\n}",
      python: "def reverseList(head):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]" }
    ])
  },
  {
    id: "cp_6",
    title: "Merge Two Sorted Lists",
    slug: "merge-two-sorted-lists",
    difficulty: "easy",
    topic: "dsa",
    description: "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists in a one sorted list and return its head.",
    starterCode: JSON.stringify({
      javascript: "function mergeTwoLists(list1, list2) {\n  return null;\n}",
      python: "def mergeTwoLists(list1, list2):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,4], [1,3,4]", expectedOutput: "[1,1,2,3,4,4]" }
    ])
  },
  {
    id: "cp_7",
    title: "Remove Duplicates from Sorted Array",
    slug: "remove-duplicates-from-sorted-array",
    difficulty: "easy",
    topic: "dsa",
    description: "Given an integer array `nums` sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return the number of unique elements.",
    starterCode: JSON.stringify({
      javascript: "function removeDuplicates(nums) {\n  return 0;\n}",
      python: "def removeDuplicates(nums):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[1,1,2]", expectedOutput: "2" }
    ])
  },
  {
    id: "cp_8",
    title: "Intersection of Two Arrays",
    slug: "intersection-of-two-arrays",
    difficulty: "easy",
    topic: "dsa",
    description: "Given two integer arrays `nums1` and `nums2`, return an array of their intersection. Each element in the result must be unique.",
    starterCode: JSON.stringify({
      javascript: "function intersection(nums1, nums2) {\n  return [];\n}",
      python: "def intersection(nums1, nums2):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,2,1], [2,2]", expectedOutput: "[2]" }
    ])
  },
  {
    id: "cp_9",
    title: "Middle of the Linked List",
    slug: "middle-of-the-linked-list",
    difficulty: "easy",
    topic: "dsa",
    description: "Given the `head` of a singly linked list, return the middle node of the linked list. If there are two middle nodes, return the second middle node.",
    starterCode: JSON.stringify({
      javascript: "function middleNode(head) {\n  return null;\n}",
      python: "def middleNode(head):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,4,5]", expectedOutput: "[3,4,5]" }
    ])
  },
  {
    id: "cp_10",
    title: "Valid Anagram",
    slug: "valid-anagram",
    difficulty: "easy",
    topic: "dsa",
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
    starterCode: JSON.stringify({
      javascript: "function isAnagram(s, t) {\n  return false;\n}",
      python: "def isAnagram(s, t):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"anagram", "nagaram"', expectedOutput: "true" },
      { input: '"rat", "car"', expectedOutput: "false" }
    ])
  },
  {
    id: "cp_11",
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. Solve it in O(n) without using division.",
    starterCode: JSON.stringify({
      javascript: "function productExceptSelf(nums) {\n  return [];\n}",
      python: "def productExceptSelf(nums):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]" }
    ])
  },
  {
    id: "cp_12",
    title: "Top K Frequent Elements",
    slug: "top-k-frequent-elements",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    starterCode: JSON.stringify({
      javascript: "function topKFrequent(nums, k) {\n  return [];\n}",
      python: "def topKFrequent(nums, k):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[1,1,1,2,2,3], 2", expectedOutput: "[1,2]" }
    ])
  },
  {
    id: "cp_13",
    title: "Group Anagrams",
    slug: "group-anagrams",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.",
    starterCode: JSON.stringify({
      javascript: "function groupAnagrams(strs) {\n  return [];\n}",
      python: "def groupAnagrams(strs):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: '["eat","tea","tan","ate","nat","bat"]', expectedOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]' }
    ])
  },
  {
    id: "cp_14",
    title: "3Sum",
    slug: "three-sum",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.",
    starterCode: JSON.stringify({
      javascript: "function threeSum(nums) {\n  return [];\n}",
      python: "def threeSum(nums):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[-1,0,1,2,-1,-4]", expectedOutput: "[[-1,-1,2],[-1,0,1]]" }
    ])
  },
  {
    id: "cp_15",
    title: "LRU Cache",
    slug: "lru-cache",
    difficulty: "medium",
    topic: "dsa",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
    starterCode: JSON.stringify({
      javascript: "class LRUCache {\n  constructor(capacity) {}\n  get(key) { return -1; }\n  put(key, value) {}\n}",
      python: "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        return -1\n    def put(self, key: int, value: int) -> None:\n        pass"
    }),
    testCases: JSON.stringify([
      { input: '["LRUCache", "put", "put", "get"], [2, [1, 1], [2, 2], [1]]', expectedOutput: "[null, null, null, 1]" }
    ])
  },
  {
    id: "cp_16",
    title: "Container With Most Water",
    slug: "container-with-most-water",
    difficulty: "medium",
    topic: "dsa",
    description: "You are given an integer array `height` of length `n`. Find two lines that together with the x-axis form a container, such that the container contains the most water.",
    starterCode: JSON.stringify({
      javascript: "function maxArea(height) {\n  return 0;\n}",
      python: "def maxArea(height):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[1,8,6,2,5,4,8,3,7]", expectedOutput: "49" }
    ])
  },
  {
    id: "cp_17",
    title: "Find First and Last Position",
    slug: "find-first-and-last-position-of-element",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an array of integers `nums` sorted in non-decreasing order, find the starting and ending position of a given `target` value. Solve it in O(log n) complexity.",
    starterCode: JSON.stringify({
      javascript: "function searchRange(nums, target) {\n  return [-1, -1];\n}",
      python: "def searchRange(nums, target):\n    return [-1, -1]"
    }),
    testCases: JSON.stringify([
      { input: "[5,7,7,8,8,10], 8", expectedOutput: "[3,4]" }
    ])
  },
  {
    id: "cp_18",
    title: "Subarray Sum Equals K",
    slug: "subarray-sum-equals-k",
    difficulty: "medium",
    topic: "dsa",
    description: "Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`.",
    starterCode: JSON.stringify({
      javascript: "function subarraySum(nums, k) {\n  return 0;\n}",
      python: "def subarraySum(nums, k):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[1,1,1], 2", expectedOutput: "2" }
    ])
  },
  {
    id: "cp_19",
    title: "Min Stack",
    slug: "min-stack",
    difficulty: "medium",
    topic: "dsa",
    description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time O(1).",
    starterCode: JSON.stringify({
      javascript: "class MinStack {\n  constructor() {}\n  push(val) {}\n  pop() {}\n  top() { return 0; }\n  getMin() { return 0; }\n}",
      python: "class MinStack:\n    def __init__(self):\n        pass\n    def push(self, val: int) -> None:\n        pass\n    def pop(self) -> None:\n        pass\n    def top(self) -> int:\n        return 0\n    def getMin(self) -> int:\n        return 0"
    }),
    testCases: JSON.stringify([
      { input: '["MinStack","push","push","getMin"], [[],[-2],[0],[]]', expectedOutput: "[null,null,null,-2]" }
    ])
  },
  {
    id: "cp_20",
    title: "Linked List Cycle",
    slug: "linked-list-cycle",
    difficulty: "easy",
    topic: "dsa",
    description: "Given `head`, the head of a linked list, determine if the linked list has a cycle in it.",
    starterCode: JSON.stringify({
      javascript: "function hasCycle(head) {\n  return false;\n}",
      python: "def hasCycle(head):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: "[3,2,0,-4] (pos=1)", expectedOutput: "true" }
    ])
  },

  // Algorithms Problems (21 to 40)
  {
    id: "cp_21",
    title: "Binary Search",
    slug: "binary-search",
    difficulty: "easy",
    topic: "algorithms",
    description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.",
    starterCode: JSON.stringify({
      javascript: "function search(nums, target) {\n  return -1;\n}",
      python: "def search(nums, target):\n    return -1"
    }),
    testCases: JSON.stringify([
      { input: "[-1,0,3,5,9,12], 9", expectedOutput: "4" }
    ])
  },
  {
    id: "cp_22",
    title: "Fibonacci Number",
    slug: "fibonacci-number",
    difficulty: "easy",
    topic: "algorithms",
    description: "The Fibonacci numbers, commonly denoted `F(n)` form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. Return `F(n)`.",
    starterCode: JSON.stringify({
      javascript: "function fib(n) {\n  return 0;\n}",
      python: "def fib(n):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "4", expectedOutput: "3" }
    ])
  },
  {
    id: "cp_23",
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    difficulty: "easy",
    topic: "algorithms",
    description: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    starterCode: JSON.stringify({
      javascript: "function climbStairs(n) {\n  return 0;\n}",
      python: "def climbStairs(n):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "3", expectedOutput: "3" }
    ])
  },
  {
    id: "cp_24",
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum (using Kadane's algorithm).",
    starterCode: JSON.stringify({
      javascript: "function maxSubArray(nums) {\n  return 0;\n}",
      python: "def maxSubArray(nums):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" }
    ])
  },
  {
    id: "cp_25",
    title: "Number of Islands",
    slug: "number-of-islands",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given an `m x n` 2D binary grid `grid` which represents a map of '1's (land) and '0's (water), return the number of islands.",
    starterCode: JSON.stringify({
      javascript: "function numIslands(grid) {\n  return 0;\n}",
      python: "def numIslands(grid):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '[["1","1","0"],["1","1","0"],["0","0","0"]]', expectedOutput: "1" }
    ])
  },
  {
    id: "cp_26",
    title: "Clone Graph",
    slug: "clone-graph",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
    starterCode: JSON.stringify({
      javascript: "function cloneGraph(node) {\n  return null;\n}",
      python: "def cloneGraph(node):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[[2,4],[1,3],[2,4],[1,3]]", expectedOutput: "[[2,4],[1,3],[2,4],[1,3]]" }
    ])
  },
  {
    id: "cp_27",
    title: "Course Schedule",
    slug: "course-schedule",
    difficulty: "medium",
    topic: "algorithms",
    description: "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. Given `prerequisites` list, detect if you can finish all courses under acyclic conditions.",
    starterCode: JSON.stringify({
      javascript: "function canFinish(numCourses, prerequisites) {\n  return true;\n}",
      python: "def canFinish(numCourses, prerequisites):\n    return True"
    }),
    testCases: JSON.stringify([
      { input: "2, [[1,0]]", expectedOutput: "true" },
      { input: "2, [[1,0],[0,1]]", expectedOutput: "false" }
    ])
  },
  {
    id: "cp_28",
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    difficulty: "medium",
    topic: "algorithms",
    description: "There is an integer array `nums` sorted in ascending order with distinct values. Pivot-rotated at an unknown index. Search for a `target` value and return its index.",
    starterCode: JSON.stringify({
      javascript: "function search(nums, target) {\n  return -1;\n}",
      python: "def search(nums, target):\n    return -1"
    }),
    testCases: JSON.stringify([
      { input: "[4,5,6,7,0,1,2], 0", expectedOutput: "4" }
    ])
  },
  {
    id: "cp_29",
    title: "Lowest Common Ancestor of BST",
    slug: "lowest-common-ancestor-of-bst",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
    starterCode: JSON.stringify({
      javascript: "function lowestCommonAncestor(root, p, q) {\n  return null;\n}",
      python: "def lowestCommonAncestor(root, p, q):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[6,2,8,0,4,7,9], 2, 8", expectedOutput: "6" }
    ])
  },
  {
    id: "cp_30",
    title: "Binary Tree Level Order Traversal",
    slug: "binary-tree-level-order-traversal",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    starterCode: JSON.stringify({
      javascript: "function levelOrder(root) {\n  return [];\n}",
      python: "def levelOrder(root):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: "[3,9,20,null,null,15,7]", expectedOutput: "[[3],[9,20],[15,7]]" }
    ])
  },
  {
    id: "cp_31",
    title: "Kth Largest Element",
    slug: "kth-largest-element",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given an integer array `nums` and an integer `k`, return the `k`-th largest element in the array. Solve it in O(n) average runtime.",
    starterCode: JSON.stringify({
      javascript: "function findKthLargest(nums, k) {\n  return 0;\n}",
      python: "def findKthLargest(nums, k):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[3,2,1,5,6,4], 2", expectedOutput: "5" }
    ])
  },
  {
    id: "cp_32",
    title: "Edit Distance",
    slug: "edit-distance",
    difficulty: "hard",
    topic: "algorithms",
    description: "Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. Operands are Insert, Delete, and Replace.",
    starterCode: JSON.stringify({
      javascript: "function minDistance(word1, word2) {\n  return 0;\n}",
      python: "def minDistance(word1, word2):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"horse", "ros"', expectedOutput: "3" }
    ])
  },
  {
    id: "cp_33",
    title: "Word Search",
    slug: "word-search",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid using DFS backtracking.",
    starterCode: JSON.stringify({
      javascript: "function exist(board, word) {\n  return false;\n}",
      python: "def exist(board, word):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED"', expectedOutput: "true" }
    ])
  },
  {
    id: "cp_34",
    title: "Longest Common Subsequence",
    slug: "longest-common-subsequence",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.",
    starterCode: JSON.stringify({
      javascript: "function longestCommonSubsequence(text1, text2) {\n  return 0;\n}",
      python: "def longestCommonSubsequence(text1, text2):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"abcde", "ace"', expectedOutput: "3" }
    ])
  },
  {
    id: "cp_35",
    title: "Coin Change",
    slug: "coin-change",
    difficulty: "medium",
    topic: "algorithms",
    description: "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount.",
    starterCode: JSON.stringify({
      javascript: "function coinChange(coins, amount) {\n  return -1;\n}",
      python: "def coinChange(coins, amount):\n    return -1"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,5], 11", expectedOutput: "3" }
    ])
  },
  {
    id: "cp_36",
    title: "House Robber",
    slug: "house-robber",
    difficulty: "medium",
    topic: "algorithms",
    description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. You cannot rob adjacent houses. Return the maximum cash you can secure.",
    starterCode: JSON.stringify({
      javascript: "function rob(nums) {\n  return 0;\n}",
      python: "def rob(nums):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[1,2,3,1]", expectedOutput: "4" }
    ])
  },
  {
    id: "cp_37",
    title: "Jump Game",
    slug: "jump-game",
    difficulty: "medium",
    topic: "algorithms",
    description: "You are given an integer array `nums` where you start at the first index. Each element represents your maximum jump length. Return `true` if you can reach the last index.",
    starterCode: JSON.stringify({
      javascript: "function canJump(nums) {\n  return false;\n}",
      python: "def canJump(nums):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: "[2,3,1,1,4]", expectedOutput: "true" }
    ])
  },
  {
    id: "cp_38",
    title: "Merge k Sorted Lists",
    slug: "merge-k-sorted-lists",
    difficulty: "hard",
    topic: "algorithms",
    description: "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list.",
    starterCode: JSON.stringify({
      javascript: "function mergeKLists(lists) {\n  return null;\n}",
      python: "def mergeKLists(lists):\n    return None"
    }),
    testCases: JSON.stringify([
      { input: "[[1,4,5],[1,3,4],[2,6]]", expectedOutput: "[1,1,2,3,4,4,5,6]" }
    ])
  },
  {
    id: "cp_39",
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "hard",
    topic: "algorithms",
    description: "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
    starterCode: JSON.stringify({
      javascript: "function findMedianSortedArrays(nums1, nums2) {\n  return 0.0;\n}",
      python: "def findMedianSortedArrays(nums1, nums2):\n    return 0.0"
    }),
    testCases: JSON.stringify([
      { input: "[1,3], [2]", expectedOutput: "2.0" }
    ])
  },
  {
    id: "cp_40",
    title: "Longest Increasing Subsequence",
    slug: "longest-increasing-subsequence",
    difficulty: "medium",
    topic: "algorithms",
    description: "Given an integer array `nums`, return the length of the longest strictly increasing subsequence in O(n log n) dynamic programming.",
    starterCode: JSON.stringify({
      javascript: "function lengthOfLIS(nums) {\n  return 0;\n}",
      python: "def lengthOfLIS(nums):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: "[10,9,2,5,3,7,101,18]", expectedOutput: "4" }
    ])
  },

  // Strings Problems (41 to 60)
  {
    id: "cp_41",
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "easy",
    topic: "strings",
    description: "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.",
    starterCode: JSON.stringify({
      javascript: "function isValid(s) {\n  return false;\n}",
      python: "def isValid(s):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"()"', expectedOutput: "true" },
      { input: '"(]"', expectedOutput: "false" }
    ])
  },
  {
    id: "cp_42",
    title: "Longest Palindromic Substring",
    slug: "longest-palindromic-substring",
    difficulty: "medium",
    topic: "strings",
    description: "Given a string `s`, return the longest palindromic substring in `s`.",
    starterCode: JSON.stringify({
      javascript: "function longestPalindrome(s) {\n  return \"\";\n}",
      python: "def longestPalindrome(s):\n    return \"\""
    }),
    testCases: JSON.stringify([
      { input: '"babad"', expectedOutput: '"bab"' }
    ])
  },
  {
    id: "cp_43",
    title: "First Unique Character",
    slug: "first-unique-character-in-a-string",
    difficulty: "easy",
    topic: "strings",
    description: "Given a string `s`, find the first non-repeating character in it and return its index. If it does not exist, return `-1`.",
    starterCode: JSON.stringify({
      javascript: "function firstUniqChar(s) {\n  return -1;\n}",
      python: "def firstUniqChar(s):\n    return -1"
    }),
    testCases: JSON.stringify([
      { input: '"leetcode"', expectedOutput: "0" }
    ])
  },
  {
    id: "cp_44",
    title: "Reverse String",
    slug: "reverse-string",
    difficulty: "easy",
    topic: "strings",
    description: "Write a function that reverses a string in-place. The input string is given as an array of characters.",
    starterCode: JSON.stringify({
      javascript: "function reverseString(s) {\n  // In-place modifications\n}",
      python: "def reverseString(s):\n    pass"
    }),
    testCases: JSON.stringify([
      { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]' }
    ])
  },
  {
    id: "cp_45",
    title: "Longest Substring Without Repeating",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "medium",
    topic: "strings",
    description: "Given a string `s`, find the length of the longest substring without repeating characters.",
    starterCode: JSON.stringify({
      javascript: "function lengthOfLongestSubstring(s) {\n  return 0;\n}",
      python: "def lengthOfLongestSubstring(s):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"abcabcbb"', expectedOutput: "3" }
    ])
  },
  {
    id: "cp_46",
    title: "String to Integer (atoi)",
    slug: "string-to-integer-atoi",
    difficulty: "medium",
    topic: "strings",
    description: "Implement the `myAtoi(string s)` function, which converts a string to a 32-bit signed integer (similar to C/C++'s atoi function).",
    starterCode: JSON.stringify({
      javascript: "function myAtoi(s) {\n  return 0;\n}",
      python: "def myAtoi(s):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"   -42"', expectedOutput: "-42" }
    ])
  },
  {
    id: "cp_47",
    title: "Valid Palindrome",
    slug: "valid-palindrome",
    difficulty: "easy",
    topic: "strings",
    description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
    starterCode: JSON.stringify({
      javascript: "function isPalindrome(s) {\n  return false;\n}",
      python: "def isPalindrome(s):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"A man, a plan, a canal: Panama"', expectedOutput: "true" }
    ])
  },
  {
    id: "cp_48",
    title: "Longest Common Prefix",
    slug: "longest-common-prefix",
    difficulty: "easy",
    topic: "strings",
    description: "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string.",
    starterCode: JSON.stringify({
      javascript: "function longestCommonPrefix(strs) {\n  return \"\";\n}",
      python: "def longestCommonPrefix(strs):\n    return \"\""
    }),
    testCases: JSON.stringify([
      { input: '["flower","flow","flight"]', expectedOutput: '"fl"' }
    ])
  },
  {
    id: "cp_49",
    title: "Decode String",
    slug: "decode-string",
    difficulty: "medium",
    topic: "strings",
    description: "Given an encoded string, return its decoded string. The encoding rule is: `k[encoded_string]`, where the `encoded_string` inside the square brackets is being repeated exactly `k` times.",
    starterCode: JSON.stringify({
      javascript: "function decodeString(s) {\n  return \"\";\n}",
      python: "def decodeString(s):\n    return \"\""
    }),
    testCases: JSON.stringify([
      { input: '"3[a]2[bc]"', expectedOutput: '"aaabcbc"' }
    ])
  },
  {
    id: "cp_50",
    title: "Palindromic Substrings",
    slug: "palindromic-substrings",
    difficulty: "medium",
    topic: "strings",
    description: "Given a string `s`, return the number of palindromic substrings in it.",
    starterCode: JSON.stringify({
      javascript: "function countSubstrings(s) {\n  return 0;\n}",
      python: "def countSubstrings(s):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"aaa"', expectedOutput: "6" }
    ])
  },
  {
    id: "cp_51",
    title: "Basic Calculator II",
    slug: "basic-calculator-ii",
    difficulty: "medium",
    topic: "strings",
    description: "Given a string `s` which represents an expression, evaluate this expression and return its value. Operands are non-negative integers, `+`, `-`, `*`, `/`.",
    starterCode: JSON.stringify({
      javascript: "function calculate(s) {\n  return 0;\n}",
      python: "def calculate(s):\n    return 0"
    }),
    testCases: JSON.stringify([
      { input: '"3+2*2"', expectedOutput: "7" }
    ])
  },
  {
    id: "cp_52",
    title: "Minimum Window Substring",
    slug: "minimum-window-substring",
    difficulty: "hard",
    topic: "strings",
    description: "Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` is included in the window.",
    starterCode: JSON.stringify({
      javascript: "function minWindow(s, t) {\n  return \"\";\n}",
      python: "def minWindow(s, t):\n    return \"\""
    }),
    testCases: JSON.stringify([
      { input: '"ADOBECODEBANC", "ABC"', expectedOutput: '"BANC"' }
    ])
  },
  {
    id: "cp_53",
    title: "Text Justification",
    slug: "text-justification",
    difficulty: "hard",
    topic: "strings",
    description: "Given an array of strings `words` and a width `maxWidth`, format the text such that each line has exactly `maxWidth` characters and is fully (left and right) justified.",
    starterCode: JSON.stringify({
      javascript: "function fullJustify(words, maxWidth) {\n  return [];\n}",
      python: "def fullJustify(words, maxWidth):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: '["This", "is", "an", "example", "of", "text", "justification."], 16', expectedOutput: '["This    is    an","example  of text","justification.  "]' }
    ])
  },
  {
    id: "cp_54",
    title: "Wildcard Matching",
    slug: "wildcard-matching",
    difficulty: "hard",
    topic: "strings",
    description: "Given an input string `s` and a pattern `p`, implement wildcard pattern matching with support for `?` and `*`.",
    starterCode: JSON.stringify({
      javascript: "function isMatch(s, p) {\n  return false;\n}",
      python: "def isMatch(s, p):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"aa", "*"', expectedOutput: "true" }
    ])
  },
  {
    id: "cp_55",
    title: "Regular Expression Matching",
    slug: "regular-expression-matching",
    difficulty: "hard",
    topic: "strings",
    description: "Given an input string `s` and a pattern `p`, implement regular expression matching with support for `.` and `*`.",
    starterCode: JSON.stringify({
      javascript: "function isMatch(s, p) {\n  return false;\n}",
      python: "def isMatch(s, p):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"aa", "a*"', expectedOutput: "true" }
    ])
  },
  {
    id: "cp_56",
    title: "Reverse Words in a String",
    slug: "reverse-words-in-a-string",
    difficulty: "medium",
    topic: "strings",
    description: "Given an input string `s`, reverse the order of the words.",
    starterCode: JSON.stringify({
      javascript: "function reverseWords(s) {\n  return \"\";\n}",
      python: "def reverseWords(s):\n    return \"\""
    }),
    testCases: JSON.stringify([
      { input: '"the sky is blue"', expectedOutput: '"blue is sky the"' }
    ])
  },
  {
    id: "cp_57",
    title: "Multiply Strings",
    slug: "multiply-strings",
    difficulty: "medium",
    topic: "strings",
    description: "Given two non-negative integers `num1` and `num2` represented as strings, return the product of `num1` and `num2`, also represented as a string.",
    starterCode: JSON.stringify({
      javascript: "function multiply(num1, num2) {\n  return \"0\";\n}",
      python: "def multiply(num1, num2):\n    return \"0\""
    }),
    testCases: JSON.stringify([
      { input: '"2", "3"', expectedOutput: '"6"' }
    ])
  },
  {
    id: "cp_58",
    title: "Implement Trie (Prefix Tree)",
    slug: "implement-trie-prefix-tree",
    difficulty: "medium",
    topic: "strings",
    description: "A trie (pronounced as \"try\") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings.",
    starterCode: JSON.stringify({
      javascript: "class Trie {\n  constructor() {}\n  insert(word) {}\n  search(word) { return false; }\n  startsWith(prefix) { return false; }\n}",
      python: "class Trie:\n    def __init__(self):\n        pass\n    def insert(self, word: str) -> None:\n        pass\n    def search(self, word: str) -> bool:\n        return False\n    def startsWith(self, prefix: str) -> bool:\n        return False"
    }),
    testCases: JSON.stringify([
      { input: '["Trie", "insert", "search"], [[], ["apple"], ["apple"]]', expectedOutput: "[null, null, true]" }
    ])
  },
  {
    id: "cp_59",
    title: "Restore IP Addresses",
    slug: "restore-ip-addresses",
    difficulty: "medium",
    topic: "strings",
    description: "Given a string `s` containing only digits, return all possible valid IP address combinations that can be formed from `s`.",
    starterCode: JSON.stringify({
      javascript: "function restoreIpAddresses(s) {\n  return [];\n}",
      python: "def restoreIpAddresses(s):\n    return []"
    }),
    testCases: JSON.stringify([
      { input: '"25525511135"', expectedOutput: '["255.255.11.135","255.255.111.35"]' }
    ])
  },
  {
    id: "cp_60",
    title: "Is Subsequence",
    slug: "is-subsequence",
    difficulty: "easy",
    topic: "strings",
    description: "Given two strings `s` and `t`, return `true` if `s` is a subsequence of `t`, or `false` otherwise.",
    starterCode: JSON.stringify({
      javascript: "function isSubsequence(s, t) {\n  return false;\n}",
      python: "def isSubsequence(s, t):\n    return False"
    }),
    testCases: JSON.stringify([
      { input: '"abc", "ahbgdc"', expectedOutput: "true" }
    ])
  }
];

class Database {
  private data: DatabaseSchema = {
    users: [],
    passwordHashes: {},
    resumes: [],
    aptitudeQuestions: [],
    aptitudeAttempts: [],
    codingProblems: [],
    codingSessions: [],
    interviewSessions: [],
    skillScores: []
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);

        // Ensure seeds are present
        this.syncSeeds();
      } catch (err) {
        console.error("Failed to parse local database. Recreating...", err);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  private syncSeeds() {
    // Overwrite with latest robust seed questions & problems to sync schemas perfectly
    this.data.aptitudeQuestions = [...SEED_APTITUDE_QUESTIONS];
    this.data.codingProblems = [...SEED_CODING_PROBLEMS];


    // Ensure at least one demo user is bootstrapped with complete history
    if (this.data.users.length === 0 || !this.data.resumes.some(r => r.userId === "usr_demo")) {
      this.data.users = this.data.users.filter(u => u.id !== "usr_demo");
      this.data.resumes = this.data.resumes.filter(r => r.userId !== "usr_demo");
      this.data.aptitudeAttempts = this.data.aptitudeAttempts.filter(a => a.userId !== "usr_demo");
      this.data.codingSessions = this.data.codingSessions.filter(s => s.userId !== "usr_demo");
      this.data.interviewSessions = this.data.interviewSessions.filter(s => s.userId !== "usr_demo");
      this.data.skillScores = this.data.skillScores.filter(s => s.userId !== "usr_demo");
      this.bootstrapDemoUser();
    }

    // Recalculate SkillScores based on actual user attempts
    this.recalculateAllSkillScores();

    this.save();
  }

  private resetToDefaults() {
    this.data = {
      users: [],
      passwordHashes: {},
      resumes: [],
      aptitudeQuestions: [...SEED_APTITUDE_QUESTIONS],
      aptitudeAttempts: [],
      codingProblems: [...SEED_CODING_PROBLEMS],
      codingSessions: [],
      interviewSessions: [],
      skillScores: []
    };
    this.bootstrapDemoUser();
    this.save();
  }

  private bootstrapDemoUser() {
    const defaultUser: User = {
      id: "usr_demo",
      name: "Demo Candidate",
      email: "demo@placement.com",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      createdAt: new Date(Date.now() - 5*24*3600*1000).toISOString()
    };
    this.data.users.push(defaultUser);
    this.data.passwordHashes[defaultUser.id] = "demo123"; // Simple demo password

    // 1. Seed historical Resume scanner feedback
    const demoResume: Resume = {
      id: "res_demo_1",
      userId: defaultUser.id,
      fileUrl: "https://cloudinary.com/mock-upload/usr_demo/Alan_Turing_Placement_Resume.pdf",
      parsedJson: JSON.stringify({
        skills: ["TypeScript", "Python", "Go", "Algorithms", "PostgreSQL", "React", "Docker"],
        yearsOfExperience: "2 Years",
        topProjects: ["Core Crypto Compiler Engine", "Sub-graph routing scheduler"]
      }),
      aiFeedback: `### Resume Review Report
**Summary**: Decent visual layout and core languages list. Outstanding focus on computational performance, parser clock-tick minimization, and sub-graph routing.

**Strengths**:
- Excellent command-line compiler project focus (reduced clock-ticks by 65%).
- Highly specific language alignment across TypeScript, Go, and Python.
- Practical database optimization patterns (PostgreSQL transactional limits).

**Weaknesses**:
- Missing clear cloud deployment parameters (e.g., Google Cloud Run, Terraform).
- Lacks a dedicated segment showcasing automated testing (Jest, PyTest coverage).
- Work experiences are slightly condensed.

**Suggestions**:
- Incorporate explicit CI/CD pipelines: indicate automated container test suites on push events.
- Quantify project scaling throughput metrics: how does the compiler scheduler handle concurrent batch volumes under stress?
- Add relevant developer certs around GCP architectures.`,
      updatedAt: new Date(Date.now() - 3*24*3600*1000).toISOString()
    };
    this.data.resumes.push(demoResume);

    // 2. Seed past Aptitude MCQ quiz logs
    const demoAptitudeAttempts: AptitudeAttempt[] = [
      {
        id: "att_demo_1",
        userId: defaultUser.id,
        questionId: "aq_quant_1",
        selectedIndex: 1, // Correct
        isCorrect: true,
        timeTaken: 18,
        attemptedAt: new Date(Date.now() - 4*24*3600*1000).toISOString()
      },
      {
        id: "att_demo_2",
        userId: defaultUser.id,
        questionId: "aq_quant_2",
        selectedIndex: 1, // Correct
        isCorrect: true,
        timeTaken: 34,
        attemptedAt: new Date(Date.now() - 4*24*3600*1000).toISOString()
      },
      {
        id: "att_demo_3",
        userId: defaultUser.id,
        questionId: "aq_logic_1",
        selectedIndex: 1, // Correct
        isCorrect: true,
        timeTaken: 12,
        attemptedAt: new Date(Date.now() - 2*24*3600*1000).toISOString()
      },
      {
        id: "att_demo_4",
        userId: defaultUser.id,
        questionId: "aq_verbal_2",
        selectedIndex: 1, // Incorrect
        isCorrect: false,
        timeTaken: 45,
        attemptedAt: new Date(Date.now() - 2*24*3600*1000).toISOString()
      }
    ];
    this.data.aptitudeAttempts.push(...demoAptitudeAttempts);

    // 3. Seed dynamic coding sandbox attempts and solved exercises
    const demoCodingSessions: CodingSession[] = [
      {
        id: "cs_demo_1",
        userId: defaultUser.id,
        problemId: "cp_1", // Two Sum
        code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
        language: "javascript",
        status: "solved",
        aiFeedback: `### Code Evaluation Report

**Correctness**:
Flawless implementation. Solves the array tracking index with target addition correctly while supporting negative elements structure.

**Efficiency**:
Time complexity is optimal at O(N) using a single loop, and space complexity is O(N) for storage lookup buckets. Excellent optimization.

**Style & Readability**:
Nicely modularized. Clean camelCase names make variables highly legible.`,
        solvedAt: new Date(Date.now() - 4*24*3600*1000).toISOString(),
        createdAt: new Date(Date.now() - 4*24*3600*1000).toISOString()
      },
      {
        id: "cs_demo_2",
        userId: defaultUser.id,
        problemId: "cp_2", // Valid Parentheses
        code: `function isValid(s) {
  const stack = [];
  // Draft layout using standard linear array pushing loops
}`,
        language: "javascript",
        status: "attempted",
        aiFeedback: `### Code Evaluation Report

**Correctness**:
Incomplete structure. The current lines outline a viable workspace but missing condition sweeps to validate paired bracket delimiters.

**Efficiency**:
O(N) structure potential on completion. No obvious runtime anomalies.

**Style & Readability**:
Comments highlight clear developmental direction. Needs full implementation.`,
        createdAt: new Date(Date.now() - 1*24*3600*1000).toISOString()
      }
    ];
    this.data.codingSessions.push(...demoCodingSessions);

    // 4. Seed interactive evaluated Speech/Interview Transcript log
    const transcript = [
      { role: "ai", content: "Welcome to the smart mixed interview grid. I will evaluate both raw code scaling design and corporate traits. To start off: describe a system you built, detail what databases were selected, and why." },
      { role: "user", content: "I built a distributed job queue platform that handles over 10,000 requests per second. I selected PostgreSQL for reliable transactional state persistence and Redis for sub-millisecond memory caching and rapid queue scheduling." },
      { role: "ai", content: "That sounds like a stable architectural choice. How did you coordinate state locking between concurrent node processes when double consumption attempts occur?" },
      { role: "user", content: "We implemented PostgreSQL advisory locks combined with optimistic concurrency control on transaction records, ensuring two parallel worker threads cannot modify or lease the same payload simultaneously." }
    ];
    const demoInterview: InterviewSession = {
      id: "int_demo_1",
      userId: defaultUser.id,
      role: "Distributed Systems Backend Architect",
      mode: "mixed",
      transcript: JSON.stringify(transcript),
      aiScore: 84,
      aiFeedback: `### Interview Evaluation Report (Role: Backend Architect)

**General Synopsis**:
Extremely robust system planning depth. The candidate speaks cleanly with specific technical metrics and uses realistic database keywords.

**Areas of Excellence**:
- PostgreSQL Advisory Locking mechanisms show an advanced comprehension of database transactional isolation levels.
- Great design trade-off logic balancing disk reliability scales against fast Redis RAM buffers.

**Actionable Growth Plan**:
- Mention standard cluster monitoring parameters: denote setup details with Prometheus and Grafana for metrics tracing.
- Discuss handling network partitions: define high-availability clustering and backup database replication channels.`,
      duration: 180,
      createdAt: new Date(Date.now() - 3*24*3600*1000).toISOString()
    };
    this.data.interviewSessions.push(demoInterview);

    // 5. Build Rolling/Synchronized Metric scores on dashboard indices
    const initialSkills = ["React", "Python", "System Design"];
    const initialScores = [80.0, 65.0, 75.0]; // Custom starter skills
    initialSkills.forEach((skill, idx) => {
      this.data.skillScores.push({
        id: `ss_${defaultUser.id}_${skill.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        userId: defaultUser.id,
        skill,
        score: initialScores[idx],
        updatedAt: new Date().toISOString()
      });
    });
  }

  public recalculateUserSkillScores(userId: string) {
    if (userId === "usr_demo") return;
    // Overridden to support user-customizable skills only. No hardcoded overwriting.
  }

  private recalculateAllSkillScores() {
    this.data.users.forEach(user => {
      this.recalculateUserSkillScores(user.id);
    });
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("DB Save failed:", err);
    }
  }

  // API wrappers to mimic database operations
  public getUsers() { return this.data.users; }
  
  public findUserById(id: string) {
    return this.data.users.find(u => u.id === id) || null;
  }

  public findUserByEmail(email: string) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public createUser(user: User, passwordHash: string): User {
    this.data.users.push(user);
    this.data.passwordHashes[user.id] = passwordHash;

    const pathUser = `users/${user.id}`;
    safeFirestoreWrite(pathUser, OperationType.CREATE, setDoc(doc(fdb, "users", user.id), user));

    this.save();
    return user;
  }

  public getPasswordHash(userId: string): string {
    return this.data.passwordHashes[userId] || "";
  }

  public getResumeByUserId(userId: string) {
    return this.data.resumes.find(r => r.userId === userId) || null;
  }

  public upsertResume(userId: string, fileUrl: string, parsedJson?: string, aiFeedback?: string): Resume {
    const existing = this.data.resumes.find(r => r.userId === userId);
    if (existing) {
      existing.fileUrl = fileUrl;
      if (parsedJson) existing.parsedJson = parsedJson;
      if (aiFeedback) existing.aiFeedback = aiFeedback;
      existing.updatedAt = new Date().toISOString();
      
      const pathResume = `resumes/${existing.id}`;
      safeFirestoreWrite(pathResume, OperationType.UPDATE, setDoc(doc(fdb, "resumes", existing.id), existing));

      this.save();
      return existing;
    } else {
      const newResume: Resume = {
        id: "res_" + Math.random().toString(36).substring(2, 11),
        userId,
        fileUrl,
        parsedJson: parsedJson || null,
        aiFeedback: aiFeedback || null,
        updatedAt: new Date().toISOString()
      };
      this.data.resumes.push(newResume);

      const pathResume = `resumes/${newResume.id}`;
      safeFirestoreWrite(pathResume, OperationType.CREATE, setDoc(doc(fdb, "resumes", newResume.id), newResume));

      this.save();
      return newResume;
    }
  }

  public getAptitudeQuestions(category?: string, difficulty?: string) {
    let list = this.data.aptitudeQuestions;
    if (category) {
      let categoryQuestions = list.filter(q => q.category === category);
      if (difficulty) {
        const matching = categoryQuestions.filter(q => q.difficulty === difficulty);
        const others = categoryQuestions.filter(q => q.difficulty !== difficulty);
        categoryQuestions = [...matching, ...others];
      }
      return categoryQuestions.slice(0, 15);
    }
    if (difficulty) {
      const matching = list.filter(q => q.difficulty === difficulty);
      const others = list.filter(q => q.difficulty !== difficulty);
      return [...matching, ...others].slice(0, 15);
    }
    return list.slice(0, 15);
  }

  public addCustomAptitudeQuestions(qs: AptitudeQuestion[]) {
    qs.forEach(q => {
      const exists = this.data.aptitudeQuestions.some(aq => aq.id === q.id);
      if (!exists) {
        this.data.aptitudeQuestions.push(q);
      }
    });
    this.save();
  }

  public getAptitudeAttempts(userId: string) {
    return this.data.aptitudeAttempts.filter(a => a.userId === userId);
  }

  public saveAptitudeAttempts(attempts: Omit<AptitudeAttempt, "id" | "attemptedAt">[]): AptitudeAttempt[] {
    const saved: AptitudeAttempt[] = [];
    attempts.forEach(att => {
      const full: AptitudeAttempt = {
        ...att,
        id: "att_" + Math.random().toString(36).substring(2, 11),
        attemptedAt: new Date().toISOString()
      };
      this.data.aptitudeAttempts.push(full);
      saved.push(full);

      const pathAttempt = `aptitudeAttempts/${full.id}`;
      safeFirestoreWrite(pathAttempt, OperationType.CREATE, setDoc(doc(fdb, "aptitudeAttempts", full.id), full));
    });
    this.save();
    return saved;
  }

  public getCodingProblems(topic?: string, difficulty?: string) {
    let list = this.data.codingProblems;
    if (topic) {
      list = list.filter(p => p.topic === topic);
    }
    if (difficulty) {
      list = list.filter(p => p.difficulty === difficulty);
    }
    return list;
  }

  public getCodingProblemBySlug(slug: string) {
    return this.data.codingProblems.find(p => p.slug === slug) || null;
  }

  public getCodingSessionsByUserId(userId: string) {
    return this.data.codingSessions.filter(s => s.userId === userId);
  }

  public createOrUpdateCodingSession(session: Omit<CodingSession, "id" | "createdAt">): CodingSession {
    const existing = this.data.codingSessions.find(
      s => s.userId === session.userId && s.problemId === session.problemId
    );
    if (existing) {
      existing.code = session.code;
      existing.language = session.language;
      existing.status = session.status;
      if (session.aiFeedback) existing.aiFeedback = session.aiFeedback;
      if (session.solvedAt) existing.solvedAt = session.solvedAt;

      const pathSession = `codingSessions/${existing.id}`;
      safeFirestoreWrite(pathSession, OperationType.UPDATE, setDoc(doc(fdb, "codingSessions", existing.id), existing));

      this.save();
      return existing;
    } else {
      const newSess: CodingSession = {
        ...session,
        id: "cos_" + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString()
      };
      this.data.codingSessions.push(newSess);

      const pathSession = `codingSessions/${newSess.id}`;
      safeFirestoreWrite(pathSession, OperationType.CREATE, setDoc(doc(fdb, "codingSessions", newSess.id), newSess));

      this.save();
      return newSess;
    }
  }

  public getInterviewSessions(userId: string) {
    return this.data.interviewSessions.filter(s => s.userId === userId);
  }

  public getInterviewSessionById(id: string) {
    return this.data.interviewSessions.find(s => s.id === id) || null;
  }

  public createInterviewSession(userId: string, role: string, mode: "technical" | "hr" | "mixed", firstQuestion: string): InterviewSession {
    const newSession: InterviewSession = {
      id: "int_" + Math.random().toString(36).substring(2, 11),
      userId,
      role,
      mode,
      transcript: JSON.stringify([{ role: "ai", content: firstQuestion }]),
      aiScore: null,
      aiFeedback: null,
      duration: 0,
      createdAt: new Date().toISOString()
    };
    this.data.interviewSessions.push(newSession);

    const pathSession = `interviewSessions/${newSession.id}`;
    safeFirestoreWrite(pathSession, OperationType.CREATE, setDoc(doc(fdb, "interviewSessions", newSession.id), newSession));

    this.save();
    return newSession;
  }

  public updateInterviewSession(id: string, transcriptJson: string, score?: number, feedback?: string): InterviewSession | null {
    const existing = this.data.interviewSessions.find(s => s.id === id);
    if (!existing) return null;
    existing.transcript = transcriptJson;
    if (score !== undefined) existing.aiScore = score;
    if (feedback !== undefined) existing.aiFeedback = feedback;

    const pathSession = `interviewSessions/${existing.id}`;
    safeFirestoreWrite(pathSession, OperationType.UPDATE, setDoc(doc(fdb, "interviewSessions", existing.id), existing));

    this.save();
    return existing;
  }

  public getSkillScores(userId: string): SkillScore[] {
    return this.data.skillScores.filter(s => s.userId === userId);
  }

  public updateSkillScore(userId: string, skill: string, score: number): SkillScore {
    const existing = this.data.skillScores.find(s => s.userId === userId && s.skill.toLowerCase() === skill.toLowerCase());
    if (existing) {
      existing.score = score;
      existing.updatedAt = new Date().toISOString();

      const pathScore = `skillScores/${existing.id}`;
      safeFirestoreWrite(pathScore, OperationType.UPDATE, setDoc(doc(fdb, "skillScores", existing.id), existing));

      this.save();
      return existing;
    } else {
      const ss_id = `ss_${userId}_${skill.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const newScore: SkillScore = {
        id: ss_id,
        userId,
        skill,
        score,
        updatedAt: new Date().toISOString()
      };
      this.data.skillScores.push(newScore);

      const pathScore = `skillScores/${newScore.id}`;
      safeFirestoreWrite(pathScore, OperationType.CREATE, setDoc(doc(fdb, "skillScores", newScore.id), newScore));

      this.save();
      return newScore;
    }
  }

  public deleteSkillScore(userId: string, skill: string): void {
    const existing = this.data.skillScores.find(s => s.userId === userId && s.skill.toLowerCase() === skill.toLowerCase());
    if (existing) {
      this.data.skillScores = this.data.skillScores.filter(s => s.id !== existing.id);
      // Clean delete using compatibility helper
      deleteDoc(doc(fdb, "skillScores", existing.id)).catch((err: any) => console.error("Firestore delete error", err));
      this.save();
    }
  }

  public setCustomSkillScores(userId: string, skills: { skill: string; score: number }[]): SkillScore[] {
    const existingScores = this.getSkillScores(userId);
    const newSkillNamesLower = skills.map(s => s.skill.toLowerCase().trim());
    
    // Delete any old scores that are not in the new custom list
    existingScores.forEach(oldScore => {
      if (!newSkillNamesLower.includes(oldScore.skill.toLowerCase())) {
        this.deleteSkillScore(userId, oldScore.skill);
      }
    });

    // Create or update the ones in the new custom list
    const results: SkillScore[] = [];
    skills.forEach(item => {
      const cleanedName = item.skill.trim();
      if (!cleanedName) return;
      const res = this.updateSkillScore(userId, cleanedName, item.score);
      results.push(res);
    });

    return results;
  }
}

export const db = new Database();
