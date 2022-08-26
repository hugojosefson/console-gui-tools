import {
  ButtonPopup,
  ConfirmPopup,
  CustomPopup,
  EventEmitter,
  FileSelectorPopup,
  InputPopup,
  KeyListenerArgs,
  OptionPopup,
  PageBuilder,
} from "../deps.ts";
import { Period, PERIODS } from "./period.ts";
import { Mode, MODES } from "./mode.ts";
import { createGui } from "./gui.ts";
import { createServer, ListeningServer } from "./server.ts";

const PORT = 9090;
const HOST = "127.0.0.1";

let mode: Mode = "random";

const clientManager = new EventEmitter();

const gui = createGui();
gui.on("exit", closeApp);

const {
  server,
  connectedClients,
  lastErr,
  tcpCounter,
}: ListeningServer = createServer(clientManager, PORT, HOST);
server.on("error", gui.error);

let min = 9;
let max = 12;

let values = [0, 0, 0, 0, 0, 0];

async function frame() {
  switch (mode) {
    case "random":
      await updateWithRandomValues();
      break;
    case "linear":
      await updateWithLinearValues();
      break;
    default:
      break;
  }
  await sendValuesAsCsv();
}

let valueEmitter: undefined | number = undefined; //setInterval(frame, period)

type Direction = 0 | 1;
const direction: Direction[] = [1, 0, 1, 1, 0, 0]; // 1 = Up
const step = 0.01;

function updateWithRandomValues() {
  values = values.map(
    () => min + Math.random() * (max - min),
  );
}

function updateWithLinearValues() {
  // Generate linear values using direction and max/min values
  values = values.map((value, index) => {
    if (value >= max) {
      direction[index] = 0;
    } else if (value <= min) {
      direction[index] = 1;
    }
    return direction[index] === 1 ? value + step : value - step;
  });
}

function sendValuesAsCsv() {
  const csv = values.map((v) => v.toFixed(4)).join(",");
  clientManager.emit("send", csv);
  drawGui();
}

export let period: Period = 100;

/**
 * @description Updates the console screen
 */
function updateConsole() {
  const p = new PageBuilder();
  p.addRow({ text: "TCP server simulator app! Welcome...", color: "yellow" });
  p.addRow({ text: `TCP Server listening on ${HOST}:${PORT}`, color: "green" });
  p.addRow({ text: "Connected clients:", color: "green" }, {
    text: ` ${connectedClients}`,
    color: "white",
  });
  p.addRow({
    text: "TCP messages sent:",
    color: "green",
    bg: "bgRed",
    bold: true,
    italic: true,
    underline: true,
  }, { text: ` ${tcpCounter}`, color: "white" });

  // Print if simulator is running or not
  if (typeof valueEmitter === "number") {
    p.addRow({ text: "Simulator is running! ", color: "green" }, {
      text: "press 'space' to stop",
      color: "white",
    });
  } else {
    p.addRow({ text: "Simulator is not running! ", color: "red" }, {
      text: "press 'space' to start",
      color: "white",
    });
  }

  // Print mode:
  p.addRow(
    { text: "Mode: ", color: "cyan" },
    { text: mode, color: "white" },
  );

  // Print message frequency:
  p.addRow(
    { text: "Message period: ", color: "cyan" },
    { text: `${period} ms`, color: "white" },
  );

  // Print Min and Max
  p.addRow(
    { text: "Min: ", color: "cyan" },
    { text: `${min}`, color: "white" },
  );
  p.addRow(
    { text: "Max: ", color: "cyan" },
    { text: `${max}`, color: "white" },
  );

  // Print current values:
  p.addRow(
    { text: "Values: ", color: "cyan" },
    {
      text: " " + values.map((v) => v.toFixed(4)).join("   "),
      color: "white",
    },
  );

  // Spacer
  p.addSpacer();

  if (lastErr.length > 0) {
    p.addRow({ text: lastErr, color: "red" });
    p.addSpacer(2);
  }

  p.addRow({ text: "Commands:", color: "white", bg: "black" });
  p.addRow(
    { text: "  'space'", color: "gray", bold: true },
    { text: "   - Start/stop simulator", color: "white", italic: true },
  );
  p.addRow(
    { text: "  'm'", color: "gray", bold: true },
    { text: "       - Select simulation mode", color: "white", italic: true },
  );
  p.addRow(
    { text: "  's'", color: "gray", bold: true },
    { text: "       - Select message period", color: "white", italic: true },
  );
  p.addRow(
    { text: "  'h'", color: "gray", bold: true },
    { text: "       - Set max value", color: "white", italic: true },
  );
  p.addRow(
    { text: "  'l'", color: "gray", bold: true },
    { text: "       - Set min value", color: "white", italic: true },
  );
  p.addRow(
    { text: "  'q'", color: "gray", bold: true },
    { text: "       - Quit", color: "white", italic: true },
  );

  gui.setPage(p, 0);
}

