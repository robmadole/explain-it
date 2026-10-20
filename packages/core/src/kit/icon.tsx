import {Path, Rect, RectProps} from '@motion-canvas/2d';

import {resolveColor} from '../theme/index.js';
import {theme} from '../scene/context.js';

// The shape of a Font Awesome icon definition, so any Font Awesome package
// works without the core depending on one.
export interface IconDefinition {
  icon: [number, number, unknown[], string, string | string[]];
}

export interface IconProps extends RectProps {
  icon: IconDefinition;
  // Height in pixels; the width follows the icon's own proportions.
  size: number;
  // A theme role or a raw colour.
  color: string;
}

// A Font Awesome icon. It takes up its own size, so it can sit in a layout.
export function Icon({icon, size, color, ...props}: IconProps) {
  const [width, height, , , data] = icon.icon;
  const scale = size / height;

  return (
    <Rect width={width * scale} height={size} {...props}>
      <Path
        layout={false}
        data={Array.isArray(data) ? data.join(' ') : data}
        x={(-width * scale) / 2}
        y={-size / 2}
        scale={scale}
        fill={resolveColor(theme, color)}
      />
    </Rect>
  );
}
