import { ArduinoStatus, PlayerAction, PlayerId } from './types';

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
}

/**
 * Parses a newline-delimited token coming from an Arduino over USB Serial.
 * Supports both:
 *   - Dedicated per-player Arduino ports: "LEFT", "RIGHT", "JUMP", "SELECT" (or L/R/J/S)
 *   - Shared single Arduino hub for both players: "P1:LEFT", "P2:JUMP", "1:RIGHT", "2:SELECT"
 */
export function parseArduinoLine(
  rawLine: string,
  defaultPlayer: PlayerId,
): { playerId: PlayerId; action: PlayerAction } | null {
  const cleaned = rawLine.trim().toUpperCase();
  if (!cleaned) return null;

  let playerId: PlayerId = defaultPlayer;
  let token = cleaned;

  const prefixMatch = cleaned.match(/^(?:P?([12]))[:_\s-]+(.+)$/);
  if (prefixMatch) {
    playerId = prefixMatch[1] === '2' ? 1 : 0;
    token = prefixMatch[2].trim();
  }

  if (token === 'LEFT' || token === 'L') return { playerId, action: 'left' };
  if (token === 'RIGHT' || token === 'R') return { playerId, action: 'right' };
  if (token === 'JUMP' || token === 'J' || token === 'UP' || token === 'U') {
    return { playerId, action: 'jump' };
  }
  if (
    token === 'SELECT' ||
    token === 'SEL' ||
    token === 'S' ||
    token === 'OK' ||
    token === 'CONFIRM' ||
    token === 'BTN'
  ) {
    return { playerId, action: 'select' };
  }
  return null;
}

export class ArduinoControllerManager {
  private ports: [SerialPortLike | null, SerialPortLike | null] = [null, null];
  private readers: [ReadableStreamDefaultReader<Uint8Array> | null, ReadableStreamDefaultReader<Uint8Array> | null] = [
    null,
    null,
  ];
  private status: ArduinoStatus;
  private onAction: (playerId: PlayerId, action: PlayerAction) => void;
  private onStatusChange: (status: ArduinoStatus) => void;
  private prevGamepadState: Map<number, { left: boolean; right: boolean; jump: boolean; select: boolean }> =
    new Map();

  constructor(
    onAction: (playerId: PlayerId, action: PlayerAction) => void,
    onStatusChange: (status: ArduinoStatus) => void,
  ) {
    this.onAction = onAction;
    this.onStatusChange = onStatusChange;
    const supported =
      typeof navigator !== 'undefined' &&
      Boolean((navigator as NavigatorWithSerial).serial);
    this.status = {
      supported,
      p1Connected: false,
      p2Connected: false,
      p1Label: 'Not connected',
      p2Label: 'Not connected',
      gamepadCount: 0,
      lastEvent: 'Keyboard backup ready',
    };
  }

  public getStatus(): ArduinoStatus {
    return { ...this.status };
  }

  private notify(): void {
    this.onStatusChange({ ...this.status });
  }

  public async connectPort(playerId: PlayerId, baudRate = 9600): Promise<boolean> {
    const nav = navigator as NavigatorWithSerial;
    if (!nav.serial) {
      this.status.lastEvent = 'Web Serial requires Chrome/Edge over HTTPS or localhost';
      this.notify();
      return false;
    }

    try {
      await this.disconnectPort(playerId);
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });
      this.ports[playerId] = port;

      const info = port.getInfo?.();
      const label = info?.usbVendorId
        ? `USB 0x${info.usbVendorId.toString(16).toUpperCase()} (${baudRate} baud)`
        : `Serial Port (${baudRate} baud)`;

      if (playerId === 0) {
        this.status.p1Connected = true;
        this.status.p1Label = label;
      } else {
        this.status.p2Connected = true;
        this.status.p2Label = label;
      }
      this.status.lastEvent = `P${playerId + 1} Arduino connected`;
      this.notify();

