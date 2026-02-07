/**
 * Generic time-based cache with promise memoization.
 * Prevents duplicate concurrent fetches and auto-expires entries.
 */

import { CACHE_TTL } from './constants.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A generic cache that stores values with TTL (time-to-live).
 * Supports promise memoization to prevent duplicate concurrent fetches.
 *
 * @example
 * ```typescript
 * const cache = new Cache<string, UserData>(60000); // 60 second TTL
 *
 * // Fetch with automatic caching and deduplication
 * const data = await cache.getOrFetch('user-123', async () => {
 *   return await fetchUserFromAPI('user-123');
 * });
 * ```
 */
export class Cache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private pendingPromises: Map<K, Promise<V>> = new Map();
  private defaultTtl: number;

  /**
   * Create a new cache instance.
   * @param defaultTtlMs - Default time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(defaultTtlMs: number = CACHE_TTL.DEFAULT) {
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Get a value from cache if it exists and hasn't expired.
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache with optional custom TTL.
   */
  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtl;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if a key exists and hasn't expired.
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key from cache.
   */
  delete(key: K): boolean {
    this.pendingPromises.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
    this.pendingPromises.clear();
  }

  /**
   * Get value from cache or fetch it using the provided function.
   * Handles promise memoization to prevent duplicate concurrent fetches.
   *
   * @param key - Cache key
   * @param fetcher - Async function to fetch the value if not cached
   * @param ttlMs - Optional custom TTL for this entry
   */
  async getOrFetch(key: K, fetcher: () => Promise<V>, ttlMs?: number): Promise<V> {
    // Return cached value if available
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Return pending promise if fetch is already in progress
    const pending = this.pendingPromises.get(key);
    if (pending) {
      return pending;
    }

    // Create new fetch promise
    const fetchPromise = fetcher()
      .then((value) => {
        this.set(key, value, ttlMs);
        this.pendingPromises.delete(key);
        return value;
      })
      .catch((error) => {
        this.pendingPromises.delete(key);
        throw error;
      });

    this.pendingPromises.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Get the number of cached entries (including potentially expired ones).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries from cache.
   */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * A singleton cache for a single value (useful for global data like config).
 * Supports promise memoization and TTL.
 */
export class SingletonCache<V> {
  private value: V | undefined;
  private expiresAt: number = 0;
  private pendingPromise: Promise<V> | null = null;
  private defaultTtl: number;

  constructor(defaultTtlMs: number = CACHE_TTL.DEFAULT) {
    this.defaultTtl = defaultTtlMs;
  }

  /**
   * Get the cached value if it exists and hasn't expired.
   */
  get(): V | undefined {
    if (this.value === undefined) return undefined;
    if (Date.now() > this.expiresAt) {
      this.value = undefined;
      return undefined;
    }
    return this.value;
  }

  /**
   * Set the cached value with optional custom TTL.
   */
  set(value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtl;
    this.value = value;
    this.expiresAt = Date.now() + ttl;
  }

  /**
   * Check if value exists and hasn't expired.
   */
  has(): boolean {
    return this.get() !== undefined;
  }

  /**
   * Clear the cached value.
   */
  clear(): void {
    this.value = undefined;
    this.pendingPromise = null;
  }

  /**
   * Get value from cache or fetch it using the provided function.
   * Handles promise memoization to prevent duplicate concurrent fetches.
   */
  async getOrFetch(fetcher: () => Promise<V>, ttlMs?: number): Promise<V> {
    // Return cached value if available
    const cached = this.get();
    if (cached !== undefined) {
      return cached;
    }

    // Return pending promise if fetch is already in progress
    if (this.pendingPromise) {
      return this.pendingPromise;
    }

    // Create new fetch promise
    this.pendingPromise = fetcher()
      .then((value) => {
        this.set(value, ttlMs);
        this.pendingPromise = null;
        return value;
      })
      .catch((error) => {
        this.pendingPromise = null;
        throw error;
      });

    return this.pendingPromise;
  }
}
