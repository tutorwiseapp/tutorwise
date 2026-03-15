-- Migration 411: Sage Curriculum Tables (Phase S4)
-- Full curriculum structure with prerequisite DAG and exam board mapping

CREATE TABLE IF NOT EXISTS sage_curriculum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    topic_name VARCHAR(200) NOT NULL,
    topic_slug VARCHAR(200) NOT NULL,
    parent_topic_id UUID REFERENCES sage_curriculum_topics(id),
    level VARCHAR(20) NOT NULL,
    learning_objectives JSONB NOT NULL DEFAULT '[]',
    vocabulary JSONB NOT NULL DEFAULT '[]',
    common_misconceptions JSONB NOT NULL DEFAULT '[]',
    estimated_hours NUMERIC(4,1),
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(subject, topic_slug, level)
);

CREATE INDEX idx_sage_curriculum_subject_level ON sage_curriculum_topics(subject, level);

CREATE TABLE IF NOT EXISTS sage_curriculum_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    prerequisite_topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    strength VARCHAR(10) NOT NULL DEFAULT 'hard' CHECK (strength IN ('hard', 'soft')),
    UNIQUE(topic_id, prerequisite_topic_id)
);

CREATE TABLE IF NOT EXISTS sage_curriculum_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    exam_board VARCHAR(20) NOT NULL,
    topic_id UUID NOT NULL REFERENCES sage_curriculum_topics(id) ON DELETE CASCADE,
    paper INTEGER,
    weighting_percent NUMERIC(4,1),
    UNIQUE(subject, exam_board, topic_id)
);

