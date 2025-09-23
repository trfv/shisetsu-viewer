import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Setup MSW server
export const server = setupServer(...handlers);

// Reset handlers to defaults
export const resetHandlers = () => {
  server.resetHandlers();
};
