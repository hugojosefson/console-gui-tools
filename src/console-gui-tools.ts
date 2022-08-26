import {
  ButtonPopup,
  ConfirmPopup,
  ConsoleManager,
  createServer,
  CustomPopup,
  EventEmitter,
  FileSelectorPopup,
  InputPopup,
  OptionPopup,
  PageBuilder,
  Socket,
} from "../deps.ts";

const PORT = 9090;
const HOST = "127.0.0.1";

const PERIODS = [
  10,
  100,
  250,
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
  30000,
  60000,
  120000,
  300000,
  600000,
  900000,
  1800000,
  3600000,
  7200000,
  14400000,
  28800000,
  43200000,
  86400000,
] as const;

type Period = typeof PERIODS[number];
let period: Period = 100;

const MODES = ["random", "linear"] as const;
type Mode = typeof MODES[number];
let mode: Mode = "random";

const clientManager = new EventEmitter();

const GUI = new ConsoleManager({
  title: "TCP Simulator", // Title of the console
  logPageSize: 20, // Number of lines to show in logs page
  logLocation: 1, // Location of the logs page
  layoutOptions: {
    boxed: true, // Set to true to enable boxed layout
    showTitle: true, // Set to false in order to hide title
    changeFocusKey: "ctrl+l", // Change layout with ctrl+l to switch to the logs page
    type: "double", // Set to 'double' to enable double layout
    direction: "vertical", // Set to 'horizontal' to enable horizontal layout
    boxColor: "yellow",
    boxStyle: "bold",
  },
});

let connectedClients = 0;

// The number of TCP message sent since start
let tcpCounter = 0;

// Make A TCP Server that listens on port 9090
const server = createServer(undefined, (socket: Socket) => {
  connectedClients++;
  //drawGui()
  clientManager.on("send", (data) => {
    socket.write(data + "\n");
    tcpCounter++;
  });
  socket.on("error", function (err: Error) {
    lastErr = `Error:  ${err.stack}`;
  });
  socket.on("end", function () {
    lastErr = "Error: Client disconnected!";
    connectedClients--;
  });
}).listen({ port: PORT, hostname: HOST });

let lastErr = "";

server.on("error", (err) => {
  lastErr = `Error: ${err.message}`;
  GUI.error(lastErr);
});

let min = 9;
let max = 12;

let values = [0, 0, 0, 0, 0, 0];

const frame = async () => {
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
};

let valueEmitter: undefined | number = undefined; //setInterval(frame, period)

type Direction = 0 | 1;
const direction: Direction[] = [1, 0, 1, 1, 0, 0]; // 1 = Up
const step = 0.01;

const updateWithRandomValues = () => {
  values = values.map(() => Math.random() * (max - min) + min);
};

const updateWithLinearValues = () => {
  // Generate linear values using direction and max/min values
  values = values.map((value, index) => {
    if (value >= max) {
      direction[index] = 0;
    } else if (value <= min) {
      direction[index] = 1;
    }
    return direction[index] === 1 ? value + step : value - step;
  });
};

const sendValuesAsCsv = () => {
  const csv = values.map((v) => v.toFixed(4)).join(",");
  clientManager.emit("send", csv);
  drawGui();
};

/**
 * @description Updates the console screen
 */
