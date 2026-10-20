import {Rect, RectProps, Txt} from '@motion-canvas/2d';
import {all, easeOutBack} from '@motion-canvas/core';

import {resolveColor} from '../theme/index.js';
import {theme} from '../scene/context.js';
import {Icon} from './icon.js';
import {check, xmark} from './marks.js';
import {named} from './names.js';

// Leading spaces become padding on the line, since text layout collapses them.
export const INDENT = '  ';

// A line, or a line in a colour (a theme role or a raw colour).
export type CodeLine = string | {text: string; color?: string};

export interface CodePanelProps extends RectProps {
  title?: string;
  lines?: CodeLine[];
  fontSize?: number;
}

// A panel of monospaced lines: page source, a JSON object, a log. Lines can be
// inserted, removed, replaced, marked as allowed or refused, and brought into
// focus. Give it offset={[0, -1]} to pin its top edge, so it grows downwards.
export class CodePanel extends Rect {
  private readonly title: Txt;
  private readonly body: Rect;
  private readonly codeSize: number;

  public constructor({title = '', lines = [], fontSize = 26, ...props}: CodePanelProps) {
    super({
      layout: true,
      direction: 'column',
      gap: 16,
      padding: [24, 32, 28],
      radius: 20,
      fill: theme.surface,
      stroke: theme.rule,
      lineWidth: 2,
      ...props,
    });
    this.codeSize = fontSize;
    this.title = (
      <Txt text={title} fontFamily={theme.mono} fontSize={22} fontWeight={700} fill={theme.muted} />
    ) as Txt;
    this.body = (<Rect layout direction="column">{lines.map(line => this.row(line))}</Rect>) as Rect;
    this.add([this.title, this.body]);
    named(this, `code:${title}`);
  }

  public rows() {
    return this.body.children() as Rect[];
  }

  public *setTitle(text: string) {
    yield* this.title.opacity(0, 0.2);
    this.title.text(text);
    yield* this.title.opacity(1, 0.2);
  }

  public *insertLine(index: number, line: CodeLine) {
    const row = this.row(line, true);
    this.body.insert(row, index);
    yield* all(row.height(this.rowHeight(), 0.4), row.opacity(1, 0.4));
  }

  public *removeLine(index: number) {
    const row = this.rows()[index];
    yield* all(row.height(0, 0.4), row.opacity(0, 0.3));
    row.remove();
  }

  public *replaceLine(index: number, line: CodeLine) {
    const {text, color, indent} = this.parse(line);
    const row = this.rows()[index];
    const txt = row.childAs<Txt>(0)!;
    yield* txt.opacity(0, 0.2);
    txt.text(text);
    txt.fill(color);
    row.padding.left(indent);
    yield* txt.opacity(1, 0.2);
  }

  // A check or a cross at the end of a line.
  public *markLine(index: number, allowed: boolean) {
    const mark = (
      <Icon
        icon={allowed ? check : xmark}
        size={this.codeSize}
        color={allowed ? theme.ok : theme.danger}
        scale={0}
      />
    ) as Rect;
    this.rows()[index].add(mark);
    yield* mark.scale(1, 0.3, easeOutBack);
  }

  // Dims every line but these. Pass null to bring them all back.
  public *focusLines(indices: number[] | null, duration = 0.3) {
    yield* all(
      ...this.rows().map((row, i) => row.opacity(indices === null || indices.includes(i) ? 1 : 0.3, duration)),
    );
  }

  private rowHeight() {
    return Math.round(this.codeSize * 1.7);
  }

  private parse(line: CodeLine) {
    const {text, color = 'text'} = typeof line === 'string' ? {text: line} : line;
    const trimmed = text.trimStart();
    // Monospaced glyphs are about 0.6em wide.
    const indent = (text.length - trimmed.length) * this.codeSize * 0.6;
    return {text: trimmed, color: resolveColor(theme, color), indent};
  }

  private row(line: CodeLine, hidden = false) {
    const {text, color, indent} = this.parse(line);
    return (
      <Rect
        layout
        alignItems="center"
        gap={18}
        paddingLeft={indent}
        height={hidden ? 0 : this.rowHeight()}
        opacity={hidden ? 0 : 1}
      >
        <Txt text={text} textWrap="pre" fontFamily={theme.mono} fontSize={this.codeSize} fill={color} />
      </Rect>
    ) as Rect;
  }
}
