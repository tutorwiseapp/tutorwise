/**
 * Filename: SkillSelector.tsx
 * Purpose: Enhanced skill selector with predefined + custom skills
 * Created: 2026-02-24
 * Version: v1.0 (Phase 2 Feature #2)
 *
 * Features:
 * - Grouped predefined skills dropdown
 * - Custom skill creation with API integration
 * - Visual differentiation (predefined vs custom)
 * - Skill removal
 * - Popular custom skills suggestions
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SKILL_GROUPS, PREDEFINED_SKILLS } from '@/app/constants/skills';
import Button from '@/app/components/ui/actions/Button';
import styles from './SkillSelector.module.css';

export interface Skill {
  name: string;
  is_custom: boolean;
}

interface SkillSelectorProps {
  selectedSkills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  disabled?: boolean;
  error?: string;
}

export default function SkillSelector({
  selectedSkills,
  onSkillsChange,
  disabled = false,
  error,
}: SkillSelectorProps) {
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isCreatingCustomSkill, setIsCreatingCustomSkill] = useState(false);
  const [showPredefinedDropdown, setShowPredefinedDropdown] = useState(false);

  // Fetch popular custom skills
  const { data: customSkillsData } = useQuery({
    queryKey: ['custom-skills'],
    queryFn: () => fetch('/api/ai-tutors/custom-skills').then((r) => r.json()),
  });

  const popularCustomSkills = customSkillsData?.popular || [];
  const myCustomSkills = customSkillsData?.mine || [];

  // Check if skill is already selected
  const isSkillSelected = (skillName: string): boolean => {
    return selectedSkills.some(
      (s) => s.name.toLowerCase() === skillName.toLowerCase()
    );
  };

  // Add predefined skill
  const handleAddPredefinedSkill = (skillName: string) => {
    if (isSkillSelected(skillName) || disabled) return;

    onSkillsChange([
      ...selectedSkills,
      { name: skillName, is_custom: false },
    ]);
  };

  // Add custom skill
  const handleAddCustomSkill = async () => {
    const trimmedName = customSkillInput.trim();

    if (!trimmedName || disabled) return;

    // Check if already exists in selected
    if (isSkillSelected(trimmedName)) {
      setCustomSkillInput('');
      return;
    }

    // Check if it's a predefined skill
    if (PREDEFINED_SKILLS.includes(trimmedName)) {
      // Add as predefined, not custom
      onSkillsChange([
        ...selectedSkills,
        { name: trimmedName, is_custom: false },
      ]);
      setCustomSkillInput('');
      return;
    }

    setIsCreatingCustomSkill(true);

    try {
      // Create custom skill in database
      const response = await fetch('/api/ai-tutors/custom-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.ok) {
        // Add to selected skills
        onSkillsChange([
          ...selectedSkills,
          { name: trimmedName, is_custom: true },
        ]);
        setCustomSkillInput('');
      } else {
        const error = await response.json();
        // If skill already exists in DB, add it anyway
        if (response.status === 409) {
          onSkillsChange([
            ...selectedSkills,
            { name: trimmedName, is_custom: true },
          ]);
          setCustomSkillInput('');
        } else {
          console.error('Failed to create custom skill:', error);
        }
      }
    } catch (err) {
      console.error('Error creating custom skill:', err);
    } finally {
      setIsCreatingCustomSkill(false);
    }
  };

  // Remove skill
  const handleRemoveSkill = (skillName: string) => {
    if (disabled) return;
    onSkillsChange(selectedSkills.filter((s) => s.name !== skillName));
  };

  return (
    <div className={styles.skillSelector}>
      <label className={styles.label}>
        Skills <span className={styles.required}>*</span>
      </label>

      {/* Predefined Skills Dropdown */}
      <div className={styles.predefinedSection}>
        <div className={styles.dropdownContainer}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => setShowPredefinedDropdown(!showPredefinedDropdown)}
            disabled={disabled}
          >
            <span>Add from predefined skills</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={
                showPredefinedDropdown ? styles.iconRotated : styles.icon
              }
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showPredefinedDropdown && (
            <div className={styles.dropdown}>
              {Object.entries(SKILL_GROUPS).map(([group, skills]) => (
                <div key={group} className={styles.skillGroup}>
                  <div className={styles.groupHeader}>{group}</div>
                  <div className={styles.groupSkills}>
                    {skills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        className={`${styles.skillOption} ${
                          isSkillSelected(skill) ? styles.skillSelected : ''
                        }`}
                        onClick={() => {
                          handleAddPredefinedSkill(skill);
                          setShowPredefinedDropdown(false);
                        }}
                        disabled={isSkillSelected(skill)}
                      >
                        {skill}
                        {isSkillSelected(skill) && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Skill Input */}
      <div className={styles.customSection}>
        <label className={styles.sublabel}>Or create custom skill:</label>
        <div className={styles.customInput}>
          <input
            type="text"
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomSkill();
              }
            }}
            placeholder="e.g., GCSE Biology Photosynthesis"
            disabled={disabled || isCreatingCustomSkill}
            className={styles.input}
          />
          <Button
            onClick={handleAddCustomSkill}
            disabled={!customSkillInput.trim() || disabled || isCreatingCustomSkill}
            variant="secondary"
          >
            {isCreatingCustomSkill ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* Popular Custom Skills */}
      {popularCustomSkills.length > 0 && (
        <div className={styles.popularSection}>
          <label className={styles.sublabel}>Popular custom skills:</label>
          <div className={styles.popularSkills}>
            {popularCustomSkills.slice(0, 5).map((skill: any) => (
              <button
                key={skill.skill_name}
                type="button"
                className={`${styles.popularSkill} ${
                  isSkillSelected(skill.skill_name) ? styles.skillSelected : ''
                }`}
                onClick={() => {
                  if (!isSkillSelected(skill.skill_name)) {
                    onSkillsChange([
                      ...selectedSkills,
                      { name: skill.skill_name, is_custom: true },
                    ]);
                  }
                }}
                disabled={isSkillSelected(skill.skill_name) || disabled}
              >
                {skill.skill_name}
                <span className={styles.usageCount}>
                  {skill.usage_count} tutors
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Skills */}
      <div className={styles.selectedSection}>
        <label className={styles.sublabel}>
          Selected ({selectedSkills.length}):
        </label>
        <div className={styles.skillsList}>
          {selectedSkills.length === 0 ? (
            <p className={styles.emptyState}>
              No skills selected yet. Add at least one skill.
            </p>
          ) : (
            selectedSkills.map((skill) => (
              <span
                key={skill.name}
                className={`${styles.skillChip} ${
                  skill.is_custom ? styles.customChip : styles.predefinedChip
                }`}
              >
                {skill.name}
                {skill.is_custom && (
                  <span className={styles.customBadge}>Custom</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.name)}
                  className={styles.removeButton}
                  disabled={disabled}
                  aria-label={`Remove ${skill.name}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
