import {
  createServer as _createServer,
  EventEmitter,
  Server,
  Socket,
} from "../deps.ts";

export type ListeningServer = {
  server: Server;
  connectedClients: number;
  /** The number of TCP message sent since start */
  tcpCounter: number;
  lastErr: string;
};

/** Makes a TCP ListeningServer that listens on a port */
export function createServer(
  clientManager: EventEmitter,
  port: number,
  hostname?: string,
): ListeningServer {
  let connectedClients = 0;
  let tcpCounter = 0;

  let lastErr = "";

  function connectionListener(socket: Socket) {
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
  }

  const server = _createServer(undefined, connectionListener);

  server.on("error", (err) => {
    lastErr = `Error: ${err.message}`;
  });

  return {
    server: server.listen({ port, hostname }),
    tcpCounter,
    lastErr,
    connectedClients,
  };
}
