import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '@/app/components/ui/actions/Button';

describe('Button', () => {
  it('renders a button with the correct text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /Click me/i });
    expect(button).toBeInTheDocument();
  });

  it('applies the correct variant class', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByRole('button', { name: /Click me/i });
    expect(button).toHaveClass('secondary');
  });

  it('applies the fullWidth class when the fullWidth prop is true', () => {
    render(<Button fullWidth>Click me</Button>);
    const button = screen.getByRole('button', { name: /Click me/i });
    expect(button).toHaveClass('fullWidth');
  });

  it('passes through any other standard button attributes', () => {
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button', { name: /Click me/i });
    expect(button).toBeDisabled();
  });
});
