'use client';

import { useState, useEffect } from 'react';
import styles from './CustomCalendar.module.css';

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  onClose: () => void;
}

export default function CustomCalendar({ value, onChange, onClose }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value + 'T00:00:00') : null
  );

  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00');
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setSelectedDate(date);
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);

    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    onClose();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <button
          type="button"
          onClick={handlePrevMonth}
          className={styles.navButton}
        >
          ‹
        </button>
        <div className={styles.monthYear}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className={styles.navButton}
        >
          ›
        </button>
      </div>

      <div className={styles.daysOfWeekHeader}>
        {daysOfWeek.map(day => (
          <div key={day} className={styles.dayOfWeek}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {days.map((day, index) => (
          <div key={index} className={styles.dayCell}>
            {day !== null && (
              <button
                type="button"
                onClick={() => handleDateClick(day)}
                className={`${styles.dayButton} ${
                  isToday(day) ? styles.today : ''
                } ${isSelected(day) ? styles.selected : ''}`}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
