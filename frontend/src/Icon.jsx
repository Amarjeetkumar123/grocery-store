const iconShapes = {
  pin: (
    <>
      <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  building: <path d="M4 21V4h10v17M14 9h6v12M2 21h20M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1" />,
  home: <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-6h4v6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h12v10H2zM14 9h4l3 3.5V16h-7" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V3h9l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5" />,
  upload: <path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  logout: <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconShapes[name]}
    </svg>
  );
}
