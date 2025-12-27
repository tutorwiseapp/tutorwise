/**
 * Filename: src/lib/utils/__tests__/formatId.test.ts
 * Purpose: Unit tests for formatId utility functions
 * Created: 2025-12-27
 */

import {
  formatIdForDisplay,
  cleanIdInput,
  isValidUuid,
  compareIds,
  generateMockUuid,
} from '../formatId';

describe('formatIdForDisplay', () => {
  const fullUuid = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

  describe('truncated context (default)', () => {
    it('should return truncated ID with # prefix by default', () => {
      expect(formatIdForDisplay(fullUuid)).toBe('#a1b2c3d4');
    });

    it('should return truncated ID when context is explicitly "truncated"', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated')).toBe('#a1b2c3d4');
    });

    it('should handle lowercase UUIDs correctly', () => {
      const lowercaseUuid = 'abcdef12-3456-7890-abcd-ef1234567890';
      expect(formatIdForDisplay(lowercaseUuid)).toBe('#abcdef12');
    });

    it('should handle mixed case UUIDs correctly (preserve lowercase)', () => {
      const mixedCaseUuid = 'AbCdEf12-3456-7890-ABCD-EF1234567890';
      expect(formatIdForDisplay(mixedCaseUuid)).toBe('#AbCdEf12');
    });
  });

  describe('full context', () => {
    it('should return full UUID when context is "full"', () => {
      expect(formatIdForDisplay(fullUuid, 'full')).toBe(fullUuid);
    });

    it('should not add prefix in full context', () => {
      const result = formatIdForDisplay(fullUuid, 'full');
      expect(result.startsWith('#')).toBe(false);
      expect(result).toBe(fullUuid);
    });
  });

  describe('null/undefined/empty handling', () => {
    it('should return em dash for null', () => {
      expect(formatIdForDisplay(null)).toBe('—');
    });

    it('should return em dash for undefined', () => {
      expect(formatIdForDisplay(undefined)).toBe('—');
    });

    it('should return em dash for empty string', () => {
      expect(formatIdForDisplay('')).toBe('—');
    });

    it('should return em dash for whitespace-only string', () => {
      expect(formatIdForDisplay('   ')).toBe('—');
    });
  });

  describe('options: prefix', () => {
    it('should omit # prefix when prefix: false', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { prefix: false })).toBe('a1b2c3d4');
    });

    it('should include # prefix when prefix: true (explicit)', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { prefix: true })).toBe('#a1b2c3d4');
    });
  });

  describe('options: length', () => {
    it('should truncate to custom length when specified', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { length: 12 })).toBe('#a1b2c3d4-567');
    });

    it('should truncate to 4 characters when length: 4', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { length: 4 })).toBe('#a1b2');
    });

    it('should truncate to 16 characters when length: 16', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { length: 16 })).toBe('#a1b2c3d4-5678-90');
    });

    it('should handle length longer than UUID (no error)', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { length: 100 })).toBe(`#${fullUuid}`);
    });
  });

  describe('options: uppercase', () => {
    it('should convert to uppercase when uppercase: true', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { uppercase: true })).toBe('#A1B2C3D4');
    });

    it('should preserve lowercase when uppercase: false (explicit)', () => {
      expect(formatIdForDisplay(fullUuid, 'truncated', { uppercase: false })).toBe('#a1b2c3d4');
    });

    it('should not affect full context', () => {
      // uppercase option should only affect truncated context
      expect(formatIdForDisplay(fullUuid, 'full', { uppercase: true })).toBe(fullUuid);
    });
  });

  describe('combined options', () => {
    it('should support multiple options together', () => {
      expect(
        formatIdForDisplay(fullUuid, 'truncated', {
          length: 12,
          uppercase: true,
          prefix: false,
        })
      ).toBe('A1B2C3D4-567');
    });
  });
});

