import {Rect, RectProps, Txt} from '@motion-canvas/2d';

import {theme} from './context.js';
import {parts, words} from './words.js';

// Where the caption's box sits. Drawings stay above it.
export const CAPTION_Y = 360;
export const CAPTION_WIDTH = 1600;

// The subtitle under a section's drawing. Text in `backticks` is set as code,
// and a code span never breaks across lines. Starts hidden; say() shows it.
export class Caption extends Rect {
  // The caption as written, backticks and all.
  public source = '';

  public constructor(props: RectProps) {
    super({
      layout: true,
      wrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      columnGap: 12,
      rowGap: 10,
      width: CAPTION_WIDTH,
      y: CAPTION_Y,
      opacity: 0,
      ...props,
    });
  }

  public show(text: string) {
    this.source = text;
    this.removeChildren();
    this.add(words(text).map(word => <Word word={word} />));
  }

  public *say(text: string) {
    if (this.opacity() > 0) yield* this.opacity(0, 0.25);
    this.show(text);
    yield* this.opacity(1, 0.35);
  }
}

// One word, which may mix prose and code: "`site`," keeps its comma.
function Word({word}: {word: string}) {
  return (
    <Rect layout alignItems="center">
      {parts(word).map(part =>
        part.code ? (
          <Rect layout padding={[2, 12]} radius={8} fill={theme.surface} stroke={theme.rule} lineWidth={2}>
            <Txt text={part.text} fontFamily={theme.mono} fontSize={38} fill={theme.text} />
          </Rect>
        ) : (
          <Txt text={part.text} fontFamily={theme.font} fontSize={44} fill={theme.text} />
        ),
      )}
    </Rect>
  );
}
