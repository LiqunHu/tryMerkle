const { expect } = require('chai')
const { network, ethers } = require('hardhat')
const { mimcSpongecontract, buildMimcSponge } = require('circomlibjs')
const { MerkleTree } = require('fixed-merkle-tree')
const {
  setProvider,
  takeSnapshot,
  revertSnapshot,
} = require('../utils/ganache')
require('chai').use(require('chai-as-promised')).should()

function toFixedHex(number, length = 32) {
  let str = BigInt(number).toString(16)
  while (str.length < length * 2) str = '0' + str
  str = '0x' + str
  return str
}

describe('MerkleTreeWithHistory', async function () {
  // let provider
  const levels = 10
  const ZERO_ELEMENT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'
  let mimcHash
  let account
  let tree
  let hasherInstance
  let merkleInstance
  let snapshotId

  before(async () => {
    try {
      // const url = 'http://localhost:7545'
      // provider = new ethers.getDefaultProvider(url)
      const mimcSponge = await buildMimcSponge()
      mimcHash = (left, right) =>
        '0x' + mimcSponge.F.toString(mimcSponge.multiHash([left, right]), 16)
      tree = new MerkleTree(levels, [], {
        hashFunction: mimcHash,
        zeroElement: ZERO_ELEMENT,
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
      setProvider(network.provider)
      snapshotId = await takeSnapshot()
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
      const haserAddress = await hasherInstance.getAddress()
      const C = await ethers.getContractFactory('MerkleTreeWithHistoryMock')
      merkleTreeWithHistory = await C.deploy(levels, haserAddress)
      await merkleTreeWithHistory.waitForDeployment()

      for (let i = 0; i < 2 ** levels; i++) {
        expect(merkleTreeWithHistory.insert(toFixedHex(i + 42))).to.eventually
      }

      expect(merkleTreeWithHistory.insert(toFixedHex(1337))).to.be.rejectedWith(
        'Merkle tree is full. No more leaves can be added',
      )

      expect(merkleTreeWithHistory.insert(toFixedHex(1))).to.be.rejectedWith(
        'Merkle tree is full. No more leaves can be added',
      )
    })

    // it('hasher gas', async () => {
    //   const levels = 6
    //   const haserAddress = await hasherInstance.getAddress()
    //   const C = await ethers.getContractFactory('MerkleTreeWithHistoryMock')
    //   merkleTreeWithHistory = await C.deploy(levels, haserAddress)
    //   await merkleTreeWithHistory.waitForDeployment()

    //   const zeroValue = await merkleTreeWithHistory.ZERO_VALUE()

    //   const gas = await merkleTreeWithHistory.hashLeftRight.estimateGas(
    //     zeroValue,
    //     zeroValue,
    //   )
    //   console.log('gas', gas - 21000)
    // })
  })

  describe('#isKnownRoot', () => {
    it('should work', async () => {
      for (let i = 1; i < 5; i++) {
        await merkleInstance.insert(toFixedHex(i), { from: account })
        await tree.insert(i)
        let isKnown = await merkleInstance.isKnownRoot(toFixedHex(tree.root))
        expect(isKnown).be.equal(true)
      }

      await merkleInstance.insert(toFixedHex(42), { from: account })
      // check outdated root
      let isKnown = await merkleInstance.isKnownRoot(toFixedHex(tree.root))
      isKnown.should.be.equal(true)
    })

    it('should not return uninitialized roots', async () => {
      await merkleInstance.insert(toFixedHex(42), { from: account }).should.be.fulfilled
      let isKnown = await merkleInstance.isKnownRoot(toFixedHex(0))
      isKnown.should.be.equal(false)
    })
  })

  afterEach(async () => {
    await revertSnapshot(snapshotId)
    // eslint-disable-next-line require-atomic-updates
    snapshotId = await takeSnapshot()
    tree = new MerkleTree(levels, [], {
      hashFunction: mimcHash,
      zeroElement: ZERO_ELEMENT,
    })
  })
})
