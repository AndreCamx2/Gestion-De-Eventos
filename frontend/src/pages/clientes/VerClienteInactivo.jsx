import { Boton } from "../../components/ui";

// Id del cliente inactivo del 400 de identificación repetida. El API lo manda en
// el campo "cliente_inactivo" (SGDE-107). Si no viene, se saca del texto
// "…está inactivo (id 12)…", como antes. null si el error no es ese.
function idClienteInactivo(error, id) {
  if (!error) return null;
  if (Number.isInteger(id)) return id;
  const encontrado = /inactivo \(id (\d+)\)/.exec(String(error));
  return encontrado ? Number(encontrado[1]) : null;
}

// Botón debajo del campo Identificación que lleva a ese cliente inactivo, para
// reactivarlo en lugar de crear uno repetido (SGDE-95).
// - error: el texto del error de Identificación (sin error, no se muestra).
// - id: el campo cliente_inactivo del 400.
export default function VerClienteInactivo({ error, id: idApi, onVer }) {
  const id = idClienteInactivo(error, idApi);
  if (id === null || !onVer) return null;
  return (
    <Boton variante="secundario" className="directorio-form__ver-inactivo" onClick={() => onVer(id)}>
      Ver el cliente inactivo
    </Boton>
  );
}
