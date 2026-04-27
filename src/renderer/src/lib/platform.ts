// Platform detection for the renderer process.
// navigator.userAgent is always available in Electron without IPC.
export const isMac = navigator.userAgent.includes('Macintosh')
export const isWindows = navigator.userAgent.includes('Windows')
export const isLinux = !isMac && !isWindows
