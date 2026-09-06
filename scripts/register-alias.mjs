import * as moduleApi from "node:module";

import { loadSync, resolve } from "./alias-hooks.mjs";

if (typeof moduleApi.registerHooks === "function") {
  moduleApi.registerHooks({ resolve, load: loadSync });
} else {
  moduleApi.register(
    new URL("./alias-hooks.mjs", import.meta.url),
    import.meta.url,
    {
      data: { legacyLoader: true },
    },
  );
}
