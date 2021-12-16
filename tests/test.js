const { Encoder, Decoder } = require("..");
const fetch = require("node-fetch");
const deepEqual = require("deep-equal");

const encoder = new Encoder();
const decoder = new Decoder();

const random = (n) =>
  [...Array(n)].map(() => (~~(Math.random() * 36)).toString(36)).join("");

test("Encode dates", function() {
  const date = new Date();
  const encoded = encoder.encode(date);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Date);
  expect(decoded).toEqual(date);
});

test("Encode sets", function() {
  const set = new Set(['Nairobi', 2, 3]);
  const encoded = encoder.encode(set);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Set);
  expect(decoded).toEqual(set);
});

test("Encode maps", () => {
  const map = new Map([
    [1, 2],
    [2, 3],
  ]);
  const encoded = encoder.encode(map);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Map);
  expect(decoded).toEqual(map);
});

test("Encode integers", () => {
  const integers = [0x10, 0x100, 0x10000, 0x100000000];
  const encoded = encoder.encode(integers);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(integers);
});

test("Encode negative integers", () => {
  const integers = [-0x10, -0x100, -0x10000, -0x100000000];
  const encoded = encoder.encode(integers);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(integers);
});

test("Encode floats", () => {
  const float = 3.14;
  const encoded = encoder.encode(float);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toEqual("number");
  expect(decoded).toEqual(float);
});

test("Encode array of floats", () => {
  const floats = [3.14, 3.14];
  const encoded = encoder.encode(floats);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(floats);
});

test("Encode big array", () => {
  const strings = new Array(0x10000).fill("X");
  const encoded = encoder.encode(strings);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(strings);
});

test("Encode string8 keys", () => {
  const object = Object.fromEntries([["a".repeat(61), null]]);
  const encoded = encoder.encode(object);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(object);
});

test("Encode big strings", () => {
  const strings = ["a".repeat(0x100), "b".repeat(0x10000)];
  const encoded = encoder.encode(strings);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(strings);
});

// test("Encode object with big keys", () => {
//   const object = Object.fromEntries([
//     ["a".repeat(0x100), null],
//     ["b".repeat(0x10000), null],
//   ]);
//   const encoded = encoder.encode(object);
//   const decoded = decoder.decode(encoded);
//   expect(decoded).toEqual(object);
// });

test("Encode boolean", () => {
  const t = true;
  const encoded = encoder.encode(t);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toEqual("boolean");
  expect(decoded).toEqual(t);
});

// test("Encode regex", () => {
//   const regex = /SIA+/i;
//   const encoded = encoder.encode(regex);
//   const decoded = decoder.decode(encoded);
//   expect(decoded).toBeInstanceOf(RegExp);
//   expect(decoded).toEqual(regex);
// });

test("Encode strings", () => {
  const string = "Hello world!";
  const encoded = encoder.encode(string);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toBe("string");
  expect(decoded).toEqual(string);
});

test("Encode arrays", () => {
  const array = [1, 2, 3];
  const encoded = encoder.encode(array);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(array);
});

test("Encode objects", () => {
  const object = { abc: { xyz: 100 } };
  const encoded = encoder.encode(object);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(object);
});

test("Encode object with uint16 keys", () => {
  const object = Object.fromEntries(
    new Array(0x1200).fill().map(() => [random(40), null])
  );
  const objects = [object, object];
  const encoded = encoder.encode(objects);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(objects);
});

// test("Encode object with uint32 keys", () => {
//   const object = Object.fromEntries(
//     new Array(0x12000).fill().map(() => [random(40), null])
//   );
//   const objects = [object, object];
//   const encoded = encoder.encode(objects);
//   const decoded = decoder.decode(encoded);
//   expect(decoded).toEqual(objects);
// });

test("Encode undefined", () => {
  const object = { abc: { xyz: undefined } };
  const encoded = encoder.encode(object);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(object);
});

// test("Encode custom classes", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 2,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded = (new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(pouya));
//   expect(decoded).toBeInstanceOf(Person);
//   expect(decoded.name).toEqual("Pouya");
// });

// test("Encode custom classes with uint16 code size", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 0x100,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded = (new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(pouya));
//   expect(decoded).toBeInstanceOf(Person);
//   expect(decoded.name).toEqual("Pouya");
// });

