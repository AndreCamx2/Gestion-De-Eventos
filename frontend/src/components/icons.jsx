// Íconos compartidos entre el sidebar (DashboardLayout) y las tarjetas
// de acceso rápido (Home), para no duplicar el mismo SVG en dos archivos.

export function IconInicio() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 11.5 12 5l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCotizaciones() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 4h9l3 3v13H6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 10h6M9 13h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="5.5" width="16" height="15" rx="1" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" strokeLinecap="round" />
    </svg>
  );
}

export function IconClientes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
      <path d="M15.5 8.2a3 3 0 1 1 2 5.5M18.3 14.3c1.7.7 2.7 2.2 3.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSalones() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3.5" width="10" height="17" rx="0.5" />
      <path
        d="M15 9h4v11.5h-4M8 7.5h.01M12 7.5h.01M8 11h.01M12 11h.01M8 14.5h.01M12 14.5h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}
