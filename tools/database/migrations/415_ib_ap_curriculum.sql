-- Migration 415: IB Diploma & AP Curriculum Topics
-- Expands sage_curriculum_topics beyond GCSE to support international markets

-- =========================================
-- IB MATHS: ANALYSIS & APPROACHES
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Number & Algebra', 'ib-aa-number-algebra', 'ib_sl',
  '["Work with arithmetic and geometric sequences and series","Use the binomial theorem for expansion","Apply proof by mathematical induction (HL)","Perform operations with complex numbers (HL)"]',
  '["arithmetic sequence","geometric series","binomial coefficient","complex conjugate","mathematical induction"]',
  '["Confusing arithmetic and geometric sequences","Applying binomial theorem incorrectly for negative exponents"]',
  19, 100),
('maths', 'Functions', 'ib-aa-functions', 'ib_sl',
  '["Understand domain, range, and function notation","Perform transformations of graphs","Find composite and inverse functions","Analyse polynomial, rational, and exponential functions"]',
  '["domain","range","composite function","inverse function","asymptote","transformation"]',
  '["Confusing vertical and horizontal transformations","Reversing order of composite functions"]',
  21, 101),
('maths', 'Geometry & Trigonometry', 'ib-aa-trigonometry', 'ib_sl',
  '["Use sine and cosine rules for non-right triangles","Work with trigonometric identities and equations","Apply vector operations in 2D and 3D"]',
  '["unit circle","radian","identity","scalar product","vector equation of a line"]',
  '[]', 25, 102),
('maths', 'Statistics & Probability', 'ib-aa-statistics', 'ib_sl',
  '["Calculate and interpret measures of central tendency and spread","Work with probability including Bayes theorem","Use normal and binomial distributions","Perform hypothesis testing (HL)"]',
  '["standard deviation","correlation","normal distribution","binomial distribution","p-value","null hypothesis"]',
  '[]', 27, 103),
('maths', 'Calculus', 'ib-aa-calculus', 'ib_sl',
  '["Differentiate polynomial, trigonometric, exponential, and logarithmic functions","Apply differentiation to optimisation and kinematics","Integrate using standard results, substitution, and by parts","Solve first-order differential equations (HL)"]',
  '["derivative","integral","chain rule","Maclaurin series","differential equation","optimisation"]',
  '["Forgetting +C in indefinite integrals","Confusing product rule and chain rule applications"]',
  28, 104)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- IB MATHS: APPLICATIONS & INTERPRETATION
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('maths', 'Number & Algebra (AI)', 'ib-ai-number-algebra', 'ib_sl',
  '["Use approximation and estimation in real-world contexts","Model financial situations with geometric sequences","Work with amortisation and loan repayments"]',
  '["amortisation","compound interest","approximation","modelling"]',
  16, 110),
('maths', 'Functions (AI)', 'ib-ai-functions', 'ib_sl',
  '["Create and analyse linear and piecewise models","Use quadratic, exponential, and logarithmic models","Apply sinusoidal models to periodic phenomena"]',
  '["regression","correlation coefficient","sinusoidal model","piecewise function"]',
  31, 111),
('maths', 'Statistics & Probability (AI)', 'ib-ai-statistics', 'ib_sl',
  '["Collect, organise, and represent data","Perform chi-squared tests for independence","Work with normal and binomial distributions"]',
  '["chi-squared","contingency table","Spearman rank","t-test","confidence interval"]',
  39, 112),
('maths', 'Calculus (AI)', 'ib-ai-calculus', 'ib_sl',
  '["Differentiate polynomial and simple functions","Apply differentiation to find maxima, minima, and rates of change","Use trapezoidal rule for numerical integration"]',
  '["rate of change","trapezoidal rule","Euler method","optimisation"]',
  19, 113),
