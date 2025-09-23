import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import { RequestHandler } from "msw";

// Setup MSW server
export const server = setupServer(...handlers);

// Utility to add custom handlers during tests
export const addCustomHandlers = (...customHandlers: RequestHandler[]) => {
  server.use(...customHandlers);
};

// Reset handlers to defaults
export const resetHandlers = () => {
  server.resetHandlers();
};
