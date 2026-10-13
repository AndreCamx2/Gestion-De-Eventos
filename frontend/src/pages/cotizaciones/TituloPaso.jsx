export default function TituloPaso({ numero, id, children }) {
  return (
    <div className="nc-paso__cabecera">
      <span className="nc-paso__numero" aria-hidden="true">{numero}</span>
      <h2 id={id} className="nc-paso__titulo">{children}</h2>
    </div>
  );
}
