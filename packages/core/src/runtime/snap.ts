import {Layout, Line, Node, Scene2D, Txt, type View2D} from '@motion-canvas/2d';
import {BBox, type Presenter} from '@motion-canvas/core';

import {nameOf, overlapAllowed} from '../kit/names.js';
import {Caption} from '../scene/caption.js';

// What `explainer snap` reads about one node, in canvas pixels from the top
// left of the 1920x1080 frame.
export interface SnapNode {
  name: string;
  // A kit component or a node with its own key, or a run of text.
  kind: 'named' | 'text';
  text?: string;
  // The nearest named node this one sits in.
  inside: string | null;
  inCaption: boolean;
  // Set on this node or one it sits in with allowOverlap().
  allowOverlap: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapApi {
  section: string;
  beats(): string[];
  // Pauses at the end of `beat`. False when the section has no such beat.
  seek(beat: string): Promise<boolean>;
  nodes(): SnapNode[];
  png(): string;
  error(): string | null;
}

declare global {
  interface Window {
    __explainer?: SnapApi;
  }
}

// Motion Canvas gives unkeyed nodes keys like "events/Rect[12]".
const GENERATED_KEY = /\/\w+\[\d+\]$/;

function nameFor(node: Node) {
  return nameOf(node) ?? (node.key && !GENERATED_KEY.test(node.key) ? node.key : null);
}

function textOf(node: Node): string {
  if (node instanceof Caption) return node.source;
  if (node instanceof Txt) return node.text();
  return node.children().map(textOf).filter(Boolean).join(' ');
}

// A node's box in canvas pixels. Layout nodes (boxes, tokens, text) by their
// layout size: the render cache box pads text by half its font size, which
// would make text that doesn't touch look like it overlaps. Lines and paths
// by what they draw.
function bounds(node: Node) {
  if (node instanceof Layout && !(node instanceof Line)) {
    // Local space is centred on the rect; localToWorld() applies `offset`.
    const {width, height} = node.size();
    const local = new BBox(-width / 2, -height / 2, width, height);
    return BBox.fromPoints(...local.transformCorners(node.localToWorld()));
  }
  return BBox.fromPoints(...node.cacheBBox().transformCorners(node.localToWorld()));
}

function collect(view: View2D): SnapNode[] {
  const found: SnapNode[] = [];
  const visit = (node: Node, inside: string | null, inCaption: boolean, allowed: boolean) => {
    if (node.absoluteOpacity() < 0.01) return;
    allowed ||= overlapAllowed(node);
    const name = nameFor(node);
    const isText = node instanceof Txt && node.text() !== '';
    if (name || isText) {
      const box = bounds(node);
      found.push({
        name: name ?? `text:${(node as Txt).text()}`,
        kind: name ? 'named' : 'text',
        text: name ? textOf(node) || undefined : (node as Txt).text(),
        inside,
        inCaption,
        allowOverlap: allowed,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
    for (const child of node.children()) visit(child, name ?? inside, inCaption || name === 'caption', allowed);
  };
  for (const child of view.children()) visit(child, null, false, false);
  return found;
}

function frames(count: number) {
  return new Promise<void>(resolve => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });
}

// Installed on section pages opened with ?snap, for tools that drive a browser.
export function installSnap(section: string, presenter: Presenter, canvas: HTMLCanvasElement) {
  const ready = new Promise<void>(resolve => {
    const unsubscribe = presenter.onInfoChanged.subscribe(info => {
      if (info.count > 0 && info.isWaiting) {
        resolve();
        unsubscribe();
      }
    });
  });

  window.__explainer = {
    section,
    beats: () => presenter.onSlidesChanged.current.map(slide => slide.name),
    async seek(beat) {
      await ready;
      if (!presenter.onSlidesChanged.current.some(slide => slide.name === beat)) return false;
      const id = `${section}:${beat}`;
      const info = presenter.onInfoChanged.current;
      if (!(info.isWaiting && info.currentSlideId === id)) {
        await new Promise<void>(resolve => {
          const unsubscribe = presenter.onInfoChanged.subscribe(next => {
            if (next.isWaiting && next.currentSlideId === id) {
              resolve();
              unsubscribe();
            }
          });
          presenter.requestSlide(id);
        });
      }
      // Let fonts load and the paused frame draw.
      await document.fonts.ready;
      await frames(2);
      return true;
    },
    nodes: () => collect((presenter.playback.currentScene as Scene2D).getView()),
    png: () => canvas.toDataURL('image/png'),
    error: () => document.body.dataset.error ?? null,
  };
}
