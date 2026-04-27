console.log('electron version:', process.versions.electron)
console.log('process.type:', process.type)
console.log('process.argv:', process.argv.slice(1, 3).join(' '))
// Try to manually require from the electron built-in path
const builtinPath = '/Applications/Electron.app'
const e = require('electron')
console.log('typeof e:', typeof e)
