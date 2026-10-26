import { stdin, stdout } from 'node:process';
import { config } from '../config.js';

/** "user@host/db" without the password, so it's safe to print. */
export function describeTarget() {
  try {
    const url = new URL(config.databaseUrl);
    return `${url.username}@${url.host}${url.pathname}`;
  } catch {
    return '(DATABASE_URL fehlt)';
  }
}

/** Asks a question on the terminal; `hidden` doesn't echo the typed text. */
export function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error('Bitte in einem interaktiven Terminal ausführen.'));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let input = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(input);
          return;
        }
        if (char === '\u0003') {
          stdin.setRawMode(false);
          stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          if (input.length) {
            input = input.slice(0, -1);
            if (!hidden) stdout.write('\b \b');
          }
          continue;
        }
        input += char;
        if (!hidden) stdout.write(char);
      }
    };
    stdin.on('data', onData);
  });
}
