import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import TutorProfessionalInfoForm from './TutorProfessionalInfoForm';

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
  roles: ['provider'],
  getRoleDetails: () => null,
  refreshProfile: async () => {}
};

const meta = {
  title: 'Account/TutorProfessionalInfoForm',
  component: TutorProfessionalInfoForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Professional information form for tutors. This is a template that pre-fills data for new listings but does not affect existing listings.',
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
} satisfies Meta<typeof TutorProfessionalInfoForm>;

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
        story: 'Form populated with existing template data.',
      },
    },
    msw: {
      handlers: [
        // Mock API response with existing data
        {
          url: '/api/account/professional-info',
          method: 'get',
          status: 200,
          response: {
            subjects: ['Mathematics', 'Physics', 'Chemistry'],
            skill_levels: { 'GCSE': true, 'A-Level': true },
            teaching_experience: '5-10 years',
            hourly_rate: 45,
            qualifications: ['BSc Mathematics - Oxford University', 'PGCE'],
            teaching_methods: ['Interactive', 'Problem-solving', 'One-on-one attention'],
            specializations: ['Exam preparation', 'University applications']
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
        story: 'Save button is disabled when required fields (subjects, levels, experience) are not filled.',
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
    await canvas.findByText('Subjects *');

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
 * Education level selection interaction
 */
export const LevelSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive education level selection using chips.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Education Levels *');

    // Select GCSE and A-Level
    const gcseChip = canvas.getByRole('button', { name: 'GCSE' });
    const aLevelChip = canvas.getByRole('button', { name: 'A-Level' });

    await user.click(gcseChip);
    await user.click(aLevelChip);

    await expect(gcseChip).toHaveClass(/chipSelected/);
    await expect(aLevelChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Adding qualifications dynamically
 */
export const AddingQualifications: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Users can add multiple qualifications dynamically.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Qualifications');

    // Click "Add Qualification" button twice
    const addButton = canvas.getByRole('button', { name: /Add Qualification/i });
    await user.click(addButton);
    await user.click(addButton);

    // Verify 3 qualification inputs exist (1 default + 2 added)
    const qualInputs = canvas.getAllByPlaceholderText(/BSc Mathematics/i);
    await expect(qualInputs).toHaveLength(3);
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
            message: '✅ Template saved. Changes won\'t affect your existing listings.'
          }
        }
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Subjects *');

    // 1. Select subjects
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'Physics' }));

    // 2. Select education levels
    await user.click(canvas.getByRole('button', { name: 'GCSE' }));
    await user.click(canvas.getByRole('button', { name: 'A-Level' }));

    // 3. Select teaching experience
    const experienceSelect = canvas.getByRole('combobox');
    await user.selectOptions(experienceSelect, '5-10 years');

    // 4. Fill hourly rate
    const minRateInput = canvas.getByPlaceholderText('Min');
    const maxRateInput = canvas.getByPlaceholderText('Max');
    await user.type(minRateInput, '40');
    await user.type(maxRateInput, '60');

    // 5. Add qualification
    const qualInput = canvas.getAllByPlaceholderText(/BSc Mathematics/i)[0];
    await user.type(qualInput, 'BSc Mathematics - Oxford University');

    // 6. Select teaching methods
    await user.click(canvas.getByRole('button', { name: 'Interactive' }));
    await user.click(canvas.getByRole('button', { name: 'Problem-solving' }));

    // 7. Verify save button is enabled
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await expect(saveButton).toBeEnabled();

    // 8. Submit form
    await user.click(saveButton);

    // 9. Wait for success message (in real app this would be a toast)
    // Note: Toast verification would need additional setup
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
    await canvas.findByText('Subjects *');
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'GCSE' }));

    const experienceSelect = canvas.getByRole('combobox');
    await user.selectOptions(experienceSelect, '5-10 years');

    // Try to submit
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await user.click(saveButton);

    // Error toast would appear (needs toast mock setup)
  },
};
