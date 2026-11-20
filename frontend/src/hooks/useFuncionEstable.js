import { useCallback, useLayoutEffect, useRef } from "react";

// Misma referencia en cada render, pero siempre llama a la última versión de `fn`.
// Sirve para que un efecto dependa solo de lo que debe dispararlo.
export function useFuncionEstable(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current(...args), []);
}
