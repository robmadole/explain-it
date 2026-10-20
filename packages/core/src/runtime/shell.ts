import './shell.css';

// The nav's links are the list of sections: `#roles` shows sections/roles.html.
// The hash can also name a beat: `#roles/handoff`.
const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav a')];
const frames = document.querySelector<HTMLElement>('.frames')!;
const title = document.title;

// The section on screen, and the one loading behind it. A new section loads
// hidden and fades in over the old one once it has drawn its first frame, so
// the switch never shows a half-loaded page.
let shown: HTMLIFrameElement | null = null;
let incoming: HTMLIFrameElement | null = null;

function parse(hash: string) {
  const [section = '', beat = ''] = decodeURIComponent(hash.slice(1)).split('/');
  return {section, beat};
}

function load(src: string) {
  incoming?.remove();
  const frame = document.createElement('iframe');
  frame.className = 'section is-loading';
  frame.title = 'Section';
  // Set before it joins the page, so the load isn't a history entry.
  frame.src = src;
  frames.append(frame);
  incoming = frame;
}

// The incoming section is ready: fade it in, then drop the old one.
function reveal(frame: HTMLIFrameElement) {
  if (frame !== incoming) return;
  const old = shown;
  shown = frame;
  incoming = null;
  if (old) old.className = 'leaving';
  frame.classList.remove('is-loading');
  const done = () => old?.remove();
  if (!old || matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else frame.addEventListener('transitionend', done, {once: true});
  // Keys go to the section on screen; give it focus if the old one had it.
  if (old && document.activeElement === old) frame.focus();
}

function show(hash: string, behavior: ScrollBehavior) {
  const {section, beat} = parse(hash);
  const index = Math.max(
    0,
    links.findIndex(link => link.hash === `#${section}`),
  );
  const current = links[index];

  links.forEach((link, i) => {
    link.classList.toggle('is-past', i < index);
    if (i === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  current.scrollIntoView({behavior, block: 'nearest', inline: 'center'});

  const page = `sections/${current.hash.slice(1)}.html`;
  load(beat ? `${page}#${encodeURIComponent(beat)}` : page);
  document.title = `${current.textContent} · ${title}`;
}

function step(by: number) {
  const index = links.findIndex(link => link.hasAttribute('aria-current'));
  const next = links[index + by];
  if (next) location.hash = next.hash;
}

window.addEventListener('hashchange', () => show(location.hash, 'smooth'));

// The section steps through its own beats first, so arrow keys go to it.
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    shown?.contentWindow?.postMessage({key: event.key}, location.origin);
  }
});

window.addEventListener('message', event => {
  const from = [incoming, shown].find(frame => frame && event.source === frame.contentWindow);
  if (!from) return;
  if (event.data?.ready) reveal(from);
  if (from !== shown) return;
  // A section sends a step when it runs out of beats in that direction.
  if (event.data?.step) step(event.data.step);
  // Or asks to start over, to play its first beat again.
  if (event.data?.restart) load(from.src.replace(/#.*$/, ''));
  // And the beat it is paused at, which goes in the hash without a history
  // entry per beat.
  if (typeof event.data?.beat === 'string') {
    const current = links.find(link => link.hasAttribute('aria-current'));
    if (current) history.replaceState(null, '', `${current.hash}/${encodeURIComponent(event.data.beat)}`);
  }
});

show(location.hash, 'instant');
