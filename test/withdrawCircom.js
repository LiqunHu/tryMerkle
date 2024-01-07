require('chai').use(require('chai-as-promised')).should()
const path = require('path')
const {
  buildBabyjub,
  buildPedersenHash,
  buildMimcSponge,
} = require('circomlibjs')
const { MerkleTree } = require('fixed-merkle-tree')
const wasm_tester = require('circom_tester').wasm
const {
  randomBigint,
  intToLEBuffer,
  intToBEBuffer,
  toFixedHex,
  u8ToHex,
  unstringifyBigInts,
} = require('../utils/util')

describe('withdrawCircom', async function () {
  let pedersenHash
  let mimcHash
  let tree
  const levels = 20
  const ZERO_ELEMENT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'

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
    pedersenHash = (data) => babyJub.F.toObject(babyJub.unpackPoint(perdersenHash.hash(data))[0])
  })
  describe('#test circom', () => {
    it('test withdraw', async function () {
      try {
        let deposit = { nullifier: randomBigint(31), secret: randomBigint(31) }
        deposit.preimage = Buffer.concat([
          intToLEBuffer(deposit.nullifier, 31),
          intToLEBuffer(deposit.secret, 31),
        ])
        deposit.commitment = pedersenHash(deposit.preimage)
        deposit.nullifierHash = pedersenHash(
          intToLEBuffer(deposit.nullifier, 31),
        )
        tree.insert(deposit.commitment)
        const treePath = tree.path(tree.indexOf(deposit.commitment))

        const input = {
          // Public snark inputs
          root: tree.root,
          nullifierHash: deposit.nullifierHash,
          recipient: BigInt('0x19bc7C4CC0E240DAd6C6B21518C05C09e8B2A4a8'),
          relayer: 0,
          fee: 0,
          refund: 0,

          // Private snark inputs
          nullifier: deposit.nullifier,
          secret: deposit.secret,
          pathElements: treePath.pathElements,
          pathIndices: treePath.pathIndices,
        }

        const circuit = await wasm_tester(
          path.join(__dirname, '..', 'circuits', 'withdraw.circom'),
        )
        const w = await circuit.calculateWitness(unstringifyBigInts(input))
        console.log(w)
      } catch (error) {
        console.log(error)
      }
    })
  })
})
