import { ConsoleManager, EventEmitter } from "../deps.ts";

export function createGui(): ConsoleManager & EventEmitter {
  return new ConsoleManager({
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
  }) as ConsoleManager & EventEmitter;
}
