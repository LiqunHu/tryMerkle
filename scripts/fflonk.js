const snarkjs = require('snarkjs')
const path = require('path')

async function main() {
  const zkey_final = { type: 'mem' }
  const wtns = { type: 'mem' }
  let proof
  let publicSignals

  const ptau_final = path.join(
    __dirname,
    '..',
    'build',
    'sha256',
    'pot15_final.ptau',
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
  console.log('fflonk start')

  //fflonk setup
  await snarkjs.fflonk.setup(circuit_r1cs, ptau_final, zkey_final)


  //zkey export verificationkey
  const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final)

  //witness calculate
  await snarkjs.wtns.calculate({ a: 1, b: 2 }, circuit_wasm, wtns)
  // await snarkjs.wtns.calculate({ a: 11, b: 2 }, circuit_wasm, wtns)

  //checks witness complies with r1cs
  await snarkjs.wtns.check(circuit_r1cs, wtns)

  //fflonk proof
  res = await snarkjs.fflonk.prove(zkey_final, wtns)
  proof = res.proof
  publicSignals = res.publicSignals

  //fflonk verify
  res = await snarkjs.fflonk.verify(vKey, publicSignals, proof)
  if (!res) throw 'fflonk verify error'
  endTime = performance.now()
  runTime = endTime - startTime
  console.log(`fflonk: OK! ${runTime} milliseconds to run`)
  process.exit(0)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
