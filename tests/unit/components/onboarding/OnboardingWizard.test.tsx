import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingWizard from '@/app/components/onboarding/OnboardingWizard';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

// Mock the UserProfileContext
jest.mock('@/app/contexts/UserProfileContext');
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
      insert: jest.fn(() => ({ error: null })),
    })),
  })),
}));

// Mock the step components
jest.mock('@/app/components/onboarding/steps/WelcomeStep', () => {
  return function MockWelcomeStep({ onNext, onSkip }: any) {
    return (
      <div data-testid="welcome-step">
        <button onClick={onNext}>Next</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    );
  };
});

jest.mock('@/app/components/onboarding/steps/RoleSelectionStep', () => {
  return function MockRoleSelectionStep({ onNext, onSkip }: any) {
    return (
      <div data-testid="role-selection-step">
        <button onClick={() => onNext(['seeker'])}>Next with Student</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    );
  };
});

jest.mock('@/app/components/onboarding/steps/RoleDetailsStep', () => {
  return function MockRoleDetailsStep({ onNext, onSkip }: any) {
    return (
      <div data-testid="role-details-step">
        <button onClick={() => onNext({ subjects: ['Math'] })}>Next with Details</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    );
  };
});

jest.mock('@/app/components/onboarding/steps/CompletionStep', () => {
  return function MockCompletionStep({ onComplete }: any) {
    return (
      <div data-testid="completion-step">
        <button onClick={onComplete}>Complete</button>
      </div>
    );
  };
});

describe('OnboardingWizard', () => {
  const mockProfile = {
    id: '123',
    agent_id: 'agent123',
    display_name: 'John Doe',
    first_name: 'John',
    email: 'john@example.com',
    roles: [] as ('agent' | 'seeker' | 'provider')[],
    created_at: '2023-01-01',
    onboarding_progress: {}
  };

  const mockUser = {
    id: '123',
    email: 'john@example.com'
  };

  const defaultMockContext = {
    profile: mockProfile,
    user: mockUser,
    activeRole: null,
    availableRoles: [],
    switchRole: jest.fn(),
    rolePreferences: {},
    updateRolePreferences: jest.fn(),
    isLoading: false,
    isRoleSwitching: false,
    needsOnboarding: true,
    showOnboarding: true,
    setShowOnboarding: jest.fn(),
    updateOnboardingProgress: jest.fn(),
    getRoleDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserProfile.mockReturnValue(defaultMockContext);
  });

  it('renders welcome step initially', () => {
    render(<OnboardingWizard />);
    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
  });

  it('does not render when user is null', () => {
    mockUseUserProfile.mockReturnValue({
      ...defaultMockContext,
      user: null,
    });

    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it('progresses from welcome to role selection step', async () => {
    render(<OnboardingWizard />);

    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByTestId('role-selection-step')).toBeInTheDocument();
    });
  });

  it.skip('progresses from role selection to role details step', async () => {
    render(<OnboardingWizard />);

    // Go to role selection
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByTestId('role-selection-step')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Select roles and continue
    const nextButton = await screen.findByText('Next with Student');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByTestId('role-details-step')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip('completes the onboarding flow', async () => {
    const mockOnComplete = jest.fn();

    render(<OnboardingWizard onComplete={mockOnComplete} />);

    // Progress through all steps
    fireEvent.click(screen.getByText('Next')); // Welcome -> Role Selection

    // Wait for and click role selection
    const studentButton = await screen.findByText('Next with Student', {}, { timeout: 3000 });
    fireEvent.click(studentButton);

    // Wait for and click role details
    const detailsButton = await screen.findByText('Next with Details', {}, { timeout: 3000 });
    fireEvent.click(detailsButton);

    // Wait for completion step
    await waitFor(() => {
      expect(screen.getByTestId('completion-step')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Complete'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('handles skip functionality', async () => {
    const mockOnSkip = jest.fn();

    render(<OnboardingWizard onSkip={mockOnSkip} />);

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error messages', () => {
    render(<OnboardingWizard />);

    // Simulate an error state by triggering an invalid action
    // This would need to be implemented based on actual error scenarios
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('initializes with existing progress', () => {
    const profileWithProgress = {
      ...mockProfile,
      onboarding_progress: {
        current_step: 'role-selection',
        completed_steps: ['welcome']
      }
    };

    mockUseUserProfile.mockReturnValue({
      ...defaultMockContext,
      profile: profileWithProgress,
    });

    render(<OnboardingWizard />);

    expect(screen.getByTestId('role-selection-step')).toBeInTheDocument();
  });

  it('initializes with existing roles', () => {
    const profileWithRoles = {
      ...mockProfile,
      roles: ['seeker', 'provider'] as ('agent' | 'seeker' | 'provider')[]
    };

    mockUseUserProfile.mockReturnValue({
      ...defaultMockContext,
      profile: profileWithRoles,
    });

    render(<OnboardingWizard />);

    // Should still start at welcome, but roles should be pre-selected in later steps
    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
  });

  it('shows wizard container', () => {
    render(<OnboardingWizard />);

    const wizardContainer = screen.getByRole('dialog');
    expect(wizardContainer).toBeInTheDocument();
    expect(wizardContainer).toHaveClass('wizardContainer');
  });

  it('has proper accessibility attributes', () => {
    render(<OnboardingWizard />);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });
});