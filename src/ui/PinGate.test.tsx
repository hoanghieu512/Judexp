import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PinGate from './PinGate';

describe('PinGate', () => {
  it('lets everything through when no pin is set', () => {
    render(
      <PinGate pin={null}>
        <p>kho</p>
      </PinGate>,
    );
    expect(screen.getByText('kho')).toBeInTheDocument();
  });

  it('asks for the pin and hides the app until it matches', () => {
    render(
      <PinGate pin="1234">
        <p>kho</p>
      </PinGate>,
    );
    expect(screen.queryByText('kho')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '9999' } });
    expect(screen.queryByText('kho')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });
    expect(screen.getByText('kho')).toBeInTheDocument();
  });

  it('says plainly that the pin does not encrypt anything', () => {
    render(
      <PinGate pin="1234">
        <p>kho</p>
      </PinGate>,
    );
    expect(screen.getByText(/không mã hoá/i)).toBeInTheDocument();
  });
});
