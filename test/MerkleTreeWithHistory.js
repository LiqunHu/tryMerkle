const { expect } = require('chai')
const { ethers } = require('hardhat')
const { mimcSpongecontract, buildMimcSponge } = require('circomlibjs')
const { MerkleTree } = require('fixed-merkle-tree')
const { createHash } = require('crypto')

function toFixedHex(number, length = 32) {
  let str = BigInt(number).toString(16)
  while (str.length < length * 2) str = '0' + str
  str = '0x' + str
  return str
}

describe('MerkleTreeWithHistory', async function () {
  // let provider
  const levels = 10
  let account
  let tree
  let hasherInstance
  let merkleInstance
  let snapshotId

  before(async () => {
    try {
      // const url = 'http://localhost:7545'
      // provider = new ethers.getDefaultProvider(url)
      // setProvider(provider)
      // snapshotId = await takeSnapshot()
      const mimcsponge = await buildMimcSponge()
      const mimcHash = (left, right) =>
        '0x' + mimcsponge.F.toString(mimcsponge.multiHash([left, right]), 16)
      console.log(mimcHash(0, 0))
      tree = new MerkleTree(levels, [], {
        hashFunction: mimcHash,
        zeroElement:
          '21663839004416932945382355908790599225266501822907911457504978515578255421292',
      })
      const [owner] = await ethers.getSigners()
      account = owner
      const C = await ethers.getContractFactory(
        mimcSpongecontract.abi,
        mimcSpongecontract.createCode('mimcsponge', 220),
        account,
      )
      hasherInstance = await C.deploy()
      await hasherInstance.waitForDeployment()

      // const hashout = await hasherInstance.MiMCSponge(0, 0, 0)
      // console.log(hashout)

      const haserAddress = await hasherInstance.getAddress()
      const C1 = await ethers.getContractFactory('MerkleTreeWithHistoryMock')
      merkleInstance = await C1.deploy(levels, haserAddress)
      await merkleInstance.waitForDeployment()
      // snapshotId = await takeSnapshot()
    } catch (error) {
      console.log(error)
    }
  })

  describe('#constructor', () => {
    it('should initialize', async function () {
      try {
        //   let merkleTreeWithHistory
        const zeroValue = await merkleInstance.ZERO_VALUE()
        const firstSubtree = await merkleInstance.filledSubtrees(0)
        expect(firstSubtree).to.equal(toFixedHex(zeroValue))
      } catch (error) {
        console.log(error)
      }
    })
  })

  describe('#insert', () => {
    it('should insert', async () => {
      try {
        let rootFromContract

        for (let i = 1; i < 11; i++) {
          await merkleInstance.insert(toFixedHex(i), { address: account })
          tree.insert(i)
          rootFromContract = await merkleInstance.getLastRoot()
          expect(toFixedHex(tree.root)).to.equal(rootFromContract.toString())
        }
      } catch (error) {
        console.log(error)
      }
    })

    it('should reject if tree is full', async () => {
      const levels = 6
      const merkleTreeWithHistory = await MerkleTreeWithHistory.new(
        levels,
        hasherInstance.address,
      )

      for (let i = 0; i < 2 ** levels; i++) {
        await merkleTreeWithHistory.insert(toFixedHex(i + 42)).should.be
          .fulfilled
      }

      let error = await merkleTreeWithHistory.insert(toFixedHex(1337)).should.be
        .rejected
      error.reason.should.be.equal(
        'Merkle tree is full. No more leaves can be added',
      )

      error = await merkleTreeWithHistory.insert(toFixedHex(1)).should.be
        .rejected
      error.reason.should.be.equal(
        'Merkle tree is full. No more leaves can be added',
      )
    })

    it.skip('hasher gas', async () => {
      const levels = 6
      const merkleTreeWithHistory = await MerkleTreeWithHistory.new(levels)
      const zeroValue = await merkleTreeWithHistory.zeroValue()

      const gas = await merkleTreeWithHistory.hashLeftRight.estimateGas(
        zeroValue,
        zeroValue,
      )
      console.log('gas', gas - 21000)
    })
  })
})
