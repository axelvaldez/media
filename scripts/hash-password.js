#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/auth.js";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("text to hash: ");
  rl.close();

  if (!password) {
    console.error("No text provided.");
    process.exitCode = 1;
    return;
  }

  const { salt, hash } = await hashPassword(password);
  console.log(`${salt}:${hash}\n`);
}

main();
