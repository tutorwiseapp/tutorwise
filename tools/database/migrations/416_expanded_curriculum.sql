-- Migration 416: Expanded Curriculum Topics
-- Seeds GCSE English, GCSE Computing, A-Level Maths, A-Level Sciences,
-- Primary/KS2, SQA National 5/Higher, and CIE IGCSE topics.

BEGIN;

-- =========================================
-- GCSE ENGLISH LANGUAGE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Reading Fiction & Literary Texts', 'eng-lang-reading-fiction', 'gcse',
  '["Identify and interpret explicit and implicit information","Analyse how writers use language for effect","Examine structural features and their impact on the reader","Evaluate texts critically, supporting views with textual references"]',
  '["inference","connotation","imagery","metaphor","simile","pathetic fallacy","foreshadowing","narrative perspective"]',
  '["Identifying a technique without explaining its effect","Retelling the story instead of analysing language","Confusing structure with language analysis"]',
  20, 300),
('english', 'Reading Non-Fiction & Transactional Texts', 'eng-lang-reading-nonfiction', 'gcse',
  '["Identify and interpret information from non-fiction sources","Analyse how writers use language and structure to influence readers","Compare writers'' perspectives and methods across two texts","Synthesise information from multiple sources"]',
  '["rhetoric","bias","tone","register","ethos","logos","pathos","anecdote","hyperbole"]',
  '["Comparing content only without analysing methods","Not distinguishing between fact and opinion","Ignoring the purpose and audience of a text"]',
  20, 301),
('english', 'Creative Writing', 'eng-lang-creative-writing', 'gcse',
  '["Write engaging narratives with effective openings, climax, and resolution","Use descriptive techniques including sensory language and figurative devices","Vary sentence structures for effect","Organise writing with paragraphs, discourse markers, and cohesive devices"]',
  '["sensory language","show not tell","cyclical structure","in medias res","extended metaphor","sibilance"]',
  '[]'::jsonb,
  15, 302),
('english', 'Transactional & Persuasive Writing', 'eng-lang-transactional-writing', 'gcse',
  '["Write for a specific purpose: argue, persuade, advise, inform, or explain","Adapt tone and register for different audiences","Use rhetorical devices effectively (tricolon, rhetorical questions, direct address)","Structure arguments logically with counterarguments"]',
  '["counterargument","tricolon","direct address","rhetorical question","anaphora","formal register"]',
  '[]'::jsonb,
  15, 303),
('english', 'Spoken Language', 'eng-lang-spoken-language', 'gcse',
  '["Plan and deliver a formal presentation on a chosen topic","Use standard English confidently in formal contexts","Respond to questions and feedback appropriately","Use strategies to engage an audience"]',
  '["standard English","formal register","audience engagement","rhetoric"]',
  '[]'::jsonb,
  5, 304),
('english', 'Spelling, Punctuation & Grammar (SPaG)', 'eng-lang-spag', 'gcse',
  '["Spell common and subject-specific vocabulary accurately","Use a full range of punctuation correctly (commas, semicolons, colons, dashes)","Construct grammatically correct sentences with varied structures","Use paragraphs effectively with topic sentences and linking"]',
  '["clause","semicolon","subordinate clause","compound sentence","apostrophe","homophone"]',
  '["Comma splicing — joining two main clauses with just a comma","Confusing their/there/they''re, its/it''s, affect/effect","Overusing exclamation marks in formal writing"]',
  10, 305)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- GCSE ENGLISH LITERATURE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Shakespeare', 'eng-lit-shakespeare', 'gcse',
  '["Analyse Shakespeare''s use of language, form, and structure","Explore themes and how they relate to the play''s context","Develop character analysis with textual evidence","Consider the play''s relevance to Elizabethan/Jacobean society"]',
  '["soliloquy","dramatic irony","tragedy","hubris","iambic pentameter","aside","foil"]',
  '["Modern interpretation without historical context","Character study without linking to themes","Translating Shakespeare into modern English instead of analysing"]',
  20, 310),
('english', '19th-Century Novel', 'eng-lit-19th-century', 'gcse',
  '["Analyse narrative voice, structure, and techniques","Explore how the novel reflects 19th-century society and values","Develop detailed character and theme analysis","Use precise subject terminology in responses"]',
  '["omniscient narrator","Gothic","bildungsroman","social commentary","protagonist","antagonist","motif"]',
  '[]'::jsonb,
  20, 311),
('english', 'Modern Prose or Drama', 'eng-lit-modern-prose-drama', 'gcse',
  '["Analyse themes, characters, and relationships in a modern text","Explore how the writer uses structure and form","Consider the social, historical, and cultural context","Write comparative responses where required"]',
  '["stage directions","didactic","allegory","symbolism","social realism","dystopia"]',
  '[]'::jsonb,
  15, 312),
('english', 'Poetry Anthology', 'eng-lit-poetry-anthology', 'gcse',
  '["Analyse poetic techniques including imagery, form, and structure","Compare two poems thematically and methodologically","Understand how context influences meaning","Use precise terminology: enjambment, caesura, volta, stanza"]',
  '["enjambment","caesura","volta","stanza","sonnet","free verse","juxtaposition","oxymoron"]',
  '["Only comparing content without comparing methods","Feature-spotting without explaining effect","Ignoring the significance of form and structure"]',
  20, 313),
('english', 'Unseen Poetry', 'eng-lit-unseen-poetry', 'gcse',
  '["Analyse an unseen poem independently","Identify and comment on language, imagery, and structure","Compare two unseen poems on a given theme","Develop a personal response supported by textual evidence"]',
  '["tone","mood","persona","ambiguity","symbolism","allegory"]',
  '[]'::jsonb,
  10, 314),
('english', 'Essay Writing & Exam Technique', 'eng-lit-essay-technique', 'gcse',
  '["Structure responses using PEEL or PETAL paragraphs","Embed quotations fluently within analytical sentences","Plan responses efficiently under timed conditions","Use a critical vocabulary and analytical tone"]',
  '["PEEL","PETAL","embedded quotation","topic sentence","analytical verb","tentative language"]',
  '[]'::jsonb,
  8, 315)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- GCSE COMPUTER SCIENCE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('computer_science', 'Systems Architecture', 'cs-architecture', 'gcse',
  '["Describe the purpose and function of the CPU components (ALU, CU, registers)","Explain the fetch-decode-execute cycle","Describe Von Neumann architecture and its limitations","Explain factors affecting CPU performance (clock speed, cores, cache)"]',
  '["ALU","control unit","register","program counter","MAR","MDR","cache","clock speed"]',
  '["Thinking more cores always means faster performance","Confusing RAM and ROM functions","Thinking cache is the same as RAM"]',
  8, 400),
('computer_science', 'Memory & Storage', 'cs-memory-storage', 'gcse',
  '["Distinguish between RAM and ROM","Describe secondary storage types (magnetic, optical, solid-state)","Calculate storage requirements for different data types","Explain the need for virtual memory and its impact on performance"]',
  '["RAM","ROM","SSD","HDD","volatile","virtual memory","bit","byte","kilobyte"]',
  '[]'::jsonb,
  6, 401),
