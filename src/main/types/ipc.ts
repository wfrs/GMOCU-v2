export interface IPCResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

export function ok<T>(data: T): IPCResponse<T> {
  return { success: true, data }
}

export function err(message: string): IPCResponse<never> {
  return { success: false, error: message }
}
