import { expect, beforeAll, describe, test } from "bun:test"
import { Noir } from "@noir-lang/noir_js"
import { CompiledCircuit, ProofData } from "@noir-lang/types"
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg"
import { compileCircuit } from "./helpers"
import path from "path"

describe("It compiles noir program code, receiving circuit bytes and abi object.", () => {
  let noir: Noir
  let backend: BarretenbergBackend
  let correctProof: ProofData
  let circuit: CompiledCircuit

  beforeAll(async () => {
    // Compile circuit from source code
    circuit = await compileCircuit(path.resolve("circuits/basic"))
    // Initialise UltraHonk backend
    backend = new BarretenbergBackend(circuit, { threads: 4 })
    // Plug backend into Noir
    noir = new Noir(circuit)
  })

  test("Should generate valid proof for correct input", async () => {
    const input = { x: 1, y: 2 }
    const { witness } = await noir.execute(input)
    correctProof = await backend.generateProof(witness)
    expect(correctProof.proof instanceof Uint8Array).toBeTrue
  })

  test("Should verify valid proof for correct input", async () => {
    const verification = await backend.verifyProof(correctProof)
    expect(verification).toBeTrue
  })

  test("Should fail to generate valid proof for incorrect input", async () => {
    try {
      const input = { x: 1, y: 1 }
      const { witness } = await noir.execute(input)
      await backend.generateProof(witness)
    } catch (err) {
      expect(err instanceof Error).toBeTrue
      const error = err as Error
      expect(error.message).toContain("Cannot satisfy constraint")
    }
  })
})
