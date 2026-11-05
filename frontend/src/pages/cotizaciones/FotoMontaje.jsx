import { useState } from "react";
import { fotosMontaje } from "./nuevaCotizacion";

// Si una foto no carga pasa a la siguiente; sin ninguna, la opción queda solo con
// texto. El alt va vacío porque la opción ya dice el nombre del montaje.
export default function FotoMontaje({ montaje }) {
  const [fallidas, setFallidas] = useState(0);
  const foto = fotosMontaje(montaje)[fallidas];
  if (!foto) return null;
  return (
    <img
      className="nc-montaje__foto"
      src={foto}
      alt=""
      loading="lazy"
      onError={() => setFallidas((n) => n + 1)}
    />
  );
}
