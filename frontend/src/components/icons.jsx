const Icon = ({ children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const IconDashboard = (props) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Icon>
);

export const IconOrders = (props) => (
  <Icon {...props}>
    <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z" />
    <path d="M9 8h6M9 12h6" />
  </Icon>
);

export const IconCustomers = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19.5a5.5 5.5 0 0 0-2-4.2" />
  </Icon>
);

export const IconPayments = (props) => (
  <Icon {...props}>
    <rect x="3" y="6" width="18" height="12" rx="2.2" />
    <path d="M3 10h18M6.5 14.5h3" />
  </Icon>
);

export const IconSettings = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.8l1.9 1.1M17.2 15.1l1.9 1.1M4.9 16.2l1.9-1.1M17.2 8.9l1.9-1.1" />
  </Icon>
);

export const IconServices = (props) => (
  <Icon {...props}>
    <path d="M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
    <path d="M8.5 9 10 4m5.5 5L14 4" />
  </Icon>
);

export const IconStaff = (props) => (
  <Icon {...props}>
    <circle cx="9.5" cy="8.5" r="3" />
    <path d="M4 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M18 8v5M15.5 10.5h5" />
  </Icon>
);

export const IconReports = (props) => (
  <Icon {...props}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </Icon>
);

export const IconShield = (props) => (
  <Icon {...props}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const IconTrack = (props) => (
  <Icon {...props}>
    <path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Icon>
);

export const IconBook = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v8M8 12h8" />
  </Icon>
);

export const IconLogout = (props) => (
  <Icon {...props}>
    <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
    <path d="M17 8.5 20.5 12 17 15.5M20.5 12H10" />
  </Icon>
);

export const IconEye = (props) => (
  <Icon {...props}>
    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);

export const IconEyeOff = (props) => (
  <Icon {...props}>
    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M4.5 4.5 19.5 19.5" />
  </Icon>
);
