import './shell.css';

// The nav's links are the list of sections: `#roles` shows sections/roles.html.
// The hash can also name a beat: `#roles/handoff`.
const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav a')];
const frame = document.querySelector<HTMLIFrameElement>('.section')!;
const title = document.title;

function parse(hash: string) {
  const [section = '', beat = ''] = decodeURIComponent(hash.slice(1)).split('/');
  return {section, beat};
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

  // replace() keeps section loads out of history; the hash change is the entry.
  const page = `sections/${current.hash.slice(1)}.html`;
  frame.contentWindow!.location.replace(beat ? `${page}#${encodeURIComponent(beat)}` : page);
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
    frame.contentWindow!.postMessage({key: event.key}, location.origin);
  }
});

window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow) return;
  // A section sends a step when it runs out of beats in that direction.
  if (event.data?.step) step(event.data.step);
  // And the beat it is paused at, which goes in the hash without a history
  // entry per beat.
  if (typeof event.data?.beat === 'string') {
    const current = links.find(link => link.hasAttribute('aria-current'));
    if (current) history.replaceState(null, '', `${current.hash}/${encodeURIComponent(event.data.beat)}`);
  }
});

show(location.hash, 'instant');