('maths', 'Geometry & Trigonometry (AI)', 'ib-ai-geometry', 'ib_sl',
  '["Apply trigonometry to real-world measurement problems","Construct and interpret Voronoi diagrams","Use graph theory for network optimisation (HL)"]',
  '["Voronoi diagram","adjacency matrix","Hamiltonian path","sine rule","cosine rule"]',
  18, 114)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- IB BIOLOGY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('science', 'Unity & Diversity (IB)', 'ib-bio-unity-diversity', 'ib_sl',
  '["Compare prokaryotic and eukaryotic cells","Explain the endosymbiotic theory","Classify organisms using binomial nomenclature","Describe mechanisms of evolution by natural selection"]',
  '["prokaryote","eukaryote","endosymbiosis","clade","phylogeny","natural selection"]',
  25, 120),
('science', 'Form & Function (IB)', 'ib-bio-form-function', 'ib_sl',
  '["Explain enzyme kinetics and metabolism","Describe cellular respiration and photosynthesis","Analyse gas exchange, transport, and digestion systems"]',
  '["enzyme","substrate","ATP","photosynthesis","homeostasis","neurotransmitter"]',
  30, 121),
('science', 'Interaction & Interdependence (IB)', 'ib-bio-interaction-interdependence', 'ib_sl',
  '["Describe energy flow through ecosystems","Analyse population dynamics and carrying capacity","Evaluate conservation strategies"]',
  '["trophic level","ecological niche","carrying capacity","biomagnification","keystone species"]',
  15, 122),
('science', 'Continuity & Change (IB)', 'ib-bio-continuity-change', 'ib_sl',
  '["Describe DNA replication, transcription, and translation","Apply Mendelian genetics","Explain gene expression and epigenetics (HL)","Discuss CRISPR and biotechnology"]',
  '["DNA replication","meiosis","genotype","phenotype","epigenetics","CRISPR"]',
  25, 123)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- IB CHEMISTRY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('science', 'Structure (IB Chem)', 'ib-chem-structure', 'ib_sl',
  '["Describe atomic structure including electron configuration","Explain ionic, covalent, and metallic bonding","Predict molecular geometry using VSEPR theory"]',
  '["electron configuration","VSEPR","electronegativity","hybridisation","van der Waals"]',
  22, 130),
('science', 'Reactivity (IB Chem)', 'ib-chem-reactivity', 'ib_sl',
  '["Perform stoichiometric calculations","Calculate enthalpy changes using Hess law","Explain collision theory and rate factors","Apply Le Chatelier principle"]',
  '["stoichiometry","enthalpy","activation energy","equilibrium constant","buffer","oxidation state"]',
  50, 131),
('science', 'Organic Chemistry (IB)', 'ib-chem-organic', 'ib_sl',
  '["Name and draw structural formulae","Describe reaction mechanisms (SN1, SN2)","Interpret mass spectra, IR, and NMR data (HL)"]',
  '["functional group","isomer","nucleophilic substitution","electrophilic addition","NMR"]',
  20, 132)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- IB PHYSICS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Mechanics (IB Physics)', 'ib-phys-mechanics', 'ib_sl',
  '["Analyse motion using kinematic equations","Apply Newton laws","Use conservation of energy and momentum"]',
  '["kinematics","impulse","momentum","torque","angular momentum"]',
  '["Confusing velocity and acceleration","Thinking heavier objects fall faster in a vacuum"]',
  22, 140),
('science', 'Waves & Optics (IB)', 'ib-phys-waves', 'ib_sl',
  '["Describe transverse and longitudinal wave properties","Apply the wave equation and Doppler effect","Explain superposition and interference"]',
  '["wavelength","frequency","interference","diffraction","standing wave","Doppler effect"]',
  '[]', 15, 141),
('science', 'Electricity & Magnetism (IB)', 'ib-phys-electricity', 'ib_sl',
  '["Analyse series and parallel circuits","Describe electric and magnetic fields","Apply Faraday and Lenz laws (HL)"]',
  '["resistance","capacitance","magnetic flux","electromagnetic induction","Kirchhoff laws"]',
  '[]', 20, 142),
('science', 'Thermal Physics & Energy (IB)', 'ib-phys-thermal', 'ib_sl',
  '["Distinguish between heat and temperature","Apply the ideal gas law","Explain the laws of thermodynamics"]',
  '["specific heat capacity","latent heat","ideal gas law","entropy","Carnot cycle"]',
  '[]', 11, 143),
