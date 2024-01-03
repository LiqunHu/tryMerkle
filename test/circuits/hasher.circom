pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/pedersen.circom";

template Hasher() {
    signal input in;
    signal output out[2];

    component pedersen = Pedersen(248);

    component n2b;
    n2b = Num2Bits(248);

    var i;

    in ==> n2b.in;

    for  (i=0; i<248; i++) {
        pedersen.in[i] <== n2b.out[i];
    }

    pedersen.out[0] ==> out[0];
    pedersen.out[1] ==> out[1];
}

component main = Hasher();