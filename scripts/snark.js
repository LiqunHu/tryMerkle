const snarkjs = require('snarkjs')
const { buildBn128 } = require('ffjavascript')
const path = require('path')

async function main() {
  const curve = await buildBn128()
  const ptau_0 = { type: 'mem' }
  const ptau_1 = { type: 'mem' }
  const ptau_2 = { type: 'mem' }
  const ptau_beacon = { type: 'mem' }
  const ptau_final = { type: 'mem' }
  const ptau_challenge2 = { type: 'mem' }
  const ptau_response2 = { type: 'mem' }
  const zkey_0 = { type: 'mem' }
  const zkey_1 = { type: 'mem' }
  const zkey_2 = { type: 'mem' }
  const zkey_final = { type: 'mem' }
  const zkey_plonk = { type: 'mem' }
  const bellman_1 = { type: 'mem' }
  const bellman_2 = { type: 'mem' }
  let vKey
  const wtns = { type: 'mem' }
  let proof
  let publicSignals
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
  // const circuit_r1cs = path.join(__dirname, 'circuits', 'circuit.r1cs')
  // const circuit_wasm = path.join(__dirname, 'circuits', 'circuit.wasm')
  let startTime = performance.now()
  console.log('powers of tau start')

  // powersoftau new
  await snarkjs.powersOfTau.newAccumulator(curve, 15, ptau_0)

  //powersoftau contribute
  await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, 'C1', 'Entropy1')

  //powersoftau export challenge
  await snarkjs.powersOfTau.exportChallenge(ptau_1, ptau_challenge2)

  //powersoftau challenge contribute
  await snarkjs.powersOfTau.challengeContribute(
    curve,
    ptau_challenge2,
    ptau_response2,
    'Entropy2',
  )

  //powersoftau import response
  await snarkjs.powersOfTau.importResponse(
    ptau_1,
    ptau_response2,
    ptau_2,
    'C2',
    true,
  )

  //powersoftau beacon
  await snarkjs.powersOfTau.beacon(
    ptau_2,
    ptau_beacon,
    'B3',
    '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    10,
  )

  //powersoftau prepare phase2
  await snarkjs.powersOfTau.preparePhase2(ptau_beacon, ptau_final)

  // powersoftau verify
  let res = await snarkjs.powersOfTau.verify(ptau_final)
  if (!res) throw 'powersoftau verify error'
  let endTime = performance.now()
  let runTime = endTime - startTime

  console.log(`powers of tau end ${runTime} milliseconds to run`)

  console.log('groth16 start')

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
  res = await snarkjs.zKey.verifyFromR1cs(circuit_r1cs, ptau_final, zkey_final)
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

  // //plonk setup
  // await snarkjs.plonk.setup(
  //   path.join('test', 'circuit', 'circuit.r1cs'),
  //   ptau_final,
  //   zkey_plonk,
  // )

  // //zkey export verificationkey
  // vKey = await snarkjs.zKey.exportVerificationKey(zkey_plonk)

  // //plonk proof
  // res = await snarkjs.plonk.prove(zkey_plonk, wtns)
  // proof = res.proof
  // publicSignals = res.publicSignals

  // //plonk verify
  // res = await snarkjs.plonk.verify(vKey, publicSignals, proof)
  // console.log(res)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
