const _ = require('lodash');

const GoogleSpreadsheetRow = require('./GoogleSpreadsheetRow');
const GoogleSpreadsheetCell = require('./GoogleSpreadsheetCell');

const { getFieldMask, columnToLetter, letterToColumn } = require('./utils');

class GoogleSpreadsheetWorksheet {
  constructor(parentSpreadsheet, { properties, data }) {
    this._spreadsheet = parentSpreadsheet; // the parent GoogleSpreadsheet instance

    // basic properties
    this._rawProperties = properties;

    this.cells = []; // we will use a 2d sparse array to store cells;

    this.rowMetadata = []; // 1d sparse array
    this.columnMetadata = [];

    if (data) this.fillCellData(data);

    return this;
  }

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////
  async _makeSingleUpdateRequest(requestType, requestParams) {
    // pass the call up to the parent
    return this._spreadsheet._makeSingleUpdateRequest(requestType, {
      // sheetId: this.sheetId,
      ...requestParams,
    });
  }

  _ensureInfoLoaded() {
    if (!this._rawProperties) {
      throw new Error(
        'You must call `sheet.getInfo()` before accessing this property',
      );
    }
  }

  resetLocalCache() {
    this._rawProperties = null;
    this.headers = null;
    this.cells = [];
  }

  fillCellData(dataRanges) {
    _.each(dataRanges, (range) => {
      const startRow = range.startRow || 0;
      const startColumn = range.startColumn || 0;

      // update cell data
      if (range.rowData) {
        for (let i = 0; i < range.rowData.length; i++) {
          for (let j = 0; j < range.rowData[i].values.length; j++) {
            const actualRow = startRow + i;
            const actualColumn = startColumn + j;

            if (!this.cells[startRow + i]) this.cells[actualRow] = [];
            const cellData = range.rowData[i].values[j];
            if (this.cells[actualRow][actualColumn]) {
              this.cells[actualRow][actualColumn]._updateRawData(cellData);
            } else {
              this.cells[actualRow][actualColumn] = new GoogleSpreadsheetCell(
                this,
                actualRow,
                actualColumn,
                cellData,
              );
            }
          }

          // update row metadata
          this.rowMetadata[startRow + i] = range.rowMetadata[i];
        }
      } else {
        // if no cell data came in, this is from fetching the entire sheet when it is empty
        // so we just clear everything
        this.cells = [];
      }

      // update row metadata
      for (let i = 0; i < range.rowMetadata.length; i++) {
        this.rowMetadata[startRow + i] = range.rowMetadata[i];
      }
      // update column metadata
      for (let i = 0; i < range.columnMetadata.length; i++) {
        this.columnMetadata[startColumn + i] = range.columnMetadata[i];
      }
    });
  }

  getCellByA1(a1Location) {
    const split = a1Location.match(/([A-Z]+)([0-9]+)/);
    const columnIndex = letterToColumn(split[1]);
    const rowIndex = parseInt(split[2]);
    return this.getCell(rowIndex - 1, columnIndex - 1);
  }

  getCell(rowIndex, columnIndex) {
    if (rowIndex < 0 || columnIndex < 0)
      throw new Error('Min coordinate is 0, 0');
    if (rowIndex >= this.rowCount || columnIndex >= this.columnCount) {
      throw new Error(
        `Out of bounds, sheet is ${this.rowCount} by ${this.columnCount}`,
      );
    }

    if (!this.cells[rowIndex] || !this.cells[rowIndex][columnIndex]) {
      throw new Error('This cell has not been loaded yet');
    }
    return this.cells[rowIndex][columnIndex];
  }

  resetLocalCells() {
    // clears the local cache of cell data
    this.cells = [];
  }

  // PROPERTY GETTERS //////////////////////////////////////////////////////////////////////////////
  get sheetId() {
    this._ensureInfoLoaded();
    return this._rawProperties.sheetId;
  }

