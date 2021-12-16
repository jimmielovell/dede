const { Encoder, Decoder } = require('..');

const encoder = new Encoder();
const decoder = new Decoder();

test('Encode dates', function() {
  const date = new Date();
  const encoded = encoder.encode(date);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Date);
  expect(decoded).toEqual(date);
});

test('Encode sets', function() {
  const set = new Set(['Nairobi', 2, 3]);
  const encoded = encoder.encode(set);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Set);
  expect(decoded).toEqual(set);
});

test('Encode maps', () => {
  const map = new Map([
    [1, 2],
    [2, 3],
  ]);
  const encoded = encoder.encode(map);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(Map);
  expect(decoded).toEqual(map);
});

test('Encode integers', () => {
  const integers = [0x10, 0x100, 0x10000, 0x100000000];
  const encoded = encoder.encode(integers);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(integers);
});

test('Encode negative integers', () => {
  const integers = [-0x10, -0x100, -0x10000, -0x100000000];
  const encoded = encoder.encode(integers);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(integers);
});

test('Encode floats', () => {
  const float = 3.14;
  const encoded = encoder.encode(float);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toEqual('number');
  expect(decoded).toEqual(float);
});

test('Encode array of floats', () => {
  const floats = [3.14, 3.14];
  const encoded = encoder.encode(floats);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(floats);
});

test('Encode big array', () => {
  const strings = new Array(0x10000).fill('X');
  const encoded = encoder.encode(strings);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(strings);
});

test('Encode big strings', () => {
  const strings = ['a'.repeat(0x100), 'b'.repeat(0x10000)];
  const encoded = encoder.encode(strings);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(strings);
});

test('Encode boolean', () => {
  const t = true;
  const encoded = encoder.encode(t);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toEqual('boolean');
  expect(decoded).toEqual(t);
});

test('Encode regex', () => {
  const regex = /SIA+/i;
  const encoded = encoder.encode(regex);
  const decoded = decoder.decode(encoded);
  expect(decoded).toBeInstanceOf(RegExp);
  expect(decoded).toEqual(regex);
});

test('Encode strings', () => {
  const string = 'Hello world!';
  const encoded = encoder.encode(string);
  const decoded = decoder.decode(encoded);
  expect(typeof decoded).toBe('string');
  expect(decoded).toEqual(string);
});

test('Encode arrays', () => {
  const array = [1, 2, 3];
  const encoded = encoder.encode(array);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(array);
});

test('Encode objects', () => {
  const object = { abc: { xyz: 100 } };
  const encoded = encoder.encode(object);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(object);
});

test('Encode undefined', () => {
  const object = { abc: { xyz: undefined } };
  const encoded = encoder.encode(object);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(object);
});

test('Encode custom classes', () => {
  class City {
    constructor(name) {
      this.name = name;
    }
  }
  const constructors = [
    {
      constructor: City,
      code: 2,
      args: (item) => [item.name],
      build: (name) => new City(name),
    },
  ];
  const city = new City('Sokovya');
  const decoded = (new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(city));
  expect(decoded).toBeInstanceOf(City);
  expect(decoded.name).toEqual('Sokovya');
});

test('Encode buffer', () => {
  const buf = Buffer.alloc(0x10000);
  const encoded = encoder.encode(buf);
  const decoded = decoder.decode(encoded);
  expect(decoded).toEqual(buf);
});

test('Throw on custom classes with huge code size', () => {
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
      build: (name) => new City(name),
    },
  ];
  const city = new City('Sokovya');
  const decoded = () => (new Decoder({ constructors })).decode((new Encoder({ constructors })).encode(city));
  expect(decoded).toThrow(`Code ${0x1000000000} too big for a constructor`);
});

test('Throw on unknow constructor, uint8', () => {
  class City {
    constructor(name) {
      this.name = name;
    }
  }
  const constructors = [
    {
      constructor: City,
      code: 0x10,
      args: (item) => [item.name],
      build: (name) => new City(name),
    },
  ];
  const city = new City('Sokovya');
  const decoded = () => (new Decoder({ constructors: [] })).decode((new Encoder({ constructors })).encode(city));
  expect(decoded).toThrow(`Constructor ${0x10} is unknown`);
});

test('Throw on unsupported class', () => {
  const constructors = [];
  const date = new Date();
  expect(() =>(new Encoder()).encode(date)).toThrow(
    `Serialization of item ${date} is not supported`
  );
});

test('Throw on unsupported type', () => {
  const buf = Buffer.from([0x42]);
  expect(() => (new Decoder()).decode(buf)).toThrow('Unsupported type: 66');
});

test('Throw on huge array', () => {
  const length = 0x100000000;
  const hugeArray = new Proxy([], {
    get(target, prop, receiver) {
      if (prop === 'length') return length;
      return Reflect.get(target, prop, receiver);
    },
  });
  expect(() => (new Encoder()).encode(hugeArray)).toThrow(
    `Array of size ${length} is too big to encode`
  );
});

test('Throw on huge buffer', () => {
  const length = 0x100000000;
  const hugeArray = new Proxy(Buffer.alloc(100), {
    get(target, prop, receiver) {
      if (prop === 'length') return length;
      return Reflect.get(target, prop, receiver);
    },
  });
  expect(() => (new Encoder()).encode(hugeArray)).toThrow(
    `Buffer of size ${length} is too big to encode`
  );
});