      this.readLoop(playerId, port);
      return true;
    } catch {
      this.status.lastEvent = `P${playerId + 1} serial connection cancelled`;
      this.notify();
      return false;
    }
  }

  private async readLoop(playerId: PlayerId, port: SerialPortLike): Promise<void> {
    if (!port.readable) return;
    const decoder = new TextDecoder();
    const reader = port.readable.getReader();
    this.readers[playerId] = reader;
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const parsed = parseArduinoLine(line, playerId);
            if (parsed) {
              this.status.lastEvent = `P${parsed.playerId + 1} → ${parsed.action.toUpperCase()}`;
              this.notify();
              this.onAction(parsed.playerId, parsed.action);
            }
          }
        }
      }
    } catch {
      // Port disconnected
    } finally {
      reader.releaseLock();
      this.readers[playerId] = null;
      if (this.ports[playerId] === port) {
        this.ports[playerId] = null;
        if (playerId === 0) {
          this.status.p1Connected = false;
          this.status.p1Label = 'Disconnected';
        } else {
          this.status.p2Connected = false;
          this.status.p2Label = 'Disconnected';
        }
        this.notify();
      }
    }
  }

  public async disconnectPort(playerId: PlayerId): Promise<void> {
    const reader = this.readers[playerId];
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      this.readers[playerId] = null;
    }
    const port = this.ports[playerId];
    if (port) {
      try {
        await port.close();
      } catch {
        // ignore
      }
      this.ports[playerId] = null;
    }
    if (playerId === 0) {
      this.status.p1Connected = false;
      this.status.p1Label = 'Not connected';
    } else {
      this.status.p2Connected = false;
      this.status.p2Label = 'Not connected';
    }
    this.notify();
  }

  /** Poll HID Gamepads (supports Arduino Leonardo / Pro Micro joystick boards) */
  public pollGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let connectedCount = 0;

    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.connected) continue;
      connectedCount += 1;
      if (i > 1) continue;

      const playerId: PlayerId = i === 0 ? 0 : 1;
      const axisX = pad.axes[0] ?? 0;
      const left = axisX < -0.5 || Boolean(pad.buttons[14]?.pressed);
      const right = axisX > 0.5 || Boolean(pad.buttons[15]?.pressed);
      const jump = Boolean(pad.buttons[0]?.pressed) || Boolean(pad.buttons[12]?.pressed);
      const select = Boolean(pad.buttons[1]?.pressed) || Boolean(pad.buttons[2]?.pressed);

      const prev = this.prevGamepadState.get(i) ?? {
        left: false,
        right: false,
        jump: false,
        select: false,
      };

      if (left && !prev.left) this.onAction(playerId, 'left');
      if (right && !prev.right) this.onAction(playerId, 'right');
      if (jump && !prev.jump) this.onAction(playerId, 'jump');
      if (select && !prev.select) this.onAction(playerId, 'select');

      this.prevGamepadState.set(i, { left, right, jump, select });
    }

    if (connectedCount !== this.status.gamepadCount) {
      this.status.gamepadCount = connectedCount;
      this.notify();
    }
  }

  public dispose(): void {
    void this.disconnectPort(0);
    void this.disconnectPort(1);
  }
}

export const ARDUINO_SKETCH_SNIPPET = `// Sunstone Sprint — Arduino Controller Sketch (9600 baud)
// Wire 4 momentary pushbuttons to GND with INPUT_PULLUP
const int BTN_LEFT = 2, BTN_RIGHT = 3, BTN_JUMP = 4, BTN_SELECT = 5;
bool prev[4] = {1, 1, 1, 1};
const char* cmd[4] = {"LEFT", "RIGHT", "JUMP", "SELECT"};
const int pins[4] = {BTN_LEFT, BTN_RIGHT, BTN_JUMP, BTN_SELECT};

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 4; i++) pinMode(pins[i], INPUT_PULLUP);
}
void loop() {
  for (int i = 0; i < 4; i++) {
    bool cur = digitalRead(pins[i]);
    if (prev[i] == HIGH && cur == LOW) Serial.println(cmd[i]);
    prev[i] = cur;
  }
  delay(15);
}`;
