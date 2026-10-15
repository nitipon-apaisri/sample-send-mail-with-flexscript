import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

export function renderTemplate(name: string, context: Record<string, unknown>): string {
  const source = readFileSync(join(__dirname, 'templates', `${name}.hbs`), 'utf8');
  return Handlebars.compile(source)(context);
}
