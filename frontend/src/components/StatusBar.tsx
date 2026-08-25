// ============================================================
// Componente: StatusBar
// ============================================================
// Muestra el estado de conexión con la API y errores.
// ============================================================

import React from 'react';

interface StatusBarProps {
  isOn: boolean;
  connected: boolean;
  backendIp: string | null;
  error: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ isOn, connected, backendIp, error }) => {
  if (!isOn) return null;

  return (
    <>
      <div
        style={{
          textAlign: "right",
          fontSize: "0.7rem",
          marginBottom: "8px",
          color: connected ? "#00ffcc" : "#f87171",
        }}
      >
        {connected ? "● Conectado a API" : "○ Sin conexión"}
      </div>
      {backendIp && (
        <div
          style={{
            color: "#d1d5db",
            fontSize: "0.7rem",
            textAlign: "right",
            marginBottom: "8px",
          }}
        >
          Instancia: {backendIp}
        </div>
      )}
      {error && (
        <div
          style={{
            color: "#f87171",
            fontSize: "0.75rem",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

export default StatusBar;
