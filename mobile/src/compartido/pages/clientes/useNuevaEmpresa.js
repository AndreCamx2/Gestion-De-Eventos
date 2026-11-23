import { useEffect, useState } from "react";
import { crearEmpresa } from "../../api/clientes";
import { listarCiudades } from "../../api/sitios";
import { EMPRESA_VACIA, erroresEmpresa, mensajeErrorEmpresa, payloadEmpresa, validarEmpresa } from "./nuevaEmpresa";

export function useNuevaEmpresa({ onCreada, onSesionVencida }) {
  const [form, setForm] = useState(EMPRESA_VACIA);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [ciudades, setCiudades] = useState([]);
  const [sinCiudades, setSinCiudades] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarCiudades()
      .then((lista) => vigente && setCiudades([...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))))
      .catch(() => vigente && setSinCiudades(true));
    return () => {
      vigente = false;
    };
  }, []);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    const locales = validarEmpresa(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const creada = await crearEmpresa(payloadEmpresa(form));
      setGuardando(false);
      onCreada(creada);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresEmpresa(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else {
        setError(mensajeErrorEmpresa(err.status));
      }
    }
  }

  return { form, errores, error, guardando, ciudades, sinCiudades, cambiar, guardar };
}
