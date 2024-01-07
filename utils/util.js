const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto')
const { Buffer } = require('node:buffer')

function randomBigint(nbytes) {
  return BigInt(`0x${randomBytes(nbytes).toString('hex')}`)
}

function buffer2bits(buff) {
  const res = []
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> (7 - j)) & 1) {
        res.push(1)
      } else {
        res.push(0)
      }
    }
  }
  return res
}

function intToLEBuffer(x, bufSize) {
  return Buffer.from(
    BigInt(x)
      .toString(16)
      .padStart(bufSize * 2, '0'),
    'hex',
  ).reverse()
}

function intToBEBuffer(x, bufSize) {
  return Buffer.from(
    BigInt(x)
      .toString(16)
      .padStart(bufSize * 2, '0'),
    'hex',
  )
}

function bigInt2bits(x, len) {
  return BigInt(x).toString(2).padStart(len, '0').split('')
}

function bits2hex(bits) {
  let hex = ''
  // console.log('inputs',bits.join(''))
  for (let i = 0; i < bits.length; i += 4) {
    let chunk = bits.slice(i, i + 4).join('')
    hex += parseInt(chunk, 2).toString(16)
    // console.log('chunk',i,chunk,parseInt(chunk, 2).toString(16))
  }
  return hex
}

function hex2bits(hex) {
  let bits = []
  for (let i = 0; i < hex.length; i++) {
    let chunk = parseInt(hex[i], 16).toString(2).padStart(4, '0')
    bits.push(...chunk.split('').map((it) => parseInt(it)))
  }
  return bits
}

function aes256CtrEncrypt(key, message, iv) {
  const algorithm = 'aes-256-ctr'
  const cipher = createCipheriv(algorithm, key, iv)
  const ciphertext = cipher.update(message, 'utf-8', 'hex')
  return ciphertext
}

function toFixedHex(number, length = 32) {
  return (
    '0x' +
    (number instanceof Buffer
      ? number.toString('hex')
      : BigInt(number).toString(16)
    ).padStart(length * 2, '0')
  )
}

function u8ToHex(buf) {
  return `0x${Buffer.from(buf).toString('hex')}`
}

function unstringifyBigInts(o) {
  if (typeof o == 'string' && (/^[0-9]+$/.test(o) || /^0x[0-9]+$/.test(o))) {
    return BigInt(o)
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts)
  } else if (typeof o == 'object') {
    const res = {}
    for (let k in o) {
      res[k] = unstringifyBigInts(o[k])
    }
    return res
  } else {
    return o
  }
}

module.exports = {
  randomBigint,
  buffer2bits,
  intToLEBuffer,
  intToBEBuffer,
  bigInt2bits,
  bits2hex,
  hex2bits,
  aes256CtrEncrypt,
  u8ToHex,
  toFixedHex,
  unstringifyBigInts,
}
