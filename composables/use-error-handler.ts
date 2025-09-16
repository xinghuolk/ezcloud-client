/**
 * Error Handler Composable
 * Provides unified error handling API for Vue components
 */

import { ref, reactive, type Ref } from 'vue'
import { notyf } from '/@src/api/request'
import { 
  analyzeError, 
  ErrorDisplay, 
  ErrorType,
  ErrorSeverity,
  type ErrorHandlerOptions,
  type ErrorAnalysis 
} from '/@src/utils/error-handler'

// Global error state for debugging
export const globalErrorState = reactive({
  lastError: null as ErrorAnalysis | null,
  errorHistory: [] as ErrorAnalysis[]
})

/**
 * Main error handler composable
 */
export function useErrorHandler() {
  const isLoading = ref(false)
  const lastError = ref<ErrorAnalysis | null>(null)

  /**
   * Handle error with unified processing
   */
  const handleError = (
    error: any, 
    options: ErrorHandlerOptions = {}
  ): ErrorAnalysis => {
    const analysis = analyzeError(error)
    lastError.value = analysis

    // Update global error state for debugging
    globalErrorState.lastError = analysis
    globalErrorState.errorHistory.unshift(analysis)
    if (globalErrorState.errorHistory.length > 50) {
      globalErrorState.errorHistory.pop() // Keep only last 50 errors
    }

    // Console logging for development
    if (import.meta.env.DEV) {
      console.error('🚨 Error Handler:', {
        type: analysis.type,
        severity: analysis.severity,
        userMessage: analysis.userMessage,
        technicalMessage: analysis.technicalMessage,
        originalError: error,
        options
      })
    }

    // Handle authentication errors automatically
    if (analysis.requiresAuth && analysis.suggestedAction === 'redirect_to_login') {
      handleAuthError()
      return analysis
    }

    // Determine display method
    const display = options.display || determineDisplayMethod(analysis, options)

    // Show error based on display method
    switch (display) {
      case ErrorDisplay.NOTIFICATION:
        showNotification(analysis, options)
        break
      case ErrorDisplay.INLINE:
        // Inline display will be handled by the component using the returned analysis
        break
      case ErrorDisplay.FORM_FIELD:
        // Form field display will be handled by the component using the returned analysis
        break
      case ErrorDisplay.SILENT:
        // Silent mode - only log, don't show
        break
      default:
        showNotification(analysis, options)
    }

    // Execute custom action if provided
    if (options.customAction) {
      try {
        options.customAction()
      } catch (actionError) {
        console.error('Custom error action failed:', actionError)
      }
    }

    return analysis
  }

  /**
   * Handle form-specific errors
   */
  const handleFormError = (
    error: any, 
    formErrors: Ref<Record<string, string>> | Record<string, string>,
    options: ErrorHandlerOptions = {}
  ): ErrorAnalysis => {
    const analysis = handleError(error, { ...options, display: ErrorDisplay.FORM_FIELD })
    
    // Handle both Ref and reactive objects
    const errorsObj = 'value' in formErrors ? formErrors.value : formErrors
    
    // Set form field error if suggested
    if (analysis.formField && errorsObj) {
      errorsObj[analysis.formField] = analysis.userMessage
    } else {
      // Set general form error if no specific field
      errorsObj.general = analysis.userMessage
    }

    return analysis
  }

  /**
   * Show success notification
   */
  const showSuccess = (message: string) => {
    notyf.success(message)
  }

  /**
   * Show info notification
   */
  const showInfo = (message: string) => {
    if (notyf.options.types?.find(t => t.type === 'info')) {
      ;(notyf as any).open({ type: 'info', message })
    } else {
      console.info(message)
    }
  }

  /**
   * Show warning notification
   */
  const showWarning = (message: string) => {
    if (notyf.options.types?.find(t => t.type === 'warning')) {
      ;(notyf as any).open({ type: 'warning', message })
    } else {
      console.warn(message)
    }
  }

  /**
   * Clear last error
   */
  const clearError = () => {
    lastError.value = null
  }

  /**
   * Check if current error is of specific type
   */
  const isErrorType = (type: ErrorType): boolean => {
    return lastError.value?.type === type
  }

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = (error: any, fallback?: string): string => {
    const analysis = analyzeError(error)
    return analysis.userMessage || fallback || 'An error occurred'
  }

  return {
    // State
    isLoading,
    lastError: readonly(lastError),

    // Methods
    handleError,
    handleFormError,
    showSuccess,
    showInfo,
    showWarning,
    clearError,
    isErrorType,
    getErrorMessage
  }
}

