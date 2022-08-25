import { defineNitroConfig } from "nitropack";

export default defineNitroConfig({
  devStorage: {
    main: {
      driver: "fs",
      base: "./data/fs",
    },
  },
});
