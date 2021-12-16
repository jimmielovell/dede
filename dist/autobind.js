'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoBind = void 0;
function autoBind(object) {
    for (const key of Object.getOwnPropertyNames(object.constructor.prototype)) {
        if (key !== 'constructor') {
            let desc = Object.getOwnPropertyDescriptor(object.constructor.prototype, key);
            if (desc) {
                if (!desc.configurable) {
                    continue;
                }
                const getter = desc.get && desc.get.bind(object);
                const setter = desc.set && desc.set.bind(object);
                Object.defineProperty(object, key, {
                    get: getter,
                    set: setter,
                    enumerable: desc.enumerable,
                    configurable: desc.configurable
                });
                continue;
            }
            if (typeof (object[key]) === 'function') {
                let method = object[key];
                console.log(method);
                object[key] = method.bind(object);
            }
        }
    }
}
exports.autoBind = autoBind;
