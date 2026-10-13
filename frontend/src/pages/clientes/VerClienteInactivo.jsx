import { Boton } from "../../components/ui";

// El 400 de identificación repetida con un cliente inactivo dice "…está inactivo
// (id 12). Puedes reactivarlo…". El API no manda el id en un campo aparte, así
// que se saca del texto. null si el mensaje no es ese.
export function idClienteInactivo(error) {
  const encontrado = /inactivo \(id (\d+)\)/.exec(String(error ?? ""));
  return encontrado ? Number(encontrado[1]) : null;
}

// Botón debajo del campo Identificación que lleva a ese cliente inactivo, para
// reactivarlo en lugar de crear uno repetido (SGDE-95).
export default function VerClienteInactivo({ error, onVer }) {
  const id = idClienteInactivo(error);
  if (id === null || !onVer) return null;
  return (
    <Boton variante="secundario" className="directorio-form__ver-inactivo" onClick={() => onVer(id)}>
      Ver el cliente inactivo
    </Boton>
  );
}
