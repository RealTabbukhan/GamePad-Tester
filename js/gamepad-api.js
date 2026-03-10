/**
 * GPad Tester — Core Gamepad API Wrapper
 * Provides a clean interface for detecting, polling, and reading gamepad state.
 * Shared across all tool pages.
 */

class GamepadManager {
  constructor() {
    this.gamepads = {};
    this.activeGamepadIndex = null;
    this.listeners = {};
    this.polling = false;
    this.pollRAF = null;
    this.controllerType = 'xbox'; // 'playstation', 'xbox', 'nintendo', 'generic'
    // Polling Rate Detection
    this._pollTimestamps = [];
    this._lastPollTime = 0;
    this._pollingRateHz = 0;
    this._buttonDetectTimes = {}; // Records when _poll first sees a button pressed
    this._onConnect = this._onConnect.bind(this);
    this._onDisconnect = this._onDisconnect.bind(this);
    this._poll = this._poll.bind(this);
    this.init();
  }

  init() {
    window.addEventListener("gamepadconnected", this._onConnect);
    window.addEventListener("gamepaddisconnected", this._onDisconnect);
    // Start polling immediately
    this.startPolling();
  }

  _onConnect(e) {
    const gp = e.gamepad;
    this.gamepads[gp.index] = {
      index: gp.index,
      id: gp.id,
      mapping: gp.mapping,
      buttons: [],
      axes: [],
      timestamp: gp.timestamp,
      connected: true,
      vibrationActuator: gp.vibrationActuator || null,
      hapticActuators: gp.hapticActuators || [],
    };
    if (this.activeGamepadIndex === null) {
      this.activeGamepadIndex = gp.index;
    }
    this.controllerType = this._detectControllerType(gp.id);
    this.emit("connected", this.gamepads[gp.index]);
    this.emit("change");
  }

  _onDisconnect(e) {
    const idx = e.gamepad.index;
    if (this.gamepads[idx]) {
      this.gamepads[idx].connected = false;
    }
    if (this.activeGamepadIndex === idx) {
      // Switch to next available
      const available = this.getConnectedGamepads();
      this.activeGamepadIndex =
        available.length > 0 ? available[0].index : null;
    }
    this.emit("disconnected", { index: idx });
    this.emit("change");
  }

  startPolling() {
    if (this.polling) return;
    this.polling = true;
    this._poll();
  }

  stopPolling() {
    this.polling = false;
    if (this.pollRAF) {
      cancelAnimationFrame(this.pollRAF);
      this.pollRAF = null;
    }
  }

