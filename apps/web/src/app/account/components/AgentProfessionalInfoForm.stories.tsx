import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import AgentProfessionalInfoForm from './AgentProfessionalInfoForm';

// Mock the API functions
const mockGetProfessionalInfo = async () => null;
const mockUpdateProfessionalInfo = async () => ({ success: true });

// Mock the UserProfile context
const mockUserProfile = {
  user: {
    id: 'test-user-id',
    email: 'agency@example.com',
    name: 'Elite Tutors'
  },
  roles: ['agent'],
  getRoleDetails: () => null,
  refreshProfile: async () => {}
};

const meta = {
  title: 'Account/AgentProfessionalInfoForm',
  component: AgentProfessionalInfoForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Professional information form for tutoring agencies. This template helps agencies showcase their services, coverage areas, and credentials to potential tutors and clients.',
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
} satisfies Meta<typeof AgentProfessionalInfoForm>;

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
        story: 'Form populated with existing agency template data.',
      },
    },
    msw: {
      handlers: [
        {
          url: '/api/account/professional-info',
          method: 'get',
          status: 200,
          response: {
            agency_name: 'Elite Tutors London',
            services: ['Tutor placement', 'Background checks', 'Quality assurance', 'Tutor training'],
            subject_specializations: ['Mathematics', 'Sciences', 'Languages'],
            education_levels: ['GCSE', 'A-Level', 'IB'],
            coverage_areas: ['London', 'South East', 'South West'],
            years_in_business: '10-20 years',
            number_of_tutors: '51-100',
            commission_rate: '15',
            certifications: ['DBS Enhanced Certification', 'Ofsted Registered'],
            website_url: 'https://www.elitetutorslondon.com',
            description: 'We are a leading tutoring agency in London with over 15 years of experience connecting students with exceptional tutors.'
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
        story: 'Save button is disabled when required fields are not filled.',
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
 * Service selection interaction
 */
export const ServiceSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive service selection using chips. Click to toggle selection.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Services Offered *');

    // Click service chips
    const placementChip = canvas.getByRole('button', { name: 'Tutor placement' });
    await user.click(placementChip);

    // Verify chip is selected
    await expect(placementChip).toHaveClass(/chipSelected/);

    // Click another service
    const bgCheckChip = canvas.getByRole('button', { name: 'Background checks' });
    await user.click(bgCheckChip);
    await expect(bgCheckChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Subject specialization selection
 */
export const SubjectSpecializationSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select subject specializations that the agency focuses on.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Subject Specializations *');

    // Select subjects
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'Sciences' }));

    const mathsChip = canvas.getByRole('button', { name: 'Mathematics' });
    const sciencesChip = canvas.getByRole('button', { name: 'Sciences' });

    await expect(mathsChip).toHaveClass(/chipSelected/);
    await expect(sciencesChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Education level selection
 */
export const EducationLevelSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select education levels covered by the agency.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Education Levels Covered *');

    // Select levels
    const gcseChip = canvas.getByRole('button', { name: 'GCSE' });
    const aLevelChip = canvas.getByRole('button', { name: 'A-Level' });

    await user.click(gcseChip);
    await user.click(aLevelChip);

    await expect(gcseChip).toHaveClass(/chipSelected/);
    await expect(aLevelChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Coverage area selection
 */
export const CoverageAreaSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Select geographic regions where the agency operates.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Coverage Areas *');

    // Select regions
    await user.click(canvas.getByRole('button', { name: 'London' }));
    await user.click(canvas.getByRole('button', { name: 'South East' }));

    const londonChip = canvas.getByRole('button', { name: 'London' });
    const southEastChip = canvas.getByRole('button', { name: 'South East' });

    await expect(londonChip).toHaveClass(/chipSelected/);
    await expect(southEastChip).toHaveClass(/chipSelected/);
  },
};

/**
 * Agency details input
 */
export const AgencyDetailsInput: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Enter agency name, years in business, number of tutors, and commission rate.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByLabelText(/Agency Name/i);

    // Fill agency name
    const nameInput = canvas.getByLabelText(/Agency Name/i);
    await user.type(nameInput, 'Elite Tutors London');

    // Select years in business
    const yearsSelect = canvas.getByLabelText(/Years in Business/i);
    await user.selectOptions(yearsSelect, '10-20 years');

    // Select number of tutors
    const tutorsSelect = canvas.getByLabelText(/Number of Tutors/i);
    await user.selectOptions(tutorsSelect, '51-100');

    // Enter commission rate
    const commissionInput = canvas.getByLabelText(/Commission Rate/i);
    await user.type(commissionInput, '15');

    await expect(nameInput).toHaveValue('Elite Tutors London');
    await expect(yearsSelect).toHaveValue('10-20 years');
    await expect(tutorsSelect).toHaveValue('51-100');
    await expect(commissionInput).toHaveValue(15);
  },
};