('science', 'Atomic, Nuclear & Particle Physics (IB)', 'ib-phys-atomic-nuclear', 'ib_sl',
  '["Describe atomic models","Explain radioactive decay and half-life","Classify particles using the Standard Model (HL)"]',
  '["isotope","half-life","binding energy","quark","lepton","boson"]',
  '[]', 14, 144)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- IB ENGLISH & TOK
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('english', 'Readers, Writers & Texts (IB)', 'ib-eng-ll-readers-writers', 'ib_sl',
  '["Analyse how meaning is constructed through language","Compare texts across different forms","Examine the reader-writer-text relationship"]',
  '["register","genre","narrative voice","audience","purpose","stylistic device"]',
  50, 150),
('english', 'Time & Space (IB)', 'ib-eng-ll-time-space', 'ib_sl',
  '["Analyse how context influences text production","Compare representations across time periods","Evaluate how texts reflect and shape societal values"]',
  '["context","representation","ideology","discourse","postcolonial","feminist criticism"]',
  50, 151),
('english', 'Intertextuality (IB)', 'ib-eng-ll-intertextuality', 'ib_sl',
  '["Identify and analyse intertextual references","Compare how different texts treat similar themes","Evaluate the effect of textual transformation"]',
  '["intertextuality","allusion","pastiche","parody","motif","archetype"]',
  50, 152),
('english', 'Knowledge & the Knower (ToK)', 'ib-tok-knowledge-knower', 'ib_sl',
  '["Distinguish between personal and shared knowledge","Analyse the role of perspective in knowledge claims","Evaluate ways of knowing"]',
  '["knowledge claim","justification","perspective","bias","paradigm"]',
  30, 155),
('english', 'Areas of Knowledge (ToK)', 'ib-tok-areas-knowledge', 'ib_sl',
  '["Compare methodology across areas of knowledge","Evaluate knowledge claims using area-specific criteria","Analyse how knowledge is produced and validated"]',
  '["empiricism","rationalism","falsifiability","paradigm shift","ethical framework"]',
  50, 156),
('english', 'Knowledge & Technology (ToK)', 'ib-tok-knowledge-technology', 'ib_sl',
  '["Evaluate how technology shapes knowledge production","Analyse ethical implications of AI and big data","Discuss technology, truth, and trust"]',
  '["algorithm","filter bubble","digital literacy","artificial intelligence","surveillance"]',
  20, 157)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP CALCULUS AB
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Limits & Continuity', 'ap-calc-ab-limits', 'ap',
  '["Evaluate limits algebraically, graphically, and numerically","Determine continuity at a point and over an interval","Apply the Squeeze Theorem and IVT"]',
  '["limit","continuity","asymptote","indeterminate form","Squeeze Theorem","IVT"]',
  '["Thinking a limit must equal the function value","Confusing removable and non-removable discontinuities"]',
  22, 200),
('maths', 'Differentiation', 'ap-calc-ab-differentiation', 'ap',
  '["Define the derivative as a limit of difference quotients","Apply power, product, quotient, and chain rules","Use implicit differentiation","Solve related rates problems"]',
  '["derivative","tangent line","chain rule","implicit differentiation","related rates"]',
  '[]', 30, 201),
('maths', 'Applications of Differentiation', 'ap-calc-ab-applications-diff', 'ap',
  '["Find absolute and relative extrema","Apply the Mean Value Theorem","Use first and second derivative tests","Solve optimisation problems"]',
  '["critical point","inflection point","concavity","Mean Value Theorem","optimisation"]',
  '[]', 20, 202),
('maths', 'Integration', 'ap-calc-ab-integration', 'ap',
  '["Find antiderivatives using basic rules","Evaluate definite integrals using FTC","Apply u-substitution","Approximate integrals using Riemann sums"]',
  '["antiderivative","Fundamental Theorem of Calculus","Riemann sum","u-substitution"]',
  '["Forgetting +C for indefinite integrals","Incorrect substitution bounds"]',
  25, 203),
