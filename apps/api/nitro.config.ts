import { defineNitroConfig } from "nitropack";

export default defineNitroConfig({
  storage: {
    fs: {
      driver: "fs",
      base: "./data/fs",
    },
  },
});