/**
 * Adding certifications dynamically
 */
export const AddingCertifications: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Agencies can add multiple certifications and accreditations.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Certifications & Accreditations');

    // Click "Add Certification" button twice
    const addButton = canvas.getByRole('button', { name: /Add Certification/i });
    await user.click(addButton);
    await user.click(addButton);

    // Verify 3 certification inputs exist (1 default + 2 added)
    const certInputs = canvas.getAllByPlaceholderText(/DBS Enhanced/i);
    await expect(certInputs).toHaveLength(3);
  },
};

/**
 * Website URL and description input
 */
export const WebsiteAndDescription: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Enter agency website URL and detailed description.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByLabelText(/Website URL/i);

    // Enter website URL
    const urlInput = canvas.getByLabelText(/Website URL/i);
    await user.type(urlInput, 'https://www.elitetutorslondon.com');

    // Enter description
    const descriptionTextarea = canvas.getByLabelText(/Agency Description/i);
    await user.type(descriptionTextarea, 'Leading tutoring agency in London with 15 years of experience.');

    await expect(urlInput).toHaveValue('https://www.elitetutorslondon.com');
    await expect(descriptionTextarea).toHaveValue('Leading tutoring agency in London with 15 years of experience.');
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
            message: '✅ Template saved. This helps tutors understand your agency better.'
          }
        }
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // Wait for form to load
    await canvas.findByText('Agency Name *');

    // 1. Enter agency name
    const nameInput = canvas.getByLabelText(/Agency Name/i);
    await user.type(nameInput, 'Elite Tutors London');

    // 2. Select services
    await user.click(canvas.getByRole('button', { name: 'Tutor placement' }));
    await user.click(canvas.getByRole('button', { name: 'Background checks' }));

    // 3. Select subjects
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'Sciences' }));

    // 4. Select education levels
    await user.click(canvas.getByRole('button', { name: 'GCSE' }));
    await user.click(canvas.getByRole('button', { name: 'A-Level' }));

    // 5. Select coverage areas
    await user.click(canvas.getByRole('button', { name: 'London' }));
    await user.click(canvas.getByRole('button', { name: 'South East' }));

    // 6. Select years in business
    const yearsSelect = canvas.getByLabelText(/Years in Business/i);
    await user.selectOptions(yearsSelect, '10-20 years');

    // 7. Select number of tutors
    const tutorsSelect = canvas.getByLabelText(/Number of Tutors/i);
    await user.selectOptions(tutorsSelect, '51-100');

    // 8. Enter commission rate
    const commissionInput = canvas.getByLabelText(/Commission Rate/i);
    await user.type(commissionInput, '15');

    // 9. Add certification
    const certInputs = canvas.getAllByPlaceholderText(/DBS Enhanced/i);
    await user.type(certInputs[0], 'DBS Enhanced Certification');

    // 10. Enter website
    const urlInput = canvas.getByLabelText(/Website URL/i);
    await user.type(urlInput, 'https://www.example.com');

    // 11. Enter description
    const descriptionTextarea = canvas.getByLabelText(/Agency Description/i);
    await user.type(descriptionTextarea, 'Leading tutoring agency in London');

    // 12. Verify save button is enabled
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await expect(saveButton).toBeEnabled();

    // 13. Submit form
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
    await canvas.findByText('Agency Name *');

    const nameInput = canvas.getByLabelText(/Agency Name/i);
    await user.type(nameInput, 'Elite Tutors');

    await user.click(canvas.getByRole('button', { name: 'Tutor placement' }));
    await user.click(canvas.getByRole('button', { name: 'Mathematics' }));
    await user.click(canvas.getByRole('button', { name: 'GCSE' }));
    await user.click(canvas.getByRole('button', { name: 'London' }));

    const yearsSelect = canvas.getByLabelText(/Years in Business/i);
    await user.selectOptions(yearsSelect, '5-10 years');

    const descriptionTextarea = canvas.getByLabelText(/Agency Description/i);
    await user.type(descriptionTextarea, 'Leading agency');

    // Try to submit
    const saveButton = canvas.getByRole('button', { name: /Save Template/i });
    await user.click(saveButton);

    // Error toast would appear (needs toast mock setup)
  },
};
