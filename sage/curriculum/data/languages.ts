/**
 * GCSE Languages Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE French, Spanish, and German
 * aligned to AQA, Edexcel, OCR, WJEC, and CCEA specifications.
 *
 * Structure (10 topics per language):
 * - 4 skill areas (Listening, Reading, Speaking, Writing)
 * - 3 grammar topics (Present, Past, Future/Conditional)
 * - 3 vocabulary themes (Identity, Travel, Global Issues)
 *
 * @module sage/curriculum/data/languages
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Languages Curriculum Topics
 */
export const languagesTopics: CurriculumTopic[] = [
  // ========================================
  // FRENCH
  // ========================================

  // French 1: Listening Comprehension
  {
    id: 'french-listening-comprehension',
    name: 'Listening Comprehension',
    description: 'Understanding spoken French in a variety of contexts including announcements, conversations, and interviews',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Identify key points and details from spoken French passages',
      'Understand opinions, attitudes, and emotions expressed by speakers',
      'Deduce meaning from unfamiliar vocabulary using context',
      'Follow extended spoken passages on familiar and unfamiliar topics',
    ],
    prerequisites: [],
    misconceptions: [
      'Assuming every word must be understood to answer correctly',
      'Confusing similarly sounding words such as "poisson" (fish) and "poison" (poison)',
      'Ignoring tone and intonation clues that indicate questions or opinions',
    ],
    vocabulary: ['comprendre', 'ecouter', 'repeter', 'identifier', 'le sens'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Listening',
    },
  },

  // French 2: Reading Comprehension
  {
    id: 'french-reading-comprehension',
    name: 'Reading Comprehension',
    description: 'Understanding written French texts including articles, emails, blogs, and literary extracts',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Read and understand authentic French texts across different genres',
      'Translate short passages from French into English accurately',
      'Identify and interpret opinions, arguments, and conclusions in written texts',
      'Use context and cognates to infer meaning of unknown words',
    ],
    prerequisites: [],
    misconceptions: [
      'Relying solely on cognates without checking for faux amis (false friends)',
      'Translating word-for-word rather than conveying meaning',
      'Overlooking negatives like "ne...pas" or "ne...jamais" in sentences',
    ],
    vocabulary: ['lire', 'le texte', 'le paragraphe', 'traduire', 'un article'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Reading',
    },
  },

  // French 3: Speaking
  {
    id: 'french-speaking',
    name: 'Speaking: Role Play & Conversation',
    description: 'Communicating in spoken French through role plays, photo card descriptions, and general conversation',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Respond to role play scenarios using appropriate register and vocabulary',
      'Describe and discuss photos using a range of structures',
      'Express and justify opinions on a variety of topics in conversation',
      'Use spontaneous language and ask questions to sustain interaction',
      'Demonstrate accurate pronunciation and intonation',
    ],
    prerequisites: ['french-grammar-present-tense'],
    misconceptions: [
      'Using English word order when constructing French sentences',
      'Forgetting to use "tu" and "vous" in the correct contexts',
      'Relying on memorised chunks without adapting them to the question asked',
    ],
    vocabulary: ['parler', 'decrire', 'expliquer', 'a mon avis', 'je pense que'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Speaking',
    },
  },

  // French 4: Writing
  {
    id: 'french-writing',
    name: 'Writing: Structured & Open-Ended',
    description: 'Producing written French including structured tasks, translations into French, and extended writing',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Write short structured responses using bullet points as prompts',
      'Produce extended pieces of writing with a range of tenses and structures',
      'Translate sentences and short passages from English into French',
      'Use connectives, opinions, and justifications to develop ideas',
      'Apply accurate spelling, grammar, and punctuation in written French',
    ],
    prerequisites: ['french-grammar-present-tense', 'french-grammar-past-tenses'],
    misconceptions: [
      'Neglecting accent marks which can change word meaning (e.g. "ou" vs "ou")',
      'Using infinitives where conjugated verbs are required',
      'Writing in only one tense when the task requires a range',
    ],
    vocabulary: ['ecrire', 'rediger', 'la phrase', 'le brouillon', 'corriger'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Writing',
    },
  },

  // French 5: Grammar — Present Tense & Regular Verbs
  {
    id: 'french-grammar-present-tense',
    name: 'Grammar: Present Tense & Regular Verbs',
    description: 'Conjugating regular -er, -ir, and -re verbs in the present tense along with key irregular verbs',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Conjugate regular -er, -ir, and -re verbs in all persons of the present tense',
      'Use common irregular verbs (avoir, etre, aller, faire) correctly',
      'Form negative sentences using ne...pas and other negative structures',
      'Apply subject-verb agreement rules consistently',
    ],
    prerequisites: [],
    misconceptions: [
      'Confusing "etre" and "avoir" when choosing the auxiliary in compound tenses',
      'Forgetting silent endings (e.g. "-ent" in third person plural)',
      'Applying -er verb endings to irregular verbs',
    ],
    vocabulary: ['le verbe', 'conjuguer', 'le sujet', 'regulier', 'irregulier', 'le present'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // French 6: Grammar — Past Tenses
  {
    id: 'french-grammar-past-tenses',
    name: 'Grammar: Past Tenses (Passe Compose & Imparfait)',
    description: 'Forming and using the passe compose with avoir and etre, and the imperfect tense for descriptions and habitual actions',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Form the passe compose with avoir and etre as auxiliary verbs',
      'Apply past participle agreement rules with etre verbs',
      'Conjugate verbs in the imperfect tense for descriptions and repeated actions',
      'Choose appropriately between passe compose and imparfait in context',
      'Use time markers to signal past tense usage',
    ],
    prerequisites: ['french-grammar-present-tense'],
    misconceptions: [
      'Forgetting the 13 etre verbs (DR MRS VANDERTRAMP) and reflexive verbs',
      'Omitting past participle agreement with etre (e.g. "elle est allee")',
      'Using passe compose for descriptions instead of the imparfait',
    ],
    vocabulary: ['le passe compose', 'l\'imparfait', 'le participe passe', 'l\'auxiliaire', 'autrefois', 'hier'],
    metadata: {
      teachingHours: 10,
      examWeight: 12,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // French 7: Grammar — Future & Conditional
  {
    id: 'french-grammar-future-conditional',
    name: 'Grammar: Future & Conditional Tenses',
    description: 'Using the simple future tense, the near future (aller + infinitive), and the conditional for hypothetical situations',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Form the near future using aller + infinitive',
      'Conjugate regular and irregular verbs in the simple future tense',
      'Use the conditional tense to express wishes and hypothetical situations',
      'Combine si clauses with appropriate tenses',
    ],
    prerequisites: ['french-grammar-present-tense'],
    misconceptions: [
      'Confusing the future tense stem with the infinitive for irregular verbs',
      'Mixing up conditional and future endings (both use the infinitive stem)',
      'Using the present tense after "si" when the future or conditional is needed in the result clause',
    ],
    vocabulary: ['le futur', 'le conditionnel', 'si', 'je voudrais', 'j\'aimerais', 'demain', 'l\'avenir'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // French 8: Vocabulary — Identity, Daily Life & School
  {
    id: 'french-vocab-identity-daily-life',
    name: 'Vocabulary: Identity, Daily Life & School',
    description: 'Key vocabulary for talking about family, relationships, daily routines, school life, and future aspirations',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe yourself, your family, and relationships using a range of adjectives',
      'Talk about daily routine including meals, chores, and hobbies',
      'Discuss school subjects, opinions on school, and future study plans',
      'Express preferences, likes, and dislikes with justifications',
    ],
    prerequisites: [],
    vocabulary: ['la famille', 'les amis', 'le college', 'les matieres', 'la routine', 'les loisirs', 'le petit dejeuner', 'l\'emploi du temps'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-1',
    },
  },

  // French 9: Vocabulary — Local Area, Holidays & Travel
  {
    id: 'french-vocab-travel-holidays',
    name: 'Vocabulary: Local Area, Holidays & Travel',
    description: 'Key vocabulary for describing your local area, giving directions, discussing holidays, and making travel arrangements',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe your town or region and its amenities',
      'Give and understand directions and location descriptions',
      'Talk about past and future holidays including accommodation and activities',
      'Make arrangements for travel including booking and transport',
      'Order food and drink in a restaurant or cafe',
    ],
    prerequisites: [],
    vocabulary: ['la ville', 'le quartier', 'les vacances', 'l\'hotel', 'le transport', 'la gare', 'le billet', 'le restaurant'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-2',
    },
  },

  // French 10: Vocabulary — Global Issues, Environment & Future Plans
  {
    id: 'french-vocab-global-issues',
    name: 'Vocabulary: Global Issues, Environment & Future Plans',
    description: 'Key vocabulary for discussing environmental issues, social problems, charitable work, and career aspirations',
    parentId: null,
    subject: 'french',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Discuss environmental problems and sustainable solutions',
      'Talk about social issues such as poverty, homelessness, and equality',
      'Describe charitable work and volunteering experiences',
      'Discuss career plans, ambitions, and the world of work',
    ],
    prerequisites: ['french-grammar-future-conditional'],
    misconceptions: [
      'Oversimplifying complex arguments due to limited vocabulary',
      'Confusing similar thematic vocabulary (e.g. "travail" work vs "travailler" to work)',
    ],
    vocabulary: ['l\'environnement', 'la pollution', 'le recyclage', 'le chomage', 'le benevolat', 'l\'avenir', 'le metier', 'les droits'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-3',
    },
  },

  // ========================================
  // SPANISH
  // ========================================

  // Spanish 1: Listening Comprehension
  {
    id: 'spanish-listening-comprehension',
    name: 'Listening Comprehension',
    description: 'Understanding spoken Spanish in a variety of contexts including dialogues, announcements, and interviews',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Identify key information and details from spoken Spanish passages',
      'Recognise opinions, attitudes, and emotions conveyed by speakers',
      'Infer meaning of unfamiliar words from context and tone',
      'Understand spoken Spanish at natural speed on familiar and unfamiliar topics',
    ],
    prerequisites: [],
    misconceptions: [
      'Expecting Castilian Spanish when the recording uses Latin American pronunciation',
      'Confusing words that sound similar such as "pero" (but) and "perro" (dog)',
      'Assuming every word must be understood to select the correct answer',
    ],
    vocabulary: ['escuchar', 'comprender', 'repetir', 'identificar', 'el significado'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Listening',
    },
  },

  // Spanish 2: Reading Comprehension
  {
    id: 'spanish-reading-comprehension',
    name: 'Reading Comprehension',
    description: 'Understanding written Spanish texts including articles, emails, blogs, and literary extracts',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Read and understand authentic Spanish texts across different genres',
      'Translate short passages from Spanish into English accurately',
      'Identify and interpret opinions, arguments, and conclusions in written texts',
      'Use cognates, context, and grammatical knowledge to work out meaning',
    ],
    prerequisites: [],
    misconceptions: [
      'Over-relying on cognates without checking for false friends (e.g. "embarazada" means pregnant, not embarrassed)',
      'Translating word-for-word rather than conveying natural meaning',
      'Missing double negatives which are grammatically correct in Spanish',
    ],
    vocabulary: ['leer', 'el texto', 'el parrafo', 'traducir', 'el articulo'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Reading',
    },
  },

  // Spanish 3: Speaking
  {
    id: 'spanish-speaking',
    name: 'Speaking: Role Play & Conversation',
    description: 'Communicating in spoken Spanish through role plays, photo card descriptions, and general conversation',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Respond to role play scenarios using appropriate vocabulary and structures',
      'Describe and discuss photos using a variety of language',
      'Express and justify opinions in sustained conversation',
      'Ask and answer unpredictable questions spontaneously',
      'Demonstrate accurate Spanish pronunciation and intonation',
    ],
    prerequisites: ['spanish-grammar-present-tense'],
    misconceptions: [
      'Forgetting that adjectives must agree in gender and number with their noun',
      'Using "tu" when "usted" is more appropriate in formal role plays',
      'Over-relying on memorised answers without adapting to the actual question',
    ],
    vocabulary: ['hablar', 'describir', 'explicar', 'en mi opinion', 'creo que'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Speaking',
    },
  },

  // Spanish 4: Writing
  {
    id: 'spanish-writing',
    name: 'Writing: Structured & Open-Ended',
    description: 'Producing written Spanish including structured tasks, translations into Spanish, and extended writing',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Write short structured responses guided by bullet points',
      'Produce extended writing using a range of tenses, structures, and vocabulary',
      'Translate sentences and short passages from English into Spanish',
      'Use connectives, opinions, and a variety of sentence structures',
      'Apply accurate spelling, accents, and grammar in written Spanish',
    ],
    prerequisites: ['spanish-grammar-present-tense', 'spanish-grammar-past-tenses'],
    misconceptions: [
      'Omitting accent marks which can change meaning (e.g. "el" the vs "el" he)',
      'Forgetting inverted question marks and exclamation marks at the start of sentences',
      'Writing in only one tense when multiple tenses are needed for higher marks',
    ],
    vocabulary: ['escribir', 'redactar', 'la frase', 'el borrador', 'corregir'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Writing',
    },
  },

  // Spanish 5: Grammar — Present Tense & Regular Verbs
  {
    id: 'spanish-grammar-present-tense',
    name: 'Grammar: Present Tense & Regular Verbs',
    description: 'Conjugating regular -ar, -er, and -ir verbs in the present tense along with key irregular and stem-changing verbs',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Conjugate regular -ar, -er, and -ir verbs in all persons of the present tense',
      'Use key irregular verbs (ser, estar, tener, ir, hacer) correctly',
      'Recognise and apply stem-changing verb patterns (e>ie, o>ue, e>i)',
      'Form negative sentences and ask questions in the present tense',
    ],
    prerequisites: [],
    misconceptions: [
      'Confusing "ser" and "estar" (both mean "to be" but are used differently)',
      'Forgetting stem changes in the present tense (e.g. "querer" becomes "quiero")',
      'Applying -ar endings to -er/-ir verbs',
    ],
    vocabulary: ['el verbo', 'conjugar', 'el sujeto', 'regular', 'irregular', 'el presente'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // Spanish 6: Grammar — Past Tenses
  {
    id: 'spanish-grammar-past-tenses',
    name: 'Grammar: Past Tenses (Preterite & Imperfect)',
    description: 'Forming and using the preterite for completed actions and the imperfect for descriptions and habitual past actions',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Conjugate regular and irregular verbs in the preterite tense',
      'Form the imperfect tense for descriptions, weather, and habitual actions',
      'Choose appropriately between preterite and imperfect in context',
      'Use time expressions to signal which past tense is needed',
      'Combine both past tenses in extended narrative writing',
    ],
    prerequisites: ['spanish-grammar-present-tense'],
    misconceptions: [
      'Using the preterite for descriptions instead of the imperfect',
      'Forgetting irregular preterite stems (e.g. "tener" becomes "tuve", not "teni")',
      'Confusing the imperfect endings for -ar verbs (-aba) with -er/-ir verbs (-ia)',
    ],
    vocabulary: ['el preterito', 'el imperfecto', 'ayer', 'la semana pasada', 'cuando era joven', 'normalmente'],
    metadata: {
      teachingHours: 10,
      examWeight: 12,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // Spanish 7: Grammar — Future & Conditional
  {
    id: 'spanish-grammar-future-conditional',
    name: 'Grammar: Future & Conditional Tenses',
    description: 'Using the simple future tense, the near future (ir a + infinitive), and the conditional for hypothetical situations',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Form the near future using ir a + infinitive',
      'Conjugate regular and irregular verbs in the simple future tense',
      'Use the conditional tense to express wishes and hypothetical situations',
      'Combine si clauses with appropriate tenses for conditional sentences',
    ],
    prerequisites: ['spanish-grammar-present-tense'],
    misconceptions: [
      'Confusing irregular future stems (e.g. "tendre" instead of correct "tendre" from "tener")',
      'Forgetting that future and conditional share the same irregular stems',
      'Using the near future exclusively and never the simple future, limiting grade potential',
    ],
    vocabulary: ['el futuro', 'el condicional', 'si', 'me gustaria', 'manana', 'en el futuro', 'voy a'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // Spanish 8: Vocabulary — Identity, Daily Life & School
  {
    id: 'spanish-vocab-identity-daily-life',
    name: 'Vocabulary: Identity, Daily Life & School',
    description: 'Key vocabulary for talking about family, relationships, daily routines, school life, and interests',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe yourself, your family, and your relationships using varied adjectives',
      'Talk about daily routine including meals, hobbies, and technology use',
      'Discuss school subjects, uniform, rules, and opinions about school',
      'Express preferences and justify opinions about free-time activities',
    ],
    prerequisites: [],
    vocabulary: ['la familia', 'los amigos', 'el instituto', 'las asignaturas', 'la rutina', 'los pasatiempos', 'el desayuno', 'el horario'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-1',
    },
  },

  // Spanish 9: Vocabulary — Local Area, Holidays & Travel
  {
    id: 'spanish-vocab-travel-holidays',
    name: 'Vocabulary: Local Area, Holidays & Travel',
    description: 'Key vocabulary for describing your local area, discussing holidays, and making travel arrangements',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe your town, neighbourhood, and local facilities',
      'Give and understand directions and describe locations',
      'Talk about past and future holidays including accommodation and activities',
      'Make travel arrangements and deal with problems while abroad',
      'Order food and drink and discuss regional cuisine',
    ],
    prerequisites: [],
    vocabulary: ['la ciudad', 'el barrio', 'las vacaciones', 'el hotel', 'el transporte', 'la estacion', 'el billete', 'el restaurante'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-2',
    },
  },

  // Spanish 10: Vocabulary — Global Issues, Environment & Future Plans
  {
    id: 'spanish-vocab-global-issues',
    name: 'Vocabulary: Global Issues, Environment & Future Plans',
    description: 'Key vocabulary for discussing environmental issues, social problems, charitable work, and career aspirations',
    parentId: null,
    subject: 'spanish',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Discuss environmental problems and propose sustainable solutions',
      'Talk about social issues such as poverty, inequality, and health',
      'Describe charitable work and volunteering experiences',
      'Discuss career plans, work experience, and future ambitions',
    ],
    prerequisites: ['spanish-grammar-future-conditional'],
    misconceptions: [
      'Simplifying complex arguments because of limited thematic vocabulary',
      'Confusing related words (e.g. "trabajo" job/work vs "trabajar" to work)',
    ],
    vocabulary: ['el medio ambiente', 'la contaminacion', 'el reciclaje', 'el desempleo', 'el voluntariado', 'el futuro', 'la carrera', 'los derechos'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-3',
    },
  },

  // ========================================
  // GERMAN
  // ========================================

  // German 1: Listening Comprehension
  {
    id: 'german-listening-comprehension',
    name: 'Listening Comprehension',
    description: 'Understanding spoken German in a variety of contexts including conversations, announcements, and interviews',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Identify key information and details from spoken German passages',
      'Recognise opinions, attitudes, and emotions expressed by speakers',
      'Infer meaning of unfamiliar words from context and intonation',
      'Understand spoken German at natural speed on a range of topics',
    ],
    prerequisites: [],
    misconceptions: [
      'Struggling with compound nouns and not breaking them into component parts',
      'Missing the verb at the end of subordinate clauses which changes the meaning',
      'Confusing similar-sounding words such as "Kirche" (church) and "Kirsche" (cherry)',
    ],
    vocabulary: ['zuhoren', 'verstehen', 'wiederholen', 'erkennen', 'die Bedeutung'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Listening',
    },
  },

  // German 2: Reading Comprehension
  {
    id: 'german-reading-comprehension',
    name: 'Reading Comprehension',
    description: 'Understanding written German texts including articles, emails, blogs, and literary extracts',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Read and understand authentic German texts across different genres',
      'Translate short passages from German into English accurately',
      'Identify and interpret opinions, arguments, and conclusions in written texts',
      'Use cognates, context, and grammatical knowledge to deduce meaning',
    ],
    prerequisites: [],
    misconceptions: [
      'Ignoring capital letters on nouns which distinguish nouns from other word classes',
      'Misreading compound words by not identifying the individual components',
      'Overlooking separable verb prefixes which appear at the end of the clause',
    ],
    vocabulary: ['lesen', 'der Text', 'der Absatz', 'ubersetzen', 'der Artikel'],
    metadata: {
      teachingHours: 12,
      examWeight: 25,
      ncReference: 'KS4-MFL-Reading',
    },
  },

  // German 3: Speaking
  {
    id: 'german-speaking',
    name: 'Speaking: Role Play & Conversation',
    description: 'Communicating in spoken German through role plays, photo card descriptions, and general conversation',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Respond to role play scenarios using appropriate register and vocabulary',
      'Describe and discuss photos using a range of structures and tenses',
      'Express and justify opinions on a variety of topics in conversation',
      'Use spontaneous language and ask questions to maintain interaction',
      'Demonstrate accurate German pronunciation including umlauts',
    ],
    prerequisites: ['german-grammar-present-tense'],
    misconceptions: [
      'Forgetting verb-second word order in main clauses (inversion after adverbs)',
      'Using "du" when "Sie" is more appropriate in formal situations',
      'Neglecting case changes after prepositions in spoken responses',
    ],
    vocabulary: ['sprechen', 'beschreiben', 'erklaren', 'meiner Meinung nach', 'ich glaube dass'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Speaking',
    },
  },

  // German 4: Writing
  {
    id: 'german-writing',
    name: 'Writing: Structured & Open-Ended',
    description: 'Producing written German including structured tasks, translations into German, and extended writing',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Write short structured responses guided by bullet points',
      'Produce extended writing using a range of tenses, structures, and vocabulary',
      'Translate sentences and short passages from English into German',
      'Use connectives, subordinating conjunctions, and varied sentence structures',
      'Apply accurate spelling, capitalisation, and grammar in written German',
    ],
    prerequisites: ['german-grammar-present-tense', 'german-grammar-past-tenses'],
    misconceptions: [
      'Forgetting to capitalise all nouns in German',
      'Ignoring word order rules especially verb position in subordinate clauses',
      'Writing in only one tense when a range is needed for higher marks',
    ],
    vocabulary: ['schreiben', 'verfassen', 'der Satz', 'der Entwurf', 'korrigieren'],
    metadata: {
      teachingHours: 14,
      examWeight: 25,
      ncReference: 'KS4-MFL-Writing',
    },
  },

  // German 5: Grammar — Present Tense & Regular Verbs
  {
    id: 'german-grammar-present-tense',
    name: 'Grammar: Present Tense & Regular Verbs',
    description: 'Conjugating regular and irregular verbs in the present tense, including separable and modal verbs',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Conjugate regular verbs in all persons of the present tense',
      'Use key irregular verbs (sein, haben, werden, fahren) correctly',
      'Apply separable verb rules and position the prefix correctly',
      'Use modal verbs (konnen, mussen, wollen, durfen, sollen) with infinitives',
    ],
    prerequisites: [],
    misconceptions: [
      'Forgetting that the verb must be the second idea in a main clause',
      'Not separating separable verbs (e.g. "aufstehen" becomes "ich stehe...auf")',
      'Confusing "sein" (to be) and "haben" (to have) in different contexts',
    ],
    vocabulary: ['das Verb', 'konjugieren', 'das Subjekt', 'regelmaessig', 'unregelmaessig', 'das Prasens'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // German 6: Grammar — Past Tenses
  {
    id: 'german-grammar-past-tenses',
    name: 'Grammar: Past Tenses (Perfekt & Imperfekt)',
    description: 'Forming the perfect tense with haben and sein, and using the imperfect tense for narration and common verbs',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Form the perfect tense using haben and sein as auxiliary verbs',
      'Identify which verbs take sein (movement and change of state verbs)',
      'Use the imperfect tense of common verbs (war, hatte, es gab)',
      'Form past participles for regular, irregular, separable, and inseparable verbs',
      'Choose between Perfekt and Imperfekt appropriately in writing',
    ],
    prerequisites: ['german-grammar-present-tense'],
    misconceptions: [
      'Using haben as the auxiliary when sein is required (e.g. "ich bin gefahren" not "ich habe gefahren")',
      'Forgetting the ge- prefix on past participles or adding it to inseparable verbs',
      'Placing the past participle in the wrong position (it goes to the end of the clause)',
    ],
    vocabulary: ['das Perfekt', 'das Imperfekt', 'das Partizip', 'das Hilfsverb', 'gestern', 'letzte Woche'],
    metadata: {
      teachingHours: 10,
      examWeight: 12,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // German 7: Grammar — Future & Conditional
  {
    id: 'german-grammar-future-conditional',
    name: 'Grammar: Future & Conditional Tenses',
    description: 'Using the future tense with werden, the conditional with wurde, and conditional clauses with wenn',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Form the future tense using werden + infinitive',
      'Use the conditional with wurde + infinitive for hypothetical situations',
      'Construct wenn-clauses with correct verb position',
      'Express plans and intentions using a variety of future expressions',
    ],
    prerequisites: ['german-grammar-present-tense'],
    misconceptions: [
      'Forgetting that the infinitive goes to the end of the clause with werden',
      'Confusing werden (future auxiliary) with wurden (conditional)',
      'Not sending the verb to the end in wenn subordinate clauses',
    ],
    vocabulary: ['die Zukunft', 'der Konjunktiv', 'wenn', 'ich wurde', 'ich mochte', 'morgen', 'in der Zukunft'],
    metadata: {
      teachingHours: 8,
      examWeight: 10,
      ncReference: 'KS4-MFL-Grammar',
    },
  },

  // German 8: Vocabulary — Identity, Daily Life & School
  {
    id: 'german-vocab-identity-daily-life',
    name: 'Vocabulary: Identity, Daily Life & School',
    description: 'Key vocabulary for talking about family, relationships, daily routines, school life, and interests',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe yourself, your family, and your relationships using varied adjectives',
      'Talk about daily routine including meals, chores, and free-time activities',
      'Discuss school subjects, school rules, and opinions about education',
      'Express preferences and justify opinions about hobbies and lifestyle',
    ],
    prerequisites: [],
    vocabulary: ['die Familie', 'die Freunde', 'die Schule', 'die Facher', 'der Alltag', 'die Hobbys', 'das Fruhstuck', 'der Stundenplan'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-1',
    },
  },

  // German 9: Vocabulary — Local Area, Holidays & Travel
  {
    id: 'german-vocab-travel-holidays',
    name: 'Vocabulary: Local Area, Holidays & Travel',
    description: 'Key vocabulary for describing your local area, discussing holidays, and making travel arrangements',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe your town, region, and local amenities',
      'Give and understand directions and describe locations',
      'Talk about past and future holidays including accommodation and activities',
      'Make travel arrangements and handle problems while travelling',
      'Order food and drink and discuss German-speaking food culture',
    ],
    prerequisites: [],
    vocabulary: ['die Stadt', 'die Gegend', 'der Urlaub', 'das Hotel', 'das Verkehrsmittel', 'der Bahnhof', 'die Fahrkarte', 'das Restaurant'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-2',
    },
  },

  // German 10: Vocabulary — Global Issues, Environment & Future Plans
  {
    id: 'german-vocab-global-issues',
    name: 'Vocabulary: Global Issues, Environment & Future Plans',
    description: 'Key vocabulary for discussing environmental issues, social problems, charitable work, and career aspirations',
    parentId: null,
    subject: 'german',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Discuss environmental problems and propose sustainable solutions',
      'Talk about social issues such as poverty, inequality, and health',
      'Describe charitable work and volunteering experiences',
      'Discuss career plans, work experience, and future ambitions',
    ],
    prerequisites: ['german-grammar-future-conditional'],
    misconceptions: [
      'Oversimplifying arguments due to limited thematic vocabulary in German',
      'Confusing noun genders which affect article and adjective endings in context',
    ],
    vocabulary: ['die Umwelt', 'die Verschmutzung', 'das Recycling', 'die Arbeitslosigkeit', 'die Freiwilligenarbeit', 'die Zukunft', 'der Beruf', 'die Rechte'],
    metadata: {
      teachingHours: 10,
      examWeight: 8,
      ncReference: 'KS4-MFL-Themes-3',
    },
  },
];
