/**
 * Model definitions for the AlphaFi SDK
 */

/**
 * Base interface for API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Export additional models 