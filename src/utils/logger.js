export function logInfo(message, details = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...details }));
}

export function logWarn(message, details = {}) {
  console.log(JSON.stringify({ level: 'warn', message, ...details }));
}

export function logError(message, details = {}) {
  console.log(JSON.stringify({ level: 'error', message, ...details }));
}
