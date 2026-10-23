// CSV builder with protection against spreadsheet formula injection.
function cell(value) {
  let v = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
const toCsv = (rows) => rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
module.exports = { toCsv, cell };
