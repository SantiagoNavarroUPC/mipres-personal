// Utility function to safely get arrays from prescription objects
export function getArray(presc: any, fieldName: string): any[] {
  return presc && Array.isArray(presc[fieldName]) ? presc[fieldName] : []
}
