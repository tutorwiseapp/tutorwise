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

    expect(screen.getByText(/How do you want to use Tutorwise?/)).toBeInTheDocument();
    expect(screen.getByText(/You can select multiple roles/)).toBeInTheDocument();
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

    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Tutor')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
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

    expect(screen.getByText(/I want to learn new skills and find tutors/)).toBeInTheDocument();
    expect(screen.getByText(/I want to teach and share my expertise/)).toBeInTheDocument();
    expect(screen.getByText(/I want to connect students with tutors and earn commissions/)).toBeInTheDocument();
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

    // Student features
    expect(screen.getByText('Find qualified tutors')).toBeInTheDocument();
    expect(screen.getByText('Book sessions')).toBeInTheDocument();

    // Tutor features
    expect(screen.getByText('Create your profile')).toBeInTheDocument();
    expect(screen.getByText('Set your rates')).toBeInTheDocument();

    // Agent features
    expect(screen.getByText('Build your network')).toBeInTheDocument();
    expect(screen.getByText('Track commissions')).toBeInTheDocument();
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

    const studentRole = screen.getByText('Student').closest('div[class*="border-2"]');
    expect(studentRole).not.toHaveClass('border-blue-500');

    fireEvent.click(studentRole!);
    expect(studentRole).toHaveClass('border-blue-500');

    // Deselect
    fireEvent.click(studentRole!);
    expect(studentRole).not.toHaveClass('border-blue-500');
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

    const studentRole = screen.getByText('Student').closest('div[class*="border-2"]');
    const tutorRole = screen.getByText('Tutor').closest('div[class*="border-2"]');

    fireEvent.click(studentRole!);
    fireEvent.click(tutorRole!);

    expect(studentRole).toHaveClass('border-blue-500');
    expect(tutorRole).toHaveClass('border-green-500');
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

    const studentRole = screen.getByText('Student').closest('div[class*="border-2"]');
    const tutorRole = screen.getByText('Tutor').closest('div[class*="border-2"]');
    const agentRole = screen.getByText('Agent').closest('div[class*="border-2"]');

    expect(studentRole).toHaveClass('border-blue-500');
    expect(tutorRole).toHaveClass('border-green-500');
    expect(agentRole).not.toHaveClass('border-purple-500');
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

    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
    expect(continueButton).toHaveClass('bg-gray-300');
  });

  it('enables Continue button when roles are selected', () => {
    render(
      <RoleSelectionStep
        selectedRoles={['seeker']}
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        isLoading={false}
      />
    );

    const continueButton = screen.getByText('Continue');
    expect(continueButton).not.toBeDisabled();
    expect(continueButton).toHaveClass('bg-blue-600');
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

    const studentRole = screen.getByText('Student').closest('div');
    fireEvent.click(studentRole!);

    const continueButton = screen.getByText('Continue');
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
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});