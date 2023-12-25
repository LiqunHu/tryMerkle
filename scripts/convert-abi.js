const { ethers } = require('hardhat')

async function main() {
  const jsonAbi = require('../artifacts/contracts/Lock.sol/Lock.json').abi

  const iface = new ethers.Interface(jsonAbi)
  console.log(iface.format(ethers.formatEther.full))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
