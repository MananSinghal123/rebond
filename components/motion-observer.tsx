'use client';

import { useEffect } from 'react';

const SELECTOR = '[data-reveal]';
/** Gap between elements that enter the viewport together, and how many of them get a gap. */
const STEP_MS = 80;
const MAX_STEPS = 5;
/** Gap between children of a data-reveal="stagger" container. */
const CHILD_STEP_MS = 55;
const MAX_CHILD_STEPS = 8;

/**
 * Plays scroll-triggered reveals for every element marked data-reveal, on every route.
 * Elements that arrive in the same frame are revealed top-to-bottom, left-to-right, a beat apart.
 * Does nothing unless the head script added `motion` to <html> (it skips reduced-motion viewers).
 */
export function MotionObserver() {
  useEffect(() => {
    if (!document.documentElement.classList.contains('motion')) return;

    let batch: HTMLElement[] = [];
    let frame = 0;

    const flush = () => {
      frame = 0;
      const ordered = batch
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .sort((a, b) => Math.round(a.box.top / 8) - Math.round(b.box.top / 8) || a.box.left - b.box.left);
      batch = [];
      ordered.forEach(({ element }, index) => {
        const delay = Math.min(index, MAX_STEPS) * STEP_MS;
        element.style.setProperty('--reveal-delay', `${delay}ms`);
        if (element.dataset.reveal === 'stagger') {
          Array.from(element.children).forEach((child, childIndex) => {
            (child as HTMLElement).style.setProperty(
              '--reveal-delay',
              `${delay + 60 + Math.min(childIndex, MAX_CHILD_STEPS) * CHILD_STEP_MS}ms`,
            );
          });
        }
        element.dataset.in = '';
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          batch.push(entry.target as HTMLElement);
        }
        if (batch.length > 0 && frame === 0) frame = requestAnimationFrame(flush);
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    const watch = (element: Element) => {
      if (!(element as HTMLElement).dataset.in) observer.observe(element);
    };
    const scan = (root: Element | Document) => {
      if (root instanceof Element && root.matches(SELECTOR)) watch(root);
      root.querySelectorAll(SELECTOR).forEach(watch);
    };

    scan(document);
    // Client-side navigations and streamed content mount new elements; pick them up too.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