('maths', 'Applications of Integration', 'ap-calc-ab-applications-int', 'ap',
  '["Calculate area between curves","Find volumes using disc and washer methods","Interpret accumulation functions","Solve differential equations by separation of variables"]',
  '["disc method","washer method","cross-section","accumulation function","slope field"]',
  '[]', 25, 204)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP CALCULUS BC (additional topics beyond AB)
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('maths', 'Parametric, Polar & Vector Functions', 'ap-calc-bc-parametric', 'ap',
  '["Differentiate and integrate parametric equations","Work with polar curves","Analyse motion using vector-valued functions","Calculate arc length"]',
  '["parametric equation","polar coordinates","vector-valued function","arc length"]',
  20, 210),
('maths', 'Infinite Sequences & Series', 'ap-calc-bc-sequences-series', 'ap',
  '["Determine convergence using comparison, ratio, and integral tests","Find Taylor and Maclaurin series","Determine radius and interval of convergence","Use Lagrange error bound"]',
  '["convergence","Taylor series","Maclaurin series","radius of convergence","Lagrange error bound"]',
  30, 211),
('maths', 'Advanced Integration Techniques', 'ap-calc-bc-advanced-integration', 'ap',
  '["Apply integration by parts","Decompose using partial fractions","Evaluate improper integrals","Solve logistic differential equations"]',
  '["integration by parts","partial fractions","improper integral","logistic growth"]',
  20, 212)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP STATISTICS
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('maths', 'Exploring Data', 'ap-stats-exploring-data', 'ap',
  '["Construct and interpret graphical displays","Calculate measures of center and spread","Describe distributions using shape, center, spread, and outliers"]',
  '["distribution","outlier","IQR","standard deviation","z-score","percentile"]',
  '[]', 20, 220),
('maths', 'Sampling & Experimentation', 'ap-stats-sampling-experimentation', 'ap',
  '["Distinguish observational studies and experiments","Identify sampling methods and bias","Design experiments with proper controls"]',
  '["SRS","stratified sample","confounding variable","randomisation","placebo","double-blind"]',
  '[]', 15, 221),
('maths', 'Probability & Random Variables', 'ap-stats-probability', 'ap',
  '["Apply probability rules","Calculate conditional probability","Work with binomial and geometric distributions","Use the normal distribution"]',
  '["conditional probability","independence","binomial distribution","expected value","standard deviation"]',
  '[]', 25, 222),
('maths', 'Statistical Inference', 'ap-stats-inference', 'ap',
  '["Construct confidence intervals for means and proportions","Perform hypothesis tests","Apply chi-squared tests","Make inferences about regression slope"]',
  '["confidence interval","null hypothesis","p-value","Type I error","chi-squared","regression"]',
  '["Interpreting confidence level as probability","Confusing Type I and Type II errors","Claiming causation from observational studies"]',
  35, 223)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP BIOLOGY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('science', 'Chemistry of Life (AP)', 'ap-bio-chemistry-of-life', 'ap',
  '["Explain how water properties support life","Describe macromolecule structure and function","Explain enzyme regulation"]',
  '["hydrogen bond","polymer","monomer","enzyme","active site","denaturation"]',
  14, 230),
('science', 'Cell Structure & Function (AP)', 'ap-bio-cell-structure', 'ap',
  '["Describe subcellular components","Explain membrane transport mechanisms","Describe cell signalling pathways"]',
  '["organelle","osmosis","active transport","signal transduction","endocytosis"]',
  14, 231),
('science', 'Cellular Energetics (AP)', 'ap-bio-cellular-energetics', 'ap',
  '["Describe light reactions and Calvin cycle","Explain glycolysis, Krebs cycle, and oxidative phosphorylation","Analyse relationship between photosynthesis and respiration"]',
  '["ATP","electron transport chain","chemiosmosis","Calvin cycle","glycolysis"]',
  14, 232),
('science', 'Heredity (AP)', 'ap-bio-heredity', 'ap',
  '["Describe meiosis and genetic variation","Apply Mendelian genetics","Explain non-Mendelian inheritance including epistasis"]',
  '["meiosis","crossing over","genotype","phenotype","epistasis","linked genes"]',
  10, 233),