  set sheetId(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get title() {
    this._ensureInfoLoaded();
    return this._rawProperties.title;
  }

  set title(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get index() {
    this._ensureInfoLoaded();
    return this._rawProperties.index;
  }

  set index(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get sheetType() {
    this._ensureInfoLoaded();
    return this._rawProperties.sheetType;
  }

  set sheetType(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get gridProperties() {
    this._ensureInfoLoaded();
    return this._rawProperties.gridProperties;
  }

  set gridProperties(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get hidden() {
    this._ensureInfoLoaded();
    return this._rawProperties.hidden;
  }

  set hidden(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get tabColor() {
    this._ensureInfoLoaded();
    return this._rawProperties.tabColor;
  }

  set tabColor(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get rightToLeft() {
    this._ensureInfoLoaded();
    return this._rawProperties.rightToLeft;
  }

  set rightToLeft(newVal) {
    throw new Error('Do not update directly. Use updateProperties()');
  }

  get rowCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.rowCount;
  }

  set rowCount(newVal) {
    throw new Error('Do not update directly. Use resize()');
  }

  get columnCount() {
    this._ensureInfoLoaded();
    return this.gridProperties.columnCount;
  }

  set columnCount(newVal) {
    throw new Error('Do not update directly. Use resize()');
  }

  get a1SheetName() {
    return `'${this.title}'`;
  }

  get lastColumnLetter() {
    return columnToLetter(this.columnCount);
  }
  // get fullRange() {
  //   // return `'${this.title}'!A1:${columnToLetter(this.columnCount)}${this.rowCount}`;
  //   return `'${this.title}'`;
  // }

  // FETCHING AND UPDATING CELLS

  get numCellsLoaded() {
    let allCells = _.flatten(this.cells);
    allCells = _.compact(allCells);
    return allCells.length;
  }

  async loadCells(sheetFilters) {
    let docFilters;

    if (!sheetFilters) {
      // load the whole sheet
      docFilters = this.a1SheetName;
    } else if (_.isString(sheetFilters)) {
      if (sheetFilters.startsWith(this.a1SheetName)) docFilters = sheetFilters;
      else docFilters = `${this.a1SheetName}!${sheetFilters}`;
    } else {
      throw new Error('Not supported yet');
    }
    return this._spreadsheet.loadCells(docFilters);
  }

  async saveUpdatedCells() {
    const cellsToSave = _.filter(_.flatten(this.cells), { _dirty: true });
    return this.updateCells(cellsToSave);
  }

  async updateCells(cellsToUpdate) {
    const cellsByRow = _.groupBy(cellsToUpdate, 'rowIndex');
    const groupsToSave = [];
    _.each(cellsByRow, (cells, rowIndex) => {
      let cellGroup = [];
      _.each(cells, (c) => {
        if (!cellGroup.length) {
          cellGroup.push(c);
        } else if (
          cellGroup[cellGroup.length - 1].columnIndex ===
          c.columnIndex - 1
        ) {
          cellGroup.push(c);
        } else {
          groupsToSave.push(cellGroup);
          cellGroup = [];
        }
      });
      groupsToSave.push(cellGroup);
    });

    const requests = _.map(groupsToSave, (cellGroup) => ({
      updateCells: {
        rows: [
          {
            values: _.map(cellGroup, (cell) => ({
              userEnteredValue: { [cell._newValueType]: cell._newValue },
            })),
          },
        ],
        fields: 'userEnteredValue',
        start: {
          sheetId: this.sheetId,
          rowIndex: cellGroup[0].rowIndex,
          columnIndex: cellGroup[0].columnIndex,
        },
      },
    }));
    const responseRanges = _.map(groupsToSave, (cellGroup) => {
      let a1Range = cellGroup[0].a1Address;
      if (cellGroup.length > 1)
        a1Range += `:${cellGroup[cellGroup.length - 1].a1Address}`;
      return `${cellGroup[0]._sheet.a1SheetName}!${a1Range}`;
    });

    await this._spreadsheet._makeBatchUpdateRequest(requests, responseRanges);
  }

  // API CALLS /////////////////////////////////////////////////////////////////////////////////////

  async getCellsInRange(a1Range, options) {
    const response = await this._spreadsheet.axios.get(
      `/values/${this.a1SheetName}!${a1Range}`,
      {
        params: options,
      },
    );
    return response.data.values;
  }

  // ROW BASED FUNCTIONS ///////////////////////////////////////////////////////////////////////////
  async loadHeaderRow() {
    const rows = await this.getCellsInRange(`A1:${this.lastColumnLetter}1`);
    this.headerValues = rows[0];
  }

  async setHeaderRow(headerValues) {
    if (!headerValues) return;
    if (headerValues.length > this.colCount) {
      throw new Error(
        `Sheet is not large enough to fit ${headerValues.length} columns. Resize the sheet first.`,
      );
    }

    const response = await this._spreadsheet.axios.request({
      method: 'put',
      url: `/values/${this.a1SheetName}!A1`,
      params: {
        valueInputOption: 'USER_ENTERED', // other option is RAW
        includeValuesInResponse: true,
      },
      data: {
        range: `${this.a1SheetName}!A1`,
        majorDimension: 'ROWS',
        values: [headerValues],
      },
    });
    this.headerValues = response.data.updatedData.values[0];
  }

  async addRow(values) {
    // values can be an array or object

    // an array is just cells
    // ex: ['column 1', 'column 2', 'column 3']

    // an object must use the header row values as keys
    // ex: { col1: 'column 1', col2: 'column 2', col3: 'column 3' }

    if (!this.headerValues) await this.loadHeaderRow();

    let valuesArray;
    if (_.isArray(values)) {
      valuesArray = values;
    } else if (_.isObject(values)) {
      valuesArray = [];
      for (let i = 0; i < this.headerValues.length; i++) {
        const propName = this.headerValues[i];
        valuesArray[i] = values[propName];
      }
    } else {
      throw new Error('You must pass in an object or an array');
    }

    const response = await this._spreadsheet.axios.request({
      method: 'post',
      url: `/values/${this.a1SheetName}:append`,
      params: {
        valueInputOption: 'USER_ENTERED', // RAW
        insertDataOption: 'OVERWRITE', // INSERT_ROWS
        includeValuesInResponse: true,
      },
      data: {
        values: [valuesArray],
      },
    });
    // console.log(response.data);
    // rows.push(new GoogleSpreadsheetRow(this, rowNum++, rawRows[i]));

    // extract the new row number from the A1-notation data range in the response
    // ex: in "'Sheet8!A2:C2" -- we want the `2`
    const { updatedRange } = response.data.updates;
    let rowNumber = updatedRange.match(/![A-Z]+([0-9]+):/)[1];
    rowNumber = parseInt(rowNumber);

    return new GoogleSpreadsheetRow(
      this,
      rowNumber,
      response.data.updates.updatedData.values[0],
    );
  }

  async getRows(options = {}) {
    // https://developers.google.com/sheets/api/guides/migration
    // The Sheets API v4 does not have equivalents for the row-order query parameters provided by the Sheets API v3. Reverse-order is trivial; simply process the returned values array in reverse order. Order by column is not supported for reads, but it is possible to sort the data in the sheet (using a SortRange) request and then read it.

    // The Sheets API v4 does not currently have a direct equivalent for the Sheets API v3 structured queries. However, you can retrieve the relevant data and sort through it as needed in your application.

    // options
    // - offset
    // - limit

    options.offset = options.offset || 0;
    options.limit = options.limit || this.rowCount - 1;

    if (!this.headerValues) await this.loadHeaderRow();

    const firstRow = 2 + options.offset; // skip first row AND not zero indexed
    const lastRow = firstRow + options.limit - 1; // inclusive so we subtract 1
    const lastColumn = columnToLetter(this.headerValues.length);
    const rawRows = await this.getCellsInRange(
      `A${firstRow}:${lastColumn}${lastRow}`,
    );

    if (!rawRows) return [];

    const rows = [];
    let rowNum = firstRow;
    for (let i = 0; i < rawRows.length; i++) {
      rows.push(new GoogleSpreadsheetRow(this, rowNum++, rawRows[i]));
    }
    return rows;
  }

  async clear() {
    // clears all the data in the sheet
    // sheet name without ie 'sheet1' rather than 'sheet1'!A1:B5 is all cells
    await this._spreadsheet.axios.post(`/values/${this.a1SheetName}:clear`);
    this.headers = null;
    this.resetLocalCells();
  }

  async updateProperties(properties) {
    // Request type = `updateSheetProperties`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSheetPropertiesRequest

    // properties
    // - title (string)
    // - index (number)
    // - gridProperties ({ object (GridProperties) } - https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#gridproperties
    // - hidden (boolean)
    // - tabColor ({ object (Color) } - https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color
    // - rightToLeft (boolean)

    return this._makeSingleUpdateRequest('updateSheetProperties', {
      properties: {
        sheetId: this.sheetId,
        ...properties,
      },
      fields: getFieldMask(properties),
    });
  }

  async updateGridProperties(gridProperties) {
    // just passes the call through to update gridProperties
    // see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties

    // gridProperties
    // - rowCount
    // - columnCount
    // - frozenRowCount
    // - frozenColumnCount
    // - hideGridLines
    return this.updateProperties({ gridProperties });
  }

  // just a shortcut because resize makes more sense to change rowCount / columnCount
  async resize(gridProperties) {
    return this.updateGridProperties(gridProperties);
  }

  async setTitle(title) {
    return this.updateProperties({ title });
  }

  async updateDimensionProperties(columnsOrRows, properties, bounds) {
    // Request type = `updateDimensionProperties`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#updatedimensionpropertiesrequest

    // columnsOrRows = COLUMNS|ROWS
    // properties
    // - pixelSize
    // - hiddenByUser
    // - developerMetadata
    // bounds
    // - startIndex
    // - endIndex

    return this._makeSingleUpdateRequest('updateDimensionProperties', {
      range: {
        sheetId: this.sheetId,
        dimension: columnsOrRows,
        ...(bounds && {
          startIndex: bounds.startIndex,
          endIndex: bounds.endIndex,
        }),
      },
      properties,
      fields: getFieldMask(properties),
    });
  }

  async updateNamedRange() {
    // Request type = `updateNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateNamedRangeRequest
  }

  async addNamedRange() {
    // Request type = `addNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddNamedRangeRequest
  }

  async deleteNamedRange() {
    // Request type = `deleteNamedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteNamedRangeRequest
  }

  async repeatCell() {
    // Request type = `repeatCell`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RepeatCellRequest
  }

  async autoFill() {
    // Request type = `autoFill`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoFillRequest
  }

  async cutPaste() {
    // Request type = `cutPaste`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CutPasteRequest
  }

  async copyPaste() {
    // Request type = `copyPaste`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CopyPasteRequest
  }

  async mergeCells() {
    // Request type = `mergeCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeCellsRequest
  }

  async unmergeCells() {
    // Request type = `unmergeCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UnmergeCellsRequest
  }

  async updateBorders() {
    // Request type = `updateBorders`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBordersRequest
  }

  async addFilterView() {
    // Request type = `addFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddFilterViewRequest
  }

  async appendCells() {
    // Request type = `appendCells`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest
  }

  async clearBasicFilter() {
    // Request type = `clearBasicFilter`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#ClearBasicFilterRequest
  }

  async deleteDimension() {
    // Request type = `deleteDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionRequest
  }

  async deleteEmbeddedObject() {
    // Request type = `deleteEmbeddedObject`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteEmbeddedObjectRequest
  }

  async deleteFilterView() {
    // Request type = `deleteFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteFilterViewRequest
  }

  async duplicateFilterView() {
    // Request type = `duplicateFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateFilterViewRequest
  }

  async duplicateSheet() {
    // Request type = `duplicateSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DuplicateSheetRequest
  }

  async findReplace() {
    // Request type = `findReplace`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#FindReplaceRequest
  }

  async insertDimension() {
    // Request type = `insertDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest
  }

  async insertRange() {
    // Request type = `insertRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#InsertRangeRequest
  }

  async moveDimension() {
    // Request type = `moveDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MoveDimensionRequest
  }

  async updateEmbeddedObjectPosition() {
    // Request type = `updateEmbeddedObjectPosition`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateEmbeddedObjectPositionRequest
  }

  async pasteData() {
    // Request type = `pasteData`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteDataRequest
  }

  async textToColumns() {
    // Request type = `textToColumns`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TextToColumnsRequest
  }

  async updateFilterView() {
    // Request type = `updateFilterView`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateFilterViewRequest
  }

  async deleteRange() {
    // Request type = `deleteRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteRangeRequest
  }

  async appendDimension() {
    // Request type = `appendDimension`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AppendDimensionRequest
  }

  async addConditionalFormatRule() {
    // Request type = `addConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddConditionalFormatRuleRequest
  }

  async updateConditionalFormatRule() {
    // Request type = `updateConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateConditionalFormatRuleRequest
  }

  async deleteConditionalFormatRule() {
    // Request type = `deleteConditionalFormatRule`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteConditionalFormatRuleRequest
  }

  async sortRange() {
    // Request type = `sortRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SortRangeRequest
  }

  async setDataValidation() {
    // Request type = `setDataValidation`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetDataValidationRequest
  }

  async setBasicFilter() {
    // Request type = `setBasicFilter`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SetBasicFilterRequest
  }

  async addProtectedRange() {
    // Request type = `addProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddProtectedRangeRequest
  }

  async updateProtectedRange() {
    // Request type = `updateProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateProtectedRangeRequest
  }

  async deleteProtectedRange() {
    // Request type = `deleteProtectedRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteProtectedRangeRequest
  }

  async autoResizeDimensions() {
    // Request type = `autoResizeDimensions`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AutoResizeDimensionsRequest
  }

  async addChart() {
    // Request type = `addChart`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddChartRequest
  }

  async updateChartSpec() {
    // Request type = `updateChartSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateChartSpecRequest
  }

  async updateBanding() {
    // Request type = `updateBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateBandingRequest
  }

  async addBanding() {
    // Request type = `addBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddBandingRequest
  }

  async deleteBanding() {
    // Request type = `deleteBanding`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteBandingRequest
  }

  async createDeveloperMetadata() {
    // Request type = `createDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#CreateDeveloperMetadataRequest
  }

  async updateDeveloperMetadata() {
    // Request type = `updateDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDeveloperMetadataRequest
  }

  async deleteDeveloperMetadata() {
    // Request type = `deleteDeveloperMetadata`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDeveloperMetadataRequest
  }

  async randomizeRange() {
    // Request type = `randomizeRange`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#RandomizeRangeRequest
  }

  async addDimensionGroup() {
    // Request type = `addDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddDimensionGroupRequest
  }

  async deleteDimensionGroup() {
    // Request type = `deleteDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionGroupRequest
  }

  async updateDimensionGroup() {
    // Request type = `updateDimensionGroup`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateDimensionGroupRequest
  }

  async trimWhitespace() {
    // Request type = `trimWhitespace`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#TrimWhitespaceRequest
  }

  async deleteDuplicates() {
    // Request type = `deleteDuplicates`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDuplicatesRequest
  }

  async addSlicer() {
    // Request type = `addSlicer`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSlicerRequest
  }

  async updateSlicerSpec() {
    // Request type = `updateSlicerSpec`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#UpdateSlicerSpecRequest
  }

  // delete this worksheet
  async delete() {
    return this._spreadsheet.deleteSheet(this.sheetId);
  }

  async del() {
    return this.delete();
  }

  // copies this worksheet into another document/spreadsheet
  async copyToSpreadsheet(destinationSpreadsheetId) {
    return this._spreadsheet.axios.post(`/sheets/${this.sheetId}:copyTo`, {
      destinationSpreadsheetId,
    });
  }
}

module.exports = GoogleSpreadsheetWorksheet;
