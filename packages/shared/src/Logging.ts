type ConsoleMethod = 'log' | 'info' | 'warn' | 'error';

const DEFAULT_METHODS: ConsoleMethod[] = ['log', 'info', 'warn', 'error'];

export function createLogPrefix(appName: string, timestamp: Date = new Date()) {
  return `[${appName}] [${timestamp.toISOString()}]`;
}

export function installConsolePrefix(
  appName: string,
  methods: ConsoleMethod[] = DEFAULT_METHODS,
  target: Console = console
) {
  const prefixedConsole = target as Console & { __spiralwaveLogPrefixApp?: string };

  if (prefixedConsole.__spiralwaveLogPrefixApp === appName) {
    return;
  }

  for (const method of methods) {
    const original = target[method].bind(target);
    target[method] = ((...args: unknown[]) => {
      original(createLogPrefix(appName), ...args);
    }) as Console[ConsoleMethod];
  }

  prefixedConsole.__spiralwaveLogPrefixApp = appName;
}
