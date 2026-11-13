import { AvisoError } from "../../components/ui";

// Siempre "servidor": el de "permiso" trae "Volver al inicio", y ya se está ahí.
export function AvisoBloque({ error, texto, onReintentar, nivel = "h3" }) {
  if (error === "sesion") {
    return (
      <AvisoError
        nivel={nivel}
        titulo="Tu sesión expiró"
        texto="Vuelve a entrar con el aviso de abajo para ver estos datos."
      />
    );
  }
  if (error === "permiso") {
    return (
      <AvisoError
        nivel={nivel}
        titulo="No tienes permiso para ver esto"
        texto="Si crees que es un error, pídele acceso a un administrador."
      />
    );
  }
  return <AvisoError nivel={nivel} texto={texto} onReintentar={onReintentar} />;
}

// Para no repetir el mismo aviso en cada bloque que depende de esa petición.
export function SinDatos({ children }) {
  return <p className="inicio-cifra__sin-datos">{children}</p>;
}
