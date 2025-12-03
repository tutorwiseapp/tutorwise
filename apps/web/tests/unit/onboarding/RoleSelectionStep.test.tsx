import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoleSelectionStep from '@/app/components/feature/onboarding/steps/RoleSelectionStep';

describe('RoleSelectionStep', () => {
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders role selection title', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    expect(screen.getByText('Select Your Role(s)')).toBeInTheDocument();
  });

  it('displays all three role options', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    expect(screen.getByText('Client (Looking for tutors)')).toBeInTheDocument();
    expect(screen.getByText('Tutor (Offering tutoring services)')).toBeInTheDocument();
    expect(screen.getByText('Agent (Managing tutoring services)')).toBeInTheDocument();
  });

  it('allows selecting and deselecting roles', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const clientCheckbox = screen.getByLabelText(/Client \(Looking for tutors\)/);
    expect(clientCheckbox).not.toBeChecked();

    fireEvent.click(clientCheckbox);
    expect(clientCheckbox).toBeChecked();

    // Deselect
    fireEvent.click(clientCheckbox);
    expect(clientCheckbox).not.toBeChecked();
  });

  it('allows multiple role selection', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const clientCheckbox = screen.getByLabelText(/Client \(Looking for tutors\)/);
    const tutorCheckbox = screen.getByLabelText(/Tutor \(Offering tutoring services\)/);

    fireEvent.click(clientCheckbox);
    fireEvent.click(tutorCheckbox);

    expect(clientCheckbox).toBeChecked();
    expect(tutorCheckbox).toBeChecked();
  });

  it('shows pre-selected roles', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['client', 'tutor']}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const clientCheckbox = screen.getByLabelText(/Client \(Looking for tutors\)/);
    const tutorCheckbox = screen.getByLabelText(/Tutor \(Offering tutoring services\)/);

    expect(clientCheckbox).toBeChecked();
    expect(tutorCheckbox).toBeChecked();
  });

  it('disables Next button when no roles selected', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('enables Next button when roles are selected', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const clientCheckbox = screen.getByLabelText(/Client \(Looking for tutors\)/);
    fireEvent.click(clientCheckbox);

    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onNext with selected roles when Next is clicked', async () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const clientCheckbox = screen.getByLabelText(/Client \(Looking for tutors\)/);
    fireEvent.click(clientCheckbox);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalledWith(['client']);
    });
  });

  it('calls onBack when Back button is clicked', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Skip button is clicked', () => {
    render(
      <RoleSelectionStep
        selectedRoles={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['client']}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables Next button during loading', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['client']}
        onNext={mockOnNext}
        onBack={mockOnBack}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });
});