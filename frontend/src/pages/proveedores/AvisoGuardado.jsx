export default function AvisoGuardado({ visible }) {
  return (
    <p className="proveedores-guardado" role="status">
      {visible ? "Guardado" : ""}
    </p>
  );
}
