require('chai').use(require('chai-as-promised')).should()
const snarkjs = require('snarkjs')
const path = require('path')
const { ethers } = require('hardhat')
const { toFixedHex } = require('../utils/util')

describe('Verifier', function () {
  let verifierInstance

  before(async () => {
    const C = await ethers.getContractFactory('Verifier')
    verifierInstance = await C.deploy()
    await verifierInstance.waitForDeployment()
  })

  describe('Verifier', () => {
    it('Verifier', async function () {
      try {
        const zkeyFilename = path.join(
          __dirname,
          '..',
          'build',
          'circuits',
          'withdraw_proving.zkey',
        )
        const wtnsFilename = path.join(
          __dirname,
          '..',
          'build',
          'circuits',
          'witness.wtns',
        )
        const { proof: proof, publicSignals: publicInputs } =
          await snarkjs.groth16.prove(zkeyFilename, wtnsFilename)

        const proofA = [proof.pi_a[0], proof.pi_a[1]]
        const proofB = [
          [proof.pi_b[0][1], proof.pi_b[0][0]],
          [proof.pi_b[1][1], proof.pi_b[1][0]],
        ]
        const proofC = [proof.pi_c[0], proof.pi_c[1]]

        let result = await verifierInstance.verifyProof(
          proofA,
          proofB,
          proofC,
          publicInputs,
        )
        result.should.be.equal(true)
      } catch (error) {
        console.log(error)
      }
    })
  })
})
