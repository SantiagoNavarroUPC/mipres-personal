export const MAX_THREE_MONTH_RANGE_DAYS = 92

const toIsoLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const getTodayIsoLocal = (): string => toIsoLocalDate(new Date())

export const getStartOfCurrentWeekMondayIsoLocal = (): string => {
  const current = new Date()
  current.setHours(0, 0, 0, 0)

  const day = current.getDay() // Sunday = 0, Monday = 1
  const diffToMonday = day === 0 ? -6 : 1 - day

  current.setDate(current.getDate() + diffToMonday)
  return toIsoLocalDate(current)
}

export const exceedsThreeMonthRange = (fechaInicio: string, fechaFin: string): boolean => {
  const start = new Date(fechaInicio)
  const end = new Date(fechaFin)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false

  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays > MAX_THREE_MONTH_RANGE_DAYS
}

export const getThreeMonthRangeErrorMessage = (): string =>
  "No se puede consultar un rango mayor a 3 meses."
