import './section.css';

import type {Presenter} from '@motion-canvas/core';
import config from 'virtual:explain-it/config';
import sections from 'virtual:explain-it/sections';

import {present} from './present.js';
import {installSnap} from './snap.js';

// Every section page loads this script. <body data-section="roles"> picks the
// project for sections/roles.tsx. The page's own hash is the beat to start at.
const stage = document.querySelector<HTMLElement>('.stage')!;
const back = document.querySelector<HTMLButtonElement>('.back')!;
const next = document.querySelector<HTMLButtonElement>('.next')!;
const beats = document.querySelector<HTMLOListElement>('.beats')!;

let presenter: Presenter | null = null;

const id = document.body.dataset.section!;
// The explainer ends after this section's last beat; there's nowhere to go.
const isLast = config.sections.at(-1)?.id === id;

// Past the last beat, or before the first, the shell moves to the next section.
function leave(step: 1 | -1) {
  parent.postMessage({step}, location.origin);
}

function forward() {
  const info = presenter?.onInfoChanged.current;
  if (!presenter || !info) return;
  if (info.count === 0) leave(1);
  // Mid-beat: finish it now.
  else if (!info.isWaiting) presenter.requestNextSlide();
  else if (info.hasNext) presenter.resume();
  else if (!isLast) leave(1);
}

// Jumps to the end of beat `index`, from a dot.
function goTo(index: number) {
  const slide = presenter?.onSlidesChanged.current[index];
  if (slide) presenter!.requestSlide(slide.id);
}

function backward() {
  const info = presenter?.onInfoChanged.current;
  if (!presenter || !info) return;
  if (info.hasPrevious) presenter.requestPreviousSlide();
  else leave(-1);
}

let reported: string | null = null;

// Slide ids are "<section>:<beat>".
function beatOf(slideId: string | null) {
  return slideId?.slice(slideId.indexOf(':') + 1) ?? null;
}

function render() {
  const info = presenter!.onInfoChanged.current;
  // Slides mark the end of a beat, so between slides the next beat is playing.
  const index = info.index ?? -1;
  const beat = info.isWaiting ? index : index + 1;

  if (beats.children.length !== info.count) {
    beats.replaceChildren(
      ...Array.from({length: info.count}, (_, i) => {
        const dot = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Step ${i + 1} of ${info.count}`);
        button.addEventListener('click', () => goTo(i));
        dot.append(button);
        return dot;
      }),
    );
  }
  [...beats.children].forEach((dot, i) => {
    dot.classList.toggle('is-done', i < beat || (i === beat && info.isWaiting));
    dot.classList.toggle('is-current', i === beat);
    const button = dot.firstElementChild!;
    if (i === beat) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });

  const atEnd = info.count === 0 || (info.isWaiting && !info.hasNext);
  next.textContent = atEnd ? 'Next section →' : 'Next →';
  next.disabled = atEnd && isLast;
  back.textContent = info.hasPrevious ? '← Back' : '← Previous section';

  // Paused at a beat: remember it here, so a reload comes back to it, and in
  // the shell's link.
  const paused = info.isWaiting ? beatOf(info.currentSlideId) : null;
  // For tools driving the page: the beat it is paused at, or nothing mid-beat.
  document.body.dataset.beat = paused ?? '';
  if (paused && paused !== reported) {
    reported = paused;
    history.replaceState(null, '', `#${encodeURIComponent(paused)}`);
    parent.postMessage({beat: paused}, location.origin);
  }
}

next.addEventListener('click', forward);
back.addEventListener('click', backward);
stage.addEventListener('click', forward);

function onKey(key: string) {
  if (key === 'ArrowRight') forward();
  if (key === 'ArrowLeft') backward();
}

document.addEventListener('keydown', event => onKey(event.key));

// Arrow keys pressed while focus is in the shell arrive here.
window.addEventListener('message', event => {
  if (event.source === parent && typeof event.data?.key === 'string') {
    onKey(event.data.key);
  }
});

const load = sections[id];
const start = decodeURIComponent(location.hash.slice(1));

// A scene that throws, like one with a duplicate beat id, can't play. Say so
// on the stage instead of leaving it blank, and tell tools driving the page.
function fail(message: string) {
  console.error(message);
  document.body.dataset.error = message;
  const box = document.createElement('div');
  box.className = 'error';
  box.setAttribute('role', 'alert');
  box.textContent = message;
  stage.replaceChildren(box);
}

if (load) {
  void load().then(({default: project}) => {
    project.logger.onLogged.subscribe(({level, message}) => {
      if (level === 'error') fail(message);
    });
    // An unknown beat matches no slide, and the section starts at the top.
    presenter = present(stage, project, start ? `${id}:${start}` : null);
    presenter.onInfoChanged.subscribe(render);
    if (new URLSearchParams(location.search).has('snap')) {
      installSnap(id, presenter, presenter.stage.finalBuffer);
    }
  });
} else {
  console.error(`No project for section "${id}"`);
}
