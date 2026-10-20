import {Rect, RectProps, Txt} from '@motion-canvas/2d';
import type {Reference} from '@motion-canvas/core';

import {resolveColor} from '../theme/index.js';
import {theme} from '../scene/context.js';
import {named} from './names.js';

export interface TokenProps extends RectProps {
  text: string;
  // A theme role or a raw colour.
  color: string;
  textColor?: string;
  textRef?: Reference<Txt>;
}

// A rounded tag: a role, an environment, or a message on the wire.
export function Token({text, color, textColor = 'bg', textRef, ...props}: TokenProps) {
  return named(
    <Rect layout padding={[10, 24]} radius={999} fill={resolveColor(theme, color)} {...props}>
      <Txt
        ref={textRef}
        text={text}
        fontFamily={theme.mono}
        fontSize={28}
        fontWeight={700}
        fill={resolveColor(theme, textColor)}
      />
    </Rect>,
    `token:${text}`,
  );
}