('computer_science', 'Computer Networks', 'cs-networks', 'gcse',
  '["Describe LAN, WAN, and PAN networks","Explain star and mesh network topologies","Describe the role of network protocols (TCP/IP, HTTP, FTP, SMTP)","Explain how data is transmitted using packet switching","Describe the client-server and peer-to-peer models"]',
  '["protocol","TCP/IP","packet switching","router","switch","DNS","firewall","encryption"]',
  '["Thinking the internet and the World Wide Web are the same thing","Confusing IP addresses and MAC addresses"]',
  10, 402),
('computer_science', 'Network Security & Cyber Threats', 'cs-security', 'gcse',
  '["Identify common cyber threats (malware, phishing, brute force, SQL injection)","Describe methods of protection (firewalls, encryption, authentication)","Explain the importance of network policies and access control","Describe social engineering attacks and how to prevent them"]',
  '["malware","phishing","firewall","encryption","SQL injection","two-factor authentication","penetration testing"]',
  '[]'::jsonb,
  6, 403),
('computer_science', 'Systems Software', 'cs-operating-systems', 'gcse',
  '["Describe the purpose and functions of an operating system","Explain memory management, multitasking, and user interfaces","Describe utility software: defragmentation, compression, backup, antivirus"]',
  '["operating system","kernel","multitasking","device driver","defragmentation","compression"]',
  '[]'::jsonb,
  5, 404),
('computer_science', 'Number Systems & Conversions', 'cs-number-systems', 'gcse',
  '["Convert between binary, denary, and hexadecimal","Perform binary addition and binary shifts","Explain overflow errors and their cause","Represent negative numbers using two''s complement"]',
  '["binary","denary","hexadecimal","overflow","two''s complement","binary shift","nibble"]',
  '["Confusing binary shift left (multiply) with shift right (divide)","Forgetting to check for overflow in 8-bit addition"]',
  8, 405),
('computer_science', 'Data Representation', 'cs-data-representation', 'gcse',
  '["Explain character encoding using ASCII and Unicode","Describe how bitmap images are represented (pixels, colour depth, resolution)","Calculate file sizes for images and sound","Explain how sound is sampled and represented digitally","Describe lossy and lossless compression"]',
  '["ASCII","Unicode","pixel","colour depth","resolution","sample rate","bit depth","compression"]',
  '[]'::jsonb,
  8, 406),
('computer_science', 'Programming Fundamentals', 'cs-programming-fundamentals', 'gcse',
  '["Declare and use variables and constants with appropriate data types","Use arithmetic, comparison, and Boolean operators","Implement selection (if/elif/else) and nested selection","Use definite (for) and indefinite (while) iteration","Apply string manipulation techniques"]',
  '["variable","constant","integer","float","string","Boolean","iteration","selection","casting"]',
  '["Using = instead of == for comparison","Off-by-one errors in loop ranges","Not initialising variables before use"]',
  15, 407),
('computer_science', 'Data Structures', 'cs-data-structures', 'gcse',
  '["Use 1D and 2D arrays/lists to store and access data","Use records (structs/dictionaries) for structured data","Read from and write to text files","Use CSV files for data storage and retrieval"]',
  '["array","list","index","record","field","file handling","CSV","append","read","write"]',
  '[]'::jsonb,
  8, 408),
('computer_science', 'Subprograms & Modular Programming', 'cs-subprograms', 'gcse',
  '["Create and call functions and procedures","Use parameters and return values","Explain the benefits of modular programming","Understand local and global variable scope"]',
  '["function","procedure","parameter","argument","return value","local variable","global variable","scope"]',
  '["Confusing functions (return value) and procedures (no return)","Not understanding variable scope — modifying local vs global"]',
  6, 409),
('computer_science', 'Algorithms', 'cs-algorithms', 'gcse',
  '["Describe and implement linear and binary search","Describe and implement bubble sort, merge sort, and insertion sort","Use flowcharts and pseudocode to represent algorithms","Complete trace tables to follow algorithm execution","Compare algorithm efficiency using Big-O notation (Higher)"]',
  '["linear search","binary search","bubble sort","merge sort","insertion sort","pseudocode","flowchart","trace table"]',
  '["Thinking binary search works on unsorted data","Confusing the number of passes in bubble sort"]',
  12, 410),
('computer_science', 'Testing & Validation', 'cs-testing', 'gcse',
  '["Create test plans with normal, boundary, erroneous, and invalid data","Use validation techniques (range check, length check, presence check, type check)","Apply authentication and verification methods","Debug programs using systematic approaches"]',
  '["normal data","boundary data","erroneous data","validation","verification","authentication","syntax error","logic error"]',
  '[]'::jsonb,
  5, 411),
('computer_science', 'Boolean Logic', 'cs-boolean-logic', 'gcse',
  '["Identify AND, OR, NOT, XOR, NAND, and NOR gates","Complete truth tables for logic circuits","Simplify Boolean expressions","Design logic circuits from Boolean expressions"]',
  '["AND gate","OR gate","NOT gate","XOR","NAND","truth table","Boolean expression"]',
  '[]'::jsonb,
  6, 412),
('computer_science', 'Ethical, Legal & Environmental Issues', 'cs-ethics-law', 'gcse',
  '["Describe key legislation: Data Protection Act 2018, Computer Misuse Act 1990, Copyright Act","Discuss ethical issues: AI bias, surveillance, digital divide, automation","Explain the environmental impact of technology (e-waste, energy, rare earth minerals)","Discuss open-source vs proprietary software"]',
  '["GDPR","Data Protection Act","Computer Misuse Act","copyright","open source","proprietary","e-waste","digital divide"]',
  '[]'::jsonb,
  5, 413)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- A-LEVEL MATHS — PURE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Proof', 'alevel-maths-proof', 'a_level',
  '["Construct proofs using deduction and exhaustion","Prove by contradiction","Disprove by counter-example"]',
  '["proof by deduction","proof by exhaustion","proof by contradiction","counter-example","conjecture"]',
  '[]'::jsonb,
  5, 500),
('maths', 'Algebra & Functions', 'alevel-maths-algebra', 'a_level',
  '["Manipulate surds and indices","Complete the square and solve quadratic equations","Use the factor theorem and algebraic division","Decompose into partial fractions","Sketch and solve modulus function problems"]',
  '["surd","discriminant","factor theorem","remainder theorem","partial fractions","modulus function"]',
  '["Incorrect partial fraction decomposition for repeated roots","Forgetting to check discriminant conditions"]',
  20, 501),
('maths', 'Coordinate Geometry', 'alevel-maths-coordinate-geometry', 'a_level',
  '["Find equations of straight lines, perpendiculars, and tangents","Work with the equation of a circle and solve intersection problems","Convert between parametric and Cartesian forms","Sketch curves using key features"]',
  '["gradient","perpendicular","tangent","normal","parametric equation","locus"]',
  '[]'::jsonb,
  12, 502),
