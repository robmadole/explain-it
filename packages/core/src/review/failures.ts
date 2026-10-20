// One thing `explainer check` found wrong.
export interface Failure {
  rule: string;
  section: string | null;
  beat: string | null;
  // Relative to the explainer's root.
  file: string | null;
  line: number | null;
  message: string;
}

export function failure(rule: string, message: string, at: Partial<Omit<Failure, 'rule' | 'message'>> = {}): Failure {
  return {rule, section: null, beat: null, file: null, line: null, ...at, message};
}

// `✗ events/stream  sections/events.tsx:42  The message. [rule]`
export function formatFailure({rule, section, beat, file, line, message}: Failure) {
  const where = [section && (beat ? `${section}/${beat}` : section), file && (line ? `${file}:${line}` : file)].filter(Boolean);
  return `✗ ${where.length ? `${where.join('  ')}  ` : ''}${message} [${rule}]`;
}
