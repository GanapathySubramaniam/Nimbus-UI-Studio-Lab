import { useEffect, useRef } from 'react';

/** Browser zoom/pinch and the on-screen keyboard can shrink the visible area
 * without changing the layout viewport. Keep editor chrome in that visible area;
 * these values never enter a project document or its exported canvas geometry.
 */
export function useStudioViewport(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!ready || !element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const measure = () => {
      const values = {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        left: viewport?.offsetLeft ?? 0,
        top: viewport?.offsetTop ?? 0,
      };
      for (const [key, value] of Object.entries(values)) {
        element.style.setProperty(`--studio-viewport-${key}`, `${value}px`);
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
    };
  }, [ready]);
  return ref;
}