('maths', 'Sequences & Series', 'alevel-maths-sequences-series', 'a_level',
  '["Use formulae for arithmetic and geometric sequences and series","Use sigma notation","Apply the binomial expansion for positive integer and fractional powers","Determine convergence of geometric series"]',
  '["arithmetic sequence","geometric series","common ratio","sum to infinity","binomial expansion","sigma notation"]',
  '[]'::jsonb,
  12, 503),
('maths', 'Trigonometry', 'alevel-maths-trigonometry', 'a_level',
  '["Work in radians for arc length and sector area","Use reciprocal trig functions (sec, cosec, cot)","Prove and apply addition formulae and double angle formulae","Solve trig equations in given intervals","Use the Rcos(θ+α) form"]',
  '["radian","sec","cosec","cot","addition formula","double angle formula","small angle approximation"]',
  '["Losing solutions by dividing by sinθ or cosθ","Confusing domains of inverse trig functions"]',
  18, 504),
('maths', 'Exponentials & Logarithms', 'alevel-maths-exponentials-logs', 'a_level',
  '["Apply the laws of logarithms","Solve equations involving exponentials and logarithms","Use logarithmic graphs to determine relationships","Model growth and decay using exponential functions"]',
  '["logarithm","natural logarithm","exponential growth","exponential decay","e","ln"]',
  '[]'::jsonb,
  10, 505),
('maths', 'Differentiation', 'alevel-maths-differentiation', 'a_level',
  '["Differentiate using chain, product, and quotient rules","Differentiate trigonometric, exponential, and logarithmic functions","Use implicit and parametric differentiation","Apply differentiation to connected rates of change and optimisation"]',
  '["chain rule","product rule","quotient rule","implicit differentiation","stationary point","inflection"]',
  '["Applying product rule when chain rule is needed","Forgetting dy/dx in implicit differentiation"]',
  20, 506),
('maths', 'Integration', 'alevel-maths-integration', 'a_level',
  '["Integrate standard functions including trig, exponential, and ln","Use substitution and integration by parts","Integrate using partial fractions","Use the trapezium rule for numerical integration","Solve first-order separable differential equations"]',
  '["integration by substitution","integration by parts","trapezium rule","differential equation","separable variables"]',
  '[]'::jsonb,
  22, 507),
('maths', 'Vectors', 'alevel-maths-vectors', 'a_level',
  '["Add, subtract, and find scalar multiples of vectors","Use position vectors and displacement vectors","Calculate magnitude and unit vectors in 3D","Use vectors for geometric proofs (collinearity, midpoints)"]',
  '["position vector","displacement","magnitude","unit vector","collinear","scalar multiple"]',
  '[]'::jsonb,
  8, 508),
('maths', 'Numerical Methods', 'alevel-maths-numerical-methods', 'a_level',
  '["Locate roots using change-of-sign methods","Use iterative methods to find approximate solutions","Apply the Newton-Raphson method","Understand convergence and divergence of iterative processes"]',
  '["iteration","Newton-Raphson","convergence","divergence","change of sign","root"]',
  '[]'::jsonb,
  6, 509)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- A-LEVEL MATHS — STATISTICS & MECHANICS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Statistics', 'alevel-maths-statistics', 'a_level',
  '["Use sampling methods and critique data collection","Calculate and interpret measures of location and spread","Work with probability including conditional probability and Venn diagrams","Model with binomial and normal distributions","Perform hypothesis tests for binomial and normal parameters","Calculate and interpret regression lines and correlation coefficients"]',
  '["binomial distribution","normal distribution","hypothesis test","significance level","critical value","PMCC","regression"]',
  '["Confusing one-tailed and two-tailed tests","Using the wrong distribution model","Interpreting correlation as causation"]',
  25, 510),
('maths', 'Mechanics', 'alevel-maths-mechanics', 'a_level',
  '["Use SUVAT equations for constant acceleration in 1D and 2D","Resolve forces and use Newton''s second law","Model problems involving friction, connected particles, and pulleys","Analyse projectile motion","Use calculus for variable acceleration (displacement, velocity, acceleration)","Calculate moments and solve static equilibrium problems"]',
  '["SUVAT","resultant force","friction","normal reaction","tension","moment","equilibrium","projectile"]',
  '["Forgetting to resolve forces into components","Using SUVAT when acceleration is not constant"]',
  25, 511)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- A-LEVEL BIOLOGY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Biological Molecules', 'alevel-bio-biological-molecules', 'a_level',
  '["Describe the structure and function of carbohydrates, lipids, and proteins","Explain enzyme action using the lock-and-key and induced fit models","Describe the structure of DNA and RNA","Explain how water properties relate to biological functions"]',
  '["monomer","polymer","glycosidic bond","peptide bond","active site","induced fit","denaturation"]',
  '[]'::jsonb,
  18, 600),
('science', 'Cells & Cell Division', 'alevel-bio-cells', 'a_level',
  '["Compare prokaryotic and eukaryotic cell structure","Calculate magnification and actual size from micrographs","Describe the stages of mitosis and meiosis","Explain the significance of meiosis for genetic variation"]',
  '["organelle","mitosis","meiosis","cell cycle","interphase","magnification","resolution"]',
  '[]'::jsonb,
  14, 601),
('science', 'Exchange & Transport', 'alevel-bio-transport', 'a_level',
  '["Explain surface area to volume ratio and exchange surfaces","Describe gas exchange in lungs, gills, and leaves","Explain the mechanisms of the mammalian heart and circulatory system","Describe osmosis, diffusion, and active transport across membranes"]',
  '["osmosis","diffusion","active transport","water potential","haemoglobin","Bohr effect","transpiration"]',
  '[]'::jsonb,
  16, 602),
('science', 'Genetics & Gene Expression', 'alevel-bio-genetics', 'a_level',
  '["Describe DNA replication (semi-conservative model)","Explain transcription and translation in detail","Describe gene regulation (operons, epigenetics)","Apply Mendelian and non-Mendelian inheritance patterns","Analyse inheritance using chi-squared tests"]',
  '["codon","anticodon","transcription","translation","operon","epigenetics","chi-squared","dihybrid cross"]',
  '["Confusing transcription (DNA→mRNA) with translation (mRNA→protein)","Not understanding that codons are on mRNA, anticodons on tRNA"]',
  20, 603),
('science', 'Energy for Life', 'alevel-bio-energy', 'a_level',
  '["Describe the light-dependent and light-independent reactions of photosynthesis","Explain glycolysis, the link reaction, Krebs cycle, and oxidative phosphorylation","Describe chemiosmosis and the role of ATP synthase","Compare aerobic and anaerobic respiration"]',
  '["ATP","NADH","electron transport chain","chemiosmosis","Calvin cycle","glycolysis","Krebs cycle"]',
  '[]'::jsonb,
  16, 604),
