/**
 * GCSE Social Sciences Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE Psychology, Sociology, and Religious Education
 * Based on standard specifications common across AQA, Edexcel, OCR, WJEC, and CCEA.
 *
 * Structure:
 * - Psychology: Memory, Social Influence, Attachment, Psychopathology, Approaches, Biopsychology, Research Methods
 * - Sociology: Families, Education, Crime, Stratification, Research Methods, Beliefs, Media
 * - Religious Education: Christianity, Islam, Philosophical Themes, Ethical Themes
 *
 * @module sage/curriculum/data/social-sciences
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Social Sciences Curriculum Topics
 */
export const socialSciencesTopics: CurriculumTopic[] = [
  // ========================================
  // PSYCHOLOGY
  // ========================================
  {
    id: 'psychology-main',
    name: 'Psychology',
    description: 'The scientific study of the mind and behaviour, exploring how and why humans think, feel, and act',
    parentId: null,
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand key psychological concepts, theories, and research studies',
      'Evaluate the strengths and limitations of psychological research',
      'Apply psychological knowledge to real-world scenarios',
      'Describe and evaluate different approaches in psychology',
      'Understand ethical issues in psychological research',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking psychology is just common sense rather than a rigorous scientific discipline',
      'Believing psychologists can read minds or always know what people are thinking',
      'Assuming one psychological approach can explain all human behaviour',
    ],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-Psychology',
    },
  },

  // Psychology 1: Memory
  {
    id: 'psychology-memory',
    name: 'Memory',
    description: 'How memories are encoded, stored, and retrieved, including models of memory and factors affecting accuracy',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe and evaluate the Multi-Store Model of memory (Atkinson & Shiffrin)',
      'Describe and evaluate the Working Memory Model (Baddeley & Hitch)',
      'Explain theories of forgetting including interference and retrieval failure',
      'Evaluate factors affecting the accuracy of eyewitness testimony',
      'Describe the cognitive interview technique and its effectiveness',
    ],
    prerequisites: [],
    vocabulary: ['sensory register', 'short-term memory', 'long-term memory', 'encoding', 'retrieval', 'working memory', 'phonological loop', 'visuo-spatial sketchpad', 'central executive', 'episodic buffer', 'interference', 'proactive interference', 'retroactive interference', 'retrieval failure', 'eyewitness testimony', 'leading questions', 'cognitive interview'],
    misconceptions: [
      'Thinking short-term memory and working memory are the same thing (the Working Memory Model replaced the idea of a single short-term store)',
      'Believing eyewitness testimony is always reliable because people trust their own memories',
      'Assuming forgetting is simply memories disappearing rather than a failure of retrieval or interference',
    ],
  },

  // Psychology 2: Social Influence
  {
    id: 'psychology-social-influence',
    name: 'Social Influence',
    description: 'How the thoughts, feelings, and behaviour of individuals are influenced by others',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain types of conformity (compliance, identification, internalisation) and factors affecting conformity',
      'Describe and evaluate Asch\'s line study on conformity',
      'Explain obedience and factors affecting obedience to authority',
      'Describe and evaluate Milgram\'s shock experiment on obedience',
      'Understand social influence processes including minority influence and social change',
    ],
    prerequisites: [],
    vocabulary: ['conformity', 'compliance', 'identification', 'internalisation', 'normative social influence', 'informational social influence', 'obedience', 'authority', 'agentic state', 'autonomous state', 'legitimacy of authority', 'situational variables', 'minority influence', 'social change'],
    misconceptions: [
      'Thinking conformity and obedience are the same thing (conformity is following the group; obedience is following an authority figure)',
      'Believing Milgram\'s participants were all cruel people rather than ordinary individuals responding to situational pressures',
      'Assuming minority influence is always less powerful than majority influence (minorities can create lasting social change)',
    ],
  },

  // Psychology 3: Attachment
  {
    id: 'psychology-attachment',
    name: 'Attachment',
    description: 'The emotional bond between an infant and their caregiver and its effects on development',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe stages of attachment development and multiple attachments',
      'Explain and evaluate Bowlby\'s monotropic theory of attachment',
      'Describe and evaluate Ainsworth\'s Strange Situation classification of attachment types',
      'Understand the effects of maternal deprivation and institutional care on development',
      'Evaluate the influence of early attachment on later relationships (internal working model)',
    ],
    prerequisites: [],
    vocabulary: ['attachment', 'monotropy', 'internal working model', 'critical period', 'sensitive period', 'Strange Situation', 'secure attachment', 'insecure-avoidant', 'insecure-resistant', 'maternal deprivation', 'privation', 'institutionalisation', 'Romanian orphan studies'],
    misconceptions: [
      'Thinking attachment can only form with the biological mother (attachment figures can be fathers, grandparents, or other primary caregivers)',
      'Believing that children who experience early deprivation can never recover (research shows resilience is possible with later support)',
      'Confusing deprivation (loss of an attachment figure) with privation (never forming an attachment in the first place)',
    ],
  },

  // Psychology 4: Psychopathology
  {
    id: 'psychology-psychopathology',
    name: 'Psychopathology',
    description: 'Definitions, explanations, and treatments of mental health conditions including phobias, depression, and OCD',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain definitions of abnormality (deviation from social norms, failure to function, statistical infrequency, deviation from ideal mental health)',
      'Describe characteristics and explanations of phobias, depression, and OCD',
      'Evaluate behavioural, cognitive, and biological explanations of mental disorders',
      'Describe and evaluate treatments for phobias (systematic desensitisation, flooding), depression (CBT, antidepressants), and OCD (drug therapy)',
    ],
    prerequisites: [],
    vocabulary: ['abnormality', 'phobia', 'depression', 'OCD', 'obsession', 'compulsion', 'systematic desensitisation', 'flooding', 'CBT', 'cognitive behavioural therapy', 'antidepressants', 'SSRIs', 'serotonin', 'statistical infrequency', 'deviation from social norms'],
    misconceptions: [
      'Thinking OCD is simply liking things to be tidy (OCD involves distressing intrusive thoughts and compulsive behaviours that significantly impact daily life)',
      'Believing depression is just feeling sad and people should be able to snap out of it (depression is a clinical condition with biological, cognitive, and social components)',
      'Assuming phobias are rational fears that everyone can understand (phobias are irrational and disproportionate responses to specific stimuli)',
    ],
  },

  // Psychology 5: Approaches in Psychology
  {
    id: 'psychology-approaches',
    name: 'Approaches in Psychology',
    description: 'Major theoretical perspectives used to explain human behaviour and mental processes',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Describe and evaluate the biological approach including genetic basis of behaviour and the role of neurotransmitters',
      'Describe and evaluate the cognitive approach including computer models and schema theory',
      'Describe and evaluate the behaviourist approach including classical and operant conditioning',
      'Describe and evaluate the psychodynamic approach including the role of the unconscious mind',
      'Describe and evaluate the humanistic approach including Maslow\'s hierarchy of needs and self-actualisation',
    ],
    prerequisites: [],
    vocabulary: ['biological approach', 'neurotransmitter', 'genetics', 'cognitive approach', 'schema', 'information processing', 'behaviourist approach', 'classical conditioning', 'operant conditioning', 'reinforcement', 'psychodynamic approach', 'unconscious mind', 'id', 'ego', 'superego', 'humanistic approach', 'self-actualisation', 'hierarchy of needs'],
    misconceptions: [
      'Thinking one approach is the correct explanation for all behaviour (each approach has strengths and limitations; most psychologists take an eclectic view)',
      'Believing the psychodynamic approach is the same as modern psychology (it is one of several approaches and is less dominant today)',
      'Assuming the behaviourist approach ignores all internal mental processes (radical behaviourists did, but modern learning theory acknowledges cognition)',
    ],
  },

  // Psychology 6: Biopsychology
  {
    id: 'psychology-biopsychology',
    name: 'Biopsychology',
    description: 'The biological basis of behaviour including the nervous system, brain structure, and the fight-or-flight response',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Describe the structure and function of the nervous system (central and peripheral)',
      'Explain the structure and function of sensory, relay, and motor neurons',
      'Describe the process of synaptic transmission',
      'Explain the fight-or-flight response and the role of adrenaline',
      'Describe brain regions and their functions (frontal lobe, temporal lobe, occipital lobe, cerebellum)',
    ],
    prerequisites: [],
    vocabulary: ['nervous system', 'central nervous system', 'peripheral nervous system', 'neuron', 'sensory neuron', 'relay neuron', 'motor neuron', 'synapse', 'neurotransmitter', 'fight-or-flight', 'adrenaline', 'frontal lobe', 'temporal lobe', 'occipital lobe', 'cerebellum'],
    misconceptions: [
      'Thinking humans only use 10% of their brain (brain imaging shows all areas of the brain have functions)',
      'Believing the fight-or-flight response is always harmful (it is an adaptive survival mechanism that becomes problematic only when chronically activated)',
      'Assuming brain regions work independently (brain regions are interconnected and work together for most functions)',
    ],
  },

  // Psychology 7: Research Methods
  {
    id: 'psychology-research-methods',
    name: 'Research Methods in Psychology',
    description: 'How psychologists design, conduct, and analyse research to study human behaviour scientifically',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe experimental methods including laboratory, field, and natural experiments',
      'Explain non-experimental methods including observations, questionnaires, and interviews',
      'Understand sampling methods including random, stratified, and opportunity sampling',
      'Explain ethical guidelines in psychological research (BPS Code of Ethics)',
      'Understand concepts of reliability, validity, and bias in research',
    ],
    prerequisites: [],
    vocabulary: ['hypothesis', 'independent variable', 'dependent variable', 'extraneous variable', 'laboratory experiment', 'field experiment', 'natural experiment', 'observation', 'questionnaire', 'sampling', 'random sampling', 'opportunity sampling', 'reliability', 'validity', 'ethics', 'informed consent', 'deception', 'right to withdraw'],
    misconceptions: [
      'Thinking laboratory experiments are always better than other methods (they have high control but low ecological validity)',
      'Believing correlation proves causation (a correlation shows a relationship but not that one variable causes the other)',
      'Assuming ethical guidelines prevent all psychological research from being conducted (guidelines aim to protect participants while still allowing valuable research)',
    ],
  },

  // Psychology 8: Language, Thought and Communication
  {
    id: 'psychology-language-thought',
    name: 'Language, Thought and Communication',
    description: 'The relationship between language and cognitive processes, and how humans and animals communicate',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the relationship between language and thought (Piaget vs Sapir-Whorf hypothesis)',
      'Describe different forms of human and animal communication',
      'Evaluate explanations for non-verbal communication including eye contact and body language',
      'Discuss the role of language in cognitive development',
    ],
    prerequisites: ['psychology-approaches'],
    vocabulary: ['linguistic relativity', 'Sapir-Whorf hypothesis', 'non-verbal communication', 'body language', 'paralanguage', 'personal space', 'eye contact', 'egocentric speech', 'inner speech'],
    misconceptions: [
      'Thinking language and thought are the same thing (Piaget argued thought comes before language, while Sapir-Whorf argued language shapes thought)',
      'Believing non-verbal communication is universal across all cultures (many gestures and expressions have different meanings in different cultures)',
      'Assuming animal communication is the same as human language (animal communication lacks key features such as displacement and creativity)',
    ],
    metadata: {
      teachingHours: 5,
      examWeight: 8,
      ncReference: 'KS4-Psychology-LanguageThought',
    },
  },

  // Psychology 9: Criminal Psychology
  {
    id: 'psychology-criminal',
    name: 'Criminal Psychology',
    description: 'Psychological explanations for criminal behaviour and the effectiveness of different approaches to dealing with offenders',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Describe biological explanations of criminal behaviour including brain abnormalities and genetic factors',
      'Explain psychological theories of criminality including Eysenck\'s personality theory',
      'Evaluate the effectiveness of different punishments and rehabilitation programmes',
      'Discuss offender profiling techniques (top-down and bottom-up approaches)',
      'Analyse the role of eyewitness testimony and its reliability in criminal investigations',
    ],
    prerequisites: ['psychology-social-influence', 'psychology-approaches'],
    vocabulary: ['recidivism', 'rehabilitation', 'retribution', 'deterrence', 'offender profiling', 'top-down approach', 'bottom-up approach', 'atavistic form', 'Lombroso', 'Eysenck', 'psychoticism', 'neuroticism', 'extraversion', 'token economy'],
    misconceptions: [
      'Believing criminal behaviour is purely genetic or purely environmental (most psychologists favour an interactionist approach combining both)',
      'Thinking offender profiling is as accurate and reliable as depicted on television (profiling has significant limitations and low success rates)',
      'Assuming all criminals have a psychological disorder (most offenders do not meet criteria for mental illness)',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 8,
      ncReference: 'KS4-Psychology-Criminal',
    },
  },

  // Psychology 10: Development
  {
    id: 'psychology-development',
    name: 'Development',
    description: 'How people change physically, cognitively, and socially across the lifespan, including theories of cognitive and moral development',
    parentId: 'psychology-main',
    subject: 'psychology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe Piaget\'s stages of cognitive development and their key features',
      'Explain the role of education in cognitive development (Vygotsky\'s zone of proximal development)',
      'Evaluate the effects of early experiences on later development',
      'Discuss moral development including Kohlberg\'s stages of moral reasoning',
      'Describe the development of self-concept and identity across the lifespan',
    ],
    prerequisites: ['psychology-attachment'],
    vocabulary: ['schema', 'assimilation', 'accommodation', 'conservation', 'egocentrism', 'object permanence', 'zone of proximal development', 'scaffolding', 'moral reasoning', 'self-concept', 'pre-operational', 'concrete operational', 'formal operational'],
    misconceptions: [
      'Thinking children are simply miniature adults who think in the same way (Piaget demonstrated children think qualitatively differently at each stage)',
      'Believing all children pass through developmental stages at exactly the same age (stages indicate a general sequence but ages are approximate)',
      'Assuming development stops at the end of adolescence (cognitive and social development continues throughout adulthood)',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 8,
      ncReference: 'KS4-Psychology-Development',
    },
  },

  // ========================================
  // SOCIOLOGY
  // ========================================
  {
    id: 'sociology-main',
    name: 'Sociology',
    description: 'The systematic study of society, social institutions, and social relationships',
    parentId: null,
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand key sociological concepts including socialisation, culture, and identity',
      'Analyse social structures and institutions such as family, education, and the media',
      'Evaluate sociological perspectives including functionalism, Marxism, and feminism',
      'Apply sociological research methods to investigate social issues',
      'Understand patterns of social inequality and stratification',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking sociology is just personal opinions about society rather than evidence-based research',
      'Believing sociological perspectives are about individual behaviour rather than social structures and patterns',
      'Assuming sociological theories are politically motivated rather than analytical frameworks for understanding society',
    ],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-Sociology',
    },
  },

  // Sociology 1: Families & Households
  {
    id: 'sociology-families',
    name: 'Families & Households',
    description: 'The changing nature of family structures, conjugal roles, and the impact of social policies on families',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe different family types including nuclear, extended, lone-parent, reconstituted, and same-sex families',
      'Explain changing patterns of marriage, cohabitation, and divorce in the UK',
      'Evaluate functionalist, Marxist, and feminist perspectives on the role of the family',
      'Analyse changing conjugal roles and the domestic division of labour',
      'Understand the impact of government policies on families',
    ],
    prerequisites: [],
    vocabulary: ['nuclear family', 'extended family', 'lone-parent family', 'reconstituted family', 'cohabitation', 'conjugal roles', 'symmetrical family', 'domestic division of labour', 'dual burden', 'triple shift', 'socialisation', 'social policy'],
    misconceptions: [
      'Thinking the nuclear family has always been the dominant family type (family structures have varied significantly across history and cultures)',
      'Believing rising divorce rates mean families are failing (divorce may reflect greater individual freedom and higher expectations of relationships)',
      'Assuming all feminists are anti-family (many feminists advocate for more equal relationships within families)',
    ],
  },

  // Sociology 2: Education
  {
    id: 'sociology-education',
    name: 'Education',
    description: 'The role of education in society and factors affecting educational achievement',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the role of education from functionalist, Marxist, and feminist perspectives',
      'Analyse class differences in educational achievement including material and cultural deprivation',
      'Evaluate gender differences in educational achievement and subject choice',
      'Describe ethnic differences in educational achievement and factors affecting them',
      'Understand the impact of educational policies including comprehensivisation, marketisation, and academies',
    ],
    prerequisites: [],
    vocabulary: ['meritocracy', 'hidden curriculum', 'cultural capital', 'material deprivation', 'cultural deprivation', 'labelling', 'self-fulfilling prophecy', 'streaming', 'setting', 'marketisation', 'academies', 'free schools', 'achievement gap', 'subculture'],
    misconceptions: [
      'Thinking educational achievement is purely about individual ability and effort (social class, gender, and ethnicity all have significant structural effects)',
      'Believing meritocracy fully operates in education (sociologists argue that social advantages and disadvantages affect outcomes)',
      'Assuming labelling theory means teachers deliberately discriminate (labelling is often unconscious and embedded in institutional practices)',
    ],
  },

  // Sociology 3: Crime & Deviance
  {
    id: 'sociology-crime',
    name: 'Crime & Deviance',
    description: 'Sociological explanations of crime, the role of the criminal justice system, and media representations of crime',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain functionalist, Marxist, and interactionist theories of crime and deviance',
      'Analyse patterns of crime by social class, gender, ethnicity, and age',
      'Evaluate the role of policing, courts, and punishment in the criminal justice system',
      'Understand the role of the media in shaping perceptions of crime (moral panics, deviancy amplification)',
      'Describe and evaluate methods of crime prevention including situational and environmental strategies',
    ],
    prerequisites: [],
    vocabulary: ['crime', 'deviance', 'social control', 'formal social control', 'informal social control', 'labelling', 'moral panic', 'deviancy amplification', 'white-collar crime', 'corporate crime', 'dark figure of crime', 'recidivism', 'deterrence', 'rehabilitation'],
    misconceptions: [
      'Thinking crime statistics accurately reflect the true amount of crime (the dark figure of crime means many offences go unreported or unrecorded)',
      'Believing crime is only committed by the working class (white-collar and corporate crime by higher classes is widespread but less visible)',
      'Assuming harsher punishments always reduce crime (research shows rehabilitation and addressing root causes can be more effective than deterrence alone)',
    ],
  },

  // Sociology 4: Social Stratification
  {
    id: 'sociology-stratification',
    name: 'Social Stratification',
    description: 'How society is divided into hierarchical layers based on class, wealth, power, and status',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain different theories of social class including functionalist, Marxist, and Weberian perspectives',
      'Analyse patterns of social mobility in the UK and barriers to upward mobility',
      'Describe and evaluate explanations of poverty including individualistic and structural theories',
      'Understand the distribution of wealth and income inequality in the UK',
      'Evaluate the role of the welfare state in addressing poverty and inequality',
    ],
    prerequisites: [],
    vocabulary: ['social stratification', 'social class', 'bourgeoisie', 'proletariat', 'social mobility', 'meritocracy', 'life chances', 'poverty', 'absolute poverty', 'relative poverty', 'welfare state', 'means-tested benefits', 'universal benefits', 'wealth', 'income inequality'],
    misconceptions: [
      'Thinking social class no longer matters in modern Britain (research consistently shows class significantly affects life chances in education, health, and employment)',
      'Believing poverty is always caused by individual laziness (structural factors such as unemployment, low wages, and inadequate welfare play major roles)',
      'Assuming social mobility means anyone can succeed if they work hard enough (systemic barriers including cultural capital and social networks limit mobility)',
    ],
  },

  // Sociology 5: Research Methods
  {
    id: 'sociology-research-methods',
    name: 'Research Methods in Sociology',
    description: 'How sociologists design and conduct research to study society using quantitative and qualitative methods',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe and evaluate questionnaires as a research method including strengths and limitations',
      'Describe and evaluate different types of interviews (structured, unstructured, semi-structured)',
      'Explain participant and non-participant observation and their ethical challenges',
      'Understand ethical issues in sociological research including informed consent, confidentiality, and harm',
      'Evaluate the strengths and limitations of using secondary sources including official statistics and documents',
    ],
    prerequisites: [],
    vocabulary: ['quantitative data', 'qualitative data', 'questionnaire', 'structured interview', 'unstructured interview', 'participant observation', 'non-participant observation', 'covert observation', 'overt observation', 'reliability', 'validity', 'representativeness', 'sampling', 'ethics', 'informed consent', 'official statistics'],
    misconceptions: [
      'Thinking quantitative data is always more scientific than qualitative data (both have strengths depending on the research question)',
      'Believing surveys always produce reliable results (poorly designed questions, low response rates, and social desirability bias can undermine reliability)',
      'Assuming participant observation is always covert (researchers often conduct overt observation with participants aware of their role)',
    ],
  },

  // Sociology 6: Beliefs in Society
  {
    id: 'sociology-beliefs',
    name: 'Beliefs in Society',
    description: 'The role of religion, ideology, and belief systems in society and their relationship to social change',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain the process of secularisation and evaluate evidence for and against it',
      'Describe the rise of religious fundamentalism and its sociological explanations',
      'Analyse New Age movements and their significance in contemporary society',
      'Evaluate functionalist, Marxist, and feminist perspectives on religion',
    ],
    prerequisites: [],
    vocabulary: ['secularisation', 'fundamentalism', 'New Age movements', 'church', 'sect', 'denomination', 'cult', 'sacred', 'profane', 'ideology', 'collective conscience', 'liberation theology'],
    misconceptions: [
      'Thinking secularisation means religion has completely disappeared (many argue religion is changing form rather than declining)',
      'Believing fundamentalism is only found in non-Western religions (fundamentalist movements exist across Christianity, Islam, Judaism, and other faiths)',
      'Assuming New Age spirituality is not a serious subject of sociological study (it reflects significant changes in how people construct meaning and identity)',
    ],
  },

  // Sociology 7: Media
  {
    id: 'sociology-media',
    name: 'Media',
    description: 'The role of traditional and new media in shaping society, identity, and public opinion',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Analyse patterns of media ownership and concentration and their impact on content',
      'Evaluate media representations of gender, ethnicity, age, and social class',
      'Describe and evaluate different models of media effects (hypodermic syringe, uses and gratifications, cultural effects)',
      'Understand the impact of new media and digital communication on society and social interaction',
      'Explain the relationship between the media, crime, and moral panics',
    ],
    prerequisites: [],
    vocabulary: ['media ownership', 'concentration', 'pluralism', 'hegemony', 'representation', 'stereotype', 'hypodermic syringe model', 'uses and gratifications', 'cultural effects model', 'new media', 'citizen journalism', 'digital divide', 'moral panic', 'agenda setting', 'gatekeeping'],
    misconceptions: [
      'Thinking the hypodermic syringe model accurately describes media effects (audiences actively interpret media messages rather than passively absorbing them)',
      'Believing new media has made traditional media irrelevant (traditional media companies have adapted and still hold significant influence)',
      'Assuming social media gives everyone an equal voice (the digital divide and algorithmic filtering mean access and reach are unequal)',
    ],
  },

  // Sociology 8: Culture & Identity
  {
    id: 'sociology-culture-identity',
    name: 'Culture & Identity',
    description: 'How culture shapes identity through socialisation, and the role of social institutions in forming who we are',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Define and distinguish between culture, norms, values, and customs',
      'Explain the process of primary and secondary socialisation',
      'Discuss the role of agents of socialisation (family, education, media, peers, religion)',
      'Analyse how identity is shaped by class, gender, ethnicity, and age',
      'Evaluate the concepts of subcultures, cultural diversity, and hybrid identities',
    ],
    prerequisites: [],
    vocabulary: ['culture', 'norms', 'values', 'socialisation', 'primary socialisation', 'secondary socialisation', 'identity', 'subculture', 'cultural diversity', 'social construction', 'hybrid identity', 'globalisation', 'feral children'],
    misconceptions: [
      'Thinking identity is entirely fixed and determined at birth (sociologists argue identity is socially constructed and can change over time)',
      'Believing culture is only about art, music, and literature (culture includes all shared norms, values, and practices of a group)',
      'Assuming feral children prove nature is more important than nurture (they actually demonstrate the importance of socialisation for human development)',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 8,
      ncReference: 'KS4-Sociology-CultureIdentity',
    },
  },

  // Sociology 9: Health
  {
    id: 'sociology-health',
    name: 'Health',
    description: 'Social factors affecting health, illness, and access to healthcare, and the social construction of health and illness',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the social model versus the biomedical model of health',
      'Analyse the impact of social class, gender, and ethnicity on health outcomes and life expectancy',
      'Discuss the role of the NHS and inequalities in access to healthcare',
      'Evaluate the concept of the sick role (Parsons) and its limitations',
      'Describe the social construction of mental illness and its implications',
    ],
    prerequisites: ['sociology-stratification'],
    vocabulary: ['biomedical model', 'social model', 'health inequalities', 'inverse care law', 'sick role', 'stigma', 'mental health', 'life expectancy', 'morbidity', 'mortality', 'iatrogenesis', 'medicalisation'],
    misconceptions: [
      'Thinking health is determined only by biology and personal lifestyle choices (social class, environment, and structural factors significantly affect health outcomes)',
      'Believing the NHS provides perfectly equal access to all social groups (the inverse care law shows those most in need often receive the least care)',
      'Assuming mental health conditions are purely medical rather than also socially influenced (diagnosis and treatment are shaped by cultural and social factors)',
    ],
    metadata: {
      teachingHours: 5,
      examWeight: 8,
      ncReference: 'KS4-Sociology-Health',
    },
  },

  // Sociology 10: Globalisation
  {
    id: 'sociology-globalisation',
    name: 'Globalisation & Global Development',
    description: 'How globalisation affects societies, economies, cultures, and patterns of inequality worldwide',
    parentId: 'sociology-main',
    subject: 'sociology',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Define globalisation and describe its economic, cultural, and political dimensions',
      'Evaluate the impact of transnational corporations on developing countries',
      'Discuss different theories of global development (modernisation vs dependency theory)',
      'Analyse the role of international organisations (UN, World Bank, IMF) in development',
    ],
    prerequisites: ['sociology-stratification'],
    vocabulary: ['globalisation', 'transnational corporation', 'developing country', 'modernisation theory', 'dependency theory', 'neoliberalism', 'cultural imperialism', 'fair trade', 'aid', 'debt', 'exploitation'],
    misconceptions: [
      'Thinking globalisation only affects developing countries (it reshapes economies, cultures, and identities in all societies)',
      'Believing aid always helps developing nations without negative consequences (some sociologists argue aid can create dependency and serve donor interests)',
      'Assuming globalisation leads inevitably to cultural homogenisation (local cultures often adapt, resist, or create hybrid forms)',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 8,
      ncReference: 'KS4-Sociology-Globalisation',
    },
  },

  // ========================================
  // RELIGIOUS EDUCATION
  // ========================================
  {
    id: 'religious-education-main',
    name: 'Religious Education',
    description: 'The study of religious beliefs, teachings, practices, and their application to ethical and philosophical questions',
    parentId: null,
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand the core beliefs and teachings of Christianity and Islam',
      'Analyse philosophical arguments about the existence of God',
      'Evaluate religious and non-religious perspectives on ethical issues',
      'Apply religious teachings to contemporary moral dilemmas',
      'Demonstrate respect for diverse religious and non-religious worldviews',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking religious education is about promoting a particular religion (it is about understanding and evaluating diverse worldviews)',
      'Believing all members of a religion hold identical beliefs and practices (there is significant diversity within every faith tradition)',
      'Assuming religious and scientific perspectives are always in conflict (many believers see them as complementary)',
    ],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-RE',
    },
  },

  // RE 1: Christianity — Beliefs & Teachings
  {
    id: 're-christianity-beliefs',
    name: 'Christianity: Beliefs & Teachings',
    description: 'Core Christian beliefs about God, Jesus, salvation, and the afterlife',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the Christian belief in the Trinity (Father, Son, and Holy Spirit) and its significance',
      'Describe Christian teachings on creation, incarnation, crucifixion, and resurrection',
      'Understand different Christian beliefs about salvation including grace and works',
      'Explain Christian beliefs about the afterlife including heaven, hell, and judgement',
      'Evaluate the significance of key biblical texts for Christian belief and practice',
    ],
    prerequisites: [],
    vocabulary: ['Trinity', 'incarnation', 'crucifixion', 'resurrection', 'ascension', 'salvation', 'grace', 'atonement', 'original sin', 'heaven', 'hell', 'purgatory', 'judgement', 'omnipotent', 'omniscient', 'benevolent'],
    misconceptions: [
      'Thinking the Trinity means Christians believe in three separate gods (the Trinity is one God in three persons)',
      'Believing all Christians interpret the Bible literally (many Christians read parts of the Bible as metaphorical or allegorical)',
      'Assuming all Christians agree on what happens after death (Catholic, Protestant, and Orthodox traditions have different emphases)',
    ],
  },

  // RE 2: Christianity — Practices
  {
    id: 're-christianity-practices',
    name: 'Christianity: Practices',
    description: 'Christian worship, sacraments, festivals, and the role of the Church in the local and global community',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe different forms of worship (liturgical, non-liturgical, private prayer)',
      'Explain the significance of sacraments, especially baptism and the Eucharist',
      'Describe the importance of Christmas and Easter in the Christian calendar',
      'Discuss the role of the Church in the local community and worldwide mission',
      'Evaluate the importance of pilgrimage and its significance for believers',
    ],
    prerequisites: ['re-christianity-beliefs'],
    vocabulary: ['liturgical worship', 'non-liturgical worship', 'Eucharist', 'Holy Communion', 'baptism', 'sacrament', 'pilgrimage', 'evangelism', 'mission', 'Advent', 'Lent', 'denomination', 'prayer', 'Lord\'s Prayer'],
    misconceptions: [
      'Thinking all Christians worship in the same way (there are significant differences between Catholic, Protestant, and Orthodox worship)',
      'Believing sacraments are observed by all Christian denominations equally (some traditions recognise two sacraments, others seven)',
      'Assuming the Church\'s role is limited to Sunday services (many churches run food banks, youth clubs, and community support programmes)',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 12,
      ncReference: 'KS4-RE-ChristianityPractices',
    },
  },

  // RE 3: Islam — Beliefs & Teachings
  {
    id: 're-islam-beliefs',
    name: 'Islam: Beliefs & Teachings',
    description: 'Core Islamic beliefs including the six articles of faith, the five pillars, and the concept of jihad',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the six articles of faith in Sunni Islam (Tawhid, angels, holy books, prophets, Day of Judgement, predestination)',
      'Describe the five pillars of Islam (Shahadah, Salah, Zakah, Sawm, Hajj) and their significance',
      'Understand the concept of Tawhid (oneness of God) as the foundation of Islamic belief',
      'Explain different understandings of jihad (greater and lesser jihad)',
      'Evaluate the significance of the Quran and Hadith as sources of authority in Islam',
    ],
    prerequisites: [],
    vocabulary: ['Tawhid', 'Shahadah', 'Salah', 'Zakah', 'Sawm', 'Hajj', 'Quran', 'Hadith', 'Sunnah', 'prophet', 'Muhammad', 'angel', 'Jibril', 'akhirah', 'jihad', 'Sunni', 'Shia'],
    misconceptions: [
      'Thinking jihad only means holy war (the greater jihad is the personal struggle to live a good Muslim life, which is considered more important)',
      'Believing all Muslims practise Islam in exactly the same way (there are significant differences between Sunni, Shia, and Sufi traditions)',
      'Assuming Islam is incompatible with science or modernity (Islamic civilisation made major contributions to science, mathematics, and medicine)',
    ],
  },

  // RE 4: Islam — Practices
  {
    id: 're-islam-practices',
    name: 'Islam: Practices',
    description: 'The Five Pillars of Islam, Ten Obligatory Acts, festivals, and the role of the mosque in Muslim life',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe the Five Pillars of Islam and the Ten Obligatory Acts (Shia) and their significance',
      'Explain the practice and significance of Salah (prayer) including preparation and movements',
      'Describe the importance of Sawm (fasting during Ramadan) and Zakah (charitable giving)',
      'Discuss the significance of Hajj (pilgrimage to Makkah) for Muslims',
      'Evaluate the celebration and importance of Eid ul-Fitr and Eid ul-Adha',
    ],
    prerequisites: ['re-islam-beliefs'],
    vocabulary: ['Shahadah', 'Salah', 'Zakah', 'Sawm', 'Hajj', 'mosque', 'imam', 'Ramadan', 'Eid ul-Fitr', 'Eid ul-Adha', 'wudu', 'Makkah', 'Ka\'aba', 'Khums', 'Ten Obligatory Acts'],
    misconceptions: [
      'Thinking all Muslims practise the Five Pillars in exactly the same way (Shia Muslims follow the Ten Obligatory Acts which overlap but differ)',
      'Believing Ramadan fasting means no food or water at all for a month (fasting is from dawn to sunset each day)',
      'Assuming Hajj is simply a holiday rather than a deeply spiritual obligation with specific rituals and meaning',
    ],
    metadata: {
      teachingHours: 6,
      examWeight: 12,
      ncReference: 'KS4-RE-IslamPractices',
    },
  },

  // RE 5: Existence of God
  {
    id: 're-existence-of-god',
    name: 'Philosophical Themes: Existence of God',
    description: 'Philosophical arguments for and against the existence of God and the problem of evil and suffering',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Describe and evaluate the design argument (teleological argument) for the existence of God',
      'Describe and evaluate the first cause argument (cosmological argument) for the existence of God',
      'Analyse the problem of evil and suffering as a challenge to belief in God',
      'Explain religious and philosophical responses to the problem of evil (theodicies)',
      'Evaluate the significance of religious experience and revelation as evidence for God',
    ],
    prerequisites: [],
    vocabulary: ['theism', 'atheism', 'agnosticism', 'design argument', 'teleological argument', 'first cause argument', 'cosmological argument', 'problem of evil', 'theodicy', 'natural evil', 'moral evil', 'free will', 'revelation', 'general revelation', 'special revelation', 'numinous'],
    misconceptions: [
      'Thinking the design argument proves God exists conclusively (it is an argument for probability, not proof, and has counter-arguments including evolution)',
      'Believing the problem of evil disproves God\'s existence (religious believers offer theodicies and argue evil is compatible with a loving God)',
      'Assuming all philosophers agree the arguments for God fail (there is ongoing philosophical debate with serious thinkers on both sides)',
    ],
  },

  // RE 7: Good, Evil and Suffering
  {
    id: 're-good-evil-suffering',
    name: 'Good, Evil and Suffering',
    description: 'Religious and philosophical responses to the problem of evil, the nature of suffering, and the origin of good and evil',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    level: 'GCSE',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain the problem of evil and suffering as a challenge to belief in an omnipotent, omnibenevolent God',
      'Distinguish between natural evil and moral evil with examples',
      'Describe Christian and Islamic responses to the problem of evil and suffering',
      'Evaluate theodicies including Augustine\'s, Irenaeus\', and the free will defence',
      'Discuss the role of suffering in spiritual growth and the development of faith',
    ],
    prerequisites: ['re-christianity-beliefs', 're-islam-beliefs'],
    vocabulary: ['theodicy', 'moral evil', 'natural evil', 'free will', 'omnipotent', 'omnibenevolent', 'the Fall', 'original sin', 'soul-making', 'inconsistent triad', 'privation of good', 'Satan', 'Iblis'],
    misconceptions: [
      'Thinking the existence of suffering automatically disproves the existence of God (religious believers offer multiple responses and theodicies)',
      'Believing religious people have no difficulty reconciling suffering with their faith (many believers experience genuine struggles with the problem of evil)',
      'Assuming the free will defence fully resolves the problem of natural evil (natural disasters and disease are not caused by human choices)',
    ],
    metadata: {
      teachingHours: 5,
      examWeight: 8,
      ncReference: 'KS4-RE-GoodEvil',
    },
  },

  // RE 8: Relationships
  {
    id: 're-relationships',
    name: 'Ethical Themes: Relationships',
    description: 'Religious and non-religious perspectives on marriage, divorce, family life, and gender equality',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain religious teachings on the nature and purpose of marriage in Christianity and Islam',
      'Describe religious attitudes to divorce and remarriage and their scriptural basis',
      'Evaluate religious and non-religious perspectives on the role of the family and the upbringing of children',
      'Analyse religious and non-religious attitudes to gender equality and the roles of men and women',
    ],
    prerequisites: [],
    vocabulary: ['marriage', 'civil partnership', 'cohabitation', 'divorce', 'annulment', 'remarriage', 'adultery', 'contraception', 'procreation', 'gender equality', 'complementarian', 'egalitarian', 'sacrament', 'nikah'],
    misconceptions: [
      'Thinking all religious people oppose divorce (many religious traditions permit divorce under certain circumstances)',
      'Believing all religious teachings on gender are the same (there is a wide spectrum from traditional to progressive views within each religion)',
      'Assuming religious views on relationships have not changed over time (many denominations have developed their positions in response to social change)',
    ],
  },

  // RE 5: Human Rights
  {
    id: 're-human-rights',
    name: 'Ethical Themes: Human Rights',
    description: 'Religious and non-religious perspectives on social justice, prejudice, and discrimination',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain religious teachings on social justice and the responsibility to help the poor and oppressed',
      'Describe religious and non-religious attitudes to prejudice and discrimination based on race, religion, and gender',
      'Evaluate the contribution of religious figures to human rights (e.g. Martin Luther King Jr, Desmond Tutu)',
      'Analyse religious and non-religious perspectives on wealth, poverty, and the fair distribution of resources',
    ],
    prerequisites: [],
    vocabulary: ['human rights', 'social justice', 'prejudice', 'discrimination', 'racism', 'sexism', 'equality', 'dignity', 'Imago Dei', 'ummah', 'stewardship', 'charity', 'zakah', 'tithe', 'liberation theology'],
    misconceptions: [
      'Thinking religion has always been on the side of human rights (religious institutions have historically both promoted and hindered human rights)',
      'Believing human rights are a purely secular concept (many religious traditions have long-standing teachings about justice and human dignity)',
      'Assuming prejudice is only about individual attitudes (sociologists and theologians recognise institutional and structural discrimination)',
    ],
  },

  // RE 6: Peace & Conflict
  {
    id: 're-peace-conflict',
    name: 'Ethical Themes: Peace & Conflict',
    description: 'Religious and non-religious perspectives on war, peace, terrorism, and reconciliation',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the concept of just war theory and its criteria (jus ad bellum and jus in bello)',
      'Describe religious and non-religious perspectives on pacifism and conscientious objection',
      'Analyse religious and non-religious responses to terrorism and violent extremism',
      'Evaluate the role of religion in peacemaking, reconciliation, and conflict resolution',
      'Understand religious teachings on the use of weapons of mass destruction',
    ],
    prerequisites: [],
    vocabulary: ['just war', 'holy war', 'pacifism', 'conscientious objector', 'terrorism', 'extremism', 'reconciliation', 'forgiveness', 'peacemaking', 'weapons of mass destruction', 'nuclear weapons', 'Geneva Convention', 'jus ad bellum', 'jus in bello'],
    misconceptions: [
      'Thinking just war theory means religious people support all wars (just war theory sets strict conditions that must be met before war is considered morally acceptable)',
      'Believing pacifism means doing nothing in the face of injustice (pacifists advocate for non-violent resistance and protest)',
      'Assuming terrorism is motivated only by religion (terrorism has political, economic, and social causes; religious justifications are often contested by mainstream believers)',
    ],
  },

  // RE 7: Crime & Punishment
  {
    id: 're-crime-punishment',
    name: 'Ethical Themes: Crime & Punishment',
    description: 'Religious and non-religious perspectives on the aims of punishment, the death penalty, and forgiveness',
    parentId: 'religious-education-main',
    subject: 'religious-education',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the aims of punishment including retribution, deterrence, reformation, and protection of society',
      'Evaluate religious and non-religious attitudes to the death penalty',
      'Describe religious teachings on forgiveness and their application to criminal justice',
      'Analyse religious and non-religious perspectives on the treatment of criminals and prison reform',
    ],
    prerequisites: [],
    vocabulary: ['retribution', 'deterrence', 'reformation', 'rehabilitation', 'protection', 'death penalty', 'capital punishment', 'forgiveness', 'repentance', 'justice', 'mercy', 'prison', 'community service', 'corporal punishment', 'restorative justice'],
    misconceptions: [
      'Thinking all religions support the death penalty because of historical practices (many modern religious leaders and denominations oppose capital punishment)',
      'Believing forgiveness means there should be no punishment (religious teachings often distinguish between forgiving the person and holding them accountable for their actions)',
      'Assuming the purpose of punishment is only to make offenders suffer (most ethical frameworks recognise multiple aims including rehabilitation and protection of society)',
    ],
  },
];

/**
 * Get all social sciences topics combined
 */
export function getAllSocialSciencesTopics(): CurriculumTopic[] {
  return socialSciencesTopics;
}

/**
 * Get topics by specific social sciences subject
 */
export function getTopicsBySubject(subject: 'psychology' | 'sociology' | 'religious-education'): CurriculumTopic[] {
  return socialSciencesTopics.filter(t => t.subject === subject);
}

/**
 * Get all top-level social sciences topics (main subject areas)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return socialSciencesTopics.filter(t => t.parentId === null);
}

/**
 * Get all child topics of a parent topic
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return socialSciencesTopics.filter(t => t.parentId === parentId);
}

/**
 * Get a social sciences topic by ID
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return socialSciencesTopics.find(t => t.id === id);
}
