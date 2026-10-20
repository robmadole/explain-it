import {Presenter, Project} from '@motion-canvas/core';

// Plays `project` on a canvas inside `host`, stopping at each beat until told
// to go on. Starts paused at the end of `slide` when one is given.
export function present(host: HTMLElement, project: Project, slide: string | null = null) {
  const presenter = new Presenter(project);
  host.append(presenter.stage.finalBuffer);
  void presenter.present({
    ...project.meta.getFullRenderingSettings(),
    name: project.name,
    // Presenter's own start slide seeks while presenting, where the first
    // beat waits forever for a resume; requestSlide() seeks while playing.
    slide: null,
  });
  if (slide) presenter.requestSlide(slide);
  return presenter;
}