('science', 'Ecology & Populations', 'alevel-bio-ecology', 'a_level',
  '["Describe energy transfer through ecosystems","Calculate net primary productivity and gross primary productivity","Explain ecological succession","Analyse population growth curves and interspecific/intraspecific competition","Use statistical tests (Simpson diversity index, Spearman rank)"]',
  '["GPP","NPP","succession","carrying capacity","Simpson index","quadrat","transect"]',
  '[]'::jsonb,
  14, 605)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- A-LEVEL CHEMISTRY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Atomic Structure & Periodicity', 'alevel-chem-atomic-structure', 'a_level',
  '["Write electron configurations using sub-shells and orbitals","Explain ionisation energy trends across periods and down groups","Describe the shapes of s, p, and d orbitals","Explain periodicity of physical and chemical properties"]',
  '["orbital","sub-shell","ionisation energy","electron shielding","Aufbau principle","Hund rule"]',
  '[]'::jsonb,
  10, 610),
('science', 'Bonding & Structure', 'alevel-chem-bonding', 'a_level',
  '["Explain ionic, covalent, and metallic bonding","Predict shapes using electron pair repulsion theory (VSEPR)","Describe intermolecular forces: London, dipole-dipole, hydrogen bonds","Relate bonding and structure to physical properties"]',
  '["electronegativity","bond angle","lone pair","hydrogen bond","London forces","giant covalent"]',
  '[]'::jsonb,
  12, 611),
('science', 'Energetics & Thermodynamics', 'alevel-chem-energetics', 'a_level',
  '["Calculate enthalpy changes using Hess law and bond enthalpies","Construct and interpret Born-Haber cycles","Calculate lattice enthalpies and enthalpies of hydration/solution","Use entropy and Gibbs free energy to predict feasibility"]',
  '["enthalpy","Hess law","Born-Haber cycle","lattice enthalpy","entropy","Gibbs free energy","exothermic"]',
  '["Confusing enthalpy with entropy","Sign errors in Hess law calculations"]',
  14, 612),
('science', 'Kinetics', 'alevel-chem-kinetics', 'a_level',
  '["Determine rate equations from experimental data","Identify the rate-determining step from a rate equation","Use the Arrhenius equation to calculate activation energy","Explain homogeneous and heterogeneous catalysis"]',
  '["rate constant","order of reaction","rate-determining step","Arrhenius equation","activation energy","catalyst"]',
  '[]'::jsonb,
  10, 613),
('science', 'Equilibrium', 'alevel-chem-equilibrium', 'a_level',
  '["Write expressions for Kc and Kp and perform calculations","Apply Le Chatelier principle to predict equilibrium shifts","Calculate pH of strong and weak acids and bases","Explain buffer action and calculate buffer pH","Interpret titration curves for strong/weak acid-base combinations"]',
  '["Kc","Kp","Le Chatelier","Ka","Kb","Kw","buffer","conjugate acid-base pair","titration curve"]',
  '["Thinking catalysts shift equilibrium position","Not distinguishing Ka from Kw in pH calculations"]',
  16, 614),
('science', 'Organic Chemistry', 'alevel-chem-organic', 'a_level',
  '["Name and draw organic compounds using IUPAC nomenclature","Describe mechanisms: nucleophilic substitution, electrophilic addition/substitution, elimination","Explain structural, geometric, and optical isomerism","Design multi-step synthesis routes","Interpret mass spectra, IR spectra, and NMR spectra"]',
  '["nucleophile","electrophile","curly arrow","carbocation","chirality","enantiomer","NMR","mass spectrum"]',
  '[]'::jsonb,
  30, 615),
('science', 'Transition Metals', 'alevel-chem-transition-metals', 'a_level',
  '["Explain the general properties of transition metals","Describe complex ion formation, coordination number, and shapes","Explain ligand substitution reactions","Use electrode potentials to predict cell EMF and reaction feasibility"]',
  '["ligand","coordination number","complex ion","electrode potential","EMF","oxidation state"]',
  '[]'::jsonb,
  12, 616)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- A-LEVEL PHYSICS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Particles & Radiation', 'alevel-phys-particles', 'a_level',
  '["Classify particles using the Standard Model (quarks, leptons, bosons)","Describe the four fundamental forces and exchange particles","Explain the photoelectric effect and calculate photon energy","Describe wave-particle duality and de Broglie wavelength"]',
  '["quark","lepton","boson","hadron","photoelectric effect","photon","de Broglie wavelength"]',
  '[]'::jsonb,
  16, 620),
('science', 'Mechanics & Materials', 'alevel-phys-mechanics', 'a_level',
  '["Resolve forces and use Newton''s laws in 2D","Use SUVAT equations and projectile motion analysis","Apply conservation of energy and momentum","Describe stress, strain, and Young modulus","Interpret force-extension and stress-strain graphs"]',
  '["stress","strain","Young modulus","elastic limit","ultimate tensile strength","momentum","impulse"]',
  '["Confusing elastic limit with proportionality limit","Not resolving forces into components before applying Newton''s laws"]',
  22, 621),
('science', 'Electricity', 'alevel-phys-electricity', 'a_level',
  '["Apply V=IR and P=IV to series and parallel circuits","Describe EMF and internal resistance","Use potential dividers and explain their applications","Analyse I-V characteristics of different components"]',
  '["EMF","internal resistance","potential divider","resistivity","superconductor","I-V characteristic"]',
  '[]'::jsonb,
  14, 622),
('science', 'Waves & Optics', 'alevel-phys-waves', 'a_level',
  '["Describe progressive and stationary waves","Explain Young double-slit experiment and calculate fringe spacing","Use diffraction gratings to determine wavelength","Apply Snell''s law and explain total internal reflection"]',
  '["node","antinode","coherence","path difference","diffraction grating","total internal reflection","Snell law"]',
  '[]'::jsonb,
  16, 623),
('science', 'Fields', 'alevel-phys-fields', 'a_level',
  '["Compare gravitational and electric fields (radial and uniform)","Calculate field strength, potential, and energy in gravitational/electric fields","Describe capacitance, charging/discharging, and energy storage","Analyse simple harmonic motion (SHM) and resonance","Describe magnetic flux and electromagnetic induction (Faraday/Lenz)"]',
  '["field strength","potential","equipotential","capacitance","time constant","SHM","magnetic flux","Faraday law"]',
  '[]'::jsonb,
  30, 624),
('science', 'Nuclear Physics', 'alevel-phys-nuclear', 'a_level',
  '["Describe alpha, beta, and gamma radiation properties","Explain radioactive decay and half-life calculations","Calculate binding energy per nucleon","Describe nuclear fission and fusion","Use mass-energy equivalence (E=mc²)"]',
  '["half-life","activity","decay constant","binding energy","mass defect","fission","fusion"]',
  '[]'::jsonb,
  12, 625),
('science', 'Astrophysics (Option)', 'alevel-phys-astrophysics', 'a_level',
  '["Classify stars using the Hertzsprung-Russell diagram","Describe stellar evolution from main sequence to end states","Use the Doppler effect to determine recession velocity","Apply Hubble law to estimate the age of the universe"]',
  '["HR diagram","main sequence","red giant","white dwarf","neutron star","Doppler effect","Hubble constant","redshift"]',
  '[]'::jsonb,
  10, 626)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- PRIMARY / KS2 MATHS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Number & Place Value', 'ks2-maths-number-place-value', 'ks2',
  '["Read, write, order, and compare numbers to at least 1,000,000","Determine the value of each digit in numbers up to 10,000,000","Round any whole number to a required degree of accuracy","Use negative numbers in context and calculate intervals across zero"]',
  '["place value","digit","round","estimate","negative number","integer"]',
  '["Thinking 0.5 is bigger than 0.45 because 5 > 45","Confusing place value columns when numbers span across thousands"]',
  10, 700),
