import {Presenter, Project} from '@motion-canvas/core';

export interface PresentOptions {
  // Start paused at the end of this slide.
  slide?: string | null;
  // Render at exactly this scale instead of fitting the screen. Snap mode
  // uses 1, so frames and node bounds are in 1920x1080 pixels everywhere.
  resolutionScale?: number;
}

// Plays `project` on a canvas inside `host`, stopping at each beat until told
// to go on.
export function present(host: HTMLElement, project: Project, {slide = null, resolutionScale}: PresentOptions = {}) {
  const presenter = new Presenter(project);
  host.append(presenter.stage.finalBuffer);
  const settings = project.meta.getFullRenderingSettings();
  void presenter.present({
    ...settings,
    resolutionScale: resolutionScale ?? fitScale(host, settings.size.x),
    name: project.name,
    // Presenter's own start slide seeks while presenting, where the first
    // beat waits forever for a resume; requestSlide() seeks while playing.
    slide: null,
  });
  if (slide) presenter.requestSlide(slide);
  return presenter;
}

// The canvas is drawn at a fixed size and stretched to fill the stage, so on a
// big high-DPI screen a 1x render is upscaled and soft. Render at the stage's
// size in device pixels instead: rounded up to a half step, never below 1x,
// and capped at 3x to keep the GPU cost bounded. Picked once per section load;
// a resize takes effect on reload.
export function fitScale(host: HTMLElement, width: number) {
  const wanted = (host.clientWidth * window.devicePixelRatio) / width;
  return Math.min(3, Math.max(1, Math.ceil(wanted * 2) / 2));
}
