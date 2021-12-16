'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = exports.Encoder = void 0;
const constructors_1 = require("./constructors");
const types_1 = require("./types");
const buffer_1 = require("buffer");
const BUFFER_SIZE_DEFAULT = 33554432;
class Encoder {
    constructor(options = {}) {
        this.offset = 0;
        this.buffer = buffer_1.Buffer.allocUnsafeSlow(options.size || BUFFER_SIZE_DEFAULT);
        this.constructors = options.constructors || constructors_1.constructors;
    }
    ensureCapacity(len) {
        let minCapacity = this.offset + len;
        if (minCapacity > this.buffer.length) {
            this.grow(minCapacity);
        }
    }
    grow(minCapacity) {
        let oldCapacity = this.buffer.length;
        let newCapacity = oldCapacity << 1;
        if (newCapacity - minCapacity < 0) {
            newCapacity = minCapacity;
        }
        if (newCapacity < 0 && minCapacity < 0) {
            throw new Error('OutOfMemoryError');
        }
        let newBuf = buffer_1.Buffer.allocUnsafeSlow(newCapacity);
        this.buffer.copy(newBuf);
        this.buffer = newBuf;
    }
    reset() {
        this.offset = 0;
    }
    writeString(str) {
        this.ensureCapacity(str.length);
        this.offset += this.buffer.write(str, this.offset);
    }
    writeUInt8(number) {
        this.ensureCapacity(1);
        this.buffer[this.offset++] = number;
    }
    writeUInt32(number) {
        this.ensureCapacity(4);
        this.offset = this.buffer.writeUInt32LE(number, this.offset);
    }
    writeInt32(number) {
        this.ensureCapacity(4);
        this.offset = this.buffer.writeInt32LE(number, this.offset);
    }
    writeDouble(number) {
        this.ensureCapacity(8);
        this.offset = this.buffer.writeDoubleLE(number, this.offset);
    }
    addObjectKey(string) {
        this.writeUInt32(buffer_1.Buffer.byteLength(string));
        this.writeString(string);
    }
    addObjectString(string) {
        this.writeUInt8(types_1.TYPES.string);
        this.writeUInt32(buffer_1.Buffer.byteLength(string));
        this.writeString(string);
    }
    addNumber(number) {
        if (Number.isInteger(number)) {
            return this.addInteger(number);
        }
        return this.addFloat(number);
    }
    addInteger(number) {
        if (number < 0) {
            if (number >= -0x80000000) {
                this.writeUInt8(types_1.TYPES.int);
                this.writeInt32(number);
            }
            else {
                this.addFloat(number);
            }
        }
        else {
            if (number < 0x100000000) {
                this.writeUInt8(types_1.TYPES.uint);
                this.writeUInt32(number);
            }
            else {
                this.addFloat(number);
            }
        }
    }
    addFloat(number) {
        this.writeUInt8(types_1.TYPES.double);
        this.writeDouble(number);
    }
    addBigInt(number) {
        if (number < 0) {
            this.writeUInt8(types_1.TYPES.bigint);
            this.offset = this.buffer.writeBigInt64LE(number, this.offset);
        }
        else {
            this.writeUInt8(types_1.TYPES.biguint);
            this.offset = this.buffer.writeBigUInt64LE(number, this.offset);
        }
    }
    addCustomType(item, constructorName) {
        const { args, code } = this.itemToConstructable(item, constructorName);
        if (code < 0x100000000) {
            this.writeUInt8(types_1.TYPES.constructorN);
            this.writeUInt32(code);
        }
        else {
            throw `Code ${code} is too big for a constructor`;
        }
        this.encodeItem(args, 'object');
    }
    itemToConstructable(item, constructorName) {
        const entry = this.constructors[constructorName];
        if (entry) {
            return {
                code: entry.code,
                args: entry.args(item),
            };
        }
        throw `Encoding of item ${item} is not supported`;
    }
    encodeObjectValue(value) {
        const type = typeof value;
        if (type === 'string') {
            this.addObjectString(value);
        }
        else {
            this.encodeItem(value, type);
        }
    }
    encodeItem(item, type) {
        switch (type) {
            case 'undefined':
                return this.writeUInt8(types_1.TYPES.undefined);
            case 'number':
                return this.addNumber(item);
            case 'bigint':
                return this.addBigInt(item);
            case 'boolean':
                return this.writeUInt8(item ? types_1.TYPES.true : types_1.TYPES.false);
            case 'object': {
                if (item === null) {
                    return this.writeUInt8(types_1.TYPES.null);
                }
                else if (Array.isArray(item)) {
                    this.writeUInt8(types_1.TYPES.arrayStart);
                    const length = item.length;
                    for (let i = 0; i < length; i++) {
                        this.encodeObjectValue(item[i]);
                    }
                    return this.writeUInt8(types_1.TYPES.arrayEnd);
                }
                const constructorName = item.constructor.name;
                switch (constructorName) {
                    case 'Object': {
                        this.writeUInt8(types_1.TYPES.objectStart);
                        Object.keys(item).forEach((key) => {
                            this.addObjectKey(key);
                            this.encodeObjectValue(item[key]);
                        });
                        return this.writeUInt8(types_1.TYPES.objectEnd);
                    }
                    case 'Set': {
                        this.writeUInt8(types_1.TYPES.setStart);
                        for (const value of item) {
                            this.encodeObjectValue(value);
                        }
                        return this.writeUInt8(types_1.TYPES.setEnd);
                    }
                    case 'Map': {
                        this.writeUInt8(types_1.TYPES.mapStart);
                        for (const [key, value] of item) {
                            this.encodeObjectValue(key);
                            this.encodeObjectValue(value);
                        }
                        return this.writeUInt8(types_1.TYPES.mapEnd);
                    }
                    case 'Buffer': {
                        const length = item.length;
                        this.writeUInt8(types_1.TYPES.bin);
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
    encode(data) {
        this.reset();
        this.encodeItem(data, typeof data);
        return this.buffer.slice(0, this.offset);
    }
}
exports.Encoder = Encoder;
class Decoder {
    constructor(options = {}) {
        this.constructors = new Map();
        this.offset = 0;
        this.strings = 0;
        this.map = new Array(options.mapSize || 256 * 1000);
        this.offset = 0;
        this.strings = 0;
        let _constructors = options.constructors || constructors_1.constructors;
        for (let item in _constructors) {
            this.constructors.set(_constructors[item].code, _constructors[item].build);
        }
    }
    reset() {
        this.offset = 0;
        this.strings = 0;
    }
    readKey() {
        const length = this.readUInt32();
        return this.readString(length);
    }
    readBlock() {
        const blockType = this.readUInt8();
        switch (blockType) {
            case types_1.TYPES.uint:
                return this.readUInt32();
            case types_1.TYPES.int:
                return this.readInt32();
            case types_1.TYPES.double:
                return this.readDouble();
            case types_1.TYPES.bigint:
                return this.readBigInt();
            case types_1.TYPES.biguint:
                return this.readBigUInt();
            case types_1.TYPES.false:
                return false;
            case types_1.TYPES.true:
                return true;
            case types_1.TYPES.null:
                return null;
            case types_1.TYPES.undefined:
                return undefined;
            case types_1.TYPES.objectStart: {
                const obj = {};
                let curr = this.buffer[this.offset];
                while (curr !== types_1.TYPES.objectEnd) {
                    obj[this.readKey()] = this.readBlock();
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return obj;
            }
            case types_1.TYPES.arrayStart: {
                const arr = new Array();
                let i = 0;
                let curr = this.buffer[this.offset];
                while (curr !== types_1.TYPES.arrayEnd) {
                    arr[i++] = this.readBlock();
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return arr;
            }
            case types_1.TYPES.mapStart: {
                const map = new Map();
                let curr = this.buffer[this.offset];
                while (curr !== types_1.TYPES.mapEnd) {
                    map.set(this.readBlock(), this.readBlock());
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return map;
            }
            case types_1.TYPES.setStart: {
                const set = new Set();
                let curr = this.buffer[this.offset];
                while (curr !== types_1.TYPES.setEnd) {
                    set.add(this.readBlock());
                    curr = this.buffer[this.offset];
                }
                this.offset++;
                return set;
            }
            case types_1.TYPES.constructorN: {
                const code = this.readUInt32();
                const args = this.readBlock();
                const build = this.constructors.get(code);
                if (build) {
                    // @ts-ignore
                    return build(...args);
                }
                else {
                    throw `Constructor ${code} is unknown`;
                }
            }
            case types_1.TYPES.bin: {
                const length = this.readUInt32();
                const buf = this.buffer.slice(this.offset, this.offset + length);
                this.offset += length;
                return buf;
            }
            case types_1.TYPES.string: {
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
    readUInt8() {
        return this.buffer[this.offset++];
    }
    readUInt32() {
        const number = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return number;
    }
    readInt32() {
        const number = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return number;
    }
    readDouble() {
        const double = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return double;
    }
    readBigInt() {
        const bigint = this.buffer.readBigInt64LE(this.offset);
        this.offset += 8;
        return bigint;
    }
    readBigUInt() {
        const bigint = this.buffer.readBigUInt64LE(this.offset);
        this.offset += 8;
        return bigint;
    }
    readString(length) {
        const str = this.buffer.toString('utf8', this.offset, this.offset + length);
        this.offset += length;
        return str;
    }
    decode(buffer) {
        this.buffer = buffer;
        this.reset();
        return this.readBlock();
    }
}
exports.Decoder = Decoder;
