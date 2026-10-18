import { isViaJpProxy } from "../common/jpProxy.ts";

process.stdout.write(isViaJpProxy(process.argv[2] ?? "") ? "true" : "false");