describe('cleanIdInput', () => {
  it('should remove # prefix', () => {
    expect(cleanIdInput('#a1b2c3d4')).toBe('a1b2c3d4');
  });

  it('should trim whitespace', () => {
    expect(cleanIdInput('  a1b2c3d4  ')).toBe('a1b2c3d4');
  });

  it('should handle # prefix with whitespace', () => {
    expect(cleanIdInput('  #a1b2c3d4  ')).toBe('a1b2c3d4');
  });

  it('should return full UUID unchanged (except trim)', () => {
    const fullUuid = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
    expect(cleanIdInput(fullUuid)).toBe(fullUuid);
  });

  it('should return null for null input', () => {
    expect(cleanIdInput(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(cleanIdInput(undefined)).toBeNull();
  });

  it('should return empty string for empty input', () => {
    expect(cleanIdInput('')).toBe('');
  });
});

describe('isValidUuid', () => {
  it('should return true for valid UUID', () => {
    expect(isValidUuid('a1b2c3d4-5678-90ab-cdef-1234567890ab')).toBe(true);
  });

  it('should return true for uppercase UUID', () => {
    expect(isValidUuid('A1B2C3D4-5678-90AB-CDEF-1234567890AB')).toBe(true);
  });

  it('should return true for mixed case UUID', () => {
    expect(isValidUuid('A1b2C3d4-5678-90Ab-CdEf-1234567890aB')).toBe(true);
  });

  it('should return false for truncated UUID', () => {
    expect(isValidUuid('a1b2c3d4')).toBe(false);
  });

  it('should return false for UUID with # prefix', () => {
    expect(isValidUuid('#a1b2c3d4-5678-90ab-cdef-1234567890ab')).toBe(false);
  });

  it('should return false for invalid format (wrong segment lengths)', () => {
    expect(isValidUuid('a1b2c3d4-567-90ab-cdef-1234567890ab')).toBe(false);
  });

  it('should return false for non-hex characters', () => {
    expect(isValidUuid('g1b2c3d4-5678-90ab-cdef-1234567890ab')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidUuid(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidUuid(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('should return false for random string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});

describe('compareIds', () => {
  const fullUuid1 = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
  const fullUuid2 = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  describe('full UUID comparisons', () => {
    it('should return true for identical full UUIDs', () => {
      expect(compareIds(fullUuid1, fullUuid1)).toBe(true);
    });

    it('should return true for case-insensitive full UUIDs', () => {
      const uppercase = 'A1B2C3D4-5678-90AB-CDEF-1234567890AB';
      expect(compareIds(fullUuid1, uppercase)).toBe(true);
    });

    it('should return false for different full UUIDs', () => {
      expect(compareIds(fullUuid1, fullUuid2)).toBe(false);
    });
  });

  describe('truncated vs full comparisons', () => {
    it('should return true when truncated matches full UUID prefix', () => {
      expect(compareIds('#a1b2c3d4', fullUuid1)).toBe(true);
    });

    it('should return true when truncated (no prefix) matches full UUID', () => {
      expect(compareIds('a1b2c3d4', fullUuid1)).toBe(true);
    });

    it('should return false when truncated does not match full UUID prefix', () => {
      expect(compareIds('#a1b2c3d4', fullUuid2)).toBe(false);
    });
  });

  describe('truncated vs truncated comparisons', () => {
    it('should return true for identical truncated IDs', () => {
      expect(compareIds('a1b2c3d4', 'a1b2c3d4')).toBe(true);
    });

    it('should return true for truncated IDs with/without prefix', () => {
      expect(compareIds('#a1b2c3d4', 'a1b2c3d4')).toBe(true);
    });

    it('should return true for case-insensitive truncated IDs', () => {
      expect(compareIds('A1B2C3D4', 'a1b2c3d4')).toBe(true);
    });

    it('should return false for different truncated IDs', () => {
      expect(compareIds('a1b2c3d4', 'ffffffff')).toBe(false);
    });
  });

  describe('null/undefined handling', () => {
    it('should return false when first ID is null', () => {
      expect(compareIds(null, fullUuid1)).toBe(false);
    });

    it('should return false when second ID is null', () => {
      expect(compareIds(fullUuid1, null)).toBe(false);
    });

    it('should return false when both IDs are null', () => {
      expect(compareIds(null, null)).toBe(false);
    });

    it('should return false when first ID is undefined', () => {
      expect(compareIds(undefined, fullUuid1)).toBe(false);
    });

    it('should return false when second ID is undefined', () => {
      expect(compareIds(fullUuid1, undefined)).toBe(false);
    });

    it('should return false when first ID is empty', () => {
      expect(compareIds('', fullUuid1)).toBe(false);
    });

    it('should return false when second ID is empty', () => {
      expect(compareIds(fullUuid1, '')).toBe(false);
    });
  });
});

describe('generateMockUuid', () => {
  it('should generate a valid UUID format', () => {
    const uuid = generateMockUuid();
    expect(isValidUuid(uuid)).toBe(true);
  });

  it('should generate different UUIDs on multiple calls', () => {
    const uuid1 = generateMockUuid();
    const uuid2 = generateMockUuid();
    expect(uuid1).not.toBe(uuid2);
  });

  it('should generate UUID with correct segment lengths', () => {
    const uuid = generateMockUuid();
    const segments = uuid.split('-');
    expect(segments).toHaveLength(5);
    expect(segments[0]).toHaveLength(8);
    expect(segments[1]).toHaveLength(4);
    expect(segments[2]).toHaveLength(4);
    expect(segments[3]).toHaveLength(4);
    expect(segments[4]).toHaveLength(12);
  });

  it('should generate UUID with version 4 marker', () => {
    const uuid = generateMockUuid();
    const segments = uuid.split('-');
    // Third segment should start with '4' (version 4)
    expect(segments[2][0]).toBe('4');
  });

  it('should generate UUID with variant bits', () => {
    const uuid = generateMockUuid();
    const segments = uuid.split('-');
    // Fourth segment should start with 8, 9, a, or b
    expect(['8', '9', 'a', 'b']).toContain(segments[3][0]);
  });

  it('should only contain valid hex characters', () => {
    const uuid = generateMockUuid();
    const cleanedUuid = uuid.replace(/-/g, '');
    expect(/^[0-9a-f]{32}$/.test(cleanedUuid)).toBe(true);
  });
});

describe('integration tests', () => {
  it('should format, clean, and compare IDs correctly', () => {
    const fullUuid = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

    // Format for display
    const truncated = formatIdForDisplay(fullUuid);
    expect(truncated).toBe('#a1b2c3d4');

    // Clean the formatted ID
    const cleaned = cleanIdInput(truncated);
    expect(cleaned).toBe('a1b2c3d4');

    // Compare with original
    expect(compareIds(cleaned, fullUuid)).toBe(true);
  });

  it('should handle round-trip formatting', () => {
    const fullUuid = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

    // Truncate
    const truncated = formatIdForDisplay(fullUuid, 'truncated');
    // Clean
    const cleaned = cleanIdInput(truncated);
    // Compare back to original
    expect(compareIds(cleaned, fullUuid)).toBe(true);
  });

  it('should work with generated mock UUIDs', () => {
    const mockUuid = generateMockUuid();

    // Validate it
    expect(isValidUuid(mockUuid)).toBe(true);

    // Format it
    const truncated = formatIdForDisplay(mockUuid);
    expect(truncated.startsWith('#')).toBe(true);

    // Compare
    expect(compareIds(truncated, mockUuid)).toBe(true);
  });
});
