#!/usr/bin/env node
// One-off local CLI: prompts for a password and prints the value to store
// as the AUTH_PASSWORD_HASH environment variable in Netlify.
//
//   npm run hash-password
//
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/auth.js";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Password to hash: ");
  rl.close();

  if (!password) {
    console.error("No password provided.");
    process.exitCode = 1;
    return;
  }

  const { salt, hash } = await hashPassword(password);
  console.log("\nSet this as the AUTH_PASSWORD_HASH environment variable in Netlify:\n");
  console.log(`${salt}:${hash}\n`);
}

main();
