const { Encoder, Decoder } = require(".");
const cborX = require("cbor-x");
// const fetch = require("node-fetch");
// const deepEqual = require("deep-equal");

const encoder = new Encoder();
const decoder = new Decoder();

function timeInMills(hrtime) {
  return hrtime[0] * 1000 + hrtime[1] / 1000000;
}

// const random = (n) =>
//   [...Array(n)].map(() => (~~(Math.random() * 36)).toString(36)).join("");


// const object = Object.fromEntries(
//   new Array(0x120000).fill().map(() => [random(40), null])
// );

let startTime, encoded, stopTime, decoded;

const strings = new Array(0x1000).fill("X");

const o = [{age: 24, gender: undefined, friends: ['Jenny', 'James'], name: 'Jimmie Lovell'}, 'jimmie', 4534323343434343489n];

// console.log(Buffer.from(JSON.stringify(o, replacer)))
const map = new Map([
  [1, 2],
  [2, 3],
]);

startTime = process.hrtime();
encoded = encoder.encode(map);
decoded = decoder.decode(encoded);
stopTime = process.hrtime();
console.log('Mine', timeInMills(stopTime) - timeInMills(startTime), encoded.length, decoded);
