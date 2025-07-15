'use client';
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react'; // A popular, clean icon library
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css'; // Default styles for the calendar grid
import styles from './Pickers.module.css'; // Our custom styles

interface DatePickerProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

const DatePicker = ({ selected, onSelect }: DatePickerProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className={styles.datePickerTrigger}>
          <CalendarIcon className={styles.calendarIcon} />
          {selected ? format(selected, 'PPP') : <span>Pick a date</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.datePickerContent} sideOffset={5}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={onSelect}
            initialFocus
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
export default DatePicker;