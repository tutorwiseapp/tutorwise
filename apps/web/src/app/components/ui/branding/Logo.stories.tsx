import type { Meta, StoryObj } from '@storybook/react';
import Logo from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Shared/Logo',
  component: Logo,
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'icon'],
    },
    width: {
      control: { type: 'number', min: 100, max: 400 },
    },
    height: {
      control: { type: 'number', min: 20, max: 100 },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  args: {
    width: 180,
    height: 32,
    variant: 'full',
  },
};

export const Small: Story = {
  args: {
    width: 120,
    height: 22,
    variant: 'full',
  },
};

export const Large: Story = {
  args: {
    width: 240,
    height: 42,
    variant: 'full',
  },
};

export const Icon: Story = {
  args: {
    height: 48,
    variant: 'icon',
  },
};

export const IconSmall: Story = {
  args: {
    height: 32,
    variant: 'icon',
  },
};

export const IconLarge: Story = {
  args: {
    height: 64,
    variant: 'icon',
  },
};
