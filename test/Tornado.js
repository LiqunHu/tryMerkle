require('chai').use(require('chai-as-promised')).should()
const path = require('path')
const { ethers } = require('hardhat')
const { buildBn128 } = require('ffjavascript')
const {
  mimcSpongecontract,
  buildBabyjub,
  buildPedersenHash,
  buildMimcSponge,
} = require('circomlibjs')
const { MerkleTree } = require('fixed-merkle-tree')
const {
  setProvider,
  takeSnapshot,
  revertSnapshot,
} = require('../utils/ganache')
const {
  randomBigint,
  intToLEBuffer,
  unstringifyBigInts,
  hexifyBigInts,
  toFixedHex,
} = require('../utils/util')
const snarkjs = require('snarkjs')

describe('ETHTornado', async function () {
  const levels = 20
  const ZERO_ELEMENT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'
  const amount = '1000000000000000000' //1 ether
  let sender
  let operator
  let snapshotId
  let mimcHash
  let pedersenHash
  let hasherInstance
  let verifierInstance
  let tornadoInstance

  function createDeposit(nullifier, secret) {
    let deposit = { nullifier, secret }
    deposit.preimage = Buffer.concat([
      intToLEBuffer(deposit.nullifier, 31),
      intToLEBuffer(deposit.secret, 31),
    ])
    deposit.commitment = pedersenHash(deposit.preimage)
    deposit.nullifierHash = pedersenHash(intToLEBuffer(deposit.nullifier, 31))
    return deposit
  }

  async function generateMerkleProof(deposit) {
    console.log('Getting contract state...')
    const filter = tornadoInstance.filters.Deposit
    const events = await tornadoInstance.queryFilter(filter)
    const leaves = events
      .sort((a, b) => a.args[1] - b.args[1]) // Sort events in chronological order
      .map((e) => e.args[0])
    const tree = new MerkleTree(levels, leaves, {
      hashFunction: mimcHash,
      zeroElement: BigInt(ZERO_ELEMENT),
    })

    // Find current commitment in the tree
    let depositEvent = events.find(
      (e) => BigInt(e.args[0]) === deposit.commitment,
    )
    let leafIndex = depositEvent ? depositEvent.args[1] : -1

    // Validate that our data is correct (optional)
    const isValidRoot = await tornadoInstance.isKnownRoot(toFixedHex(tree.root))
    const isSpent = await tornadoInstance.isSpent(
      toFixedHex(deposit.nullifierHash),
    )
    if (!isValidRoot) {
      console.log('Merkle tree is corrupted')
    }

    if (isSpent) {
      console.log('The note is already spent')
    }

    if (leafIndex < 0) {
      console.log('The deposit is not found in the tree')
    }

    // Compute merkle proof of our commitment
    const { pathElements, pathIndices } = tree.path(ethers.getNumber(leafIndex))
    return { pathElements, pathIndices, root: tree.root }
  }

  function toSolidityInput(proof, publicSignals) {
    const result = {
      proof: [
        [proof.pi_a[0].toString(8), proof.pi_a[1].toString(8)],
        [
          [proof.pi_b[0][0].toString(8), proof.pi_b[0][1].toString(8)],
          [proof.pi_b[1][0].toString(8), proof.pi_b[1][1].toString(8)],
        ],
        [proof.pi_c[0].toString(8), proof.pi_c[1].toString(8)],
      ],
    }
    if (publicSignals) {
      result.publicSignals = hexifyBigInts(unstringifyBigInts(publicSignals))
    }
    return result
  }

  async function generateSnarkProof(input) {
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
      'circuits',
      'withdraw.r1cs',
    )
    const circuit_wasm = path.join(
      __dirname,
      '..',
      'build',
      'circuits',
      'withdraw_js',
      'withdraw.wasm',
    )
    // const circuit_r1cs = path.join(__dirname, 'circuits', 'circuit.r1cs')
    // const circuit_wasm = path.join(__dirname, 'circuits', 'circuit.wasm')

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
    console.log(res)

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
    res = await snarkjs.zKey.verifyFromR1cs(
      circuit_r1cs,
      ptau_final,
      zkey_final,
    )
    console.log(res)

    //zkey verify init
    res = await snarkjs.zKey.verifyFromInit(zkey_0, ptau_final, zkey_final)
    console.log(res)

    //zkey export verificationkey
    vKey = await snarkjs.zKey.exportVerificationKey(zkey_final)

    //witness calculate
    await snarkjs.wtns.calculate(unstringifyBigInts(input), circuit_wasm, wtns)
    // await snarkjs.wtns.calculate({ a: 11, b: 2 }, circuit_wasm, wtns)

    //checks witness complies with r1cs
    await snarkjs.wtns.check(circuit_r1cs, wtns)

    //groth16 proof
    res = await snarkjs.groth16.prove(zkey_final, wtns)
    proof = res.proof
    publicSignals = res.publicSignals

    //groth16 verify
    res = await snarkjs.groth16.verify(vKey, publicSignals, proof)
    console.log(res)

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

    await curve.terminate()

    return toSolidityInput(proof, publicSignals)
  }

  async function generateSnarkProofFromFile(input) {
    const wtns = { type: 'mem' }

    const circuit_wasm = path.join(
      __dirname,
      '..',
      'build',
      'circuits',
      'withdraw_js',
      'withdraw.wasm',
    )

    //witness calculate
    await snarkjs.wtns.calculate(unstringifyBigInts(input), circuit_wasm, wtns)

    //groth16 proof
    let res = await snarkjs.groth16.prove(path.join(
      __dirname,
      'circuits',
      'withdraw_proving.zkey'
    ), wtns)

    const proofA = [res.proof.pi_a[0], res.proof.pi_a[1]]
    const proofB = [[res.proof.pi_b[0][1], res.proof.pi_b[0][0]], [res.proof.pi_b[1][1], res.proof.pi_b[1][0]]]
    const proofC = [res.proof.pi_c[0], res.proof.pi_c[1]]

    return (proofA, proofB, proofC, res.publicSignals)
  }

  before(async () => {
    const mimcSponge = await buildMimcSponge()
    mimcHash = (left, right) =>
      '0x' + mimcSponge.F.toString(mimcSponge.multiHash([left, right]), 16)
    tree = new MerkleTree(levels, [], {
      hashFunction: mimcHash,
      zeroElement: BigInt(ZERO_ELEMENT),
    })

    const babyJub = await buildBabyjub()
    const perdersenHash = await buildPedersenHash()
    pedersenHash = (data) =>
      babyJub.F.toObject(babyJub.unpackPoint(perdersenHash.hash(data))[0])

    const [owner, addr1] = await ethers.getSigners()
    sender = owner
    operator = addr1

    const C = await ethers.getContractFactory(
      mimcSpongecontract.abi,
      mimcSpongecontract.createCode('mimcsponge', 220),
      sender,
    )
    hasherInstance = await C.deploy()
    await hasherInstance.waitForDeployment()
    const haserAddress = await hasherInstance.getAddress()

    const C1 = await ethers.getContractFactory('Verifier')
    verifierInstance = await C1.deploy()
    await verifierInstance.waitForDeployment()
    const verifierAddress = await verifierInstance.getAddress()

    const C2 = await ethers.getContractFactory('ETHTornado')
    tornadoInstance = await C2.deploy(
      verifierAddress,
      haserAddress,
      amount,
      levels,
    )

    setProvider(ethers.provider)
    snapshotId = await takeSnapshot()
  })

  describe('#minimal tornado', () => {
    it('tornado', async function () {
      try {
        const deposit = createDeposit(randomBigint(31), randomBigint(31))
        let balance = await ethers.provider.getBalance(sender)
        console.log(ethers.formatEther(balance))
        console.log('Sending deposit transaction...')

        const filter = tornadoInstance.filters.Deposit
        tornadoInstance.on(filter, (commitment, leafIndex, timestamp) => {
          // The to will always be "address"
          console.log(commitment)
          console.log(leafIndex)
          console.log(timestamp)
        })

        // deposit
        let tx = await tornadoInstance.deposit(
          Buffer.from(deposit.commitment.toString(16).padStart(64, '0'), 'hex'),
          {
            value: ethers.parseEther('1'),
          },
        )
        console.log(tx)
        balance = await ethers.provider.getBalance(sender)
        console.log(ethers.formatEther(balance))

        // withdraw
        const { pathElements, pathIndices, root } =
          await generateMerkleProof(deposit)
        const input = {
          // Public snark inputs
          root: root,
          nullifierHash: deposit.nullifierHash,
          recipient: BigInt(operator.address),
          relayer: 0,
          fee: 0,
          refund: 0,

          // Private snark inputs
          nullifier: deposit.nullifier,
          secret: deposit.secret,
          pathElements: pathElements,
          pathIndices: pathIndices,
        }
        const { proofA, proofB, proofC ,publicSignals } = await generateSnarkProofFromFile(input)
        // const proof = '0x2a5e6cfc496a8532b0076a5675da967923e796e9209ffbec971d80288445677c26e369d0ff2de2f36839a024287cfa70f9c0e956b1cbaa37fdf6b0693d7bb646289e82c3a3ad1c919bc3c950aeadc7d17ee0baa1c3ee694d0ae1ce1062d87e660423acd3a763bcd40a9797beaba5542a361ceee2e4662028221ff942e5ad3bf927dcbdd4477bee6a1a87aba4d2b3b3c4cfdb17658404f0b5646fe641ef9c5368304046d6a94b3acf42ea54f16c2bab3dbe546f17f7884aeef59b3b2364a327e20bb5297ae039ad1b4c75f50f22086fa71ea0242d393d286853d7e1d6370477711debcf7f7b47748f44456e045b7a5e6ecad68fc240cb827d4f5c54130d024e83'
        balance = await ethers.provider.getBalance(operator)
        console.log(ethers.formatEther(balance))
        tx = await tornadoInstance.withdraw(
          proofA, proofB, proofC ,publicSignals,
          toFixedHex(input.root),
          toFixedHex(input.nullifierHash),
          toFixedHex(input.recipient, 20),
          toFixedHex(input.relayer, 20),
          toFixedHex(input.fee),
          toFixedHex(input.refund),
        )
        console.log(tx)
        balance = await ethers.provider.getBalance(operator)
        console.log(ethers.formatEther(balance))
      } catch (error) {
        console.log(error)
      }
    })
  })
})
