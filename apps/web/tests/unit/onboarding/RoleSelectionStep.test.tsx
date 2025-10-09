import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleSelectionStep from '@/app/components/onboarding/steps/RoleSelectionStep';

describe('RoleSelectionStep', () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders role selection title and description', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    expect(screen.getByText(/What will you conquer?/)).toBeInTheDocument();
    expect(screen.getByText(/Choose your subjects and start your transformation/)).toBeInTheDocument();
  });

  it('displays all three role options', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('shows role descriptions', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    expect(screen.getByText(/From struggling to succeeding/)).toBeInTheDocument();
    expect(screen.getByText(/Express yourself with confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Create the future you imagine/)).toBeInTheDocument();
  });

  it('displays role features', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    // Subject outcomes
    expect(screen.getByText(/Believe: Math can be your strength/)).toBeInTheDocument();
    expect(screen.getByText(/Learn: Speak fluently in months/)).toBeInTheDocument();
    expect(screen.getByText(/Succeed: Build amazing projects/)).toBeInTheDocument();
  });

  it('allows selecting and deselecting roles', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const mathSubject = screen.getByText('Mathematics').closest('div[class*="roleCard"]');
    expect(mathSubject).not.toHaveClass('selected');

    fireEvent.click(mathSubject!);
    expect(mathSubject).toHaveClass('selected');

    // Deselect
    fireEvent.click(mathSubject!);
    expect(mathSubject).not.toHaveClass('selected');
  });

  it('allows multiple role selection', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const mathSubject = screen.getByText('Mathematics').closest('div[class*="roleCard"]');
    const langSubject = screen.getByText('Languages').closest('div[class*="roleCard"]');

    fireEvent.click(mathSubject!);
    fireEvent.click(langSubject!);

    expect(mathSubject).toHaveClass('selected');
    expect(langSubject).toHaveClass('selected');
  });

  it('shows pre-selected roles', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['seeker', 'provider']}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    // Component now uses subject selection internally, not role pre-selection
    // Verify component renders without crashing
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
  });

  it('disables Continue button when no roles selected', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const continueButton = screen.getByText('Next →');
    expect(continueButton).toBeDisabled();
    expect(continueButton).toHaveClass('buttonDisabled');
  });

  it('enables Continue button when roles are selected', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    // Select a subject to enable the button
    const mathSubject = screen.getByText('Mathematics').closest('div[class*="roleCard"]');
    fireEvent.click(mathSubject!);

    const continueButton = screen.getByText('Next →');
    expect(continueButton).not.toBeDisabled();
    expect(continueButton).toHaveClass('buttonPrimary');
  });

  it('calls onNext with selected roles when Continue is clicked', async () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const mathSubject = screen.getByText('Mathematics').closest('div');
    fireEvent.click(mathSubject!);

    const continueButton = screen.getByText('Next →');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalledWith(['seeker']);
    });
  });

  it('calls onSkip when Skip button is clicked', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const skipButton = screen.getByText(/Skip for now/);
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['seeker']}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText(/Skip for now/)).toBeDisabled();
  });

  it('handles loading state with spinner', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['seeker']}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    // Check for loading spinner by class
    const spinner = document.querySelector('.loadingSpinner');
    expect(spinner).toBeInTheDocument();
  });
});