export function logInfo(message) {
  console.log(JSON.stringify({ level: 'info', message }));
}

export function logWarn(message) {
  console.log(JSON.stringify({ level: 'warn', message }));
}

export function logError(message) {
  console.log(JSON.stringify({ level: 'error', message }));
}
