require('chai').use(require('chai-as-promised')).should()
const path = require('path')
const { buildBabyjub, buildPedersenHash } = require('circomlibjs')
const wasm_tester = require('circom_tester').wasm
const { randomBigint, intToLEBuffer, intToBEBuffer } = require('../utils/util')

describe('hasher', async function () {
  let pedersen
  let babyJub
  let F

  before(async () => {
    babyJub = await buildBabyjub()
    pedersen = await buildPedersenHash()
    F = babyJub.F
  })
  describe('#test pedersen hash', () => {
    it('hash 0', async function () {
      try {
        const b = Buffer.alloc(31)
        const h = pedersen.hash(b)
        const hP = babyJub.unpackPoint(h)
        console.log(F.toObject(hP[0]))

        // const n = F.e(Scalar.sub(Scalar.shl(Scalar.e(1), 253), Scalar.e(1)))
        const input = {
          in: BigInt(0),
        }

        const circuit = await wasm_tester(
          path.join(__dirname, 'circuits', 'hasher.circom'),
        )
        const w = await circuit.calculateWitness(input)
        F.toObject(hP[0]).should.be.equal(w[1])
        F.toObject(hP[1]).should.be.equal(w[2])
      } catch (error) {
        console.log(error)
      }
    })

    it('hash 1', async function () {
      try {
        const b = Buffer.alloc(31)
        b[30] = 0x01
        const h = pedersen.hash(b)
        const hP = babyJub.unpackPoint(h)
        console.log(F.toObject(hP[0]))

        // const n = F.e(Scalar.sub(Scalar.shl(Scalar.e(1), 253), Scalar.e(1)))
        const input = {
          in: BigInt(
            '0x01000000000000000000000000000000000000000000000000000000000000',
          ), //b.reverse().toString('hex')
        }

        const circuit = await wasm_tester(
          path.join(__dirname, 'circuits', 'hasher.circom'),
        )
        const w = await circuit.calculateWitness(input)
        F.toObject(hP[0]).should.be.equal(w[1])
        F.toObject(hP[1]).should.be.equal(w[2])
      } catch (error) {
        console.log(error)
      }
    })

    it('hash random', async function () {
      try {
        let a = randomBigint(31)
        const b = Buffer.from(a.toString(16), 'hex')
        const h = pedersen.hash(b)
        const hP = babyJub.unpackPoint(h)
        console.log(F.toObject(hP[0]))

        const input = {
          in: BigInt('0x' + b.reverse().toString('hex')),
        }

        const circuit = await wasm_tester(
          path.join(__dirname, 'circuits', 'hasher.circom'),
        )
        const w = await circuit.calculateWitness(input)
        console.log(w)
        F.toObject(hP[0]).should.be.equal(w[1])
        F.toObject(hP[1]).should.be.equal(w[2])
      } catch (error) {
        console.log(error)
      }
    })

    it('hash 496', async function () {
      try {
        let x = randomBigint(31)
        let y = randomBigint(31)
        const b = Buffer.concat([intToLEBuffer(x, 31), intToLEBuffer(y, 31)])
        const h = pedersen.hash(b)
        const hP = babyJub.unpackPoint(h)
        console.log(F.toObject(hP[0]))

        // const input = {
        //   nullifier: BigInt('0x' + intToLEBuffer(x, 31).toString('hex')),
        //   secret: BigInt('0x' + intToLEBuffer(y, 31).toString('hex'))
        // }

        const input = {
          nullifier: x,
          secret: y,
        }

        const circuit = await wasm_tester(
          path.join(__dirname, 'circuits', 'hasher496.circom'),
        )
        const w = await circuit.calculateWitness(input)
        console.log(w)
        F.toObject(hP[0]).should.be.equal(w[1])
        F.toObject(hP[1]).should.be.equal(w[2])
      } catch (error) {
        console.log(error)
      }
    })
  })
})
