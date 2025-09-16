/**
 * Unified Error Handling Architecture for EzenCloud Frontend
 * Provides consistent, user-friendly error handling across all components
 */

// Error Types and Severity Levels
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication', 
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SERVER = 'server',
  RATE_LIMIT = 'rate_limit',
  RECAPTCHA = 'recaptcha',
  BUSINESS = 'business',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',        // Info level, can be ignored
  MEDIUM = 'medium',  // Warning level, needs attention  
  HIGH = 'high',      // Error level, prevents operation
  CRITICAL = 'critical' // Critical level, system level issue
}

export enum ErrorDisplay {
  NOTIFICATION = 'notification', // Show as toast notification
  INLINE = 'inline',            // Show inline in component
  FORM_FIELD = 'form_field',    // Show under form field
  SILENT = 'silent'             // Don't show, just log
}

// Error Analysis Result
export interface ErrorAnalysis {
  type: ErrorType
  severity: ErrorSeverity
  statusCode?: number
  userMessage: string
  technicalMessage: string
  suggestedAction?: string
  formField?: string
  shouldRetry: boolean
  requiresAuth: boolean
  requiresRecaptcha: boolean
}

// Error Display Options
export interface ErrorHandlerOptions {
  display?: ErrorDisplay
  formField?: string
  fallbackMessage?: string
  showNotification?: boolean
  customAction?: () => void
}

/**
 * Analyze error and classify its type, severity, and required handling
 */
export function analyzeError(error: any): ErrorAnalysis {
  const analysis: ErrorAnalysis = {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'An unexpected error occurred',
    technicalMessage: '',
    shouldRetry: false,
    requiresAuth: false,
    requiresRecaptcha: false
  }

  // Extract technical message first
  analysis.technicalMessage = extractTechnicalMessage(error)
  
  // Analyze by status code
  const statusCode = error?.response?.status || error?.status
  analysis.statusCode = statusCode

  if (statusCode) {
    switch (statusCode) {
      case 400:
        analysis.type = ErrorType.VALIDATION
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.userMessage = 'Please check your input and try again'
        
        // Special handling for specific validation errors
        if (analysis.technicalMessage.includes('reCAPTCHA verification required') || 
            analysis.technicalMessage.includes('recaptcha')) {
          analysis.type = ErrorType.RECAPTCHA
          analysis.requiresRecaptcha = true
          analysis.userMessage = 'Security verification required'
        } else if (analysis.technicalMessage.includes('password')) {
          analysis.formField = 'password'
          analysis.userMessage = analysis.technicalMessage
        } else if (analysis.technicalMessage.includes('email')) {
          analysis.formField = 'email'
          analysis.userMessage = analysis.technicalMessage
        }
        break

      case 401:
        analysis.type = ErrorType.AUTHENTICATION
        analysis.severity = ErrorSeverity.HIGH
        
        // 区分登录失败和需要重新登录的场景
        if (analysis.technicalMessage.includes('Invalid email or password') || 
            analysis.technicalMessage.includes('Invalid credentials')) {
          analysis.userMessage = analysis.technicalMessage // 使用具体的错误消息
          analysis.requiresAuth = false // 不需要跳转，用户已在登录页面
        } else {
          analysis.requiresAuth = true
          analysis.userMessage = 'Please sign in to continue'
          analysis.suggestedAction = 'redirect_to_login'
        }
        break

      case 403:
        if (analysis.technicalMessage.includes('expired') || analysis.technicalMessage.includes('invalid token')) {
          analysis.type = ErrorType.AUTHENTICATION
          analysis.requiresAuth = true
          analysis.userMessage = 'Your session has expired. Please sign in again'
          analysis.suggestedAction = 'redirect_to_login'
        } else {
          analysis.type = ErrorType.AUTHORIZATION
          analysis.userMessage = 'You don\'t have permission to perform this action'
        }
        analysis.severity = ErrorSeverity.HIGH
        break

      case 404:
        analysis.type = ErrorType.BUSINESS
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.userMessage = 'The requested resource was not found'
        break

      case 409:
        analysis.type = ErrorType.BUSINESS
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.userMessage = analysis.technicalMessage || 'A conflict occurred. The resource may already exist'
        break

      case 422:
        analysis.type = ErrorType.BUSINESS
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.userMessage = analysis.technicalMessage || 'Unable to process the request'
        break

      case 423:
        analysis.type = ErrorType.RECAPTCHA
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.requiresRecaptcha = true
        analysis.userMessage = 'Security verification required'
        break

      case 429:
        analysis.type = ErrorType.RATE_LIMIT
        analysis.severity = ErrorSeverity.MEDIUM
        analysis.shouldRetry = true
        analysis.userMessage = 'Too many requests. Please wait a moment and try again'
        
        // Extract retry time if available
        const retryAfter = error?.response?.data?.retryAfter
        if (retryAfter) {
          if (retryAfter < 120) {
            analysis.userMessage = `Please wait ${retryAfter} seconds before trying again`
          } else {
            const minutes = Math.ceil(retryAfter / 60)
            analysis.userMessage = `Please wait ${minutes} minutes before trying again`
          }
        }
        break

      case 500:
      case 502:
      case 503:
      case 504:
        analysis.type = ErrorType.SERVER
        analysis.severity = ErrorSeverity.HIGH
        analysis.shouldRetry = true
        analysis.userMessage = 'Server error. Please try again in a few moments'
        break

      default:
        if (statusCode >= 400 && statusCode < 500) {
          analysis.type = ErrorType.BUSINESS
          analysis.userMessage = analysis.technicalMessage || 'Request failed'
        } else if (statusCode >= 500) {
          analysis.type = ErrorType.SERVER
          analysis.severity = ErrorSeverity.HIGH
          analysis.userMessage = 'Server error occurred'
        }
    }
  }

  // Network errors
  if (!error.response && error.request) {
    analysis.type = ErrorType.NETWORK
    analysis.severity = ErrorSeverity.HIGH
    analysis.shouldRetry = true
    if (error.code === 'ECONNABORTED' || analysis.technicalMessage.includes('timeout')) {
      analysis.userMessage = 'Request timed out. Please check your connection and try again'
    } else {
      analysis.userMessage = 'Network error. Please check your connection'
    }
  }

  // Use technical message if it's user-friendly
  if (isUserFriendlyMessage(analysis.technicalMessage)) {
    analysis.userMessage = analysis.technicalMessage
  }

  return analysis
}

