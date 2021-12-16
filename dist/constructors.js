"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructors = void 0;
;
exports.constructors = {
    RegExp: {
        code: 0,
        args: (item) => [item.source, item.flags],
        build(pattern, flags) {
            return new RegExp(pattern, flags);
        },
    },
    Date: {
        code: 1,
        args: (item) => [item.valueOf()],
        build(value) {
            return new Date(value);
        },
    },
};
