pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/pedersen.circom";

template Hasher() {
    signal input nullifier;
    signal input secret;
    signal output out[2];

    component pedersen = Pedersen(496);

    component nullifierBits = Num2Bits(248);
    component secretBits = Num2Bits(248);
    nullifierBits.in <== nullifier;
    secretBits.in <== secret;

    for  (var i = 0; i<248; i++) {
        pedersen.in[i] <== nullifierBits.out[i];
        pedersen.in[i + 248] <== secretBits.out[i];
    }

    pedersen.out[0] ==> out[0];
    pedersen.out[1] ==> out[1];
}

component main = Hasher();