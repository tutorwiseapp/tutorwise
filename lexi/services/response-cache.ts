/**
 * Lexi Response Cache
 *
 * Client-side caching for common responses to improve performance
 * and enable offline functionality for frequently asked questions.
 *
 * Uses localStorage for persistence with automatic TTL expiration.
 *
 * @module lexi/services/response-cache
 */

// --- Types ---

export interface CachedResponse {
  content: string;
  suggestions: string[];
  intent?: string;
  timestamp: number;
  ttl: number; // milliseconds
  hitCount: number;
}

export interface ResponseCacheConfig {
  maxEntries?: number;
  defaultTTL?: number; // milliseconds
  storageKey?: string;
}

// --- Cache Patterns ---

/**
 * Patterns that can be cached with their TTLs
 * Longer TTL for static responses, shorter for dynamic ones
 */
const CACHEABLE_PATTERNS: Array<{
  pattern: RegExp;
  key: string;
  ttl: number; // hours
  isStatic: boolean;
}> = [
  // Greetings - very cacheable
  { pattern: /^(hi|hello|hey|good morning|good afternoon|good evening)[\s!.,]*$/i, key: 'greeting', ttl: 24, isStatic: true },
  { pattern: /^(thanks|thank you|thx|ty)[\s!.,]*$/i, key: 'thanks', ttl: 24, isStatic: true },
  { pattern: /^(bye|goodbye|see you|later)[\s!.,]*$/i, key: 'goodbye', ttl: 24, isStatic: true },

  // Help questions - fairly static
  { pattern: /^(what can you do|help|how can you help|what are you)[\s?!.,]*$/i, key: 'capabilities', ttl: 12, isStatic: true },
  { pattern: /^(who are you|what is lexi|about lexi)[\s?!.,]*$/i, key: 'about', ttl: 24, isStatic: true },

  // Common navigation queries
  { pattern: /^(how (do i|to)|where (can i|is)).*book(ing)?s?[\s?!.,]*$/i, key: 'nav_bookings', ttl: 4, isStatic: false },
  { pattern: /^(how (do i|to)|where (can i|is)).*progress[\s?!.,]*$/i, key: 'nav_progress', ttl: 4, isStatic: false },
  { pattern: /^(how (do i|to)|where (can i|is)).*schedule[\s?!.,]*$/i, key: 'nav_schedule', ttl: 4, isStatic: false },
  { pattern: /^(how (do i|to)|where (can i|is)).*payment[\s?!.,]*$/i, key: 'nav_payments', ttl: 4, isStatic: false },
  { pattern: /^(how (do i|to)|where (can i|is)).*settings[\s?!.,]*$/i, key: 'nav_settings', ttl: 4, isStatic: false },

  // FAQ type questions
  { pattern: /^(how does|what is).*tutorwise[\s?!.,]*$/i, key: 'faq_about', ttl: 24, isStatic: true },
  { pattern: /^(how (do|does)|what).*pricing[\s?!.,]*$/i, key: 'faq_pricing', ttl: 6, isStatic: false },
  { pattern: /^(how (do|does)|what).*cancel[\s?!.,]*$/i, key: 'faq_cancel', ttl: 12, isStatic: false },
  { pattern: /^(how (do|does)|what).*refund[\s?!.,]*$/i, key: 'faq_refund', ttl: 12, isStatic: false },
];

// --- Response Cache Class ---

export class ResponseCache {
  private cache: Map<string, CachedResponse>;
  private config: Required<ResponseCacheConfig>;
  private readonly STORAGE_KEY: string;

  constructor(config: ResponseCacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      defaultTTL: config.defaultTTL ?? 4 * 60 * 60 * 1000, // 4 hours default
      storageKey: config.storageKey ?? 'lexi_response_cache',
    };
    this.STORAGE_KEY = this.config.storageKey;
    this.cache = new Map();
    this.loadFromStorage();
  }

  /**
   * Check if a message is cacheable and return cache key if so
   */
  getCacheKey(message: string, persona?: string): string | null {
    const normalizedMessage = message.trim().toLowerCase();

    for (const { pattern, key, isStatic } of CACHEABLE_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        // Include persona in key for non-static responses
        return isStatic ? key : `${key}_${persona || 'default'}`;
      }
    }

    return null;
  }

  /**
   * Get TTL for a cache key
   */
  private getTTL(message: string): number {
    const normalizedMessage = message.trim().toLowerCase();

    for (const { pattern, ttl } of CACHEABLE_PATTERNS) {
      if (pattern.test(normalizedMessage)) {
        return ttl * 60 * 60 * 1000; // Convert hours to ms
      }
    }

    return this.config.defaultTTL;
  }

  /**
   * Get cached response if available and not expired
   */
  get(key: string): CachedResponse | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    // Update hit count
    cached.hitCount++;
    this.saveToStorage();

    return cached;
  }

  /**
   * Store response in cache
   */
  set(
    key: string,
    response: {
      content: string;
      suggestions?: string[];
      intent?: string;
    },
    message: string
  ): void {
    // Check max entries and evict if needed
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const ttl = this.getTTL(message);

    this.cache.set(key, {
      content: response.content,
      suggestions: response.suggestions || [],
      intent: response.intent,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    });

    this.saveToStorage();
  }

  /**
   * Check if response can be retrieved from cache
   */
  canCache(message: string): boolean {
    return this.getCacheKey(message) !== null;
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
      }
    }
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    totalHits: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    let totalHits = 0;
    let oldest = Infinity;
    let newest = 0;

    for (const value of this.cache.values()) {
      totalHits += value.hitCount;
      if (value.timestamp < oldest) oldest = value.timestamp;
      if (value.timestamp > newest) newest = value.timestamp;
    }

    return {
      entries: this.cache.size,
      totalHits,
      oldestEntry: oldest === Infinity ? null : new Date(oldest),
      newestEntry: newest === 0 ? null : new Date(newest),
    };
  }

  // --- Private Methods ---

  private evictOldest(): void {
    // Evict entries with lowest hit count first, then oldest
    let lowestHitKey: string | null = null;
    let lowestHitCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, value] of this.cache) {
      if (
        value.hitCount < lowestHitCount ||
        (value.hitCount === lowestHitCount && value.timestamp < oldestTimestamp)
      ) {
        lowestHitCount = value.hitCount;
        oldestTimestamp = value.timestamp;
        lowestHitKey = key;
      }
    }

    if (lowestHitKey) {
      this.cache.delete(lowestHitKey);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, CachedResponse>;
        const now = Date.now();

        // Load non-expired entries
        for (const [key, value] of Object.entries(data)) {
          if (now <= value.timestamp + value.ttl) {
            this.cache.set(key, value);
          }
        }
      }
    } catch {
      // Silently fail - cache is optional
      console.warn('[ResponseCache] Failed to load from storage');
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data: Record<string, CachedResponse> = {};
      for (const [key, value] of this.cache) {
        data[key] = value;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail - storage might be full
      console.warn('[ResponseCache] Failed to save to storage');
    }
  }
}

// --- Singleton Export ---

export const responseCache = new ResponseCache();

export default ResponseCache;
