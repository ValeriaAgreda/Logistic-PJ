import { useEffect, useRef, useState } from "react";

const AppAlert = () => {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const originalAlertRef = useRef(null);

  useEffect(() => {
    originalAlertRef.current = window.alert;

    window.alert = (value) => {
      setMessage(String(value || "Ocurrio un error inesperado."));
      setVisible(true);
    };

    return () => {
      if (originalAlertRef.current) {
        window.alert = originalAlertRef.current;
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="app-alert-backdrop" role="presentation">
      <div className="app-alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-alert-title">
        <div className="app-alert-header">
          <h5 id="app-alert-title" className="m-0">Aviso del sistema</h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setVisible(false)}
          />
        </div>
        <div className="app-alert-body">{message}</div>
        <div className="app-alert-footer">
          <button type="button" className="btn btn-primary" onClick={() => setVisible(false)}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppAlert;
