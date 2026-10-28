// Constantes y auxiliares que comparten las piezas del Inicio (SGDE-103).
// Las fórmulas de las cifras están en utils/inicioCifras.js.
import { rolesDeRuta } from "../../routes/rutasPorRol";
import { numero } from "../../utils/inicioCifras";
import { estaAgotado } from "../proveedores/proveedores";

// Ventana de la agenda y de la ocupación: hoy y los 29 días siguientes.
export const DIAS_VENTANA = 30;
// Eventos que se listan en la agenda; el resto se resume en "y N más".
export const MAX_AGENDA = 6;

export function plural(cantidad, singular, varios) {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;
}

export function puedeEntrar(ruta, rol) {
  return rolesDeRuta(ruta).includes(rol);
}

export function resumenInventario(elementos) {
  const ultima = elementos.reduce(
    (masReciente, e) => (!masReciente || new Date(e.actualizado_en) > new Date(masReciente) ? e.actualizado_en : masReciente),
    null,
  );
  return { total: elementos.length, agotados: elementos.filter(estaAgotado).length, ultima };
}