/**
 * Specialized composable for authentication errors
 */
export function useAuthErrorHandler() {
  const { handleError, ...rest } = useErrorHandler()

  const handleAuthError = (error: any, options: ErrorHandlerOptions = {}) => {
    return handleError(error, {
      ...options,
      customAction: () => {
        // Clear local storage
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth'
        }
      }
    })
  }

  return {
    handleAuthError,
    handleError,
    ...rest
  }
}

/**
 * Specialized composable for form validation errors
 */
export function useFormErrorHandler() {
  const { handleError, handleFormError, ...rest } = useErrorHandler()
  
  const createFormErrors = () => reactive<Record<string, string>>({})
  
  const clearFormErrors = (formErrors: Ref<Record<string, string>> | Record<string, string>) => {
    const errorsObj = 'value' in formErrors ? formErrors.value : formErrors
    Object.keys(errorsObj).forEach(key => {
      errorsObj[key] = ''
    })
  }

  const setFieldError = (
    formErrors: Ref<Record<string, string>> | Record<string, string>, 
    field: string, 
    message: string
  ) => {
    const errorsObj = 'value' in formErrors ? formErrors.value : formErrors
    errorsObj[field] = message
  }

  return {
    createFormErrors,
    clearFormErrors,
    setFieldError,
    handleFormError,
    handleError,
    ...rest
  }
}

// Helper functions
function determineDisplayMethod(
  analysis: ErrorAnalysis, 
  options: ErrorHandlerOptions
): ErrorDisplay {
  // Use explicit option if provided
  if (options.display) {
    return options.display
  }

  // Auto-determine based on error type and context
  if (options.formField || analysis.formField) {
    return ErrorDisplay.FORM_FIELD
  }

  // Show notifications for most errors, except validation
  if (analysis.type === ErrorType.VALIDATION && analysis.severity !== ErrorSeverity.HIGH) {
    return ErrorDisplay.INLINE
  }

  return ErrorDisplay.NOTIFICATION
}

function showNotification(analysis: ErrorAnalysis, options: ErrorHandlerOptions) {
  // Don't show notification if explicitly disabled
  if (options.showNotification === false) {
    return
  }

  const message = options.fallbackMessage || analysis.userMessage

  switch (analysis.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      notyf.error(message)
      break
    case ErrorSeverity.MEDIUM:
      // Check if warning type is available
      if (notyf.options.types?.find(t => t.type === 'warning')) {
        ;(notyf as any).open({ type: 'warning', message })
      } else {
        notyf.error(message)
      }
      break
    case ErrorSeverity.LOW:
      // Check if info type is available  
      if (notyf.options.types?.find(t => t.type === 'info')) {
        ;(notyf as any).open({ type: 'info', message })
      } else {
        console.info(message)
      }
      break
    default:
      notyf.error(message)
  }
}

function handleAuthError() {
  // Clear authentication data
  localStorage.removeItem('token')
  localStorage.removeItem('user_info')
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/auth'
  }
}

// Backward compatibility note: 
// All error handling types and functions are available through the composable functions above
// Direct imports should use: import { ErrorType, ErrorSeverity, ErrorDisplay, analyzeError } from '/@src/utils/error-handler'