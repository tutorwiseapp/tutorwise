import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import ClientProfessionalInfoForm from './ClientProfessionalInfoForm';

// Mock the API functions
const mockGetProfessionalInfo = async () => null;
const mockUpdateProfessionalInfo = async () => ({ success: true });

// Mock the UserProfile context
const mockUserProfile = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  roles: ['seeker'],
  getRoleDetails: () => null,
  refreshProfile: async () => {}
};

const meta = {
  title: 'Account/ClientProfessionalInfoForm',
  component: ClientProfessionalInfoForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Professional information form for clients/seekers. This template helps match students with suitable tutors based on their learning needs and preferences.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClientProfessionalInfoForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty form state
 */
export const EmptyForm: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no saved template data.',
      },
    },
  },
};

/**
 * Form with pre-filled data from existing template
 */
export const WithExistingTemplate: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Form populated with existing student template data.',
      },
    },
    msw: {
      handlers: [
        {
          url: '/api/account/professional-info',
          method: 'get',
          status: 200,
          response: {
            subjects: ['Mathematics', 'Physics', 'Chemistry'],
            education_level: 'GCSE',
            learning_goals: ['Exam preparation', 'Improve grades', 'Build confidence'],
            learning_preferences: ['Visual learning', 'Hands-on practice', 'Step-by-step guidance'],
            budget_range: '20-40',
            sessions_per_week: '2',
            session_duration: '1 hour',
            additional_info: 'Preparing for GCSE Maths and Physics exams in May. Struggling with algebra and mechanics.'
          }
        }
      ]
    }
  },
};

/**
 * Loading state while fetching template data
 */
export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Loading skeleton shown while fetching template data from API.',
      },
    },
    msw: {
      handlers: [
        {
          url: '/api/account/professional-info',
          method: 'get',
          delay: 10000, // Simulate slow network
          status: 200,
          response: null
        }
      ]
    }
  },
};

/**
 * Form with validation errors (Save button disabled)
 */
export const ValidationErrors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Save button is disabled when required fields (subjects, education level, learning goals) are not filled.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify save button is disabled initially
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await expect(saveButton).toBeDisabled();
  },
};

/**
 * Subject selection interaction
 */
export const SubjectSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive subject selection using chips. Click to toggle selection.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Subjects of Interest *');

    // Click Mathematics chip
    const mathsChip = canvas.getByRole('button', { name: 'Mathematics' });
    await user.click(mathsChip);

    // Verify chip is selected (has chipSelected class)
    await expect(mathsChip).toHaveClass(/chipSelected/);

    // Click Physics chip
    const physicsChip = canvas.getByRole('button', { name: 'Physics' });
    await user.click(physicsChip);
    await expect(physicsChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Education level selection
 */
export const EducationLevelSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select current education level from dropdown.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByLabelText(/Current Education Level/i);

    // Select education level
    const levelSelect = canvas.getByLabelText(/Current Education Level/i);
    await user.selectOptions(levelSelect, 'GCSE');

    await expect(levelSelect).toHaveValue('GCSE');
  },
};

/**
 * Learning goals selection interaction
 */
export const LearningGoalsSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive learning goals selection using chips.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Learning Goals *');

    // Select multiple learning goals
    const examPrepChip = canvas.getByRole('button', { name: 'Exam preparation' });
    const homeworkChip = canvas.getByRole('button', { name: 'Homework help' });
    const gradesChip = canvas.getByRole('button', { name: 'Improve grades' });

    await user.click(examPrepChip);
    await user.click(homeworkChip);
    await user.click(gradesChip);

    await expect(examPrepChip).toHaveClass(/chipSelected/);
    await expect(homeworkChip).toHaveClass(/chipSelected/);
    await expect(gradesChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Learning preferences selection
 */
export const LearningPreferencesSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select learning preferences to match with compatible tutors.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Learning Preferences');

    // Select preferences
    await user.click(canvas.getByRole('button', { name: 'Visual learning' }));
    await user.click(canvas.getByRole('button', { name: 'Hands-on practice' }));

    const visualChip = canvas.getByRole('button', { name: 'Visual learning' });
    const handsOnChip = canvas.getByRole('button', { name: 'Hands-on practice' });

    await expect(visualChip).toHaveClass(/chipSelected/);
    await expect(handsOnChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Budget range input
 */
export const BudgetRangeInput: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Enter budget range to filter tutors by price.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText(/Budget Range per Hour/i);

    // Fill budget inputs
    const budgetInputs = canvas.getAllByPlaceholderText(/Min|Max/i);
    const minInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Min');
    const maxInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Max');

    if (minInput && maxInput) {
      await user.type(minInput, '20');
      await user.type(maxInput, '40');

      await expect(minInput).toHaveValue(20);
      await expect(maxInput).toHaveValue(40);
    }
  },
};

