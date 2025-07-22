/**
 * Error handling utilities for consistent error message extraction
 * Based on the pattern from bind-device.vue (lines 164-176)
 */

/**
 * Extract user-friendly error message from various error sources
 * @param error - Error object from axios, API response, or generic Error
 * @param fallbackMessage - Generic fallback message if no specific error is found
 * @returns User-friendly English error message
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'Request failed'): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error
  }

  // Check for server response errors (axios response)
  if (error.response && error.response.data) {
    // Try to extract from server response data
    const serverMessage = error.response.data.message || 
                         error.response.data.error || 
                         error.response.data.msg
    
    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage
    }
  }

  // Check for API response format with success field
  if (error.success === false && error.message) {
    return error.message
  }

  // Check for standard Error object message (but filter out technical errors)
  if (error.message && typeof error.message === 'string') {
    // Filter out technical HTTP status code messages
    if (!error.message.includes('Request failed with status code') &&
        !error.message.includes('Network Error') &&
        !error.message.includes('timeout')) {
      return error.message
    }
  }

  // Return fallback message
  return fallbackMessage
}

/**
 * Extract error message specifically for form validation
 * Returns both the message and suggested field assignment
 * @param error - Error object
 * @param fallbackMessage - Generic fallback message
 * @returns Object with message and suggested field for forms
 */
export function extractFormError(error: any, fallbackMessage: string = 'Request failed'): {
  message: string
  suggestedField?: 'email' | 'password' | 'general'
} {
  const message = extractErrorMessage(error, fallbackMessage)
  
  // Determine which form field should display the error
  let suggestedField: 'email' | 'password' | 'general' | undefined

  if (message.toLowerCase().includes('email') || 
      message.toLowerCase().includes('user not found')) {
    suggestedField = 'email'
  } else if (message.toLowerCase().includes('password') || 
             message.toLowerCase().includes('invalid credentials') ||
             message.toLowerCase().includes('authentication failed')) {
    suggestedField = 'password'
  } else {
    suggestedField = 'general'
  }

  return { message, suggestedField }
}

/**
 * Check if an error is a network-related error that should be handled specially
 * @param error - Error object
 * @returns true if it's a network error
 */
export function isNetworkError(error: any): boolean {
  return !error.response && error.request && !error.message?.includes('timeout')
}

/**
 * Check if an error is an authentication error (401/403)
 * @param error - Error object  
 * @returns true if it's an auth error
 */
export function isAuthError(error: any): boolean {
  return error.response && (error.response.status === 401 || error.response.status === 403)
}