('science', 'Gene Expression & Regulation (AP)', 'ap-bio-gene-expression', 'ap',
  '["Describe DNA replication, transcription, and translation","Explain gene regulation","Describe PCR, gel electrophoresis, and CRISPR"]',
  '["operon","transcription factor","PCR","gel electrophoresis","CRISPR","mutation"]',
  16, 234),
('science', 'Ecology (AP)', 'ap-bio-ecology', 'ap',
  '["Analyse population growth models","Describe community interactions","Explain energy flow and nutrient cycling"]',
  '["carrying capacity","logistic growth","trophic level","succession","biodiversity"]',
  14, 235),
('science', 'Natural Selection & Evolution (AP)', 'ap-bio-evolution', 'ap',
  '["Describe evidence for evolution","Explain natural selection and genetic drift","Analyse Hardy-Weinberg equilibrium","Describe speciation"]',
  '["natural selection","genetic drift","Hardy-Weinberg","speciation","phylogeny","homology"]',
  16, 236)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP CHEMISTRY
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order) VALUES
('science', 'Atomic Structure & Properties (AP)', 'ap-chem-atomic-structure', 'ap',
  '["Write electron configurations","Explain periodic trends","Interpret mass spectra","Apply Coulomb law"]',
  '["electron configuration","ionisation energy","electronegativity","mass spectrometry","isotope"]',
  '[]', 12, 240),
('science', 'Molecular & Ionic Bonding (AP)', 'ap-chem-bonding', 'ap',
  '["Draw Lewis structures and predict geometry using VSEPR","Determine bond and molecular polarity","Explain intermolecular forces"]',
  '["Lewis structure","VSEPR","dipole moment","London dispersion","hydrogen bond"]',
  '[]', 14, 241),
('science', 'Chemical Reactions (AP)', 'ap-chem-reactions', 'ap',
  '["Balance equations and perform stoichiometry","Identify reaction types","Balance redox equations","Perform titrations"]',
  '["stoichiometry","limiting reagent","oxidation","reduction","titration","molarity"]',
  '[]', 14, 242),
('science', 'Kinetics (AP)', 'ap-chem-kinetics', 'ap',
  '["Determine rate laws from experimental data","Describe collision theory","Analyse reaction mechanisms","Explain catalysis"]',
  '["rate law","rate constant","activation energy","reaction mechanism","catalyst"]',
  '[]', 12, 243),
('science', 'Thermodynamics (AP)', 'ap-chem-thermodynamics', 'ap',
  '["Calculate enthalpy changes","Apply entropy and Gibbs free energy","Analyse galvanic and electrolytic cells"]',
  '["enthalpy","entropy","Gibbs free energy","galvanic cell","cell potential","Faraday"]',
  '[]', 14, 244),
('science', 'Equilibrium (AP)', 'ap-chem-equilibrium', 'ap',
  '["Write equilibrium expressions","Apply Le Chatelier principle","Calculate pH of acids and bases","Analyse buffers and solubility"]',
  '["equilibrium constant","Le Chatelier","Ka","Kb","buffer","Ksp"]',
  '["Thinking equal concentrations means equilibrium","Including solids/liquids in equilibrium expressions"]',
  20, 245)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP PHYSICS 1
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('science', 'Kinematics (AP)', 'ap-phys1-kinematics', 'ap',
  '["Describe motion using position, velocity, and acceleration","Use kinematic equations","Analyse projectile motion"]',
  '["displacement","velocity","acceleration","projectile","free fall"]',
  18, 250),
('science', 'Dynamics — Forces (AP)', 'ap-phys1-forces', 'ap',
  '["Draw and analyse free-body diagrams","Apply Newton three laws","Analyse friction and circular motion"]',
  '["net force","free-body diagram","friction","normal force","centripetal force"]',
  22, 251),
('science', 'Energy & Work (AP)', 'ap-phys1-energy', 'ap',
  '["Calculate work done by forces","Apply work-energy theorem","Use conservation of energy","Analyse springs using Hooke law"]',
  '["kinetic energy","potential energy","work-energy theorem","power","Hooke law"]',
  16, 252),
