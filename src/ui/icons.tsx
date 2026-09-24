// Small inline stroke icons, so the app needs no icon font offline.
const paths: Record<string, string> = {
  play: "M8 5.5v13l10-6.5z",
  stop: "M7 7h10v10H7z",
  wave: "M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4",
  speaker: "M4 9.5h3.5L12 5v14l-4.5-4.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  check: "M5 12.5l4.5 4.5L19 7.5",
  redo: "M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  done: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.9L4.4 9.4l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2L10.7 3h4l.3 2.5a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.9z",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  headphones: "M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v6H4zM17 15h3v6h-3z",
  shuffle: "M4 7h3.5c5 0 5 10 10 10H20M4 17h3.5c1.8 0 3-1.2 4-2.8M20 7h-2.5c-1.8 0-3 1.2-4 2.8M18 5l2 2-2 2M18 15l2 2-2 2",
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} fill={name === "play" || name === "stop" ? "currentColor" : "none"} />
    </svg>
  );
}
