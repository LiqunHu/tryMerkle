// This module is used only for tests
let provider = undefined

async function send(method, params = []) {
    // eslint-disable-next-line no-undef
    await provider.send(method, params)
}

const setProvider = (p) => {
  provider = p
}

const takeSnapshot = async () => {
  return await send('evm_snapshot')
}

const traceTransaction = async (tx) => {
  return await send('debug_traceTransaction', [tx, {}])
}

const revertSnapshot = async (id) => {
  await send('evm_revert', [id])
}

const mineBlock = async (timestamp) => {
  await send('evm_mine', [timestamp])
}

const increaseTime = async (seconds) => {
  await send('evm_increaseTime', [seconds])
}

const minerStop = async () => {
  await send('miner_stop', [])
}

const minerStart = async () => {
  await send('miner_start', [])
}

module.exports = {
  setProvider,
  takeSnapshot,
  revertSnapshot,
  mineBlock,
  minerStop,
  minerStart,
  increaseTime,
  traceTransaction,
}
