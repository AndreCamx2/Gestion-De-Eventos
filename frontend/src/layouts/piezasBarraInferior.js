import { rolesDeRuta } from "../routes/rutasPorRol";
import { IconoAgenda, IconoCotizar, IconoInicio } from "./IconosBarraInferior";

const FIJAS = [
  { to: "/inicio", label: "Inicio", Icono: IconoInicio },
  { to: "/cotizaciones", label: "Cotizar", Icono: IconoCotizar },
  { to: "/calendario", label: "Agenda", Icono: IconoAgenda },
];

export const RUTA_NUEVA = "/cotizaciones/nueva";

export function piezasBarraInferior(itemsVisibles, rol) {
  const rutasVisibles = new Set(itemsVisibles.map((item) => item.to));
  const fijas = FIJAS.filter((pieza) => rutasVisibles.has(pieza.to));
  const rutasFijas = new Set(FIJAS.map((pieza) => pieza.to));
  const enMas = itemsVisibles.filter((item) => !rutasFijas.has(item.to));
  const nueva = rolesDeRuta(RUTA_NUEVA).includes(rol);
  // Con un solo destino (hoy, el cliente: solo Inicio) la barra no aporta nada:
  // se quedan las pestañas de arriba.
  const hayBarra = fijas.length + enMas.length > 1;
  return { fijas, enMas, nueva, hayBarra };
}
