const { expect } = require("chai")
const { ethers } = require("hardhat");
const hasher = require('../build/Hasher.json');

function toFixedHex(number, length = 32) {
    let str = bigInt(number).toString(16)
    while (str.length < length * 2) str = '0' + str
    str = '0x' + str
    return str
}

describe("MerkleTreeWithHistory", async function () {
    it("should initialize", async function () {
        let merkleTreeWithHistory
        const hasherInstance = await ethers.getContractFactoryFromArtifact(hasher)
        const HasherInstance = await hasherInstance.deploy();
        await HasherInstance.waitForDeployment();

        
        let levels = 16
        const sender = accounts[0]
        let tree = new MerkleTree(levels)
    })
})