/**
 * Sessions and duration selection
 */
export const SessionsAndDuration: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select preferred sessions per week and session duration.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByLabelText(/Preferred Sessions Per Week/i);

    // Select sessions per week
    const sessionsSelect = canvas.getByLabelText(/Preferred Sessions Per Week/i);
    await user.selectOptions(sessionsSelect, '2');
    await expect(sessionsSelect).toHaveValue('2');

    // Select session duration
    const durationSelect = canvas.getByLabelText(/Preferred Session Duration/i);
    await user.selectOptions(durationSelect, '1 hour');
    await expect(durationSelect).toHaveValue('1 hour');
  },
};

/**
 * Additional information input
 */
export const AdditionalInformationInput: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Provide additional context about learning needs and preferences.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByLabelText(/Additional Information/i);

    // Type in textarea
    const textarea = canvas.getByLabelText(/Additional Information/i);
    await user.type(textarea, 'Preparing for GCSE exams in May. Need help with algebra and mechanics.');

    await expect(textarea).toHaveValue('Preparing for GCSE exams in May. Need help with algebra and mechanics.');
  },
};

/**
 * Complete form submission flow
 */
export const CompleteFormSubmission: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Complete flow: fill all required fields and submit form successfully.',
      },
    },
    msw: {
      handlers: [
        {
          url: '/api/account/professional-info',
          method: 'patch',
          status: 200,
          response: {
            success: true,
            message: '✅ Template saved. This will help us match you with suitable tutors.'
          }
        }
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Subjects of Interest *');

    // 1. Select subjects
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'Physics' }));

    // 2. Select education level
    const levelSelect = canvas.getByLabelText(/Current Education Level/i);
    await user.selectOptions(levelSelect, 'GCSE');

    // 3. Select learning goals
    await user.click(canvas.getByRole('button', { name: 'Exam preparation' }));
    await user.click(canvas.getByRole('button', { name: 'Improve grades' }));

    // 4. Select learning preferences
    await user.click(canvas.getByRole('button', { name: 'Visual learning' }));
    await user.click(canvas.getByRole('button', { name: 'Step-by-step guidance' }));

    // 5. Fill budget range
    const budgetInputs = canvas.getAllByPlaceholderText(/Min|Max/i);
    const minInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Min');
    const maxInput = budgetInputs.find(input => input.getAttribute('placeholder') === 'Max');

    if (minInput && maxInput) {
      await user.type(minInput, '25');
      await user.type(maxInput, '45');
    }

    // 6. Select sessions per week
    const sessionsSelect = canvas.getByLabelText(/Preferred Sessions Per Week/i);
    await user.selectOptions(sessionsSelect, '2');

    // 7. Select session duration
    const durationSelect = canvas.getByLabelText(/Preferred Session Duration/i);
    await user.selectOptions(durationSelect, '1 hour');

    // 8. Add additional information
    const textarea = canvas.getByLabelText(/Additional Information/i);
    await user.type(textarea, 'Preparing for GCSE Maths exam');

    // 9. Verify save button is enabled
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await expect(saveButton).toBeEnabled();

    // 10. Submit form
    await user.click(saveButton);

    // Success message would appear (toast)
  },
};

/**
 * Mobile viewport
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Form layout optimized for mobile devices (320px width).',
      },
    },
  },
};

/**
 * Tablet viewport
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Form layout on tablet devices (768px width).',
      },
    },
  },
};

/**
 * Form with API error
 */
export const APIError: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Error handling when API call fails.',
      },
    },
    msw: {
      handlers: [
        {
          url: '/api/account/professional-info',
          method: 'patch',
          status: 500,
          response: {
            error: 'Internal server error'
          }
        }
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Fill minimum required fields
    await canvas.findByText('Subjects of Interest *');
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));

    const levelSelect = canvas.getByLabelText(/Current Education Level/i);
    await user.selectOptions(levelSelect, 'GCSE');

    await user.click(canvas.getByRole('button', { name: 'Exam preparation' }));

    // Try to submit
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await user.click(saveButton);

    // Error toast would appear (needs toast mock setup)
  },
};
