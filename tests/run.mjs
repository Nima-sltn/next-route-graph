import { readdir } from "node:fs/promises";

// Expand filenames in Node so Windows and Node 18 do not rely on shell globbing.
for (const file of (await readdir(new URL(".", import.meta.url))).sort()) {
  if (file.endsWith(".test.ts")) await import(new URL(file, import.meta.url));
}
