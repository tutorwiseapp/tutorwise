import React from 'react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';

// Helper to generate time options
const generateTimeOptions = (interval: 15 | 30 | 60 = 30) => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const date = new Date(2000, 0, 1, hour, minute);
      const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      options.push({ label: timeLabel, value: timeValue });
    }
  }
  return options;
};

interface TimePickerProps {
  interval?: 15 | 30 | 60;
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
  ({ interval = 30, ...props }, ref) => {
    const timeOptions = generateTimeOptions(interval);
    return <UnifiedSelect ref={ref} options={timeOptions} {...props} />;
  }
);

TimePicker.displayName = 'TimePicker';
export default TimePicker;
