// Splits a caption on spaces outside backticks, so `git push` stays one word.
export function words(text: string) {
  return text.match(/(?:`[^`]*`|[^\s`])+/g) ?? [];
}

// One word's prose and code parts: "`site`," is code `site` then prose ",".
export function parts(word: string) {
  return word
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map(part => (part.startsWith('`') ? {code: true, text: part.slice(1, -1)} : {code: false, text: part}));
}
