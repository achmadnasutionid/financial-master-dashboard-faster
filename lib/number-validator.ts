/**
 * Safe number parsing utilities
 * 
 * Validates and parses numeric input to prevent NaN values from entering the database
 */

/**
 * Safely parse a number value, returning a default if invalid
 * 
 * @param value - The value to parse (can be string, number, or any)
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns The parsed number or default value
 * 
 * @example
 * safeParseFloat("123.45") // 123.45
 * safeParseFloat("invalid") // 0
 * safeParseFloat("abc", 100) // 100
 * safeParseFloat(null) // 0
 */
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  
  const parsed = parseFloat(value)
  
  if (!Number.isFinite(parsed)) {
    return defaultValue
  }
  
  return parsed
}

/**
 * Validate that a required number field is valid
 * Throws an error with field name if invalid
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated number
 * @throws Error if value is not a valid number
 * 
 * @example
 * validateRequiredNumber("123.45", "totalAmount") // 123.45
 * validateRequiredNumber("invalid", "totalAmount") // throws Error
 */
export function validateRequiredNumber(value: any, fieldName: string): number {
  const parsed = parseFloat(value)
  
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`)
  }
  
  return parsed
}

/**
 * Validate multiple number fields at once
 * 
 * @param fields - Object mapping field names to values
 * @returns Object with validated numbers
 * @throws Error with field name if any validation fails
 * 
 * @example
 * validateNumbers({ totalAmount: "123", paidAmount: "100" })
 * // { totalAmount: 123, paidAmount: 100 }
 */
export function validateNumbers(fields: Record<string, any>): Record<string, number> {
  const validated: Record<string, number> = {}
  
  for (const [fieldName, value] of Object.entries(fields)) {
    validated[fieldName] = validateRequiredNumber(value, fieldName)
  }
  
  return validated
}
