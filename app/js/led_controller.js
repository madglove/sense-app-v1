// app/js/led_controller.js
'use strict';

import { bleCharacteristic, connectBLE } from './ble_manager.js';

const ledStates = { red: false, green: false, blue: false };

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('main-content');

  const btnConnect = document.createElement('button');
  btnConnect.className = 'btn btn-primary mb-2';
  btnConnect.textContent = 'Connect to RGB Peripheral';
  btnConnect.addEventListener('click', async () => {
    await connectBLE();
    enableColorButtons();
  });
  container.appendChild(btnConnect);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'd-flex flex-wrap gap-2';
  container.appendChild(buttonContainer);

  const btnRed = createColorButton('Red', 'danger', 'red');
  const btnGreen = createColorButton('Green', 'success', 'green');
  const btnBlue = createColorButton('Blue', 'primary', 'blue');

  buttonContainer.appendChild(btnRed);
  buttonContainer.appendChild(btnGreen);
  buttonContainer.appendChild(btnBlue);

  function createColorButton(name, colorClass, key) {
    const btn = document.createElement('button');
    btn.className = `btn btn-outline-${colorClass}`;
    btn.textContent = `${name} ON`;
    btn.disabled = true;

    btn.addEventListener('click', async () => {
      if (!bleCharacteristic) return;

      const turningOn = !ledStates[key];
      const command = getCommand(key, turningOn);
      try {
        await bleCharacteristic.writeValue(Uint8Array.of(command));
        ledStates[key] = turningOn;

        btn.textContent = `${name} ${turningOn ? 'OFF' : 'ON'}`;
        btn.className = `btn ${turningOn ? '' : 'btn-outline-'}${colorClass}`;
      } catch (error) {
        console.error('LED write error:', error);
      }
    });

    return btn;
  }

  function getCommand(key, turningOn) {
    switch (key) {
      case 'red': return turningOn ? 1 : 2;
      case 'green': return turningOn ? 3 : 4;
      case 'blue': return turningOn ? 5 : 6;
    }
  }

  function enableColorButtons() {
    buttonContainer.querySelectorAll('button').forEach(btn => btn.disabled = false);
  }
});
