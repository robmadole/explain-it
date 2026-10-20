import {Circle, Rect, RectProps, Txt} from '@motion-canvas/2d';

import {resolveColor} from '../theme/index.js';
import {config, theme} from '../scene/context.js';
import {named} from './names.js';

// The key to the explainer's colours, from the config's `legend`. scene() adds
// it at the top of every section.
export function Legend(props: RectProps) {
  return named(
    <Rect layout gap={48} alignItems="center" {...props}>
      <Txt text={config.legendTitle} fontFamily={theme.font} fontSize={24} fontWeight={700} letterSpacing={2} fill={theme.muted} />
      {config.legend.map(({color, label}) => (
        <Rect layout gap={14} alignItems="center">
          <Circle size={20} fill={resolveColor(theme, color)} />
          <Txt text={label} fontFamily={theme.font} fontSize={28} fill={theme.text} />
        </Rect>
      ))}
    </Rect>,
    'legend',
  );
}