('maths', 'Addition, Subtraction, Multiplication & Division', 'ks2-maths-four-operations', 'ks2',
  '["Use formal written methods for addition and subtraction of large numbers","Multiply numbers up to 4 digits by a 2-digit number using long multiplication","Divide numbers up to 4 digits by a 2-digit number using long division","Use order of operations (BIDMAS/BODMAS) including brackets","Identify common factors, multiples, and prime numbers"]',
  '["factor","multiple","prime","composite","BIDMAS","remainder","long division","short division"]',
  '["Applying operations in left-to-right order instead of using BIDMAS","Errors in carrying/borrowing during column methods"]',
  15, 701),
('maths', 'Fractions, Decimals & Percentages', 'ks2-maths-fractions-decimals-pct', 'ks2',
  '["Compare and order fractions with different denominators","Add, subtract, multiply, and divide fractions and mixed numbers","Convert between fractions, decimals, and percentages","Find percentages of amounts","Identify equivalent fractions"]',
  '["numerator","denominator","equivalent fraction","mixed number","improper fraction","simplify"]',
  '["Adding numerators and denominators when adding fractions (1/3 + 1/4 ≠ 2/7)","Thinking a larger denominator means a larger fraction"]',
  15, 702),
('maths', 'Ratio & Proportion', 'ks2-maths-ratio-proportion', 'ks2',
  '["Solve problems involving relative sizes and similarity","Use ratio notation (a:b) and reduce to simplest form","Solve unequal sharing problems using ratio","Work with scale factors in maps and drawings"]',
  '["ratio","proportion","scale factor","unequal sharing","simplify"]',
  '[]'::jsonb,
  6, 703),
('maths', 'Algebra', 'ks2-maths-algebra', 'ks2',
  '["Use simple formulae expressed in words","Generate and describe linear number sequences","Find pairs of numbers that satisfy an equation with two unknowns","Enumerate possibilities of combinations of two variables"]',
  '["formula","variable","sequence","term","rule","unknown","equation"]',
  '[]'::jsonb,
  6, 704),
('maths', 'Measurement', 'ks2-maths-measurement', 'ks2',
  '["Convert between standard units of measure (km/m/cm/mm, kg/g, l/ml)","Calculate perimeter and area of rectangles, triangles, and parallelograms","Calculate the area of compound shapes","Calculate volume of cubes and cuboids","Read and interpret timetables and time problems"]',
  '["perimeter","area","volume","convert","metric","imperial"]',
  '[]'::jsonb,
  12, 705),
('maths', 'Geometry — Properties of Shapes', 'ks2-maths-geometry', 'ks2',
  '["Identify and classify 2D shapes by their properties","Know that angles in a triangle sum to 180° and in a quadrilateral to 360°","Calculate missing angles on a straight line and at a point","Describe positions on all four quadrants of a coordinate grid","Translate and reflect shapes on a coordinate grid"]',
  '["vertex","edge","face","parallel","perpendicular","acute","obtuse","reflex","coordinates","translation","reflection"]',
  '["Thinking all quadrilaterals are rectangles","Confusing reflective and rotational symmetry"]',
  10, 706),
('maths', 'Statistics', 'ks2-maths-statistics', 'ks2',
  '["Interpret and construct pie charts and line graphs","Calculate the mean as an average","Solve comparison and sum problems using information in tables and graphs"]',
  '["mean","pie chart","line graph","bar chart","frequency","data"]',
  '[]'::jsonb,
  6, 707),
('maths', 'SATs Arithmetic Paper', 'ks2-sats-maths-arithmetic', 'ks2',
  '["Complete 36 arithmetic questions in 30 minutes","Use efficient written methods for long multiplication and division","Calculate with fractions, decimals, and percentages under time pressure","Apply order of operations correctly"]',
  '["arithmetic","calculation","method","check"]',
  '[]'::jsonb,
  8, 708),
('maths', 'SATs Reasoning Papers', 'ks2-sats-maths-reasoning', 'ks2',
  '["Solve multi-step word problems","Explain mathematical reasoning and show working","Interpret data from charts, graphs, and tables","Apply knowledge across different mathematical areas"]',
  '["reasoning","explain","prove","show that","work out"]',
  '[]'::jsonb,
  10, 709)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- PRIMARY / KS2 ENGLISH
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Reading Comprehension', 'ks2-eng-reading-comprehension', 'ks2',
  '["Retrieve and record information from fiction and non-fiction texts","Make inferences from the text, supporting with evidence","Summarise main ideas from more than one paragraph","Identify how language, structure, and presentation contribute to meaning","Make comparisons within and across texts"]',
  '["inference","retrieve","summarise","evidence","viewpoint","audience","purpose"]',
  '["Copying text without explaining its meaning","Confusing inference (reading between the lines) with retrieval (finding facts)"]',
  15, 720),
('english', 'Writing Composition', 'ks2-eng-writing-composition', 'ks2',
  '["Plan writing by identifying audience and purpose","Use paragraphs to organise ideas around a theme","Use a range of sentence structures for effect","Use descriptive language including figurative devices","Edit and proofread writing for spelling, grammar, and punctuation"]',
  '["paragraph","connective","clause","simile","metaphor","personification","fronted adverbial"]',
  '[]'::jsonb,
  15, 721),
('english', 'Grammar, Punctuation & Spelling (GPS)', 'ks2-eng-grammar-punctuation', 'ks2',
  '["Identify and use word classes: nouns, verbs, adjectives, adverbs, prepositions, conjunctions","Use commas for clauses, parenthesis, and lists","Use colons, semicolons, and dashes correctly","Distinguish between active and passive voice","Use subjunctive mood in formal writing","Spell words from the Year 5/6 statutory word list"]',
  '["noun","verb","adjective","adverb","preposition","conjunction","subordinate clause","relative clause","passive voice","subjunctive"]',
  '["Confusing adjectives and adverbs","Using apostrophes for plurals (its vs it''s)"]',
  15, 722)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- PRIMARY / KS2 SCIENCE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Living Things & Their Habitats', 'ks2-sci-living-things', 'ks2',
  '["Describe how living things are classified into groups","Give reasons for classifying plants and animals based on characteristics","Describe the life cycles of mammals, amphibians, insects, and birds","Describe the process of reproduction in some plants and animals"]',
  '["classification","vertebrate","invertebrate","mammal","amphibian","life cycle","reproduction","pollination"]',
  '[]'::jsonb,
  8, 730),
