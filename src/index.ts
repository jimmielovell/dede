'use strict';

import { constructors } from './constructors';
import { TYPES } from './types';
import { Buffer } from 'buffer';

const BUFFER_SIZE_DEFAULT = 33554432;

export class Encoder {
  buffer: Buffer;
  offset: number = 0;
  constructors;

  constructor(options: { size?: number, constructors?: {} } = {}) {
    this.buffer = Buffer.allocUnsafeSlow(options.size || BUFFER_SIZE_DEFAULT);
    this.constructors = options.constructors || constructors;
  }

  ensureCapacity(len: number) {
    let minCapacity = this.offset + len;
    if (minCapacity > this.buffer.length) {
      this.grow(minCapacity);
    }
  }

  grow(minCapacity: number) {
    let oldCapacity = this.buffer.length;
    let newCapacity = oldCapacity << 1;
    if (newCapacity - minCapacity < 0) {
      newCapacity = minCapacity;
    }

    if (newCapacity < 0 && minCapacity < 0) {
      throw new Error('OutOfMemoryError');
    }

    let newBuf = Buffer.allocUnsafeSlow(newCapacity);
    this.buffer.copy(newBuf);
    this.buffer = newBuf;
  }

  private reset() {
    this.offset = 0;
  }

  private writeString(str: string) {
    this.ensureCapacity(str.length);
    this.offset += this.buffer.write(str, this.offset);
  }

  private writeUInt8(number: number) {
    this.ensureCapacity(1);
    this.buffer[this.offset++] = number;
  }

  private writeUInt32(number: number) {
    this.ensureCapacity(4);
    this.offset = this.buffer.writeUInt32LE(number, this.offset);
  }

  private writeInt32(number: number) {
    this.ensureCapacity(4);
    this.offset = this.buffer.writeInt32LE(number, this.offset);
  }

  private writeDouble(number: number) {
    this.ensureCapacity(8);
    this.offset = this.buffer.writeDoubleLE(number, this.offset);
  }

  private addObjectKey(string: string) {
    this.writeUInt32(Buffer.byteLength(string));
    this.writeString(string);
  }

  private addObjectString(string: string) {
    this.writeUInt8(TYPES.string);
    this.writeUInt32(Buffer.byteLength(string));
    this.writeString(string);
  }

  private addNumber(number: number) {
    if (Number.isInteger(number)) {
      return this.addInteger(number);
    }
    return this.addFloat(number);
  }

  private addInteger(number: number) {
    if (number < 0) {
      if (number >= -0x80000000) {
        this.writeUInt8(TYPES.int);
        this.writeInt32(number);
      } else {
        this.addFloat(number);
      }
    } else {
      if (number < 0x100000000) {
        this.writeUInt8(TYPES.uint);
        this.writeUInt32(number);
      } else {
        this.addFloat(number);
      }
    }
  }

  private addFloat(number: number) {
    this.writeUInt8(TYPES.double);
    this.writeDouble(number);
  }

  private addBigInt(number: bigint) {
    if (number < 0) {
      this.writeUInt8(TYPES.bigint);
      this.offset = this.buffer.writeBigInt64LE(number, this.offset);
    } else {
      this.writeUInt8(TYPES.biguint);
      this.offset = this.buffer.writeBigUInt64LE(number, this.offset);
    }
  }

  private addCustomType(item: any, constructorName: string) {
    const { args, code } = this.itemToConstructable(item, constructorName);
    if (code < 0x100000000) {
      this.writeUInt8(TYPES.constructorN);
      this.writeUInt32(code);
    } else {
      throw `Code ${code} is too big for a constructor`;
    }
    this.encodeItem(args, 'object');
  }

  private itemToConstructable(item: any, constructorName: string): { code: number, args: [] } {
    const entry = this.constructors[constructorName];
    if (entry) {
      return {
        code: entry.code,
        args: entry.args(item),
      };
    }

    throw `Encoding of item ${constructorName} is not supported`;
  }

  encodeObjectValue(value) {
    const type = typeof value;
    if (type === 'string') {
      this.addObjectString(value);
    } else {
      this.encodeItem(value, type);
    }
  }