  _poll() {
    if (!this.polling) return;

    // Track polling rate
    const now = performance.now();
    if (this._lastPollTime > 0) {
      this._pollTimestamps.push(now - this._lastPollTime);
      if (this._pollTimestamps.length > 60) this._pollTimestamps.shift();
      if (this._pollTimestamps.length >= 10) {
        const avgDelta = this._pollTimestamps.reduce((s, v) => s + v, 0) / this._pollTimestamps.length;
        this._pollingRateHz = Math.round(1000 / avgDelta);
      }
    }
    this._lastPollTime = now;

    // Get fresh gamepad state (required in Chromium browsers)
    const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (let i = 0; i < rawGamepads.length; i++) {
      const raw = rawGamepads[i];
      if (!raw) continue;

      if (!this.gamepads[raw.index] || !this.gamepads[raw.index].connected) {
        // Auto-detect if gamepadconnected event didn't fire
        this.gamepads[raw.index] = {
          index: raw.index,
          id: raw.id,
          mapping: raw.mapping,
          buttons: [],
          axes: [],
          timestamp: raw.timestamp,
          connected: true,
          vibrationActuator: raw.vibrationActuator || null,
          hapticActuators: raw.hapticActuators || [],
        };
        if (this.activeGamepadIndex === null) {
          this.activeGamepadIndex = raw.index;
        }
        this.emit("connected", this.gamepads[raw.index]);
        this.emit("change");
      }

      const gp = this.gamepads[raw.index];
      const prevButtons = [...gp.buttons];
      const prevAxes = [...gp.axes];

      // Update buttons
      gp.buttons = raw.buttons.map((b, idx) => ({
        index: idx,
        pressed: b.pressed,
        touched: b.touched,
        value: b.value,
      }));

      // Update axes
      gp.axes = Array.from(raw.axes);
      gp.timestamp = raw.timestamp;
      gp.vibrationActuator = raw.vibrationActuator || null;

      // Emit button events
      gp.buttons.forEach((btn, idx) => {
        const prev = prevButtons[idx];
        if (btn.pressed && (!prev || !prev.pressed)) {
          // Record exact time _poll detected this transition
          const detectTime = performance.now();
          this._buttonDetectTimes[`${raw.index}_${idx}`] = detectTime;
          this.emit("buttondown", {
            gamepadIndex: raw.index,
            buttonIndex: idx,
            button: btn,
            detectTime: detectTime,
          });
        }
        if (!btn.pressed && prev && prev.pressed) {
          this.emit("buttonup", {
            gamepadIndex: raw.index,
            buttonIndex: idx,
            button: btn,
          });
        }
      });

      // Emit axis change event
      let axisChanged = false;
      gp.axes.forEach((val, idx) => {
        if (
          prevAxes[idx] !== undefined &&
          Math.abs(val - prevAxes[idx]) > 0.01
        ) {
          axisChanged = true;
        }
      });
      if (axisChanged) {
        this.emit("axismove", { gamepadIndex: raw.index, axes: gp.axes });
      }
    }

    // Emit poll event for tools that need per-frame data
    this.emit("poll", this.gamepads);

    this.pollRAF = requestAnimationFrame(this._poll);
  }

  /** Get the currently active gamepad data */
  getActiveGamepad() {
    if (this.activeGamepadIndex === null) return null;
    return this.gamepads[this.activeGamepadIndex] || null;
  }

  /** Get raw browser gamepad object for the active index */
  getActiveRawGamepad() {
    if (this.activeGamepadIndex === null) return null;
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    return raw[this.activeGamepadIndex] || null;
  }

  /** Get all connected gamepads */
  getConnectedGamepads() {
    return Object.values(this.gamepads).filter((g) => g.connected);
  }

  /** Set the active gamepad by index */
  setActiveGamepad(index) {
    if (this.gamepads[index] && this.gamepads[index].connected) {
      this.activeGamepadIndex = index;
      this.emit("change");
    }
  }