('science', 'Momentum & Impulse (AP)', 'ap-phys1-momentum', 'ap',
  '["Define momentum and impulse","Apply conservation of momentum to collisions","Distinguish elastic and inelastic collisions"]',
  '["momentum","impulse","elastic collision","inelastic collision","conservation of momentum"]',
  14, 253),
('science', 'Torque & Rotational Motion (AP)', 'ap-phys1-rotation', 'ap',
  '["Calculate torque","Apply rotational kinematics","Use conservation of angular momentum","Relate translational and rotational quantities"]',
  '["torque","angular velocity","moment of inertia","angular momentum","rotational equilibrium"]',
  18, 254),
('science', 'Simple Harmonic Motion & Waves (AP)', 'ap-phys1-waves', 'ap',
  '["Describe simple harmonic motion","Analyse wave properties","Explain superposition and standing waves"]',
  '["amplitude","period","frequency","resonance","standing wave","node"]',
  14, 255)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP ENGLISH LANGUAGE & COMPOSITION
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('english', 'Rhetorical Analysis (AP)', 'ap-eng-lang-rhetorical-analysis', 'ap',
  '["Identify and analyse rhetorical strategies (ethos, logos, pathos)","Examine style, tone, and structure","Evaluate effectiveness of rhetorical choices"]',
  '["rhetoric","ethos","logos","pathos","tone","syntax","diction","juxtaposition"]',
  40, 260),
('english', 'Argumentation (AP)', 'ap-eng-lang-argumentation', 'ap',
  '["Develop a thesis with evidence","Identify and address counterarguments","Write argumentative essays with clear claims"]',
  '["claim","warrant","concession","rebuttal","qualifier","Toulmin model"]',
  40, 261),
('english', 'Synthesis (AP)', 'ap-eng-lang-synthesis', 'ap',
  '["Read and analyse multiple sources","Synthesise information to support arguments","Properly attribute and integrate source material"]',
  '["synthesis","attribution","source integration","paraphrase","direct quotation"]',
  30, 262)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- AP ENGLISH LITERATURE & COMPOSITION
-- =========================================
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, estimated_hours, sort_order) VALUES
('english', 'Prose Fiction Analysis (AP)', 'ap-eng-lit-prose-fiction', 'ap',
  '["Analyse character development and relationships","Examine narrative structure and point of view","Identify literary devices in prose"]',
  '["characterisation","point of view","unreliable narrator","stream of consciousness","motif","foreshadowing"]',
  50, 270),
('english', 'Poetry Analysis (AP)', 'ap-eng-lit-poetry', 'ap',
  '["Analyse poetic form, metre, and rhyme scheme","Interpret figurative language and imagery","Examine how structure contributes to meaning"]',
  '["metre","iambic pentameter","enjambment","caesura","metaphor","conceit","volta"]',
  40, 271),
('english', 'Literary Argumentation (AP)', 'ap-eng-lit-literary-argument', 'ap',
  '["Develop defensible literary interpretations","Support claims with textual evidence","Apply literary critical lenses"]',
  '["literary criticism","close reading","thesis","textual evidence","interpretation","thematic analysis"]',
  30, 272)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- =========================================
-- Exam board mappings for IB and AP topics
-- =========================================
INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id, paper, weighting_percent)
SELECT 'maths', 'IBO', t.id, 1, 50
FROM sage_curriculum_topics t WHERE t.level = 'ib_sl' AND t.subject = 'maths'
ON CONFLICT DO NOTHING;

INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id, paper, weighting_percent)
SELECT 'maths', 'IBO', t.id, 2, 50
FROM sage_curriculum_topics t WHERE t.level = 'ib_sl' AND t.subject = 'maths'
ON CONFLICT DO NOTHING;

INSERT INTO sage_curriculum_boards (subject, exam_board, topic_id, paper, weighting_percent)
SELECT t.subject, 'CollegeBoard', t.id, 1, 100
FROM sage_curriculum_topics t WHERE t.level = 'ap'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE sage_curriculum_topics IS 'Curriculum topics for GCSE, A-Level, IB Diploma (SL/HL), and AP courses.';