  private encodeItem(item: any, type: string) {
    switch (type) {
      case 'undefined':
        return this.writeUInt8(TYPES.undefined);
      case 'number':
        return this.addNumber(item);
      case 'bigint':
        return this.addBigInt(item);
      case 'boolean':
        return this.writeUInt8(item ? TYPES.true : TYPES.false);
      case 'object': {
        if (item === null) {
          return this.writeUInt8(TYPES.null);
        } else if (Array.isArray(item)) {
          this.writeUInt8(TYPES.arrayStart);
          const length = item.length;
          for (let i = 0; i < length; i++) {
            this.encodeObjectValue(item[i]);
          }
          return this.writeUInt8(TYPES.arrayEnd);
        }

        const constructorName = item.constructor.name;
        switch (constructorName) {
          case 'Object': {
            this.writeUInt8(TYPES.objectStart);
            Object.keys(item).forEach((key) => {
              this.addObjectKey(key);
              this.encodeObjectValue(item[key]);
            });
            return this.writeUInt8(TYPES.objectEnd);
          }
          case 'Set': {
            this.writeUInt8(TYPES.setStart);
            for (const value of item) {
              this.encodeObjectValue(value);
            }
            return this.writeUInt8(TYPES.setEnd);
          }
          case 'Map': {
            this.writeUInt8(TYPES.mapStart);
            for (const [key, value] of item) {
              this.encodeObjectValue(key);
              this.encodeObjectValue(value);
            }
            return this.writeUInt8(TYPES.mapEnd);
          }
          case 'Buffer': {
            const length = item.length;
            this.writeUInt8(TYPES.buffer);
            this.writeUInt32(length);
            item.copy(this.buffer, this.offset);
            this.offset += length;
            return;
          }
          default:
            return this.addCustomType(item, constructorName);
        }
      }
      case 'string':
        return this.writeString(item);
    }
  }

  encode(data: any, constructor?: {code: number, build: (...any) => any}): Buffer {
    this.reset();
    this.encodeItem(data, typeof data);
    return this.buffer.slice(0, this.offset);
  }
}

export class Decoder {
  map;
  constructors: Map<number, {build: (...any) => any}> = new Map();
  offset: number = 0;
  strings: number = 0;
  buffer: Buffer;
  processingObject: boolean;

  constructor(options: {constructors?, mapSize?: number} = {}) {
    this.map = new Array(options.mapSize || 256 * 1000);
    this.offset = 0;
    this.strings = 0;
    let _constructors = options.constructors || constructors;
    for (let item in _constructors) {
      this.constructors.set(_constructors[item].code, _constructors[item].build);
    }
  }

  private reset() {
    this.offset = 0;
    this.strings = 0;
  }

  private readKey() {
    const length = this.readUInt32();
    return this.readString(length);
  }

  private readBlock() {
    const blockType = this.readUInt8();
    switch (blockType) {
      case TYPES.uint:
        return this.readUInt32();
      case TYPES.int:
        return this.readInt32();
      case TYPES.double:
        return this.readDouble();
      case TYPES.bigint:
        return this.readBigInt();
      case TYPES.biguint:
        return this.readBigUInt();
      case TYPES.false:
        return false;
      case TYPES.true:
        return true;
      case TYPES.null:
        return null;
      case TYPES.undefined:
        return undefined;
      case TYPES.objectStart: {
        const obj = {};
        let curr = this.buffer[this.offset];
        while (curr !== TYPES.objectEnd) {
          obj[this.readKey()] = this.readBlock();
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return obj;
      }
      case TYPES.arrayStart: {
        const arr = new Array();
        let i = 0;
        let curr = this.buffer[this.offset];
        while (curr !== TYPES.arrayEnd) {
          arr[i++] = this.readBlock();
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return arr;
      }
      case TYPES.mapStart: {
        const map = new Map();
        let curr = this.buffer[this.offset];
        while (curr !== TYPES.mapEnd) {
          map.set(this.readBlock(), this.readBlock());
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return map;
      }
      case TYPES.setStart: {
        const set = new Set();
        let curr = this.buffer[this.offset];
        while (curr !== TYPES.setEnd) {
          set.add(this.readBlock());
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return set;
      }
      case TYPES.constructorN: {
        const code = this.readUInt32();
        const args = this.readBlock();
        const build = this.constructors.get(code);
        if (build) {
          // @ts-ignore
          return build(...args);
        } else {
          throw `Constructor ${code} is unknown`;
        }
      }
      case TYPES.buffer: {
        const length = this.readUInt32();
        const buf = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return buf;
      }
      case TYPES.string: {
        const length = this.readUInt32();
        return this.readString(length);
      }
      // Assumed to be string since it's not encoded with type identifier,
      default: {
        this.offset--;
        return this.readString(this.buffer.length);
      }
    }
  }

  private readUInt8() {
    return this.buffer[this.offset++];
  }

  private readUInt32() {
    const number = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return number;
  }

  private readInt32() {
    const number = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return number;
  }

  private readDouble() {
    const double = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return double;
  }

  private readBigInt() {
    const bigint = this.buffer.readBigInt64LE(this.offset);
    this.offset += 8;
    return bigint;
  }

  private readBigUInt() {
    const bigint = this.buffer.readBigUInt64LE(this.offset);
    this.offset += 8;
    return bigint;
  }

  private readString(length) {
    const str = this.buffer.toString('utf8', this.offset, this.offset + length);
    this.offset += length;
    return str;
  }

  decode(buffer: Buffer): any {
    this.buffer = buffer;
    this.reset();
    return this.readBlock();
  }
}