// test("Encode custom classes with uint32 code size", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 0x10000,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded =(new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(pouya));
//   expect(decoded).toBeInstanceOf(Person);
//   expect(decoded.name).toEqual("Pouya");
// });

test("Encode uint8 size buffer", () => {
  const buf = Buffer.alloc(0x10);
  const encoded = encoder.encode(buf);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(buf);
});

test("Encode uint16 size buffer", () => {
  const buf = Buffer.alloc(0x100);
  const encoded = encoder.encode(buf);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(buf);
});

test("Encode uint32 size buffer", () => {
  const buf = Buffer.alloc(0x10000);
  const encoded = encoder.encode(buf);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(buf);
});

test("Throw on custom classes with huge code size", () => {
  class City {
    constructor(name) {
      this.name = name;
    }
  }
  const constructors = [
    {
      constructor: City,
      code: 0x1000000000,
      args: (item) => [item.name],
      build: (name) => new Person(name),
    },
  ];
  const city = new City("Sokovya");
  const decoded = () => (new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(city));
  expect(decoded).toThrow(`Code ${0x1000000000} too big for a constructor`);
});

// test("Throw on unknow constructor, uint8", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 0x10,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded = () => (new Decoder({ constructors: [] })).decode((new Encoder({ constructors })).encode(pouya));
//   expect(decoded).toThrow(`Constructor ${0x10} is unknown`);
// });

// test("Throw on unknow constructor, uint16", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 0x100,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded = () => (new Decoder({ constructors: [] })).decode(new Encoder({ constructors }).encode(pouya));
//   expect(decoded).toThrow(`Constructor ${0x100} is unknown`);
// });

// test("Throw on unknow constructor, uint32", () => {
//   class Person {
//     constructor(name) {
//       this.name = name;
//     }
//   }
//   const constructors = [
//     {
//       constructor: Person,
//       code: 0x10000,
//       args: (item) => [item.name],
//       build: (name) => new Person(name),
//     },
//   ];
//   const pouya = new Person("Pouya");
//   const decoded = () => (new Decoder({ constructors: [] })).decode((new Encoder({ constructors })).encode(pouya));
//   expect(decoded).toThrow(`Constructor ${0x10000} is unknown`);
// });

// test("Throw on unsupported class", () => {
//   const constructors = [];
//   const date = new Date();
//   expect(() =>(new Encoder()).encode(date)).toThrow(
//     `Serialization of item ${date} is not supported`
//   );
// });

// test("Throw on unsupported key type", () => {
//   const constructors = [];
//   const encoder = new Encoder({ constructors });
//   encoder.startObject();
//   encoder.addNull();
//   encoder.addNull();
//   encoder.endObject();
//   const buf = encoder.buffer.subarray(0, 5);
//   expect(() => (new Decoder()).decode(buf)).toThrow(`Key of type 0 is invalid.`);
// });

// test("Throw on unsupported type", () => {
//   const buf = Buffer.from([0x42]);
//   expect(() => (new Decoder()).decode(buf)).toThrow("Unsupported type: 66");
// });

// test("Throw on huge ref", () => {
//   expect(() => (new Encoder()).addRef(999999999999)).toThrow(
//     "Ref size 999999999999 is too big"
//   );
// });

// test("Throw on huge array", () => {
//   const length = 0x100000000;
//   const hugeArray = new Proxy([], {
//     get(target, prop, receiver) {
//       if (prop === "length") return length;
//       return Reflect.get(target, prop, receiver);
//     },
//   });
//   expect(() => (new Encoder()).encode(hugeArray)).toThrow(
//     `Array of size ${length} is too big to encode`
//   );
// });

// test("Throw on huge buffer", () => {
//   const length = 0x100000000;
//   const hugeArray = new Proxy(Buffer.alloc(100), {
//     get(target, prop, receiver) {
//       if (prop === "length") return length;
//       return Reflect.get(target, prop, receiver);
//     },
//   });
//   expect(() => (new Encoder()).encode(hugeArray)).toThrow(
//     `Buffer of size ${length} is too big to encode`
//   );
// });

// test(
//   "Encode huge sample data",
//   async () => {
//     const data = await fetch(
//       "https://github.com/json-iterator/test-data/raw/master/large-file.json"
//     ).then((resp) => resp.json());
//     const encoded = encoder.encode(data);
//     const decoded = decoder.decode(encoded);
//     expect(deepEqual(decoded, data)).toBe(true);
//   },
//   60 * 1000
// );
