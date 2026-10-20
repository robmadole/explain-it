import {Rect, RectProps, Txt} from '@motion-canvas/2d';

import {resolveColor} from '../theme/index.js';
import {theme} from '../scene/context.js';
import {Icon, type IconDefinition} from './icon.js';
import {named} from './names.js';

export const BOX_WIDTH = 400;
export const BOX_HEIGHT = 240;

// Distance from a box's top edge to its title, and from its bottom edge to its note.
const INSET = 58;

export interface BoxProps extends RectProps {
  icon?: IconDefinition;
  title?: string;
  note?: string;
  // The outline and icon. A theme role or a raw colour.
  color?: string;
}

// A party to a system: a service, a browser, a container. The title sits at
// the top edge and the note at the bottom, leaving the middle clear for wires
// and tokens passing through. Give it a larger height to run more than one
// wire through it.
export function Box({icon, title = '', note = '', color = 'accent', width = BOX_WIDTH, height = BOX_HEIGHT, ...props}: BoxProps) {
  const stroke = resolveColor(theme, color);
  const h = typeof height === 'number' ? height : BOX_HEIGHT;
  return named(
    <Rect
      width={width}
      height={height}
      radius={24}
      fill={theme.surface}
      stroke={stroke}
      lineWidth={4}
      {...props}
    >
      <Rect layout y={-h / 2 + INSET} gap={18} alignItems="center">
        {icon ? <Icon icon={icon} size={44} color={stroke} /> : null}
        <Txt text={title} fontFamily={theme.font} fontSize={42} fontWeight={700} fill={theme.text} />
      </Rect>
      <Txt y={h / 2 - INSET} text={note} fontFamily={theme.font} fontSize={26} fill={theme.muted} />
    </Rect>,
    `box:${title}`,
  );
}
