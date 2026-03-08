'use client';

import { useCallback, useState } from 'react';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import styles from './ProcessInput.module.css';

interface ProcessInputProps {
  onParse: (input: string) => Promise<void>;
  isParsing: boolean;
}

const EXAMPLE_PROMPTS = [
  'Student onboarding: register, verify email, complete profile, assign tutor, welcome email',
  'Tutor application: submit, review docs, background check, approve/reject, notify',
  'Lesson booking: request, check availability, confirm, send reminder, complete, review',
];

export function ProcessInput({ onParse, isParsing }: ProcessInputProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isParsing) return;
    await onParse(input.trim());
    setInput('');
    setIsOpen(false);
  }, [input, isParsing, onParse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [handleSubmit]
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setInput(example);
    },
    []
  );

  if (!isOpen) {
    return (
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(true)}
        title="Describe a process and let AI generate the workflow"
      >
        <Sparkles size={16} />
        AI Generate
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="AI Process Generator"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Sparkles size={18} />
            <span>AI Process Generator</span>
          </div>
          <p className={styles.modalSubtitle}>
            Describe your process in plain text and AI will generate a visual workflow.
          </p>
        </div>

        <div className={styles.inputSection}>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your process... e.g., 'When a new student registers, verify their email, then have them complete their profile...'"
            rows={5}
            autoFocus
            disabled={isParsing}
          />
          <span className={styles.hint}>
            {input.length}/5000 characters · Ctrl+Enter to generate
          </span>
        </div>

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>
            <FileText size={12} /> Try an example:
          </span>
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              className={styles.exampleChip}
              onClick={() => handleExampleClick(example)}
              disabled={isParsing}
            >
              {example.slice(0, 60)}...
            </button>
          ))}
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={() => setIsOpen(false)}
            disabled={isParsing}
          >
            Cancel
          </button>
          <button
            className={styles.generateButton}
            onClick={handleSubmit}
            disabled={!input.trim() || isParsing}
          >
            {isParsing ? (
              <>
                <Loader2 size={14} className={styles.spinner} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
