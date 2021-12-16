"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPES = void 0;
const typeNames = [
    'null',
    'undefined',
    'uint',
    'int',
    'bigint',
    'biguint',
    'double',
    'record',
    'ref',
    'string',
    'bin',
    'true',
    'false',
    'date',
    'date64',
    'constructorN',
    'arrayStart',
    'arrayEnd',
    'objectStart',
    'objectEnd',
    'setStart',
    'setEnd',
    'mapStart',
    'mapEnd',
];
exports.TYPES = Object.fromEntries(typeNames.map((name, index) => [name, index]));
