// ============================================================
// Tests del componente StatusBar
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBar from './components/StatusBar';

describe('StatusBar', () => {
  test('no renderiza nada cuando está apagado', () => {
    const { container } = render(
      <StatusBar isOn={false} connected={false} backendIp={null} error={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  test('muestra "Conectado a API" cuando hay conexión', () => {
    render(<StatusBar isOn={true} connected={true} backendIp={null} error={null} />);
    expect(screen.getByText(/Conectado a API/)).toBeInTheDocument();
  });

  test('muestra "Sin conexión" cuando no hay conexión', () => {
    render(<StatusBar isOn={true} connected={false} backendIp={null} error={null} />);
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });

  test('muestra el mensaje de error', () => {
    render(
      <StatusBar
        isOn={true}
        connected={false}
        backendIp={null}
        error="No se pudo conectar"
      />
    );
    expect(screen.getByText('No se pudo conectar')).toBeInTheDocument();
  });

  test('no muestra error si error es null', () => {
    render(<StatusBar isOn={true} connected={true} backendIp={null} error={null} />);
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('muestra la IP de la instancia', () => {
    render(
      <StatusBar
        isOn={true}
        connected={true}
        backendIp="10.0.1.25"
        error={null}
      />
    );
    expect(screen.getByText('Instancia: 10.0.1.25')).toBeInTheDocument();
  });
});
