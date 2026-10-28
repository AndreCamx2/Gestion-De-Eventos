import { AvisoError } from "../../components/ui";

// Error de un bloque del Inicio. Usa siempre el aspecto "servidor" de AvisoError:
// el tipo "permiso" trae "Volver al inicio", que no tiene sentido estando aquí.
// Solo los errores del servidor ofrecen "Reintentar".
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

// Línea corta para los bloques que dependen de una petición que ya muestra su
// AvisoError en otra parte (así no se repite el mismo aviso tres veces).
export function SinDatos({ children }) {
  return <p className="inicio-cifra__sin-datos">{children}</p>;
}
