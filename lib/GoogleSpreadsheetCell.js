const _ = require('lodash');

const { getFieldMask, columnToLetter, letterToColumn } = require('./utils');

const { GoogleSpreadsheetFormulaError } = require('./errors');

class GoogleSpreadsheetCell {
  constructor(parentSheet, rowIndex, columnIndex, cellData) {
    this._sheet = parentSheet; // the parent GoogleSpreadsheetWorksheet instance
    this._row = rowIndex;
    this._column = columnIndex;

    this._updateRawData(cellData);
    return this;
  }

  _updateRawData(newData) {
    this._rawData = newData;

    if (_.get(this._rawData, 'effectiveValue.errorValue')) {
      this._error = new GoogleSpreadsheetFormulaError(
        this._rawData.effectiveValue.errorValue,
      );
    } else {
      this._error = null;
    }

    this._dirty = false;
  }

  get rowIndex() {
    return this._row;
  }

  get columnIndex() {
    return this._column;
  }

  get a1Column() {
    return columnToLetter(this._column + 1);
  }

  get a1Row() {
    return this._row + 1;
  }

  get a1Address() {
    return `${this.a1Column}${this.a1Row}`;
  }

  get value() {
    // const typeKey = _.keys(this._rawData.effectiveValue)[0];
    if (this._dirty) throw new Error('Value has been changed');
    if (this._error) return this._error;
    if (!this._rawData.effectiveValue) return null;
    return _.values(this._rawData.effectiveValue)[0];
  }

  set value(newValue) {
    this._dirty = true;
    this._newValue = newValue;

    if (_.isBoolean(newValue)) {
      this._newValueType = 'boolValue';
    } else if (_.isString(newValue)) {
      if (newValue.substr(0, 1) === '=') this._newValueType = 'formulaValue';
      else this._newValueType = 'stringValue';
    } else if (_.isFinite(newValue)) {
      this._newValueType = 'numberValue';
    } else if (_.isNil(newValue)) {
      // null or undefined
      this._newValueType = 'stringValue';
      this._newValue = '';
    } else {
      throw new Error('Set value to boolean, string, or number');
    }
  }

  get formulaError() {
    return this._error;
  }

  get formattedValue() {
    return this._rawData.formattedValue || null;
  }

  set formattedValue(newVal) {
    throw new Error('You cannot modify the formatted value directly');
  }

  get formula() {
    const f = _.get(this._rawData, 'userEnteredValue.formulaValue');
    return f || null;
  }

  set formula(newValue) {
    if (newValue.substr(0, 1) !== '=')
      throw new Error('formula must begin with "="');
    this._newValueType = 'formulaValue';
    this._newValue = newValue;
    this._dirty = true;
  }

  get format() {
    return _.get(this._rawData, 'userEnteredFormat.textFormat');
  }

  // ///////////////////

  async save() {
    if (!this._dirty) return;
    await this._sheet.updateCells([this]);
  }

  async clear() {
    this.value = null;
    await this.save();
  }

  async clearFormatting() {}
}

module.exports = GoogleSpreadsheetCell;
