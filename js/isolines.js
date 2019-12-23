/*jshint esversion: 8 */
exports.makeThresholdPaths = makeThresholdPaths;

const SEGS = [
  [],                                       // 0, no contour
  [{s1: 'L', s2: 'B'}],                     // 1
  [{s1: 'R', s2: 'B'}],                     // 2
  [{s1: 'L', s2: 'R'}],                     // 3
  [{s1: 'T', s2: 'R'}],                     // 4
  [{s1: 'L', s2: 'T'}, {s1: 'B', s2: 'R'}], // 5, saddle
  [{s1: 'B', s2: 'T'}],                     // 6
  [{s1: 'L', s2: 'T'}],                     // 7
  [{s1: 'L', s2: 'T'}],                     // 8
  [{s1: 'B', s2: 'T'}],                     // 9
  [{s1: 'L', s2: 'B'}, {s1: 'T', s2: 'R'}], // 10, saddle
  [{s1: 'T', s2: 'R'}],                     // 11
  [{s1: 'L', s2: 'R'}],                     // 12
  [{s1: 'R', s2: 'B'}],                     // 13
  [{s1: 'L', s2: 'B'}],                     // 14
  [],                                       // 15, no contour
];

function makeThresholdPaths(thresholds, scale, data) {
  if (!data) return;
  return marching_squares(thresholds, scale, data);
}

function marching_squares(thresholds, scale, data) {
  let max = -Infinity;
  let min = Infinity;
  data.forEach (function(row) {
    row.forEach (function(val) {
      if (val > max) max = val;
      if (val < min) min = val;
    });
  });
  const rows = data.length - 1;
  const cols = data[0].length - 1;
  const thresholdPaths = [];
  for (const threshold of thresholds) {
    const path = marching_squares_threshold(data.map (function(row) {
      return row.map (function(val) {
        return (val >= threshold) ? 0 : 1; // flipped, 0 if above
      });
    }), rows, cols, threshold, min, max, scale, data);
    thresholdPaths.push(path);
  }
  return thresholdPaths;
}

function marching_squares_threshold(filtered, rows, cols, threshold, min, max, scale, data) {
  const cells = new Array(rows);
  for (let i = 0; i < rows; i++) {
    cells[i] = new Array(cols);
    for (let j = 0; j < cols; j++) {
      // remember: cells stored in [row][col], or [y][x]
      const TL = filtered[i][j];
      const TR = filtered[i][j+1];
      const BL = filtered[i+1][j];
      const BR = filtered[i+1][j+1];
      let idx = 8 * TL + 4 * TR + 2 * BR + BL;
      if (idx == 5 || idx == 10) {
        const avg = (data[i][j] + data[i+1][j] + data[i][j+1] + data[i+1][j+1]) / 4;
        if (avg > threshold) idx = (idx == 5) ? 10 : 5;
      }
      cells[i][j] = idx;
    }
  }
  return makePaths(cells, threshold, min, max, scale, data);
}

function interp(a, b, threshold) {
  return (threshold - a) / (b - a);
}

function pointForSide(row, col, threshold, side, data) {
  const point = {};
  switch (side) {
    case 'B':
      point.y = 1;
      point.x = interp(data[row+1][col], data[row+1][col+1], threshold);
      break;
    case 'T':
      point.y = 0;
      point.x = interp(data[row][col], data[row][col+1], threshold);
      break;
    case 'L':
      point.x = 0;
      point.y = interp(data[row][col], data[row+1][col], threshold);
      break;
    case 'R':
       point.x = 1;
       point.y = interp(data[row][col+1], data[row+1][col+1], threshold);
       break;
  }
  return point;
}

function makePaths(cells, threshold, min, max, scale, data) {
  const path = [];
  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < cells[0].length; col++) {
      SEGS[cells[row][col]].forEach( function(seg) {
        const p1 = pointForSide(row, col, threshold, seg.s1, data);
        const p2 = pointForSide(row, col, threshold, seg.s2, data);
        const point1 = ({x: col * scale + p1.x * scale, y: row * scale + p1.y * scale});
        path.push(point1);
        const point2 = ({x: col * scale + p2.x * scale, y: row * scale + p2.y * scale});
        path.push(point2);
      });
    }
  }
  return path;
}

// const data = [
//   [0, 0, 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0],
//   [ 0, 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0],
//   [ 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0],
//   [ 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0],
//   [ 0, 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0],
//   [ 0, 0, 0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0],
//   [ 0, 0, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0, 0, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0],
//   [ 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0],
//   [ 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0, 0],
//   [ 0, 0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0]
// ]

// console.time('all')
// const scale = 10
// const thresholds = [1, 0.1, 0.2]
// const paths = makeThresholdPaths(thresholds, scale);
// console.log(paths);
// console.timeEnd('all')