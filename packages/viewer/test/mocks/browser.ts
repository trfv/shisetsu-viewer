import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Setup MSW worker for browser
export const worker = setupWorker(...handlers);
