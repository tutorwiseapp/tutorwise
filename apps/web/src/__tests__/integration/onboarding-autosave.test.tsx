/**
 * Filename: onboarding-autosave.test.tsx
 * Purpose: Integration tests for onboarding auto-save flow
 * Created: 2026-01-10
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorPersonalInfoStep from '@/app/components/feature/onboarding/tutor/TutorPersonalInfoStep';
import { saveOnboardingProgress, getOnboardingProgress } from '@/lib/api/onboarding';

// Mock dependencies
jest.mock('@/lib/api/onboarding');
jest.mock('@/app/contexts/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      id: 'test-profile-id',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    },
    user: {
      id: 'test-user-id',
      email: 'john@example.com',
    },
    isLoading: false,
  }),
}));

jest.useFakeTimers();

const mockSaveOnboardingProgress = saveOnboardingProgress as jest.MockedFunction<
  typeof saveOnboardingProgress
>;
const mockGetOnboardingProgress = getOnboardingProgress as jest.MockedFunction<
  typeof getOnboardingProgress
>;

describe.skip('Onboarding Auto-Save Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveOnboardingProgress.mockResolvedValue({ success: true });
    mockGetOnboardingProgress.mockResolvedValue({
      progress: {
        tutor: {
          personalInfo: null
        }
      }
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should auto-save after 5 seconds of inactivity', async () => {
    const mockOnNext = jest.fn();

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    // Type in first name field
    const firstNameInput = screen.getByPlaceholderText('John');
    await userEvent.type(firstNameInput, 'Jane');

    // Should NOT have saved yet
    expect(mockSaveOnboardingProgress).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should auto-save now
    await waitFor(() => {
      expect(mockSaveOnboardingProgress).toHaveBeenCalledWith({
        userId: 'test-user-id',
        progress: {
          tutor: {
            personalInfo: expect.objectContaining({
              firstName: 'Jane',
            }),
          },
        },
      });
    });
  });

  it('should show auto-save indicator during save', async () => {
    const mockOnNext = jest.fn();
    mockSaveOnboardingProgress.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
    );

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    const firstNameInput = screen.getByPlaceholderText('John');
    await userEvent.type(firstNameInput, 'Test');

    // Fast-forward to trigger save
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should show "Saving..." indicator
    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    // Complete the save
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should show "Saved" indicator
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it('should use blocking save on Continue button', async () => {
    const mockOnNext = jest.fn();

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    // Fill required fields
    await userEvent.type(screen.getByPlaceholderText('John'), 'Jane');
    await userEvent.type(screen.getByPlaceholderText('Smith'), 'Doe');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'Female');
    // ... fill other required fields

    // Click Continue
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    // Should save immediately
    await waitFor(() => {
      expect(mockSaveOnboardingProgress).toHaveBeenCalled();
    });

    // Should only call onNext after save completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  it('should use optimistic save on Back button', async () => {
    const mockOnNext = jest.fn();
    const mockOnBack = jest.fn();

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        onBack={mockOnBack}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    // Type something
    await userEvent.type(screen.getByPlaceholderText('John'), 'Test');

    // Click Back
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    // Should navigate immediately (optimistic)
    expect(mockOnBack).toHaveBeenCalled();

    // Save should happen in background
    await waitFor(() => {
      expect(mockSaveOnboardingProgress).toHaveBeenCalled();
    });
  });

  it('should handle save errors gracefully', async () => {
    const mockOnNext = jest.fn();
    mockSaveOnboardingProgress.mockRejectedValue(new Error('Network error'));

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    // Type something
    await userEvent.type(screen.getByPlaceholderText('John'), 'Test');

    // Trigger auto-save
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should show error indicator
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('should not save when user is not authenticated', async () => {
    // Override mock to return no user
    jest.mock('@/app/contexts/UserProfileContext', () => ({
      useUserProfile: () => ({
        profile: null,
        user: null,
        isLoading: false,
      }),
    }));

    const mockOnNext = jest.fn();

    render(
      <TutorPersonalInfoStep
        onNext={mockOnNext}
        isLoading={false}
        progressData={{
          currentPoints: 0,
          totalPoints: 55,
          currentStepPoints: 15,
          requiredPoints: 45,
          steps: [],
        }}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('John'), 'Test');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should NOT save
    expect(mockSaveOnboardingProgress).not.toHaveBeenCalled();
  });
});
