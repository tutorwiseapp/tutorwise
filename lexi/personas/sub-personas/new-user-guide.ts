/**
 * New User Guide Sub-Persona
 *
 * Specialized persona for helping new users get started
 * with TutorWise, regardless of their role.
 *
 * @module lexi/personas/sub-personas/new-user-guide
 */

import { BasePersona, withIntentHandlers, type IntentHandlerMap } from '../base-persona';
import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaType,
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';

// --- Persona Config ---

const config: PersonaConfig = {
  name: 'New User Guide',
  description: 'Friendly onboarding assistant for new TutorWise users',
  defaultGreeting: `Welcome to TutorWise, {name}! I'm here to help you get started. Whether you're a tutor, parent, or student, I'll guide you through setting up your account and making the most of the platform.`,
  capabilities: [
    'Account setup guidance',
    'Profile completion help',
    'Feature explanations',
    'First booking assistance',
    'Verification walkthrough',
    'Platform tour',
    'FAQ answers',
  ],
  suggestedQueries: [
    "How do I get started?",
    "What should I do first?",
    "How does TutorWise work?",
    "Help me complete my profile",
    "What can I do on this platform?",
  ],
};

// --- Role-Specific Guides ---

const ONBOARDING_GUIDES: Record<string, {
  steps: string[];
  tips: string[];
  nextActions: string[];
}> = {
  tutor: {
    steps: [
      '1. **Complete your profile** - Add your subjects, qualifications, and a friendly bio',
      '2. **Set your availability** - Let students know when you can teach',
      '3. **Add your pricing** - Set competitive hourly rates',
      '4. **Complete verification** - Upload ID and complete DBS check',
      '5. **Get your first student** - Share your profile or wait for matches',
    ],
    tips: [
      'Add a profile photo - tutors with photos get 40% more bookings',
      'Write a detailed bio mentioning your teaching approach',
      'Start with competitive pricing and increase as you get reviews',
      'Respond to booking requests within 24 hours',
    ],
    nextActions: ['Complete profile', 'Set availability', 'Start verification'],
  },
  client: {
    steps: [
      '1. **Tell us about your child** - Age, year group, and subjects needed',
      '2. **Browse tutors** - Search by subject, read reviews, check availability',
      '3. **Book a trial lesson** - Try a tutor before committing',
      '4. **Set up payments** - Secure payment through EduPay',
      '5. **Track progress** - Monitor your child\'s learning journey',
    ],
    tips: [
      'Book a trial lesson first to ensure good fit',
      'Read reviews from other parents',
      'Check tutor qualifications and DBS status',
      'Communicate your child\'s learning goals clearly',
    ],
    nextActions: ['Find a tutor', 'Add child details', 'Browse subjects'],
  },
  student: {
    steps: [
      '1. **Complete your profile** - Tell tutors about yourself',
      '2. **Set your learning goals** - What do you want to achieve?',
      '3. **Join your first lesson** - Your tutor will guide you',
      '4. **Practice with Sage** - Our AI tutor helps between lessons',
      '5. **Track your progress** - Celebrate your achievements!',
    ],
    tips: [
      'Be honest about what you find difficult',
      'Come to lessons with questions prepared',
      'Use Sage AI for extra practice between lessons',
      'Don\'t be afraid to ask your tutor to explain differently',
    ],
    nextActions: ['Set learning goals', 'View upcoming lessons', 'Try Sage AI'],
  },
  organisation: {
    steps: [
      '1. **Set up your organisation** - Add name, logo, and details',
      '2. **Invite tutors** - Build your team of educators',
      '3. **Configure settings** - Set policies and preferences',
      '4. **Set up billing** - Configure subscription and payment methods',
      '5. **Start accepting bookings** - Your tutors can now receive students',
    ],
    tips: [
      'Invite tutors via email or share your organisation link',
      'Set clear expectations for tutor response times',
      'Monitor analytics to track organisation growth',
      'Use reports to identify top performers',
    ],
    nextActions: ['Complete setup', 'Invite tutors', 'View dashboard'],
  },
};

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  explain: {
    getting_started: async function(this: NewUserGuide, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Providing getting started guide', ctx);

      const userRole = ctx.user?.role || 'student';
      const guide = ONBOARDING_GUIDES[userRole] || ONBOARDING_GUIDES.student;

      let message = `**Getting Started as a ${capitalize(userRole)}:**\n\n`;
      message += guide.steps.join('\n') + '\n\n';
      message += `**💡 Tips:**\n`;
      guide.tips.forEach(tip => {
        message += `• ${tip}\n`;
      });

      return this.success(message, guide, guide.nextActions);
    },

    how_it_works: async function(this: NewUserGuide, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      const userRole = ctx.user?.role || 'student';

      let message = `**How TutorWise Works:**\n\n`;

      if (userRole === 'tutor') {
        message += `**As a Tutor:**\n`;
        message += `1. Create your profile and set availability\n`;
        message += `2. Students find and book you\n`;
        message += `3. Teach online or in-person\n`;
        message += `4. Get paid weekly via EduPay\n\n`;
        message += `You set your own rates and schedule. We handle payments, scheduling, and help you find students.`;
      } else if (userRole === 'client') {
        message += `**As a Parent:**\n`;
        message += `1. Search for qualified tutors\n`;
        message += `2. Book lessons that fit your schedule\n`;
        message += `3. Pay securely through EduPay\n`;
        message += `4. Track your child's progress\n\n`;
        message += `All tutors are verified with DBS checks. You can try a trial lesson before committing.`;
      } else {
        message += `**As a Student:**\n`;
        message += `1. Your parent or tutor sets up lessons\n`;
        message += `2. Join lessons online or in-person\n`;
        message += `3. Practice between lessons with Sage AI\n`;
        message += `4. Track your progress and achievements\n\n`;
        message += `Learning is a journey - we're here to help every step of the way!`;
      }

      return this.success(message, null, ['Find a tutor', 'View my profile', 'Explore features']);
    },

    features: async function(this: NewUserGuide, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      const userRole = ctx.user?.role || 'student';

      let message = `**TutorWise Features:**\n\n`;

      message += `**🎓 For Everyone:**\n`;
      message += `• Secure video lessons\n`;
      message += `• Integrated whiteboard\n`;
      message += `• Lesson scheduling\n`;
      message += `• Progress tracking\n\n`;

      if (userRole === 'tutor') {
        message += `**📚 For Tutors:**\n`;
        message += `• Set your own rates & availability\n`;
        message += `• Resource library\n`;
        message += `• Student management\n`;
        message += `• Earnings dashboard\n`;
        message += `• Referral program\n`;
      } else if (userRole === 'client') {
        message += `**👨‍👩‍👧 For Parents:**\n`;
        message += `• Tutor search & matching\n`;
        message += `• Progress reports\n`;
        message += `• Secure payments\n`;
        message += `• Direct messaging\n`;
        message += `• Trial lessons\n`;
      } else {
        message += `**🧑‍🎓 For Students:**\n`;
        message += `• Sage AI tutor (practice anytime!)\n`;
        message += `• Homework help\n`;
        message += `• Progress tracking\n`;
        message += `• Achievement badges\n`;
        message += `• Study resources\n`;
      }

      return this.success(message, null, ['Try a feature', 'Complete profile', 'Get started']);
    },

    profile: async function(this: NewUserGuide, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Profile help', ctx);

      const userRole = ctx.user?.role || 'student';

      let message = `**Complete Your Profile:**\n\n`;

      if (userRole === 'tutor') {
        message += `**Essential:**\n`;
        message += `• Profile photo ✨ (increases bookings by 40%)\n`;
        message += `• Subjects you teach\n`;
        message += `• Education & qualifications\n`;
        message += `• Teaching experience\n`;
        message += `• Bio / About me\n\n`;
        message += `**Optional but recommended:**\n`;
        message += `• Video introduction\n`;
        message += `• Teaching philosophy\n`;
        message += `• Availability preferences\n`;
      } else if (userRole === 'client') {
        message += `**For your profile:**\n`;
        message += `• Your name\n`;
        message += `• Contact information\n\n`;
        message += `**About your child:**\n`;
        message += `• Name and age\n`;
        message += `• Year group / level\n`;
        message += `• Subjects needing help\n`;
        message += `• Learning goals\n`;
        message += `• Any special requirements\n`;
      } else {
        message += `• Display name\n`;
        message += `• Subjects you're studying\n`;
        message += `• Year group / level\n`;
        message += `• Learning goals\n`;
        message += `• Interests (helps tutors connect with you!)\n`;
      }

      return this.success(message, null, ['Go to profile', 'What\'s next?']);
    },
  },

  support: {
    help: async function(this: NewUserGuide, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('General help', ctx);

      const topic = intent.entities?.topic;

      if (topic === 'verification') {
        return this.success(
          `**Tutor Verification:**\n\n` +
          `To start teaching, tutors need to complete:\n\n` +
          `1. **ID Verification** (5 mins)\n` +
          `   Upload a photo ID (passport or driving licence)\n\n` +
          `2. **DBS Check** (1-2 weeks)\n` +
          `   Enhanced background check for child safety\n\n` +
          `3. **Qualification Check** (2-3 days)\n` +
          `   Verify your teaching qualifications\n\n` +
          `You can start completing your profile while verification is pending.`,
          null,
          ['Start verification', 'Check status']
        );
      }

      if (topic === 'payments') {
        return this.success(
          `**Payment Help:**\n\n` +
          `**For Clients:**\n` +
          `• Payments are secure through EduPay\n` +
          `• You're charged after each lesson\n` +
          `• Refunds available for cancellations >24h ahead\n\n` +
          `**For Tutors:**\n` +
          `• Payouts are weekly (every Monday)\n` +
          `• Minimum payout: £10\n` +
          `• Direct bank transfer in 2-3 days\n`,
          null,
          ['Payment settings', 'Contact support']
        );
      }

      return this.success(
        `**How can I help?**\n\n` +
        `I can assist with:\n` +
        `• Getting started\n` +
        `• Profile setup\n` +
        `• Finding tutors\n` +
        `• Booking lessons\n` +
        `• Payments & billing\n` +
        `• Verification\n` +
        `• Technical issues\n\n` +
        `What would you like help with?`,
        null,
        ['Getting started', 'Profile help', 'Payment help', 'Contact support']
      );
    },

    faq: async function(this: NewUserGuide, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      return this.success(
        `**Frequently Asked Questions:**\n\n` +
        `**How much does it cost?**\n` +
        `Tutors set their own rates. Average is £25-50/hour.\n\n` +
        `**Can I try before committing?**\n` +
        `Yes! Book a trial lesson with any tutor.\n\n` +
        `**How do I cancel a lesson?**\n` +
        `Cancel in the app 24+ hours ahead for full refund.\n\n` +
        `**Are tutors background checked?**\n` +
        `Yes, all tutors complete enhanced DBS checks.\n\n` +
        `**Can lessons be online or in-person?**\n` +
        `Both! Check tutor preferences when booking.\n\n` +
        `Have another question?`,
        null,
        ['Ask a question', 'Contact support']
      );
    },
  },
};

// --- Persona Class ---

class NewUserGuidePersona extends BasePersona {
  type: PersonaType = 'student'; // Can adapt to any role
  config = config;

  protected getHandledCategories(): IntentCategory[] {
    return ['explain', 'support', 'navigation'];
  }

  async handleIntent(_intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
    return this.error('Intent handling not implemented');
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    const userRole = ctx.user?.role || 'student';
    const guide = ONBOARDING_GUIDES[userRole];
    return guide?.nextActions || config.suggestedQueries;
  }

  getGreeting(ctx: AgentContext): string {
    const userName = ctx.user?.metadata?.displayName as string || 'there';
    return config.defaultGreeting.replace('{name}', userName);
  }
}

// --- Helper Functions ---

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Export ---

export const NewUserGuide = withIntentHandlers(
  new NewUserGuidePersona(),
  handlers
);

export const newUserGuide = NewUserGuide;

export default NewUserGuide;
