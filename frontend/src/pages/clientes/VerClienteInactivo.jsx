import { Boton } from "../../components/ui";

function idClienteInactivo(error, id) {
  if (!error) return null;
  if (Number.isInteger(id)) return id;
  const encontrado = /inactivo \(id (\d+)\)/.exec(String(error));
  return encontrado ? Number(encontrado[1]) : null;
}

export default function VerClienteInactivo({ error, id: idApi, onVer }) {
  const id = idClienteInactivo(error, idApi);
  if (id === null || !onVer) return null;
  return (
    <Boton variante="secundario" className="directorio-form__ver-inactivo" onClick={() => onVer(id)}>
      Ver el cliente inactivo
    </Boton>
  );
}