/**
 * Extract user-friendly error message from various error sources
 * @param error - Error object from axios, API response, or generic Error  
 * @param fallbackMessage - Generic fallback message if no specific error is found
 * @returns User-friendly English error message
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'Request failed'): string {
  const analysis = analyzeError(error)
  return analysis.userMessage || fallbackMessage
}

/**
 * Extract technical error message for debugging
 */
function extractTechnicalMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  // Check for server response errors (axios response)
  if (error?.response?.data) {
    const data = error.response.data
    return data.message || data.error || data.msg || ''
  }

  // Check for API response format with success field
  if (error?.success === false && error.message) {
    return error.message
  }

  // Check for standard Error object message
  if (error?.message && typeof error.message === 'string') {
    return error.message
  }

  return ''
}

/**
 * Check if a message is user-friendly (not technical)
 */
function isUserFriendlyMessage(message: string): boolean {
  if (!message) return false
  
  const technicalPatterns = [
    /Request failed with status code/,
    /Network Error/,
    /ERR_/,
    /timeout of \d+ms exceeded/,
    /connect ECONNREFUSED/,
    /getaddrinfo ENOTFOUND/
  ]
  
  return !technicalPatterns.some(pattern => pattern.test(message))
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
  suggestedField?: string
} {
  const analysis = analyzeError(error)
  
  return { 
    message: analysis.userMessage || fallbackMessage,
    suggestedField: analysis.formField
  }
}

/**
 * Check if an error is a network-related error that should be handled specially
 * @param error - Error object
 * @returns true if it's a network error
 */
export function isNetworkError(error: any): boolean {
  const analysis = analyzeError(error)
  return analysis.type === ErrorType.NETWORK
}

/**
 * Check if an error is an authentication error (401/403)
 * @param error - Error object  
 * @returns true if it's an auth error
 */
export function isAuthError(error: any): boolean {
  const analysis = analyzeError(error)
  return analysis.type === ErrorType.AUTHENTICATION || analysis.requiresAuth
}

/**
 * Check if an error requires reCAPTCHA verification
 */
export function isRecaptchaError(error: any): boolean {
  const analysis = analyzeError(error)
  return analysis.type === ErrorType.RECAPTCHA || analysis.requiresRecaptcha
}

/**
 * Check if an error indicates rate limiting
 */
export function isRateLimitError(error: any): boolean {
  const analysis = analyzeError(error)
  return analysis.type === ErrorType.RATE_LIMIT
}

/**
 * Get suggested user action based on error type
 */
export function getSuggestedAction(error: any): string | null {
  const analysis = analyzeError(error)
  return analysis.suggestedAction || null
}