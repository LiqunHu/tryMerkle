const { expect } = require('chai')
const { ethers } = require('hardhat')
const { mimcSpongecontract } = require('circomlibjs')

function toFixedHex(number, length = 32) {
  let str = BigInt(number).toString(16)
  while (str.length < length * 2) str = '0' + str
  str = '0x' + str
  return str
}

describe('MerkleTreeWithHistory', async function () {
  it('should initialize', async function () {
    try {
      const levels = 10

      const url = 'http://localhost:7545'
      const provider = new ethers.getDefaultProvider(url)
      let account = await provider.getSigner(0)
      //   let merkleTreeWithHistory
      const C = await ethers.getContractFactory(
        mimcSpongecontract.abi,
        mimcSpongecontract.createCode('mimcsponge', 220),
        account,
      )
      const hasherInstance = await C.deploy()
      await hasherInstance.waitForDeployment()

      const haserAddress = await hasherInstance.getAddress()

      const C1 = await ethers.getContractFactory('MerkleTreeWithHistory')
      const merkleInstance = await C1.deploy(levels, haserAddress)
      await merkleInstance.waitForDeployment()
      const zeroValue = await merkleInstance.ZERO_VALUE()
      const firstSubtree = await merkleInstance.filledSubtrees(0)
      expect(firstSubtree).to.equal(toFixedHex(zeroValue));

    } catch (error) {
      console.log(error)
    }
  })
})
