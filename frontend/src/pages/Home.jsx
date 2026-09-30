import { Link } from "react-router-dom";
import { IconCotizaciones, IconCalendario, IconClientes, IconSalones } from "./icons";
import "../styles/home.css";

const QUICK_ACCESS = [
  {
    to: "/cotizaciones",
    accent: true,
    title: "Solicitar cotización",
    desc: "Genera una cotización para un evento a partir de fecha, salón y servicios requeridos.",
    icon: <IconCotizaciones />,
  },
  {
    to: "/calendario",
    title: "Calendario de disponibilidad",
    desc: "Consulta la ocupación de los salones y confirma fechas libres antes de reservar.",
    icon: <IconCalendario />,
  },
  {
    to: "/clientes",
    title: "Directorio de clientes",
    desc: "Busca y administra clientes personas naturales y empresas registradas.",
    icon: <IconClientes />,
  },
  {
    to: "/salones",
    title: "Catálogo de salones y servicios",
    desc: "Explora capacidad, montaje y servicios disponibles por salón.",
    icon: <IconSalones />,
  },
];

export default function Home() {
  return (
    <>
      <div className="welcome">
        <h2 className="welcome__title">Bienvenido al Sistema de Gestión de Eventos y Salones</h2>
        <p className="welcome__copy">
          Desde aquí puedes generar cotizaciones, revisar la disponibilidad de
          los salones y dar seguimiento a tus clientes y eventos en Cartagena.
        </p>
      </div>

      <div className="quick-access-grid">
        {QUICK_ACCESS.map((item) => (
          <Link key={item.to} to={item.to} className={`qa-card${item.accent ? " qa-card--accent" : ""}`}>
            <div>
              <div className="qa-card__icon">{item.icon}</div>
              <h3 className="qa-card__title">{item.title}</h3>
              <p className="qa-card__desc">{item.desc}</p>
            </div>
            <span className="qa-card__cta">Ir a la sección</span>
          </Link>
        ))}
      </div>
    </>
  );
}
