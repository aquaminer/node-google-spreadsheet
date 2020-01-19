const _ = require('lodash');

const { GoogleSpreadsheet } = require('../index.js');

const docs = require('./load-test-docs')();
const creds = require('../examples/service-account-creds.json');

const doc = docs.private;

let sheet;
let rows;
let row;

const NUM_ROWS = 10;
const NUM_COLS = 10;

describe('Cell-based operations', () => {
  beforeAll(async () => {
    await doc.useServiceAccountAuth(creds);
    sheet = await doc.addSheet({
      gridProperties: {
        rowCount: NUM_ROWS,
        colCount: NUM_COLS,
      },
    });
  });
  afterAll(async () => {
    await sheet.delete();
  });

  describe('loading cells', () => {
    it('fetches no cells if sheet is empty and no filters given', async () => {
      await sheet.loadCells();
    });

    it('can fetch a specific A1 range', async () => {
      await sheet.loadCells('B2:D5');
    });

    it('throws an error if the range is outside the bounds of the sheet', async () => {
      await sheet.loadCells('B2:D100');
    });
  });

  describe('basic cell functionality', () => {});

  describe('updating cells', () => {
    it('can clear save a single cell');
    it('can clear a single cell');

    it('can update a cell with a string value');
    it('can update a cell with a number value');
    it('can update a cell with a boolean value');
    it('can update a cell with a formula value');
    it('handles a bad formula value properly');
    it('can update a cell formula via .formula');
    it('cannot set a cell value to an object');

    it('can clear a cell by setting value to null');
    it('can clear a cell by setting value to undefined');
    it('can clear a cell by setting value to empty string');

    it('can update multiple cells with one call');
  });
});

//   describe('manipulating cell data', function() {
//     var cell;

//     before(function(done) {
//       sheet.getCells({
//         'return-empty': true
//       }, function(err, cells) {
//         cell = cells[0];
//         done(err);
//       });
//     });

//     it('has row and column numbers', function(done) {
//       sheet.getCells({}, function(err, new_cells) {
//         cell.row.should.equal(1);
//         cell.col.should.equal(1);
//         done(err);
//       });
//     });

//     it('can update a single cell by calling `setValue`', function(done) {
//       cell.setValue('HELLO', function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('HELLO');
//         sheet.getCells({}, function(err, cells) {
//           cells[0].value.should.equal('HELLO');
//           done(err);
//         });
//       });
//     });

//     it('can update a single cell by `save`', function(done) {
//       cell.value = 'GOODBYE';
//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('GOODBYE');
//         sheet.getCells({}, function(err, cells) {
//           cells[0].value.should.equal('GOODBYE');
//           done(err);
//         });
//       });
//     });

//     it('supports `value` to numeric values', function(done) {
//       cell.value = 123;
//       cell.value.should.equal('123');
//       cell.numericValue.should.equal(123);
//       (cell.formula === undefined).should.be.true;

//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('123');
//         cell.numericValue.should.equal(123);
//         (cell.formula === undefined).should.be.true;
//         done();
//       });
//     });

//     it('supports setting `numericValue`', function(done) {
//       cell.numericValue = 456;
//       cell.value.should.equal('456');
//       cell.numericValue.should.equal(456);
//       (cell.formula === undefined).should.be.true;

//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('456');
//         cell.numericValue.should.equal(456);
//         (cell.formula === undefined).should.be.true;
//         done();
//       });
//     });

//     it('throws an error if an invalid `numericValue` is set', function() {
//       var err;
//       try {
//         cell.numericValue = 'abc';
//       } catch (_err) { err = _err; }
//       err.should.be.an.error;
//     });

//     it('supports non-numeric values', function(done) {
//       cell.value = 'ABC';
//       cell.value.should.equal('ABC');
//       (cell.numericValue === undefined).should.be.true;
//       (cell.formula === undefined).should.be.true;

//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('ABC');
//         (cell.numericValue === undefined).should.be.true;
//         (cell.formula === undefined).should.be.true;
//         done();
//       });
//     });

//     it('throws an error if setting an invalid formula', function() {
//       var err;
//       try {
//         cell.formula = 'This is not a formula';
//       } catch (_err) { err = _err; }
//       err.should.be.an.error;
//     });

//     it('supports formulas that resolve to a numeric value', function(done) {
//       cell.formula = '=ROW()';
//       (cell.numericValue === undefined).should.be.true;
//       cell.value.should.equal('*SAVE TO GET NEW VALUE*');
//       cell.formula.should.equal('=ROW()');
//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('1');
//         cell.numericValue.should.equal(1);
//         cell.formula.should.equal('=ROW()');
//         done();
//       });
//     });

//     it('persists the new formula value', function(done){
//       sheet.getCells({}, function(err, cells) {
//         cells[0].value.should.equal('1');
//         cells[0].numericValue.should.equal(1);
//         cells[0].formula.should.equal('=ROW()');
//         done(err);
//       });
//     });

//     it('supports formulas that resolve to non-numeric values', function(done) {
//       cell.formula = '=IF(TRUE, "ABC", "DEF")';
//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('ABC');
//         (cell.numericValue === undefined).should.be.true;
//         cell.formula.should.equal('=IF(TRUE, "ABC", "DEF")');
//         done();
//       });
//     });

//     it('supports setting the formula via the `value` property', function(done) {
//       cell.value = '=COLUMN()';
//       cell.value.should.equal('*SAVE TO GET NEW VALUE*');
//       cell.formula.should.equal('=COLUMN()');
//       (cell.numericValue === undefined).should.be.true;
//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('1');
//         cell.numericValue.should.equal(1);
//         cell.formula.should.equal('=COLUMN()');
//         done();
//       });
//     });

//     it('supports clearing the `value`', function(done) {
//       cell.value = '4';
//       cell.value = '';
//       cell.value.should.equal('');
//       (cell.numericValue === undefined).should.be.true;
//       (cell.formula === undefined).should.be.true;

//       cell.save(function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('');
//         (cell.numericValue === undefined).should.be.true;
//         (cell.formula === undefined).should.be.true;
//         done();
//       });
//     });

//     it('can update a single cell with linefeed in value', function(done) {
//       cell.setValue('HELLO\nWORLD', function(err) {
//         (!err).should.be.true;
//         cell.value.should.equal('HELLO\nWORLD');
//         sheet.getCells({}, function(err, cells) {
//           cells[0].value.should.equal('HELLO\nWORLD');
//           done(err);
//         });
//       });
//     });
//   });

//   describe('bulk cell updates', function() {
//     var cells;

//     before(function(done) {
//       sheet.getCells({
//         'return-empty': true
//       }, function(err, _cells) {
//         cells = _cells.slice(0,4);
//         done(err);
//       });
//     });

//     it('succeeds if no cells need an update', function(done) {
//       sheet.bulkUpdateCells(cells, function(err) {
//         (!err).should.be.true;
//         done();
//       })
//     });

//     it('can update multiple cells at once', function(done) {
//       cells[0].value = 1;
//       cells[1].value = '2';
//       cells[2].formula = '=A1+B1';
//       sheet.bulkUpdateCells(cells, function(err) {
//         (!err).should.be.true;
//         cells[0].numericValue.should.equal(1);
//         cells[1].numericValue.should.equal(2);
//         cells[2].numericValue.should.equal(3);
//         done();
//       })
//     });
//   });

// });
