'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import styles from './Pickers.module.css';

interface DatePickerProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}

const DatePicker = ({ selected, onSelect, placeholder = 'Pick a date' }: DatePickerProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.datePickerTrigger}
          aria-label="Select date of birth"
        >
          <CalendarIcon className={styles.calendarIcon} />
          {selected ? (
            <span className={styles.datePickerValue}>
              {format(selected, 'PPP')}
            </span>
          ) : (
            <span className={styles.datePickerPlaceholder}>{placeholder}</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.datePickerContent}
          sideOffset={5}
          align="start"
          side="bottom"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onSelect(date);
              setOpen(false); // Close after selection
            }}
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            className={styles.datePickerCalendar}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default DatePicker;