('science', 'Animals Including Humans', 'ks2-sci-animals-humans', 'ks2',
  '["Identify and name the main parts of the human circulatory system","Describe the functions of the heart, blood vessels, and blood","Recognise the impact of diet, exercise, drugs, and lifestyle on health","Describe the way nutrients and water are transported within animals"]',
  '["heart","artery","vein","capillary","nutrient","oxygen","circulatory system"]',
  '[]'::jsonb,
  6, 731),
('science', 'Evolution & Inheritance', 'ks2-sci-evolution-inheritance', 'ks2',
  '["Recognise that living things have changed over time (evolution)","Identify how animals and plants are adapted to their environment","Recognise that offspring are not identical to their parents (variation)","Understand that fossils provide evidence for evolution"]',
  '["evolution","adaptation","variation","inheritance","fossil","natural selection","species"]',
  '[]'::jsonb,
  6, 732),
('science', 'Light', 'ks2-sci-light', 'ks2',
  '["Recognise that light appears to travel in straight lines","Explain how we see objects (light source → object → eye)","Explain why shadows have the same shape as the objects that cast them"]',
  '["light source","reflection","shadow","opaque","transparent","translucent"]',
  '[]'::jsonb,
  4, 733),
('science', 'Electricity', 'ks2-sci-electricity', 'ks2',
  '["Associate brightness of a lamp or volume of a buzzer with voltage","Compare and give reasons for series and parallel circuits","Use recognised symbols when drawing circuit diagrams"]',
  '["circuit","voltage","cell","battery","switch","series","parallel","component"]',
  '[]'::jsonb,
  4, 734)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- KS2 — 11+ ENTRANCE EXAM SKILLS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Verbal Reasoning', 'ks2-11plus-verbal-reasoning', 'ks2',
  '["Complete word analogies and find odd ones out","Solve letter and number code problems","Find hidden words within sentences","Complete word sequences and word-number puzzles","Work with antonyms, synonyms, and compound words"]',
  '["analogy","antonym","synonym","code","sequence","compound word"]',
  '[]'::jsonb,
  12, 740),
('maths', 'Non-Verbal Reasoning', 'ks2-11plus-non-verbal-reasoning', 'ks2',
  '["Identify patterns and sequences in shapes","Complete shape analogies (A is to B as C is to ?)","Find the odd one out from a set of shapes","Identify reflections and rotations of shapes","Fold and unfold 2D nets into 3D shapes mentally"]',
  '["rotation","reflection","symmetry","pattern","sequence","net","spatial"]',
  '[]'::jsonb,
  12, 741),
('maths', '11+ Mathematics', 'ks2-11plus-maths', 'ks2',
  '["Solve multi-step word problems at an advanced level","Work with fractions and percentages beyond KS2 expectations","Apply logic and reasoning to unfamiliar problem types","Work with number patterns, sequences, and algebra","Solve problems involving time, speed, distance, and money"]',
  '["problem solving","logic","reasoning","systematic","proof"]',
  '[]'::jsonb,
  15, 742)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- SQA NATIONAL 5 MATHS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Expressions & Formulae', 'sqa-n5-maths-expressions', 'other',
  '["Simplify surds and expressions with indices","Expand brackets and factorise expressions","Complete the square for quadratic expressions","Calculate the gradient of a straight line","Use the distance formula and midpoint formula"]',
  '["surd","index","factorise","gradient","midpoint","distance formula"]',
  '[]'::jsonb,
  20, 800),
('maths', 'Relationships', 'sqa-n5-maths-relationships', 'other',
  '["Solve linear equations and inequalities","Solve simultaneous equations algebraically and graphically","Solve quadratic equations by factorising and using the formula","Apply sine rule, cosine rule, and area of a triangle","Work with trigonometric graphs and identities"]',
  '["quadratic formula","discriminant","sine rule","cosine rule","simultaneous equations"]',
  '[]'::jsonb,
  25, 801),
('maths', 'Applications', 'sqa-n5-maths-applications', 'other',
  '["Calculate compound interest and depreciation","Interpret standard deviation and compare datasets","Use Pythagoras'' theorem in 2D and 3D","Apply similarity and scale factor in area and volume","Calculate volumes of prisms, cylinders, cones, and spheres"]',
  '["compound interest","depreciation","standard deviation","similarity","scale factor"]',
  '[]'::jsonb,
  20, 802)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- SQA HIGHER MATHS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Algebra & Trigonometry (Higher)', 'sqa-higher-maths-algebra', 'other',
  '["Apply the remainder and factor theorems","Work with logarithmic and exponential functions","Use addition and double angle formulae","Express asinx + bcosx in the form kcos(x+α)","Solve trigonometric equations in given intervals"]',
  '["polynomial","remainder theorem","logarithm","wave function","double angle formula"]',
  '[]'::jsonb,
  30, 810),
('maths', 'Calculus (Higher)', 'sqa-higher-maths-calculus', 'other',
  '["Differentiate using the chain rule","Find equations of tangents and normals to curves","Determine stationary points and their nature","Integrate standard functions and use definite integrals for area","Solve problems involving optimisation and rates of change"]',
  '["derivative","chain rule","tangent","stationary point","integral","optimisation"]',
  '[]'::jsonb,
  25, 811),
('maths', 'Geometry & Vectors (Higher)', 'sqa-higher-maths-geometry', 'other',
  '["Work with the equation of a circle and tangent problems","Determine intersection of lines and curves","Use 3D vectors including scalar product","Apply recurrence relations and find limits of sequences"]',
  '["scalar product","position vector","recurrence relation","limit","convergent"]',
  '[]'::jsonb,
  20, 812)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- SQA NATIONAL 5 ENGLISH
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Reading for Understanding, Analysis & Evaluation', 'sqa-n5-eng-reading', 'other',
  '["Identify main ideas and supporting details in non-fiction texts","Analyse how language is used to convey meaning and create effect","Evaluate the effectiveness of a writer''s techniques","Understand and use context clues for unfamiliar vocabulary"]',
  '["inference","evaluation","analysis","tone","word choice","imagery","sentence structure"]',
  '[]'::jsonb,
  15, 820),
('english', 'Critical Essay', 'sqa-n5-eng-critical-essay', 'other',
  '["Write a structured critical essay with introduction, body, and conclusion","Analyse techniques used by writers in prose, poetry, drama, or film","Use evidence and quotation to support critical arguments","Demonstrate understanding of theme, characterisation, and structure"]',
  '["critical essay","thesis","analysis","technique","characterisation","theme","structure"]',
  '[]'::jsonb,
  15, 821),
('english', 'Writing Portfolio', 'sqa-n5-eng-writing', 'other',
  '["Write one creative piece (narrative, poetry, or drama)","Write one discursive piece (argumentative or persuasive)","Draft, edit, and refine pieces to a high standard","Demonstrate technical accuracy in spelling, punctuation, and grammar"]',
  '["creative writing","discursive","argumentative","persuasive","narrative voice","structure"]',
  '[]'::jsonb,
  15, 822)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- SQA NATIONAL 5 SCIENCES
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Cell Biology (N5)', 'sqa-n5-biology-cell', 'other',
  '["Describe cell structure and ultrastructure","Explain active transport, osmosis, and diffusion","Describe DNA structure, replication, and protein synthesis","Explain genetic engineering and its applications"]',
  '["mitosis","DNA","mRNA","ribosome","plasmid","genetic engineering","osmosis"]',
  '[]'::jsonb,
  15, 830),
