require('chai').use(require('chai-as-promised')).should()
const { ethers } = require('hardhat')
const { mimcSpongecontract, buildMimcSponge } = require('circomlibjs')
const { MerkleTree } = require('fixed-merkle-tree')
const {
  setProvider,
  takeSnapshot,
  revertSnapshot,
} = require('../utils/ganache')

function toFixedHex(number, length = 32) {
  let str = BigInt(number).toString(16)
  while (str.length < length * 2) str = '0' + str
  str = '0x' + str
  return str
}

describe('ETHTornado', async function () {
  const levels = 20
  const ZERO_ELEMENT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'
  const amount = '1000000000000000000' //1 ether
  let sender
  let operator
  let snapshotId
  let tree
  let mimcHash
  let hasherInstance
  let verifierInstance
  let tornadoInstance

  before(async () => {
    const mimcSponge = await buildMimcSponge()
    mimcHash = (left, right) =>
      '0x' + mimcSponge.F.toString(mimcSponge.multiHash([left, right]), 16)
    tree = new MerkleTree(levels, [], {
      hashFunction: mimcHash,
      zeroElement: ZERO_ELEMENT,
    })
    const [owner] = await ethers.getSigners()
    sender = owner
    operator = owner

    const C = await ethers.getContractFactory(
      mimcSpongecontract.abi,
      mimcSpongecontract.createCode('mimcsponge', 220),
      account,
    )
    hasherInstance = await C.deploy()
    await hasherInstance.waitForDeployment()
    const haserAddress = await hasherInstance.getAddress()

    const C1 = await ethers.getContractFactory('Verifier')
    verifierInstance = await C1.deploy()
    await verifierInstance.waitForDeployment()
    const verifierAddress = await verifierInstance.getAddress()

    const C2 = await ethers.getContractFactory('Tornado')
    tornadoInstance = await C2.deploy(
      verifierAddress,
      haserAddress,
      amount,
      levels,
    )

    setProvider(ethers.provider)
    snapshotId = await takeSnapshot()
  })
})
