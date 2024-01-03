require('chai').use(require('chai-as-promised')).should()
const path = require('path')
const {
  buildMimcSponge,
} = require('circomlibjs')
const wasm_tester = require('circom_tester').wasm

describe('mimchasher', async function () {
  const ZERO_ELEMENT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'
    let mimcHash

  before(async () => {
    const mimcSponge = await buildMimcSponge()
    mimcHash = (left, right) =>
      mimcSponge.F.toString(mimcSponge.multiHash([left, right]), 16)
  })
  describe('#test mimc hash', () => {
    it('hash ZERO_ELEMENT', async function () {
      try {
        let a = BigInt(ZERO_ELEMENT)
        let b = BigInt(ZERO_ELEMENT)
        let out = mimcHash(a,b)
        console.log(out)

        const input = {
          left: a,
          right: b
        }

        const circuit = await wasm_tester(
          path.join(__dirname, 'circuits', 'mimchasher.circom'),
        )
        const w = await circuit.calculateWitness(input)
        w[1].toString(16).should.be.equal(out)
      } catch (error) {
        console.log(error)
      }
    })
  })
})