-- Seed GCSE Maths topics (foundation tier, core topics)
INSERT INTO sage_curriculum_topics (subject, topic_name, topic_slug, level, learning_objectives, vocabulary, common_misconceptions, estimated_hours, sort_order)
VALUES
('maths', 'Number', 'number', 'gcse_foundation', '["Order integers, decimals and fractions", "Apply four operations to integers and decimals", "Use and understand place value"]', '["integer", "decimal", "fraction", "place value", "factor", "multiple", "prime"]', '["Multiplying by 10 just adds a zero", "0.5 is bigger than 0.25 because 5>25"]', 8, 1),
('maths', 'Fractions, Decimals and Percentages', 'fractions-decimals-percentages', 'gcse_foundation', '["Convert between fractions, decimals and percentages", "Order fractions", "Calculate with fractions"]', '["numerator", "denominator", "equivalent", "improper fraction", "mixed number"]', '["Adding fractions: add numerators and denominators separately", "50% of anything is always 50"]', 10, 2),
('maths', 'Ratio and Proportion', 'ratio-proportion', 'gcse_foundation', '["Simplify ratios", "Share in a given ratio", "Solve proportion problems"]', '["ratio", "proportion", "simplify", "share", "unitary method"]', '["3:2 means 3 and 2, not 3 out of 5", "Confusing ratio with fraction"]', 6, 3),
('maths', 'Algebra: Basics', 'algebra-basics', 'gcse_foundation', '["Use and interpret algebraic notation", "Substitute into expressions", "Simplify expressions"]', '["variable", "coefficient", "term", "expression", "equation", "substitute"]', '["2a means 2+a not 2×a", "a²=2a"]', 8, 4),
('maths', 'Algebra: Equations', 'algebra-equations', 'gcse_foundation', '["Solve linear equations", "Solve simultaneous equations", "Set up and solve equations from context"]', '["solve", "linear", "simultaneous", "unknown", "balance"]', '["Changing side changes sign applies to multiplication too", "x means times"]', 10, 5),
('maths', 'Algebra: Graphs', 'algebra-graphs', 'gcse_foundation', '["Plot and interpret graphs of linear functions", "Identify gradient and y-intercept", "Recognise quadratic graphs"]', '["gradient", "intercept", "y=mx+c", "coordinate", "linear", "quadratic"]', '["Gradient is just the number in front of x", "All graphs are straight lines"]', 8, 6),
('maths', 'Geometry: Angles', 'geometry-angles', 'gcse_foundation', '["Calculate missing angles on straight lines and at a point", "Angles in triangles and quadrilaterals", "Angles in parallel lines"]', '["acute", "obtuse", "reflex", "vertically opposite", "alternate", "corresponding", "co-interior"]', '["Angles in a triangle add up to 360", "Alternate angles are equal even without parallel lines"]', 6, 7),
('maths', 'Geometry: Area and Perimeter', 'geometry-area-perimeter', 'gcse_foundation', '["Calculate area and perimeter of 2D shapes", "Calculate area of circles", "Calculate surface area of 3D shapes"]', '["area", "perimeter", "circumference", "radius", "diameter", "pi", "surface area"]', '["Area of triangle = base × height", "Confusing area and perimeter"]', 8, 8),
('maths', 'Statistics', 'statistics', 'gcse_foundation', '["Calculate mean, median, mode and range", "Interpret charts and diagrams", "Draw and interpret scatter graphs"]', '["mean", "median", "mode", "range", "frequency", "scatter graph", "correlation"]', '["Mean is always a whole number", "The mode is always the best average"]', 6, 9),
('maths', 'Probability', 'probability', 'gcse_foundation', '["Calculate probability of single events", "Use probability scales", "Calculate expected outcomes"]', '["probability", "outcome", "event", "expected", "tree diagram", "independent", "mutually exclusive"]', '["Probability can be greater than 1", "Past results affect future probability"]', 6, 10),
-- GCSE English Language
('english', 'Reading: Inference', 'reading-inference', 'gcse_foundation', '["Identify and interpret explicit and implicit information", "Select evidence to support interpretations", "Make inferences from texts"]', '["inference", "explicit", "implicit", "evidence", "interpretation"]', '["Inference means guessing", "Only quotes count as evidence"]', 6, 1),
('english', 'Reading: Language Analysis', 'reading-language-analysis', 'gcse_foundation', '["Analyse effects of language choices", "Identify and comment on writers methods", "Use subject terminology"]', '["metaphor", "simile", "personification", "alliteration", "connotation", "imagery", "tone"]', '["Identifying a technique is the same as analysing it", "Alliteration is just repeated letters"]', 8, 2),
('english', 'Reading: Comparison', 'reading-comparison', 'gcse_foundation', '["Compare writers ideas and perspectives", "Compare methods used", "Use connectives for comparison"]', '["compare", "contrast", "similarly", "whereas", "perspective", "viewpoint"]', '["Comparison means finding similarities only", "Writing about each text separately counts as comparing"]', 6, 3),
('english', 'Writing: Narrative', 'writing-narrative', 'gcse_foundation', '["Write creative narratives", "Use varied sentence structures", "Create atmosphere and tension"]', '["narrative", "protagonist", "setting", "tension", "dialogue", "foreshadowing"]', '["Good writing needs lots of adjectives", "Stories must have happy endings"]', 8, 4),
('english', 'Writing: Persuasive', 'writing-persuasive', 'gcse_foundation', '["Write persuasive texts", "Use rhetorical devices", "Structure arguments logically"]', '["rhetoric", "persuade", "audience", "ethos", "pathos", "logos", "counter-argument"]', '["Persuasive writing is just opinions", "Using LOTS of exclamation marks makes it persuasive!!!"]', 6, 5),
('english', 'Writing: Transactional', 'writing-transactional', 'gcse_foundation', '["Write letters, articles, speeches, reports", "Adapt tone and register for audience", "Use appropriate format conventions"]', '["register", "tone", "formal", "informal", "audience", "purpose", "convention"]', '["All letters start with Dear Sir/Madam", "Formal means using long words"]', 6, 6),
-- GCSE Combined Science: Biology
('science', 'Cell Biology', 'cell-biology', 'gcse_foundation', '["Describe structure of animal and plant cells", "Explain cell specialisation", "Describe cell division by mitosis"]', '["nucleus", "cytoplasm", "cell membrane", "mitochondria", "ribosome", "vacuole", "chloroplast", "mitosis"]', '["Plant cells dont have mitochondria", "Mitosis produces 4 cells"]', 6, 1),
('science', 'Organisation', 'organisation', 'gcse_foundation', '["Describe the human digestive system", "Explain the circulatory system", "Describe plant organ systems"]', '["enzyme", "organ", "tissue", "organ system", "artery", "vein", "capillary"]', '["Veins carry deoxygenated blood (pulmonary vein doesnt)", "Enzymes are living things"]', 8, 2),
('science', 'Infection and Response', 'infection-response', 'gcse_foundation', '["Describe how pathogens cause disease", "Explain the immune response", "Describe vaccination"]', '["pathogen", "bacteria", "virus", "antibody", "antigen", "vaccination", "antibiotic"]', '["Antibiotics kill viruses", "Vaccines contain the full disease"]', 6, 3),
-- GCSE Combined Science: Chemistry
('science', 'Atomic Structure', 'atomic-structure', 'gcse_foundation', '["Describe the structure of an atom", "Explain electron configuration", "Describe ions and isotopes"]', '["proton", "neutron", "electron", "nucleus", "shell", "ion", "isotope", "atomic number", "mass number"]', '["Electrons orbit like planets", "Atoms are mostly solid"]', 6, 4),
('science', 'Chemical Bonding', 'chemical-bonding', 'gcse_foundation', '["Describe ionic, covalent and metallic bonding", "Draw dot-and-cross diagrams", "Explain properties from bonding"]', '["ionic", "covalent", "metallic", "electrostatic", "delocalised", "giant structure"]', '["Ionic bonds are weak", "Molecules have high melting points"]', 8, 5),
-- GCSE Combined Science: Physics
('science', 'Energy', 'energy-physics', 'gcse_foundation', '["Describe energy stores and transfers", "Calculate kinetic and gravitational PE", "Explain conservation of energy"]', '["kinetic", "potential", "thermal", "elastic", "conservation", "dissipated", "efficiency"]', '["Energy is used up", "Heavier objects fall faster"]', 6, 6),
('science', 'Electricity', 'electricity', 'gcse_foundation', '["Describe series and parallel circuits", "Calculate using V=IR and P=IV", "Explain AC and DC"]', '["current", "voltage", "resistance", "series", "parallel", "ohm", "ampere", "volt"]', '["Current is used up in a circuit", "Voltage is the same as current"]', 8, 7)
ON CONFLICT (subject, topic_slug, level) DO NOTHING;

