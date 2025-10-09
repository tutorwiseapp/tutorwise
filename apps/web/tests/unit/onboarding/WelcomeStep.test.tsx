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

    expect(screen.getByText(/Believe\. Learn\. Succeed\./)).toBeInTheDocument();
    expect(screen.getByText(/John, join thousands of students/)).toBeInTheDocument();
  });

  it('displays onboarding overview points', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    expect(screen.getByText(/Believe in yourself/)).toBeInTheDocument();
    expect(screen.getByText(/Learn your way/)).toBeInTheDocument();
    expect(screen.getByText(/Succeed faster/)).toBeInTheDocument();
    expect(screen.getByText(/Never learn alone/)).toBeInTheDocument();
  });

  it('shows estimated time', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    expect(screen.getByText(/Takes 2 minutes/)).toBeInTheDocument();
  });

  it('calls onNext when "Let\'s get started" button is clicked', () => {
    render(
      <WelcomeStep
        onNext={mockOnNext}
        onSkip={mockOnSkip}
        userName="John"
      />
    );

    const nextButton = screen.getByText(/Yes, I'm ready to succeed/);
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

    expect(screen.getByText(/Believe\. Learn\. Succeed\./)).toBeInTheDocument();
    expect(screen.getByText(/, join thousands of students/)).toBeInTheDocument();
  });
});