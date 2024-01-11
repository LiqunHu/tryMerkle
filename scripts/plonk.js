const snarkjs = require('snarkjs')
const path = require('path')

async function main() {
  const zkey_plonk = { type: 'mem' }
  let vKey
  const wtns = { type: 'mem' }
  let proof
  let publicSignals

  const ptau_final = path.join(
    __dirname,
    '..',
    'build',
    'sha256',
    'pot18_final.ptau',
  )
  const circuit_r1cs = path.join(
    __dirname,
    '..',
    'build',
    'sha256',
    'sha256.r1cs',
  )
  const circuit_wasm = path.join(
    __dirname,
    '..',
    'build',
    'sha256',
    'sha256_js',
    'sha256.wasm',
  )

  let startTime = performance.now()
  console.log('plonk start')

  //witness calculate
  await snarkjs.wtns.calculate({ a: 1, b: 2 }, circuit_wasm, wtns)
  // await snarkjs.wtns.calculate({ a: 11, b: 2 }, circuit_wasm, wtns)

  //checks witness complies with r1cs
  await snarkjs.wtns.check(circuit_r1cs, wtns)

  //plonk setup
  await snarkjs.plonk.setup(
    circuit_r1cs,
    ptau_final,
    zkey_plonk,
  )

  //zkey export verificationkey
  vKey = await snarkjs.zKey.exportVerificationKey(zkey_plonk)

  //plonk proof
  res = await snarkjs.plonk.prove(zkey_plonk, wtns)
  proof = res.proof
  publicSignals = res.publicSignals

  //plonk verify
  res = await snarkjs.plonk.verify(vKey, publicSignals, proof)
  if (!res) throw 'plonk verify error'
  endTime = performance.now()
  runTime = endTime - startTime
  console.log(`plonk: OK! ${runTime} milliseconds to run`)
  process.exit(0)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
