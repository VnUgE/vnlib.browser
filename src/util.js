
/**
 * Writes logs to the console if the environment is set to development
 */
export const debugLog = function (...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}