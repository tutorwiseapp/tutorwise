/**
 * GCSE Business Studies & Economics Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE Business Studies and Economics
 * based on standard specifications common across AQA, Edexcel, OCR, WJEC, and CCEA.
 *
 * Structure:
 * - Business Studies: Enterprise, Marketing, Finance, HR, Operations, Growth, External Influences
 * - Economics: Scarcity, Demand & Supply, Market Structure, Market Failure,
 *   Government, Macroeconomics, Policy, International Trade
 *
 * @module sage/curriculum/data/business-economics
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Business Studies & Economics Curriculum Topics
 */
export const businessEconomicsTopics: CurriculumTopic[] = [
  // ========================================
  // BUSINESS STUDIES
  // ========================================
  {
    id: 'business-studies-main',
    name: 'Business Studies',
    description: 'The study of how businesses are organised, financed, and managed to meet customer needs and generate profit',
    parentId: null,
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand the purpose and nature of business activity',
      'Analyse how businesses are organised and managed',
      'Evaluate the financial performance of businesses',
      'Explain how businesses respond to external influences',
      'Apply business concepts to real-world case studies',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking business studies is just about making money rather than creating value for customers and stakeholders',
      'Believing all businesses aim to maximise profit (social enterprises and not-for-profits have different objectives)',
      'Assuming large businesses are always more successful than small businesses',
    ],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-Business-Studies',
    },
  },

  // Business Studies 1: Enterprise & Entrepreneurship
  {
    id: 'business-enterprise-entrepreneurship',
    name: 'Enterprise & Entrepreneurship',
    description: 'The role of entrepreneurs, business start-ups, risk and reward, and the purpose of business planning',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Define enterprise and explain the characteristics of successful entrepreneurs',
      'Analyse the risks and rewards of starting a business',
      'Explain the purpose and key components of a business plan',
      'Distinguish between goods and services, and different business sectors (primary, secondary, tertiary)',
      'Evaluate the factors that contribute to business success and failure',
    ],
    prerequisites: [],
    vocabulary: ['entrepreneur', 'enterprise', 'risk', 'reward', 'business plan', 'innovation', 'start-up', 'revenue', 'costs', 'profit', 'primary sector', 'secondary sector', 'tertiary sector', 'goods', 'services', 'market research', 'stakeholder'],
    misconceptions: [
      'Thinking entrepreneurs are born rather than developed (skills can be learned and improved)',
      'Believing a good business idea guarantees success (execution, timing, and planning are equally important)',
      'Assuming all entrepreneurs need a completely original idea (many succeed by improving existing products or services)',
      'Confusing revenue with profit (revenue is total income; profit is revenue minus costs)',
    ],
    relatedTopics: ['business-finance', 'business-marketing'],
    metadata: {
      teachingHours: 5,
      examWeight: 12,
    },
  },

  // Business Studies 2: Marketing
  {
    id: 'business-marketing',
    name: 'Marketing',
    description: 'Market research methods, the marketing mix (4Ps), market segmentation, and competitive strategy',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the purpose of market research and distinguish between primary and secondary methods',
      'Describe the elements of the marketing mix (product, price, place, promotion)',
      'Analyse how businesses use market segmentation to target customers',
      'Evaluate different pricing strategies and their suitability for different products',
      'Understand the product life cycle and its impact on marketing decisions',
    ],
    prerequisites: ['business-enterprise-entrepreneurship'],
    vocabulary: ['marketing mix', 'product', 'price', 'place', 'promotion', 'market research', 'primary research', 'secondary research', 'qualitative data', 'quantitative data', 'market segmentation', 'target market', 'product life cycle', 'brand', 'unique selling point', 'pricing strategy', 'penetration pricing', 'skimming', 'competitive pricing'],
    misconceptions: [
      'Thinking marketing is just advertising (it includes research, product development, pricing, and distribution)',
      'Believing the cheapest price always wins (customers consider quality, brand, and convenience too)',
      'Assuming market research always gives accurate predictions (samples may not represent the whole market)',
      'Confusing market share with market size (share is a percentage; size is total value or volume)',
    ],
    relatedTopics: ['business-enterprise-entrepreneurship', 'business-finance'],
    metadata: {
      teachingHours: 6,
      examWeight: 15,
    },
  },

  // Business Studies 3: Finance
  {
    id: 'business-finance',
    name: 'Finance',
    description: 'Revenue, costs, profit calculation, break-even analysis, cash flow forecasting, and sources of finance',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Calculate revenue, costs (fixed and variable), and profit',
      'Construct and interpret break-even charts and calculate break-even output',
      'Prepare and analyse cash flow forecasts, identifying potential problems',
      'Evaluate different sources of finance for start-ups and established businesses',
      'Interpret basic financial statements including profit and loss accounts',
    ],
    prerequisites: ['business-enterprise-entrepreneurship'],
    vocabulary: ['revenue', 'fixed costs', 'variable costs', 'total costs', 'gross profit', 'net profit', 'break-even', 'margin of safety', 'cash flow', 'cash flow forecast', 'inflows', 'outflows', 'net cash flow', 'opening balance', 'closing balance', 'overdraft', 'loan', 'share capital', 'retained profit', 'venture capital', 'crowdfunding'],
    misconceptions: [
      'Confusing profit with cash flow (a profitable business can still run out of cash)',
      'Thinking break-even means the business is doing well (it only means costs are covered, with zero profit)',
      'Believing revenue is the same as profit (revenue does not account for costs)',
      'Assuming a negative cash flow always means the business is failing (seasonal businesses may have planned negative months)',
    ],
    relatedTopics: ['business-enterprise-entrepreneurship', 'business-growth'],
    metadata: {
      teachingHours: 7,
      examWeight: 18,
    },
  },

  // Business Studies 4: Human Resources
  {
    id: 'business-human-resources',
    name: 'Human Resources',
    description: 'Recruitment and selection processes, motivation theories (Maslow, Herzberg, Taylor), training, and organisational structure',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe the recruitment and selection process including job descriptions and person specifications',
      'Explain and compare motivation theories: Maslow hierarchy of needs, Herzberg two-factor theory, and Taylor scientific management',
      'Analyse different methods of motivation including financial and non-financial incentives',
      'Evaluate different types of training (induction, on-the-job, off-the-job) and their benefits',
      'Understand organisational structures including span of control, hierarchy, and delegation',
    ],
    prerequisites: ['business-enterprise-entrepreneurship'],
    vocabulary: ['recruitment', 'selection', 'job description', 'person specification', 'interview', 'motivation', 'Maslow', 'hierarchy of needs', 'Herzberg', 'hygiene factors', 'motivators', 'Taylor', 'scientific management', 'piece rate', 'salary', 'bonus', 'fringe benefits', 'induction', 'on-the-job training', 'off-the-job training', 'organisational structure', 'span of control', 'hierarchy', 'delegation', 'chain of command'],
    misconceptions: [
      'Thinking money is the only motivator (Herzberg showed pay is a hygiene factor, not a true motivator)',
      'Believing Maslow\'s hierarchy is a strict sequence everyone follows in order (people can pursue higher needs before lower ones are fully met)',
      'Assuming a flat organisational structure is always better (it depends on the size and nature of the business)',
      'Confusing delegation with abdication (delegation involves handing over authority while retaining responsibility)',
    ],
    relatedTopics: ['business-operations', 'business-growth'],
    metadata: {
      teachingHours: 6,
      examWeight: 14,
    },
  },

  // Business Studies 5: Operations
  {
    id: 'business-operations',
    name: 'Operations',
    description: 'Production methods (job, batch, flow), quality management, stock control, and supply chain management',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Compare production methods: job, batch, and flow production and their suitability',
      'Explain quality management approaches including quality control, quality assurance, and total quality management (TQM)',
      'Analyse stock control methods and interpret stock control diagrams',
      'Evaluate the importance of supply chain management and procurement',
      'Understand the role of technology in improving operations and productivity',
    ],
    prerequisites: ['business-enterprise-entrepreneurship'],
    vocabulary: ['job production', 'batch production', 'flow production', 'lean production', 'just-in-time', 'quality control', 'quality assurance', 'total quality management', 'stock control', 'buffer stock', 'lead time', 'reorder level', 'supply chain', 'procurement', 'productivity', 'efficiency', 'automation', 'CAD', 'CAM'],
    misconceptions: [
      'Thinking flow production is always the best method (it requires high demand for identical products)',
      'Believing just-in-time means the business holds no stock at all (it holds minimal stock and relies on reliable suppliers)',
      'Assuming quality control and quality assurance are the same (control inspects finished products; assurance builds quality into every stage)',
      'Confusing productivity with production (productivity is output per worker or per hour, not total output)',
    ],
    relatedTopics: ['business-finance', 'business-growth'],
    metadata: {
      teachingHours: 5,
      examWeight: 13,
    },
  },

  // Business Studies 6: Business Growth
  {
    id: 'business-growth',
    name: 'Business Growth',
    description: 'Organic and external growth strategies, mergers and takeovers, franchising, and business ownership structures',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Distinguish between organic growth and external growth (mergers and takeovers)',
      'Explain the advantages and disadvantages of franchising for franchisors and franchisees',
      'Compare business ownership structures: sole trader, partnership, private limited company, public limited company',
      'Analyse the benefits and risks of business growth for different stakeholders',
      'Evaluate why some businesses choose to remain small',
    ],
    prerequisites: ['business-finance', 'business-enterprise-entrepreneurship'],
    vocabulary: ['organic growth', 'external growth', 'merger', 'takeover', 'horizontal integration', 'vertical integration', 'franchise', 'franchisor', 'franchisee', 'sole trader', 'partnership', 'private limited company', 'public limited company', 'shareholder', 'dividend', 'limited liability', 'unlimited liability', 'economies of scale', 'diseconomies of scale'],
    misconceptions: [
      'Thinking bigger is always better (diseconomies of scale can make large firms less efficient)',
      'Believing franchisees are fully independent business owners (they must follow strict rules set by the franchisor)',
      'Confusing a merger with a takeover (mergers are agreed; takeovers can be hostile)',
      'Assuming all businesses want to grow (some owners prefer to stay small for lifestyle or control reasons)',
    ],
    relatedTopics: ['business-finance', 'business-external-influences'],
    metadata: {
      teachingHours: 5,
      examWeight: 14,
    },
  },

  // Business Studies 7: External Influences
  {
    id: 'business-external-influences',
    name: 'External Influences',
    description: 'The impact of the economic climate, legislation, technology, ethical considerations, and globalisation on business',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain how the economic climate (interest rates, exchange rates, inflation, unemployment) affects businesses',
      'Describe the impact of legislation on business including employment law, consumer law, and environmental regulation',
      'Analyse the effects of technological change on business operations and competition',
      'Evaluate the impact of globalisation on UK businesses including competition and market opportunities',
      'Understand the role of ethics and the environment in business decision-making',
    ],
    prerequisites: ['business-enterprise-entrepreneurship', 'business-finance'],
    vocabulary: ['interest rate', 'exchange rate', 'inflation', 'unemployment', 'recession', 'economic growth', 'consumer law', 'employment law', 'minimum wage', 'Health and Safety Act', 'Consumer Rights Act', 'e-commerce', 'social media marketing', 'globalisation', 'multinational', 'tariff', 'trade barrier', 'ethics', 'corporate social responsibility', 'sustainability', 'pressure group'],
    misconceptions: [
      'Thinking a fall in interest rates is always good for businesses (it depends on whether the business is a borrower or saver)',
      'Believing legislation only creates costs for businesses (it can also create opportunities and a level playing field)',
      'Assuming globalisation only benefits large multinational corporations (small businesses can access global markets through e-commerce)',
      'Confusing ethics with law (a business can be legal but still act unethically)',
    ],
    relatedTopics: ['business-growth', 'economics-role-of-government'],
    metadata: {
      teachingHours: 6,
      examWeight: 14,
    },
  },

  // Business Studies 8: Business Planning & Ownership
  {
    id: 'business-planning-ownership',
    name: 'Business Planning & Ownership',
    description: 'Business plans, aims and objectives, ownership structures (sole trader to PLC), stakeholders and their conflicting interests',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Explain the purpose and contents of a business plan including market analysis, financial forecasts, and marketing strategy',
      'Compare ownership structures: sole trader, partnership, private limited company (Ltd), and public limited company (PLC)',
      'Distinguish between the aims and objectives of different types of businesses including social enterprises and not-for-profits',
      'Identify key stakeholders and analyse how their interests may conflict',
    ],
    prerequisites: ['business-enterprise-entrepreneurship'],
    vocabulary: ['business plan', 'aims', 'objectives', 'SMART targets', 'sole trader', 'partnership', 'deed of partnership', 'private limited company', 'public limited company', 'social enterprise', 'not-for-profit', 'stakeholder', 'shareholder', 'limited liability', 'unlimited liability', 'incorporation', 'articles of association'],
    misconceptions: [
      'Confusing a business plan with a guarantee of success (it is a planning tool, not a prediction)',
      'Thinking sole traders always work alone (they can employ staff but bear all the risk personally)',
      'Believing all PLCs are large companies (any company that offers shares to the public is a PLC regardless of size)',
      'Assuming stakeholder interests are always opposed (some objectives like quality benefit both customers and employees)',
    ],
    relatedTopics: ['business-enterprise-entrepreneurship', 'business-growth'],
    metadata: {
      teachingHours: 5,
      examWeight: 10,
    },
  },

  // Business Studies 9: Customer Service
  {
    id: 'business-customer-service',
    name: 'Customer Service',
    description: 'The importance of customer service, methods of providing good service, handling complaints, and building customer loyalty',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Explain why good customer service is essential for business survival and growth',
      'Describe methods of providing good customer service including pre-sale, point-of-sale, and after-sale',
      'Analyse the impact of customer satisfaction and loyalty on revenue and reputation',
      'Evaluate the role of technology (e.g., chatbots, CRM systems, social media) in modern customer service',
    ],
    prerequisites: ['business-enterprise-entrepreneurship', 'business-marketing'],
    vocabulary: ['customer service', 'customer satisfaction', 'customer loyalty', 'repeat purchase', 'brand loyalty', 'customer retention', 'customer relationship management', 'CRM', 'complaint handling', 'after-sale service', 'warranty', 'feedback', 'mystery shopper', 'Net Promoter Score'],
    misconceptions: [
      'Thinking customer service is only about dealing with complaints (it covers the entire customer experience)',
      'Believing the lowest price always creates the most loyal customers (service quality often matters more)',
      'Assuming online businesses do not need customer service (digital customers have equally high expectations)',
    ],
    relatedTopics: ['business-marketing', 'business-operations'],
    metadata: {
      teachingHours: 4,
      examWeight: 8,
    },
  },

  // Business Studies 10: Business Ethics & Environment
  {
    id: 'business-ethics-environment',
    name: 'Business Ethics & Environment',
    description: 'Ethical decision-making, corporate social responsibility, environmental sustainability, pressure groups, and trade-offs between profit and ethics',
    parentId: 'business-studies-main',
    subject: 'business-studies',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Define business ethics and explain why ethical behaviour matters to businesses and stakeholders',
      'Analyse examples of ethical and unethical business practices and their consequences',
      'Evaluate the costs and benefits of adopting environmentally sustainable practices',
      'Explain the role of pressure groups in influencing business behaviour',
      'Assess the trade-offs businesses face between profit maximisation and social responsibility',
    ],
    prerequisites: ['business-enterprise-entrepreneurship', 'business-external-influences'],
    vocabulary: ['ethics', 'business ethics', 'corporate social responsibility', 'CSR', 'sustainability', 'carbon footprint', 'renewable energy', 'recycling', 'fair trade', 'pressure group', 'ethical sourcing', 'greenwashing', 'triple bottom line', 'people planet profit', 'stakeholder capitalism', 'environmental audit'],
    misconceptions: [
      'Thinking ethical behaviour always reduces profit (ethical businesses often build stronger brands and customer loyalty)',
      'Believing CSR is just a marketing tool (genuine CSR involves embedding ethical values into business operations)',
      'Assuming small businesses cannot make a difference to the environment (collective small changes have significant impact)',
      'Confusing greenwashing with genuine sustainability (greenwashing is misleading claims about environmental practices)',
    ],
    relatedTopics: ['business-external-influences', 'economics-market-failure'],
    metadata: {
      teachingHours: 4,
      examWeight: 10,
    },
  },

  // ========================================
  // ECONOMICS
  // ========================================
  {
    id: 'economics-main',
    name: 'Economics',
    description: 'The study of how societies allocate scarce resources to satisfy unlimited wants, including microeconomic and macroeconomic principles',
    parentId: null,
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand the fundamental economic problem of scarcity',
      'Analyse how markets determine prices and allocate resources',
      'Explain the role of government in the economy',
      'Evaluate macroeconomic objectives and policies',
      'Apply economic concepts to real-world issues and data',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking economics is just about money and finance (it studies the allocation of all scarce resources)',
      'Believing economic models perfectly predict the real world (they are simplifications that help us understand patterns)',
      'Assuming what is good for one individual is always good for the economy (the fallacy of composition)',
    ],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-Economics',
    },
  },

  // Economics 1: Scarcity & Choice
  {
    id: 'economics-scarcity-choice',
    name: 'Scarcity & Choice',
    description: 'The fundamental economic problem, opportunity cost, economic agents, and the production possibility curve',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Define the basic economic problem: unlimited wants and limited resources',
      'Explain opportunity cost and apply it to decision-making by individuals, firms, and governments',
      'Describe the roles of economic agents: consumers, producers, and the government',
      'Interpret and analyse a production possibility curve (PPC) to illustrate scarcity, choice, and opportunity cost',
      'Distinguish between the three factors of production: land, labour, and capital (and enterprise)',
    ],
    prerequisites: [],
    vocabulary: ['scarcity', 'opportunity cost', 'economic problem', 'wants', 'needs', 'resources', 'factors of production', 'land', 'labour', 'capital', 'enterprise', 'production possibility curve', 'PPC', 'economic agents', 'consumers', 'producers', 'allocation'],
    misconceptions: [
      'Thinking scarcity means shortage (scarcity is about limited resources relative to unlimited wants; shortage is a temporary market condition)',
      'Believing opportunity cost is measured in money (it is the next best alternative forgone, which may not have a monetary value)',
      'Assuming the production possibility curve is fixed (it shifts outward with economic growth or improved technology)',
    ],
    relatedTopics: ['economics-demand-supply'],
    metadata: {
      teachingHours: 4,
      examWeight: 10,
    },
  },

  // Economics 2: Demand & Supply
  {
    id: 'economics-demand-supply',
    name: 'Demand & Supply',
    description: 'The price mechanism, market equilibrium, shifts in demand and supply curves, and price elasticity',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Draw and interpret demand and supply curves and explain the laws of demand and supply',
      'Explain how equilibrium price and quantity are determined in a market',
      'Analyse the causes and effects of shifts in demand and supply curves',
      'Define and calculate price elasticity of demand (PED) and explain its significance for businesses',
      'Understand the difference between a movement along a curve and a shift of a curve',
    ],
    prerequisites: ['economics-scarcity-choice'],
    vocabulary: ['demand', 'supply', 'price mechanism', 'equilibrium', 'equilibrium price', 'equilibrium quantity', 'demand curve', 'supply curve', 'shift', 'extension', 'contraction', 'excess demand', 'excess supply', 'price elasticity of demand', 'PED', 'elastic', 'inelastic', 'substitute', 'complement', 'normal good', 'inferior good'],
    misconceptions: [
      'Confusing a movement along a demand curve (caused by price change) with a shift of the demand curve (caused by non-price factors)',
      'Thinking equilibrium means the market is fair or desirable (it just means quantity demanded equals quantity supplied)',
      'Believing demand means the same as want (demand requires willingness and ability to pay)',
      'Assuming all goods have the same elasticity (necessities tend to be inelastic; luxuries tend to be elastic)',
    ],
    relatedTopics: ['economics-scarcity-choice', 'economics-market-structure'],
    metadata: {
      teachingHours: 6,
      examWeight: 15,
    },
  },

  // Economics 3: Market Structure
  {
    id: 'economics-market-structure',
    name: 'Market Structure',
    description: 'Types of competition including perfect competition, monopoly, and oligopoly, and their effects on consumers',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe the characteristics of competitive markets and explain how they benefit consumers',
      'Define monopoly and explain how monopoly power affects prices, output, and consumer choice',
      'Explain the features of an oligopoly and how firms in oligopolistic markets compete',
      'Analyse the role of the Competition and Markets Authority (CMA) in promoting competition',
      'Evaluate whether monopolies are always harmful to consumers',
    ],
    prerequisites: ['economics-demand-supply'],
    vocabulary: ['competition', 'competitive market', 'monopoly', 'monopoly power', 'oligopoly', 'market share', 'barriers to entry', 'price maker', 'price taker', 'supernormal profit', 'Competition and Markets Authority', 'CMA', 'collusion', 'cartel', 'price war', 'non-price competition', 'consumer choice', 'efficiency'],
    misconceptions: [
      'Thinking a monopoly means only one firm exists (it means a firm has significant market dominance, usually 25%+ share)',
      'Believing monopolies are always bad for consumers (they may invest in innovation and benefit from economies of scale)',
      'Assuming competitive markets always produce the best outcomes (they may under-provide public goods or create externalities)',
      'Confusing oligopoly with monopoly (oligopoly has a few large dominant firms, not just one)',
    ],
    relatedTopics: ['economics-demand-supply', 'economics-market-failure'],
    metadata: {
      teachingHours: 5,
      examWeight: 12,
    },
  },

  // Economics 4: Market Failure
  {
    id: 'economics-market-failure',
    name: 'Market Failure',
    description: 'Externalities, public goods, merit and demerit goods, and government intervention to correct market failure',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Define market failure and explain why markets may not allocate resources efficiently',
      'Explain positive and negative externalities with real-world examples and diagrams',
      'Distinguish between public goods, private goods, merit goods, and demerit goods',
      'Analyse government methods of intervention: taxation, subsidies, regulation, and provision',
      'Evaluate whether government intervention always improves market outcomes',
    ],
    prerequisites: ['economics-demand-supply', 'economics-market-structure'],
    vocabulary: ['market failure', 'externality', 'positive externality', 'negative externality', 'social cost', 'private cost', 'external cost', 'social benefit', 'public good', 'private good', 'merit good', 'demerit good', 'non-excludable', 'non-rival', 'free rider', 'information failure', 'government intervention', 'subsidy', 'indirect tax'],
    misconceptions: [
      'Thinking market failure means the market has completely collapsed (it means resources are misallocated)',
      'Believing externalities are always negative (positive externalities like education and vaccination also exist)',
      'Confusing public goods with goods provided by the government (public goods are defined by non-excludability and non-rivalry, not who provides them)',
      'Assuming government intervention always corrects market failure (government failure can make outcomes worse)',
    ],
    relatedTopics: ['economics-role-of-government', 'economics-demand-supply'],
    metadata: {
      teachingHours: 6,
      examWeight: 15,
    },
  },

  // Economics 5: Role of Government
  {
    id: 'economics-role-of-government',
    name: 'Role of Government',
    description: 'Taxation, subsidies, regulation, redistribution of income, and the provision of public services',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the reasons for government intervention in the economy',
      'Distinguish between direct and indirect taxation and analyse their effects',
      'Describe how subsidies work and evaluate their impact on markets',
      'Analyse the role of regulation in protecting consumers, workers, and the environment',
      'Evaluate government policies to redistribute income and reduce inequality',
    ],
    prerequisites: ['economics-market-failure'],
    vocabulary: ['taxation', 'direct tax', 'indirect tax', 'income tax', 'VAT', 'corporation tax', 'progressive tax', 'regressive tax', 'proportional tax', 'subsidy', 'regulation', 'minimum wage', 'National Living Wage', 'redistribution', 'transfer payments', 'benefits', 'welfare state', 'inequality', 'poverty'],
    misconceptions: [
      'Thinking higher taxes always reduce economic activity (it depends on the type, level, and what the revenue is spent on)',
      'Believing subsidies are free money (they are funded by taxpayers and can distort market signals)',
      'Assuming the minimum wage always causes unemployment (evidence shows moderate increases have minimal employment effects)',
      'Confusing equality with equity (equality means everyone gets the same; equity means fair distribution based on need)',
    ],
    relatedTopics: ['economics-market-failure', 'economics-fiscal-monetary-policy'],
    metadata: {
      teachingHours: 5,
      examWeight: 12,
    },
  },

  // Economics 6: Macroeconomic Objectives
  {
    id: 'economics-macroeconomic-objectives',
    name: 'Macroeconomic Objectives',
    description: 'GDP and economic growth, inflation, unemployment, and the balance of trade as key government targets',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Define GDP and explain how it is used to measure economic growth and living standards',
      'Describe the causes and consequences of inflation and deflation',
      'Analyse types and causes of unemployment (cyclical, structural, frictional, seasonal)',
      'Explain the balance of trade and the significance of a trade surplus or deficit',
      'Evaluate the trade-offs between macroeconomic objectives (e.g., growth vs inflation)',
    ],
    prerequisites: ['economics-scarcity-choice'],
    vocabulary: ['GDP', 'gross domestic product', 'economic growth', 'recession', 'boom', 'business cycle', 'inflation', 'deflation', 'Consumer Price Index', 'CPI', 'unemployment', 'cyclical unemployment', 'structural unemployment', 'frictional unemployment', 'seasonal unemployment', 'balance of trade', 'trade surplus', 'trade deficit', 'exports', 'imports', 'living standards'],
    misconceptions: [
      'Thinking GDP growth always means everyone is better off (growth can be unevenly distributed)',
      'Believing all inflation is harmful (moderate inflation of around 2% is considered healthy for an economy)',
      'Confusing the balance of trade with the balance of payments (trade is goods and services; payments includes all financial flows)',
      'Assuming zero unemployment is achievable or desirable (some frictional unemployment is natural in a healthy economy)',
    ],
    relatedTopics: ['economics-fiscal-monetary-policy', 'economics-international-trade'],
    metadata: {
      teachingHours: 6,
      examWeight: 15,
    },
  },

  // Economics 7: Fiscal & Monetary Policy
  {
    id: 'economics-fiscal-monetary-policy',
    name: 'Fiscal & Monetary Policy',
    description: 'Government spending and taxation (fiscal policy), interest rates and money supply (monetary policy), and quantitative easing',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Define fiscal policy and explain how government spending and taxation affect the economy',
      'Define monetary policy and explain how the Bank of England uses interest rates to control inflation',
      'Describe quantitative easing (QE) and analyse why it is used during economic downturns',
      'Evaluate the effectiveness and limitations of fiscal and monetary policy tools',
      'Analyse the difference between expansionary and contractionary policy and when each is appropriate',
    ],
    prerequisites: ['economics-macroeconomic-objectives', 'economics-role-of-government'],
    vocabulary: ['fiscal policy', 'monetary policy', 'government spending', 'budget deficit', 'budget surplus', 'national debt', 'austerity', 'interest rate', 'base rate', 'Bank of England', 'Monetary Policy Committee', 'MPC', 'quantitative easing', 'QE', 'money supply', 'expansionary policy', 'contractionary policy', 'aggregate demand'],
    misconceptions: [
      'Thinking the government sets interest rates (the independent Bank of England Monetary Policy Committee does)',
      'Believing a budget deficit is always bad (governments may borrow to invest during recessions)',
      'Confusing fiscal policy with monetary policy (fiscal = government spending and tax; monetary = interest rates and money supply)',
      'Assuming quantitative easing directly gives money to the public (it involves the central bank buying financial assets from banks)',
    ],
    relatedTopics: ['economics-macroeconomic-objectives', 'economics-role-of-government'],
    metadata: {
      teachingHours: 5,
      examWeight: 12,
    },
  },

  // Economics 8: International Trade
  {
    id: 'economics-international-trade',
    name: 'International Trade',
    description: 'Globalisation, specialisation, tariffs and trade barriers, exchange rates, and the balance of payments',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain why countries trade and the benefits of specialisation and comparative advantage',
      'Describe the impact of globalisation on developed and developing economies',
      'Analyse the effects of tariffs, quotas, and other trade barriers on consumers and producers',
      'Explain how exchange rates are determined and the effects of appreciation and depreciation',
      'Evaluate the arguments for and against free trade and protectionism',
    ],
    prerequisites: ['economics-macroeconomic-objectives', 'economics-demand-supply'],
    vocabulary: ['international trade', 'globalisation', 'specialisation', 'comparative advantage', 'absolute advantage', 'free trade', 'protectionism', 'tariff', 'quota', 'trade barrier', 'embargo', 'exchange rate', 'appreciation', 'depreciation', 'strong pound', 'weak pound', 'balance of payments', 'current account', 'World Trade Organisation', 'WTO', 'multinational corporation', 'MNC'],
    misconceptions: [
      'Thinking free trade benefits all workers equally (some industries may decline while others grow)',
      'Believing protectionism always helps domestic businesses (it can lead to retaliation, higher prices, and reduced competition)',
      'Confusing a strong currency with a strong economy (a strong pound makes exports more expensive and imports cheaper)',
      'Assuming globalisation only benefits wealthy countries (many developing economies have grown significantly through trade)',
    ],
    relatedTopics: ['economics-macroeconomic-objectives', 'economics-fiscal-monetary-policy', 'business-external-influences'],
    metadata: {
      teachingHours: 5,
      examWeight: 12,
    },
  },

  // Economics 9: Economic Growth & Development
  {
    id: 'economics-growth-development',
    name: 'Economic Growth & Development',
    description: 'The difference between growth and development, indicators of development (HDI), causes of poverty, and strategies for economic development',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Distinguish between economic growth (increase in GDP) and economic development (improvement in living standards)',
      'Describe and evaluate indicators of development including HDI, GDP per capita, literacy rate, and life expectancy',
      'Analyse the causes of poverty and inequality within and between countries',
      'Evaluate strategies for promoting development including aid, trade, debt relief, and investment in education',
      'Assess the environmental and social sustainability of economic growth',
    ],
    prerequisites: ['economics-macroeconomic-objectives', 'economics-international-trade'],
    vocabulary: ['economic growth', 'economic development', 'Human Development Index', 'HDI', 'GDP per capita', 'literacy rate', 'life expectancy', 'infant mortality', 'absolute poverty', 'relative poverty', 'inequality', 'Gini coefficient', 'foreign aid', 'bilateral aid', 'multilateral aid', 'debt relief', 'microfinance', 'sustainable development', 'Sustainable Development Goals', 'SDGs'],
    misconceptions: [
      'Thinking economic growth and development are the same (a country can grow its GDP without improving living standards for most citizens)',
      'Believing GDP per capita accurately reflects how well off everyone in a country is (it is an average that hides inequality)',
      'Assuming foreign aid always helps developing countries (it can create dependency and may not reach those who need it most)',
      'Thinking development is only about increasing income (it includes health, education, freedom, and environmental quality)',
    ],
    relatedTopics: ['economics-macroeconomic-objectives', 'economics-international-trade'],
    metadata: {
      teachingHours: 5,
      examWeight: 10,
    },
  },

  // Economics 10: Personal Finance & Money
  {
    id: 'economics-personal-finance',
    name: 'Personal Finance & Money',
    description: 'The functions of money, saving and borrowing, interest rates, budgeting, and the role of banks and financial institutions',
    parentId: 'economics-main',
    subject: 'economics',
    examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Explain the functions of money: medium of exchange, store of value, unit of account, and standard of deferred payment',
      'Describe different types of saving and borrowing products and their risks and rewards',
      'Calculate and interpret simple and compound interest on savings and loans',
      'Explain the importance of budgeting and managing personal finances responsibly',
      'Analyse the role of banks, building societies, and the Bank of England in the financial system',
    ],
    prerequisites: ['economics-scarcity-choice'],
    vocabulary: ['money', 'medium of exchange', 'store of value', 'unit of account', 'barter', 'saving', 'borrowing', 'interest rate', 'simple interest', 'compound interest', 'APR', 'annual percentage rate', 'credit', 'debit', 'mortgage', 'loan', 'overdraft', 'current account', 'savings account', 'budget', 'income', 'expenditure', 'inflation', 'real value', 'nominal value'],
    misconceptions: [
      'Thinking saving always means putting money in a bank (it includes any deferred spending, such as pensions and investments)',
      'Believing a low interest rate is always good (it is good for borrowers but bad for savers)',
      'Confusing nominal and real values (nominal does not account for inflation; real values are adjusted for purchasing power)',
      'Assuming credit cards are free money (credit must be repaid, often with high interest charges)',
    ],
    relatedTopics: ['economics-scarcity-choice', 'economics-fiscal-monetary-policy'],
    metadata: {
      teachingHours: 4,
      examWeight: 8,
    },
  },
];

/**
 * Get all business and economics topics combined
 */
export function getAllBusinessEconomicsTopics(): CurriculumTopic[] {
  return businessEconomicsTopics;
}

/**
 * Get topics by specific subject
 */
export function getTopicsBySubject(subject: 'business-studies' | 'economics'): CurriculumTopic[] {
  return businessEconomicsTopics.filter(t => t.subject === subject);
}

/**
 * Get all top-level business/economics topics (main subject areas)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return businessEconomicsTopics.filter(t => t.parentId === null);
}

/**
 * Get all child topics of a parent topic
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return businessEconomicsTopics.filter(t => t.parentId === parentId);
}

/**
 * Get a business/economics topic by ID
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return businessEconomicsTopics.find(t => t.id === id);
}
