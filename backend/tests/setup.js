// Lets the test files use a Jest-like API on top of Mocha (Jest's sandbox is incompatible with the MongoDB driver).
const { expect } = require('expect');
global.expect = expect;
global.test = (...a) => global.it(...a);
global.beforeAll = (...a) => global.before(...a);
global.afterAll = (...a) => global.after(...a);
