import "./Esqueleto.css";

// Esqueleto de carga (maqueta CasosLimite, "Cargando"): filas con la forma real
// del contenido en vez de un spinner en el centro.
// - filas: cuántas filas pintar.
// - avatar: círculo de 36 px al inicio de cada fila.
// - columnas: bloques cortos a la derecha (por ejemplo, tipo, estado...). En
//   teléfono se ocultan para que la fila no se aplaste.
// - etiqueta: lo que anuncia el lector de pantalla.
// No trae caja propia: envuélvelo en TablaContenedor o Tarjeta según la pantalla.

// Anchos de las dos líneas de texto, para que las filas no se vean idénticas.
const ANCHOS = [
  ["70%", "45%"],
  ["55%", "35%"],
  ["62%", "40%"],
];

export default function Esqueleto({ filas = 5, avatar = true, columnas = 0, etiqueta = "Cargando…", className = "", ...resto }) {
  return (
    <div
      {...resto}
      role="status"
      aria-busy="true"
      className={["esqueleto", className].filter(Boolean).join(" ")}
    >
      <span className="visually-hidden">{etiqueta}</span>
      {Array.from({ length: filas }, (_, fila) => {
        const [anchoLinea, anchoCorta] = ANCHOS[fila % ANCHOS.length];
        return (
          <div key={fila} className="esqueleto__fila" aria-hidden="true">
            {avatar && <span className="esqueleto__bloque esqueleto__avatar" />}
            <span className="esqueleto__textos">
              <span className="esqueleto__bloque esqueleto__linea" style={{ width: anchoLinea }} />
              <span className="esqueleto__bloque esqueleto__linea esqueleto__linea--corta" style={{ width: anchoCorta }} />
            </span>
            {Array.from({ length: columnas }, (_, columna) => (
              <span key={columna} className="esqueleto__bloque esqueleto__columna" />
            ))}
          </div>
        );
      })}
    </div>
  );
}
