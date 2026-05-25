// src/components/InfiniteScrollSentinel.jsx
//
// A tiny invisible div that calls `onIntersect` whenever it scrolls into view.
// Pair it with @tanstack/react-query's `useInfiniteQuery`:
//
//   <InfiniteScrollSentinel
//     onIntersect={() => fetchNextPage()}
//     enabled={hasNextPage && !isFetchingNextPage}
//   />
//
// Place it right after the last row of a list/table.

import React from "react";

export default function InfiniteScrollSentinel({
  onIntersect,
  enabled = true,
  rootMargin = "200px",
  // Optional: scrollable ancestor element. If null, uses viewport.
  root = null,
  children = null,
}) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onIntersect?.();
            break;
          }
        }
      },
      { root, rootMargin, threshold: 0 }
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [enabled, onIntersect, root, rootMargin]);

  return (
    <div ref={ref} aria-hidden="true" style={{ width: "100%", minHeight: 1 }}>
      {children}
    </div>
  );
}
