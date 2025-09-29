import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeStep from '@/app/components/onboarding/steps/WelcomeStep';

describe('WelcomeStep', () => {
  const mockOnNext = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome message with user name', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    expect(screen.getByText(/Welcome to Tutorwise, John!/)).toBeInTheDocument();
  });

  it('displays onboarding overview points', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    expect(screen.getByText(/Choose your role\(s\) - Student, Tutor, or Agent/)).toBeInTheDocument();
    expect(screen.getByText(/Set up your preferences and goals/)).toBeInTheDocument();
    expect(screen.getByText(/Customize your dashboard/)).toBeInTheDocument();
  });

  it('shows estimated time', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    expect(screen.getByText(/Takes about 2-3 minutes/)).toBeInTheDocument();
  });

  it('calls onNext when "Let\'s get started" button is clicked', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    const nextButton = screen.getByText(/Let's get started/);
    fireEvent.click(nextButton);

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when "Skip for now" button is clicked', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    const skipButton = screen.getByText(/Skip for now/);
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('handles empty user name gracefully', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName=""
      />
    );

    expect(screen.getByText(/Welcome to Tutorwise, !/)).toBeInTheDocument();
  });
});