const updateConsole = () => {
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
  if (!valueEmitter) {
    p.addRow({ text: "Simulator is not running! ", color: "red" }, {
      text: "press 'space' to start",
      color: "white",
    });
  } else {
    p.addRow({ text: "Simulator is running! ", color: "green" }, {
      text: "press 'space' to stop",
      color: "white",
    });
  }

  // Print mode:
  p.addRow({ text: "Mode: ", color: "cyan" }, {
    text: `${mode}`,
    color: "white",
  });

  // Print message frequency:
  p.addRow({ text: "Message period: ", color: "cyan" }, {
    text: `${period} ms`,
    color: "white",
  });

  // Print Min and Max
  p.addRow({ text: "Min: ", color: "cyan" }, {
    text: `${min}`,
    color: "white",
  });
  p.addRow({ text: "Max: ", color: "cyan" }, {
    text: `${max}`,
    color: "white",
  });

  // Print current values:
  p.addRow({ text: "Values: ", color: "cyan" }, {
    text: ` ${values.map((v) => v.toFixed(4)).join("   ")}`,
    color: "white",
  });

  // Spacer
  p.addSpacer();

  if (lastErr.length > 0) {
    p.addRow({ text: lastErr, color: "red" });
    p.addSpacer(2);
  }

  p.addRow({ text: "Commands:", color: "white", bg: "black" });
  p.addRow({ text: "  'space'", color: "gray", bold: true }, {
    text: "   - Start/stop simulator",
    color: "white",
    italic: true,
  });
  p.addRow({ text: "  'm'", color: "gray", bold: true }, {
    text: "       - Select simulation mode",
    color: "white",
    italic: true,
  });
  p.addRow({ text: "  's'", color: "gray", bold: true }, {
    text: "       - Select message period",
    color: "white",
    italic: true,
  });
  p.addRow({ text: "  'h'", color: "gray", bold: true }, {
    text: "       - Set max value",
    color: "white",
    italic: true,
  });
  p.addRow({ text: "  'l'", color: "gray", bold: true }, {
    text: "       - Set min value",
    color: "white",
    italic: true,
  });
  p.addRow({ text: "  'q'", color: "gray", bold: true }, {
    text: "       - Quit",
    color: "white",
    italic: true,
  });

  GUI.setPage(p, 0);
};

GUI.on("exit", () => {
  closeApp();
});

const CONFIRM_CHOICES = ["Yes", "No", "?"] as const;

GUI.on("keypressed", (key: { name: string }) => {
  switch (key.name) {
    case "space":
      if (valueEmitter) {
        clearInterval(valueEmitter);
        valueEmitter = undefined;
      } else {
        valueEmitter = setInterval(frame, period);
      }
      break;
    case "m":
      new OptionPopup(
        "popupSelectMode",
        "Select simulation mode",
        MODES,
        mode,
      ).show().on("confirm", (_mode: Mode) => {
        mode = _mode;
        GUI.warn(`NEW MODE: ${mode}`);
        drawGui();
      });
      break;
    case "s":
      new OptionPopup(
        "popupSelectPeriod",
        "Select simulation period",
        PERIODS,
        period,
      ).show().on("confirm", (_period: Period) => {
        new ButtonPopup(
          "popupConfirmPeriod",
          "Confirm period",
          `Period set to ${_period} ms, apply?`,
          CONFIRM_CHOICES,
        ).show().on("confirm", (answer: typeof CONFIRM_CHOICES[number]) => {
          if (answer === "Yes") {
            period = _period;
            GUI.warn(`NEW PERIOD: ${period}`);
          } else if (answer === "?") {
            GUI.info("Choose ok to confirm period");
          }
          drawGui();
        });
      });
      break;
    case "h":
      new InputPopup("popupTypeMax", "Type max value", max, true).show().on(
        "confirm",
        (_max: number) => {
          max = _max;
          GUI.warn(`NEW MAX VALUE: ${max}`);
          drawGui();
        },
      );
      break;
    case "l":
      new InputPopup("popupTypeMin", "Type min value", min, true).show().on(
        "confirm",
        (_min: number) => {
          min = _min;
          GUI.warn(`NEW MIN VALUE: ${min}`);
          drawGui();
        },
      );
      break;
    case "1":
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
      break;
    case "f":
      new FileSelectorPopup("popupFileManager", "File Manager", "./").show();
      break;
    case "q":
      new ConfirmPopup("popupQuit", "Are you sure you want to quit?").show().on(
        "confirm",
        () => closeApp(),
      );
      break;
    default:
      break;
  }
});

const drawGui = () => {
  updateConsole();
};

const closeApp = () => {
  console.clear();
  clearInterval(valueEmitter);
  server.close();

  Deno.setRaw(Deno.stdin.rid, false);
  Deno.exit(0);
};

drawGui();