const CONFIRM_CHOICES = ["Yes", "No", "?"] as const;

type KeyHandler = (key: KeyListenerArgs) => void;
const KEY_HANDLERS: Record<string, KeyHandler> = {
  "space": () => {
    if (valueEmitter) {
      clearInterval(valueEmitter);
      valueEmitter = undefined;
    } else {
      valueEmitter = setInterval(frame, period);
    }
  },
  "m": () => {
    (new OptionPopup(
      "popupSelectMode",
      "Select simulation mode",
      [...MODES],
      mode,
    ).show() as OptionPopup & EventEmitter).on("confirm", (_mode: Mode) => {
      mode = _mode;
      gui.warn(`NEW MODE: ${mode}`);
      drawGui();
    });
  },
  "s": () => {
    const popupSelectPeriod = new OptionPopup(
      "popupSelectPeriod",
      "Select simulation period",
      [...PERIODS],
      period,
    ).show() as OptionPopup & EventEmitter;

    popupSelectPeriod.on(
      "confirm",
      (_period: Period) => {
        const popupConfirmPeriod = new ButtonPopup(
          "popupConfirmPeriod",
          "Confirm period",
          `Period set to ${_period} ms, apply?`,
          [...CONFIRM_CHOICES],
        ).show() as ButtonPopup & EventEmitter;

        popupConfirmPeriod.on(
          "confirm",
          (answer: typeof CONFIRM_CHOICES[number]) => {
            if (answer === "Yes") {
              period = _period;
              gui.warn(`NEW PERIOD: ${period}`);
            } else if (answer === "?") {
              gui.info("Choose ok to confirm period");
            }
            drawGui();
          },
        );
      },
    );
  },
  "h": () => {
    (new InputPopup("popupTypeMax", "Type max value", max, true).show() as
      & InputPopup
      & EventEmitter).on(
        "confirm",
        (_max: number) => {
          max = _max;
          gui.warn(`NEW MAX VALUE: ${max}`);
          drawGui();
        },
      );
  },
  "l": () => {
    (new InputPopup("popupTypeMin", "Type min value", min, true).show() as
      & InputPopup
      & EventEmitter).on(
        "confirm",
        (_min: number) => {
          min = _min;
          gui.warn(`NEW MIN VALUE: ${min}`);
          drawGui();
        },
      );
  },
  "1": () => {
    {
      const p = new PageBuilder(5); // Add a scroll limit, so it will be scrollable with up and down
      p.addRow({
        text: "Example of a custom popup content!",
        color: "yellow",
      });
      p.addRow({ text: "This is a custom popup!", color: "green" });
      p.addRow({ text: "It can be used to show a message,", color: "green" });
      p.addRow({ text: "or to show variables.", color: "green" });
      p.addRow({ text: "TCP Message sent: ", color: "green" }, {
        text: `${tcpCounter}`,
        color: "white",
      });
      p.addRow({ text: "Connected clients: ", color: "green" }, {
        text: `${connectedClients}`,
        color: "white",
      });
      p.addRow({ text: "Mode: ", color: "green" }, {
        text: `${mode}`,
        color: "white",
      });
      p.addRow({ text: "Message period: ", color: "green" }, {
        text: `${period} ms`,
        color: "white",
      });
      new CustomPopup("popupCustom1", "See that values", p, 32).show();
    }
  },
  "f": () => {
    new FileSelectorPopup("popupFileManager", "File Manager", "./").show();
  },
  "q": (key) => {
    if (key.shift) {
      closeApp();
      return;
    }

    (new ConfirmPopup(
      "popupQuit",
      "Are you sure you want to quit?",
      undefined,
    ).show() as ConfirmPopup & EventEmitter).on(
      "confirm",
      () => closeApp(),
    );
  },
};

gui.on("keypressed", (key: KeyListenerArgs) => {
  const keyHandler: KeyHandler | undefined = KEY_HANDLERS[key.name];
  if (keyHandler) {
    keyHandler(key);
  } else {
    gui.warn(`Unknown key: ${key.name}`);
  }
});

function drawGui() {
  updateConsole();
}

function closeApp() {
  console.clear();
  clearInterval(valueEmitter);
  server.close();

  Deno.setRaw(Deno.stdin.rid, false);
  Deno.exit(0);
}

drawGui();
