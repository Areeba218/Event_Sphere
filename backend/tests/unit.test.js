const { toCsv, cell } = require('../utils/csv');
const { boothCoords, areNeighbors } = require('../utils/booths');
const { passwordProblem, safeUrl, isObjectId } = require('../utils/validators');
const sanitize = require('../middleware/sanitize');

describe('csv', () => {
  test('quotes commas, quotes and newlines', () => expect(cell('a,"b"\nc')).toBe('"a,""b""\nc"'));
  test('neutralises spreadsheet formulas', () => expect(cell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)"));
  test('builds rows', () => expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2\r\n'));
});

describe('booth floor plan', () => {
  const b = (n, id = n) => ({ _id: id, event: 'e1', boothNumber: `B${String(n).padStart(2, '0')}`, columns: 6 });
  test('coordinates', () => { expect(boothCoords(b(1))).toEqual({ x: 0, y: 0 }); expect(boothCoords(b(8))).toEqual({ x: 1, y: 1 }); });
  test('neighbours include row, column and diagonal', () => { expect(areNeighbors(b(8), b(9))).toBe(true); expect(areNeighbors(b(8), b(2))).toBe(true); expect(areNeighbors(b(8), b(3))).toBe(true); });
  test('non neighbours and itself', () => { expect(areNeighbors(b(1), b(3))).toBe(false); expect(areNeighbors(b(1), b(1))).toBe(false); });
  test('different events never neighbour', () => expect(areNeighbors(b(1), { ...b(2), event: 'e2' })).toBe(false));
});

describe('validators', () => {
  test('password rules', () => { expect(passwordProblem('short1')).toBeTruthy(); expect(passwordProblem('onlyletters')).toBeTruthy(); expect(passwordProblem('12345678')).toBeTruthy(); expect(passwordProblem('Passw0rd!')).toBeNull(); });
  test('safeUrl', () => { expect(safeUrl('https://x.com/a.png')).toBe('https://x.com/a.png'); expect(safeUrl('javascript:alert(1)')).toBeNull(); expect(safeUrl('/uploads/' + 'a'.repeat(32) + '.png')).toBeTruthy(); expect(safeUrl('/uploads/../etc/passwd')).toBeNull(); expect(safeUrl('')).toBe(''); });
  test('isObjectId', () => { expect(isObjectId('a'.repeat(24))).toBe(true); expect(isObjectId('xyz')).toBe(false); expect(isObjectId({ $gt: '' })).toBe(false); });
});

describe('sanitize middleware', () => {
  test('removes operator keys', () => {
    const req = { body: { email: { $gt: '' }, 'a.b': 1, ok: { nested: { $ne: 1, fine: 2 } } } };
    sanitize(req, {}, () => {});
    expect(req.body).toEqual({ email: {}, ok: { nested: { fine: 2 } } });
  });
});
