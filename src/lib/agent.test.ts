/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"

import { fixEnums } from "./agent.ts"

const schema = {
  properties: {
    language: { enum: ["en", "de"] },
    type: { anyOf: [{ enum: ["Fire", "Water"] }, {}] },
    stage: { anyOf: [{ anyOf: [{ enum: ["Basic", "Stage1"] }, {}] }, {}] },
    effect: {},
  },
  required: ["language"],
}

test("fixEnums fixes casing, drops invalid optional values, defaults required ones", () => {
  assert.deepEqual(
    fixEnums(
      { language: "English", type: "fire", stage: "stage 1", effect: "asleep" },
      schema
    ),
    { language: "en", type: "Fire", effect: "asleep" }
  )
  assert.deepEqual(fixEnums({ language: "de", stage: 1 }, schema), {
    language: "de",
    stage: 1,
  })
})