-- Seed prerequisite relationships
-- algebra-equations requires algebra-basics
INSERT INTO sage_curriculum_prerequisites (topic_id, prerequisite_topic_id, strength)
SELECT e.id, b.id, 'hard'
FROM sage_curriculum_topics e, sage_curriculum_topics b
WHERE e.topic_slug = 'algebra-equations' AND e.subject = 'maths'
  AND b.topic_slug = 'algebra-basics' AND b.subject = 'maths'
ON CONFLICT DO NOTHING;

-- algebra-graphs requires algebra-equations
INSERT INTO sage_curriculum_prerequisites (topic_id, prerequisite_topic_id, strength)
SELECT g.id, e.id, 'hard'
FROM sage_curriculum_topics g, sage_curriculum_topics e
WHERE g.topic_slug = 'algebra-graphs' AND g.subject = 'maths'
  AND e.topic_slug = 'algebra-equations' AND e.subject = 'maths'
ON CONFLICT DO NOTHING;

-- geometry-area-perimeter requires number (soft)
INSERT INTO sage_curriculum_prerequisites (topic_id, prerequisite_topic_id, strength)
SELECT a.id, n.id, 'soft'
FROM sage_curriculum_topics a, sage_curriculum_topics n
WHERE a.topic_slug = 'geometry-area-perimeter' AND a.subject = 'maths'
  AND n.topic_slug = 'number' AND n.subject = 'maths'
ON CONFLICT DO NOTHING;

-- probability requires fractions-decimals-percentages
INSERT INTO sage_curriculum_prerequisites (topic_id, prerequisite_topic_id, strength)
SELECT p.id, f.id, 'hard'
FROM sage_curriculum_topics p, sage_curriculum_topics f
WHERE p.topic_slug = 'probability' AND p.subject = 'maths'
  AND f.topic_slug = 'fractions-decimals-percentages' AND f.subject = 'maths'
ON CONFLICT DO NOTHING;

-- chemical-bonding requires atomic-structure
INSERT INTO sage_curriculum_prerequisites (topic_id, prerequisite_topic_id, strength)
SELECT b.id, a.id, 'hard'
FROM sage_curriculum_topics b, sage_curriculum_topics a
WHERE b.topic_slug = 'chemical-bonding' AND b.subject = 'science'
  AND a.topic_slug = 'atomic-structure' AND a.subject = 'science'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE sage_curriculum_topics IS 'UK national curriculum topic hierarchy with learning objectives, vocabulary, and misconceptions.';
COMMENT ON TABLE sage_curriculum_prerequisites IS 'Directed acyclic graph of topic dependencies — hard (must know) or soft (helps to know).';
COMMENT ON TABLE sage_curriculum_boards IS 'Exam board topic mapping — AQA, Edexcel, OCR, WJEC weighting per topic.';