  /** Detect controller type from gamepad.id string */
  _detectControllerType(id) {
    if (!id) return 'generic';
    const lower = id.toLowerCase();
    // PlayStation detection
    if (lower.includes('dualsense') || lower.includes('ps5') || lower.includes('054c:0ce6')) return 'playstation';
    if (lower.includes('dualshock') || lower.includes('ps4') || lower.includes('054c:09cc') || lower.includes('054c:05c4')) return 'playstation';
    if (lower.includes('ps3') || lower.includes('playstation') || lower.includes('054c:0268') || lower.includes('sony')) return 'playstation';
    // Nintendo detection
    if (lower.includes('pro controller') || lower.includes('joy-con') || lower.includes('nintendo') || lower.includes('057e:')) return 'nintendo';
    // Xbox detection
    if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('045e:') || lower.includes('microsoft')) return 'xbox';
    // Standard mapping usually means Xbox-style layout
    if (lower.includes('standard')) return 'xbox';
    return 'generic';
  }

  /** Get the detected controller type */
  getControllerType() {
    return this.controllerType;
  }

  /** Get the measured polling rate in Hz */
  getPollingRate() {
    return this._pollingRateHz;
  }

  /** Get the timestamp when _poll first detected a button press (for latency delta) */
  getLastPollDetectTime(gamepadIndex, buttonIndex) {
    return this._buttonDetectTimes[`${gamepadIndex}_${buttonIndex}`] || 0;
  }

  /** Button label maps per controller type */
  _buttonLabels() {
    return {
      playstation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', '↑', '↓', '←', '→', 'PS', 'TP'],
      xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', '↑', '↓', '←', '→', 'Home', 'Share'],
      nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS', '↑', '↓', '←', '→', 'Home', 'Cap'],
      generic: ['B0', 'B1', 'B2', 'B3', 'L1', 'R1', 'L2', 'R2', 'Sel', 'Start', 'LS', 'RS', '↑', '↓', '←', '→', 'Home', 'Aux']
    };
  }

  /** Button name maps per controller type */
  _buttonNames() {
    return {
      playstation: ['Cross (✕)', 'Circle (○)', 'Square (□)', 'Triangle (△)', 'L1 Bumper', 'R1 Bumper', 'L2 Trigger', 'R2 Trigger', 'Share', 'Options', 'L3 Stick Click', 'R3 Stick Click', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'PS Button', 'Touchpad'],
      xbox: ['A Button', 'B Button', 'X Button', 'Y Button', 'LB Bumper', 'RB Bumper', 'LT Trigger', 'RT Trigger', 'Back / View', 'Start / Menu', 'Left Stick Click', 'Right Stick Click', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'Xbox / Guide', 'Share'],
      nintendo: ['B Button', 'A Button', 'Y Button', 'X Button', 'L Bumper', 'R Bumper', 'ZL Trigger', 'ZR Trigger', 'Minus (−)', 'Plus (+)', 'Left Stick Click', 'Right Stick Click', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'Home', 'Capture'],
      generic: ['Button 0', 'Button 1', 'Button 2', 'Button 3', 'L1 / LB', 'R1 / RB', 'L2 / LT', 'R2 / RT', 'Select / Back', 'Start / Menu', 'L3 (Stick)', 'R3 (Stick)', 'D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right', 'Home / Guide', 'Aux / Share']
    };
  }

  /** Get button name for standard mapping — dynamically based on detected controller */
  getButtonName(index) {
    const names = this._buttonNames()[this.controllerType] || this._buttonNames().generic;
    return names[index] || `Button ${index}`;
  }

  /** Get short button label — dynamically based on detected controller */
  getButtonLabel(index) {
    const labels = this._buttonLabels()[this.controllerType] || this._buttonLabels().generic;
    return labels[index] || `B${index}`;
  }

  /** Vibrate the active gamepad */
  async vibrate(options = {}) {
    const gp = this.getActiveRawGamepad();
    if (!gp) return false;

    const defaults = {
      startDelay: 0,
      duration: 500,
      weakMagnitude: 0.5,
      strongMagnitude: 0.5,
    };

    const params = { ...defaults, ...options };

    // Try vibrationActuator (Chrome/Edge)
    if (gp.vibrationActuator && gp.vibrationActuator.playEffect) {
      try {
        await gp.vibrationActuator.playEffect("dual-rumble", params);
        return true;
      } catch (e) {
        console.warn("Vibration playEffect failed:", e);
      }
    }

    // Fallback: hapticActuators (Firefox)
    if (gp.hapticActuators && gp.hapticActuators.length > 0) {
      try {
        await gp.hapticActuators[0].pulse(
          params.strongMagnitude,
          params.duration,
        );
        return true;
      } catch (e) {
        console.warn("Haptic pulse failed:", e);
      }
    }

    return false;
  }

  /** Stop vibration */
  async stopVibration() {
    const gp = this.getActiveRawGamepad();
    if (!gp) return;
    if (gp.vibrationActuator && gp.vibrationActuator.reset) {
      try {
        await gp.vibrationActuator.reset();
      } catch (e) {}
    }
  }

  /** Event system */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Event handler error [${event}]:`, e);
      }
    });
  }

  destroy() {
    this.stopPolling();
    window.removeEventListener("gamepadconnected", this._onConnect);
    window.removeEventListener("gamepaddisconnected", this._onDisconnect);
    this.listeners = {};
  }
}

// Singleton instance
const gamepadManager = new GamepadManager();
