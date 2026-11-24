import { rolesDeRuta } from "../../routes/rutasPorRol";
import { numero } from "../../utils/inicioCifras";
import { estaAgotado } from "../proveedores/proveedores";

export const DIAS_VENTANA = 30;
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