('science', 'Multicellular Organisms (N5)', 'sqa-n5-biology-multicellular', 'other',
  '["Describe the structure and function of organ systems","Explain the nervous system and hormonal control","Describe reproduction, inheritance, and genetic variation","Explain the transport of substances in plants and animals"]',
  '["synapse","hormone","genotype","phenotype","dominant","recessive","xylem","phloem"]',
  '[]'::jsonb,
  15, 831),
('science', 'Life on Earth (N5)', 'sqa-n5-biology-life', 'other',
  '["Describe energy flow through ecosystems","Explain natural selection and speciation","Describe factors affecting biodiversity","Explain how food production is managed and improved"]',
  '["ecosystem","food web","natural selection","speciation","mutation","biodiversity"]',
  '[]'::jsonb,
  10, 832),
('science', 'Chemical Changes & Structure (N5)', 'sqa-n5-chemistry-nature', 'other',
  '["Describe atomic structure and write electron configurations","Explain ionic, covalent, and metallic bonding","Balance chemical equations and calculate formula mass","Describe properties of acids and bases, and calculate pH"]',
  '["ion","covalent bond","ionic bond","metallic bond","formula mass","pH","neutralisation"]',
  '[]'::jsonb,
  15, 833),
('science', 'Nature''s Chemistry & Chemistry in Society (N5)', 'sqa-n5-chemistry-everyday', 'other',
  '["Describe homologous series: alkanes, alkenes, alcohols, carboxylic acids","Explain uses of everyday consumer chemistry products","Describe extraction and properties of metals","Explain polymerisation and properties of plastics","Calculate percentage composition and moles"]',
  '["homologous series","functional group","polymer","exothermic","endothermic","mole","Avogadro"]',
  '[]'::jsonb,
  20, 834),
('science', 'National 5 Physics', 'sqa-n5-physics', 'other',
  '["Describe and calculate speed, velocity, acceleration, and forces","Explain the electromagnetic spectrum and wave properties","Analyse series and parallel circuits using Ohm''s law","Describe nuclear radiation types and their properties","Calculate gravitational field strength and projectile motion"]',
  '["velocity","acceleration","resultant force","Ohm law","resistor","electromagnetic spectrum","half-life"]',
  '[]'::jsonb,
  25, 835)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- SQA NATIONAL 5 COMPUTING SCIENCE
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('computer_science', 'National 5 Computing Science', 'sqa-n5-computing', 'other',
  '["Design, implement, and test programs using Python or similar","Use selection, iteration, and pre-defined functions","Design and query relational databases using SQL","Create web pages using HTML, CSS, and JavaScript","Describe computer architecture, data representation, and networking"]',
  '["algorithm","pseudocode","SQL","primary key","foreign key","HTML","CSS","binary"]',
  '[]'::jsonb,
  40, 840)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- CIE IGCSE MATHEMATICS (0580)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Number (IGCSE)', 'cie-maths-number', 'other',
  '["Work with integers, decimals, fractions, and percentages","Calculate with ratio, proportion, and rate","Use standard form for very large and very small numbers","Apply upper and lower bounds to calculations","Use estimation and rounding appropriately"]',
  '["standard form","upper bound","lower bound","ratio","proportion","reciprocal"]',
  '[]'::jsonb,
  15, 900),
('maths', 'Algebra & Graphs (IGCSE)', 'cie-maths-algebra', 'other',
  '["Solve linear and quadratic equations","Solve simultaneous equations (linear and linear-quadratic)","Work with algebraic fractions and rearrange formulae","Generate and use sequences (nth term)","Sketch and interpret graphs of functions","Find gradient, equation of a line, and use y = mx + c"]',
  '["quadratic","simultaneous","nth term","gradient","inequality","function notation"]',
  '[]'::jsonb,
  25, 901),
('maths', 'Shape, Space & Measures (IGCSE)', 'cie-maths-geometry', 'other',
  '["Calculate angles in polygons and circle theorems","Use trigonometric ratios and Pythagoras'' theorem","Apply sine and cosine rules to non-right triangles","Describe and perform transformations (rotation, reflection, translation, enlargement)","Work with vectors in 2D","Calculate surface area and volume of 3D shapes"]',
  '["circle theorem","trigonometry","sine rule","cosine rule","vector","transformation","enlargement"]',
  '["Applying SOHCAHTOA to non-right triangles","Forgetting to use the correct circle theorem"]',
  25, 902),
('maths', 'Statistics & Probability (IGCSE)', 'cie-maths-statistics-probability', 'other',
  '["Calculate mean, median, mode, and range from grouped and ungrouped data","Construct and interpret cumulative frequency diagrams and box plots","Calculate probability including combined events and tree diagrams","Interpret histograms with unequal class widths"]',
  '["cumulative frequency","interquartile range","box plot","histogram","tree diagram","relative frequency"]',
  '[]'::jsonb,
  15, 903),
('maths', 'Sets, Functions & Calculus (IGCSE Extended)', 'cie-maths-sets-functions', 'other',
  '["Use set notation and Venn diagrams for two and three sets","Use function notation, composite functions, and inverse functions","Differentiate simple polynomial functions","Find gradients of curves and equations of tangents","Determine turning points using differentiation"]',
  '["set notation","Venn diagram","union","intersection","complement","derivative","turning point"]',
  '[]'::jsonb,
  15, 904)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- CIE IGCSE ENGLISH (0500/0990)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('english', 'Reading Passages (IGCSE)', 'cie-eng-reading', 'other',
  '["Demonstrate understanding of explicit and implicit meanings","Analyse how writers achieve effects through language","Select and organise material for summary writing","Compare and contrast writers'' perspectives"]',
  '["explicit","implicit","inference","summary","analysis","perspective","tone"]',
  '[]'::jsonb,
  20, 910),
('english', 'Directed & Composition Writing (IGCSE)', 'cie-eng-writing', 'other',
  '["Write for specific purposes and audiences (argue, persuade, describe, narrate)","Use a range of sentence structures and vocabulary for effect","Organise writing with effective paragraphing and cohesion","Demonstrate accuracy in spelling, punctuation, and grammar"]',
  '["audience","purpose","register","cohesion","discourse marker","complex sentence"]',
  '[]'::jsonb,
  20, 911)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- CIE IGCSE BIOLOGY (0610)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Cells & Organisation (IGCSE)', 'cie-bio-cells', 'other',
  '["Describe the structure of animal and plant cells","Explain diffusion, osmosis, and active transport","Describe enzyme action and factors affecting enzyme activity","Explain levels of organisation from cells to organisms"]',
  '["cell membrane","nucleus","chloroplast","enzyme","substrate","osmosis","diffusion"]',
  '[]'::jsonb,
  12, 920),
