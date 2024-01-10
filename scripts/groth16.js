const snarkjs = require('snarkjs')
const { buildBn128 } = require('ffjavascript')
const path = require('path')

async function main() {
  const curve = await buildBn128()
  const zkey_0 = { type: 'mem' }
  const zkey_1 = { type: 'mem' }
  const zkey_2 = { type: 'mem' }
  const zkey_final = { type: 'mem' }
  const bellman_1 = { type: 'mem' }
  const bellman_2 = { type: 'mem' }
  let vKey
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
  console.log('Groth16 start')

  //groth16 setup
  await snarkjs.zKey.newZKey(circuit_r1cs, ptau_final, zkey_0)

  //zkey contribute
  await snarkjs.zKey.contribute(zkey_0, zkey_1, 'p2_C1', 'pa_Entropy1')

  //zkey export bellman
  await snarkjs.zKey.exportBellman(zkey_1, bellman_1)

  //zkey bellman contribute
  await snarkjs.zKey.bellmanContribute(
    curve,
    bellman_1,
    bellman_2,
    'pa_Entropy2',
  )

  //zkey import bellman
  await snarkjs.zKey.importBellman(zkey_1, bellman_2, zkey_2, 'C2')

  //zkey beacon
  await snarkjs.zKey.beacon(
    zkey_2,
    zkey_final,
    'B3',
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    10,
  )

  //zkey verify r1cs
  let res = await snarkjs.zKey.verifyFromR1cs(circuit_r1cs, ptau_final, zkey_final)
  if (!res) throw 'zkey verify r1cs error'

  //zkey verify init
  res = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final)
  if (!res) throw 'zkey verify init error'

  //zkey export verificationkey
  vKey = await snarkjs.zKey.exportVerificationKey(zkey_final)

  //witness calculate
  await snarkjs.wtns.calculate({ a: 1, b: 2 }, circuit_wasm, wtns)
  // await snarkjs.wtns.calculate({ a: 11, b: 2 }, circuit_wasm, wtns)

  //checks witness complies with r1cs
  await snarkjs.wtns.check(circuit_r1cs, wtns)

  //groth16 proof
  res = await snarkjs.groth16.prove(zkey_final, wtns)
  proof = res.proof
  publicSignals = res.publicSignals

  //groth16 verify
  res = await snarkjs.groth16.verify(vKey, publicSignals, proof)
  if (!res) throw 'groth16 verify error'
  endTime = performance.now()
  runTime = endTime - startTime
  console.log(`snarkJS: OK! ${runTime} milliseconds to run`)
  process.exit(0)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
