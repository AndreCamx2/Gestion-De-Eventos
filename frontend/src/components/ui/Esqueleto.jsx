import "./Esqueleto.css";

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
