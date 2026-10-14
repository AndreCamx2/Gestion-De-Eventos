// Íconos de la barra inferior del teléfono (SGDE-102), tomados de la maqueta Movil.dc.html.
// Usan currentColor: el color sale del CSS (tokens.css), nunca de aquí.
// Son decorativos: el texto visible o el aria-label del enlace dicen qué es cada uno.

function Icono({ children, tamano = 20, grosor = 1.8 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconoInicio() {
  return (
    <Icono>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </Icono>
  );
}

export function IconoCotizar() {
  return (
    <Icono>
      <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />
    </Icono>
  );
}

export function IconoNueva() {
  return (
    <Icono tamano={24} grosor={2.6}>
      <path d="M12 5v14M5 12h14" />
    </Icono>
  );
}

export function IconoAgenda() {
  return (
    <Icono>
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" />
    </Icono>
  );
}

export function IconoMas() {
  return (
    <Icono>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icono>
  );
}