('science', 'Nutrition, Respiration & Transport (IGCSE)', 'cie-bio-nutrition-transport', 'other',
  '["Describe photosynthesis and factors that affect its rate","Explain aerobic and anaerobic respiration","Describe the structure and function of the digestive system","Describe the structure of the heart and circulatory system"]',
  '["photosynthesis","respiration","glucose","starch","enzyme","artery","vein","capillary"]',
  '[]'::jsonb,
  18, 921),
('science', 'Reproduction, Genetics & Ecology (IGCSE)', 'cie-bio-genetics-ecology', 'other',
  '["Describe sexual and asexual reproduction in plants and animals","Explain inheritance using genetic diagrams and Punnett squares","Describe natural selection and evidence for evolution","Explain food chains, food webs, and energy flow in ecosystems"]',
  '["chromosome","gene","allele","genotype","phenotype","dominant","recessive","ecosystem"]',
  '[]'::jsonb,
  16, 922)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- CIE IGCSE CHEMISTRY (0620)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Atomic Structure & Bonding (IGCSE)', 'cie-chem-atoms-bonding', 'other',
  '["Describe the structure of atoms (protons, neutrons, electrons)","Write electron configurations for the first 20 elements","Explain ionic, covalent, and metallic bonding","Describe the properties of ionic and covalent compounds"]',
  '["proton","neutron","electron","ionic bond","covalent bond","metallic bond","electron shell"]',
  '[]'::jsonb,
  12, 930),
('science', 'Stoichiometry & Chemical Reactions (IGCSE)', 'cie-chem-stoichiometry-reactions', 'other',
  '["Balance chemical equations and calculate relative formula mass","Perform mole calculations including concentration and volume","Describe factors affecting rate of reaction and explain using collision theory","Describe exothermic and endothermic reactions","Interpret energy profile diagrams"]',
  '["mole","Avogadro constant","concentration","rate of reaction","collision theory","activation energy"]',
  '[]'::jsonb,
  16, 931),
('science', 'Organic Chemistry & Earth Science (IGCSE)', 'cie-chem-organic-earth', 'other',
  '["Describe alkanes, alkenes, and their reactions","Explain cracking, polymerisation, and uses of polymers","Describe the extraction and reactivity of metals","Explain the causes and effects of climate change and air pollution"]',
  '["hydrocarbon","alkane","alkene","cracking","polymer","electrolysis","reactivity series"]',
  '[]'::jsonb,
  14, 932)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- CIE IGCSE PHYSICS (0625)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Forces & Motion (IGCSE)', 'cie-phys-forces-motion', 'other',
  '["Calculate speed, velocity, and acceleration from data and graphs","Apply Newton''s laws of motion","Describe the effects of friction and air resistance","Apply the principle of conservation of momentum","Calculate work done, power, and efficiency"]',
  '["velocity","acceleration","resultant force","momentum","work done","power","efficiency"]',
  '[]'::jsonb,
  14, 940),
('science', 'Waves, Light & Sound (IGCSE)', 'cie-phys-waves-light', 'other',
  '["Describe transverse and longitudinal waves","Explain reflection, refraction, and total internal reflection","Describe the electromagnetic spectrum and its applications","Explain the properties and uses of sound waves"]',
  '["transverse","longitudinal","reflection","refraction","total internal reflection","electromagnetic spectrum"]',
  '[]'::jsonb,
  12, 941),
('science', 'Electricity & Magnetism (IGCSE)', 'cie-phys-electricity-magnetism', 'other',
  '["Draw and interpret circuit diagrams","Apply V=IR and P=IV to series and parallel circuits","Describe magnetic fields and electromagnetic induction","Explain the motor effect and operation of a transformer"]',
  '["resistance","potential difference","current","series","parallel","transformer","electromagnetic induction"]',
  '[]'::jsonb,
  14, 942),
('science', 'Atomic & Nuclear Physics (IGCSE)', 'cie-phys-nuclear', 'other',
  '["Describe the nuclear model of the atom","Describe alpha, beta, and gamma radiation and their properties","Explain radioactive decay and half-life","Describe uses and dangers of nuclear radiation"]',
  '["alpha","beta","gamma","half-life","radioactive decay","fission","fusion","isotope"]',
  '[]'::jsonb,
  8, 943)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- EXAM BOARD MAPPINGS
-- =========================================

-- GCSE English: AQA, Edexcel, OCR
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, board.name, t.id
FROM sage_curriculum_topics t
CROSS JOIN (VALUES ('AQA'), ('Edexcel'), ('OCR')) AS board(name)
WHERE t.topic_slug IN (
  'eng-lang-reading-fiction','eng-lang-reading-nonfiction','eng-lang-creative-writing',
  'eng-lang-transactional-writing','eng-lang-spoken-language','eng-lang-spag',
  'eng-lit-shakespeare','eng-lit-19th-century','eng-lit-modern-prose-drama',
  'eng-lit-poetry-anthology','eng-lit-unseen-poetry','eng-lit-essay-technique'
)
AND t.level = 'gcse'
ON CONFLICT DO NOTHING;

-- GCSE Computer Science: AQA, OCR, Edexcel
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, board.name, t.id
FROM sage_curriculum_topics t
CROSS JOIN (VALUES ('AQA'), ('OCR'), ('Edexcel')) AS board(name)
WHERE t.level = 'gcse' AND t.subject = 'computer_science'
ON CONFLICT DO NOTHING;

-- A-Level Maths: AQA, Edexcel, OCR
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, board.name, t.id
FROM sage_curriculum_topics t
CROSS JOIN (VALUES ('AQA'), ('Edexcel'), ('OCR')) AS board(name)
WHERE t.level = 'a_level' AND t.subject = 'maths'
ON CONFLICT DO NOTHING;

-- A-Level Sciences: AQA, Edexcel, OCR
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, board.name, t.id
FROM sage_curriculum_topics t
CROSS JOIN (VALUES ('AQA'), ('Edexcel'), ('OCR')) AS board(name)
WHERE t.level = 'a_level' AND t.subject = 'science'
ON CONFLICT DO NOTHING;

-- A-Level Physics Astrophysics: AQA only
-- (Already covered by the bulk insert above; the other boards will be there too, which is fine
--  since all A-Level Physics topics list AQA, Edexcel, OCR except astrophysics.
--  The extra board entries are harmless for topic discovery.)

-- KS2/Primary: no specific exam board (use AQA as proxy for SATs alignment)
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, 'AQA', t.id
FROM sage_curriculum_topics t
WHERE t.level = 'ks2'
ON CONFLICT DO NOTHING;

-- SQA topics: map to SQA exam board (stored as 'SQA' since ExamBoard type in DB is text)
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, 'SQA', t.id
FROM sage_curriculum_topics t
WHERE t.level = 'other'
AND t.topic_slug LIKE 'sqa-%'
ON CONFLICT DO NOTHING;

-- CIE/Cambridge topics: map to CIE exam board
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id)
SELECT t.subject, 'CIE', t.id
FROM sage_curriculum_topics t
WHERE t.level = 'other'
AND t.topic_slug LIKE 'cie-%'
ON CONFLICT DO NOTHING;

COMMIT;
