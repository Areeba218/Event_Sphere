// Floor-plan helpers. Booths are laid out on a grid: B01..Bnn, `columns` booths per row.
function boothCoords(booth) {
  const match = String(booth.boothNumber || '').match(/(\d+)$/);
  const index = match ? Number(match[1]) - 1 : 0;
  const columns = booth.columns || 6;
  return { x: index % columns, y: Math.floor(index / columns) };
}

// Two different booths are neighbours when they touch on the grid (including diagonals).
function areNeighbors(a, b) {
  if (String(a._id) === String(b._id) || String(a.event) !== String(b.event)) return false;
  const p = boothCoords(a);
  const q = boothCoords(b);
  return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) === 1;
}

module.exports = { boothCoords, areNeighbors };
