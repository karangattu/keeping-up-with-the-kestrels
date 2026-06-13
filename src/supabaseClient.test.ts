import { expect, test } from "vitest";
import { supabase } from "./supabaseClient";

test("Supabase client is configured", () => {
  expect(supabase).toBeDefined();
  expect(supabase.auth).toBeDefined();
  expect(supabase.from).toBeDefined();
});
