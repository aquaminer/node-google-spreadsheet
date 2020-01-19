const _ = require('lodash');
const { JWT } = require('google-auth-library');
const Axios = require('axios');

const GoogleSpreadsheetWorksheet = require('./GoogleSpreadsheetWorksheet');
const { getFieldMask, columnToLetter, letterToColumn } = require('./utils');

const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',

  // the list from the sheets v4 auth for spreadsheets.get
  // 'https://www.googleapis.com/auth/drive',
  // 'https://www.googleapis.com/auth/drive.readonly',
  // 'https://www.googleapis.com/auth/drive.file',
  // 'https://www.googleapis.com/auth/spreadsheets',
  // 'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const AUTH_MODES = {
  JWT: 'JWT',
  API_KEY: 'API_KEY',
};

class GoogleSpreadsheet {
  constructor(sheetId, options = {}) {
    this.spreadsheetId = sheetId;
    this.authMode = null;
    this._rawSheets = {};
    this._rawProperties = null;

    // create an axios instance with sheet root URL and interceptors to handle auth
    this.axios = Axios.create({
      baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
    });
    // have to use bind here or the functions dont have access to `this` :(
    this.axios.interceptors.request.use(this._setAxiosRequestAuth.bind(this));
    this.axios.interceptors.response.use(
      this._handleAxiosResponse.bind(this),
      this._handleAxiosErrors.bind(this),
    );

    return this;
  }

  // AUTH RELATED FUNCTIONS ////////////////////////////////////////////////////////////////////////

  async useApiKey(key) {
    this.authMode = AUTH_MODES.API_KEY;
    this.apiKey = key;
  }

  // creds should be an object obtained by loading the json file google gives you
  async useServiceAccountAuth(creds) {
    this.jwtClient = new JWT(
      creds.client_email,
      null,
      creds.private_key,
      GOOGLE_AUTH_SCOPES,
      null,
    );
    await this.renewJwtAuth();
  }

  async renewJwtAuth() {
    this.authMode = AUTH_MODES.JWT;
    this.jwtToken = await this.jwtClient.authorize();
    /*
    returned token looks like
      {
        access_token: 'secret-token...',
        token_type: 'Bearer',
        expiry_date: 1576005020000,
        id_token: undefined,
        refresh_token: 'jwt-placeholder'
      }
    */
  }

  // TODO: provide mechanism to share single JWT auth between docs?

  // INTERNAL UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////

  async _setAxiosRequestAuth(config) {
    // TODO: check auth mode, if valid, renew if expired, etc
    if (this.authMode === AUTH_MODES.JWT) {
      config.headers.Authorization = `Bearer ${this.jwtToken.access_token}`;
    } else if (this.authMode === AUTH_MODES.API_KEY) {
      if (!this.apiKey) throw new Error('Please set API key');
      config.params = config.params || {};
      config.params.key = this.apiKey;
    } else {
      throw new Error(
        'You must initialize some kind of auth before making any requests',
      );
    }
    return config;
  }

  async _handleAxiosResponse(response) {
    return response;
  }

  async _handleAxiosErrors(error) {
    // console.log(error);
    if (error.response && error.response.data) {
      const { code, message } = error.response.data.error;
      error.message = `Google API error - [${code}] ${message}`;
      throw error;
      // throw new Error(`Google API error - [${code}] ${message}`);
    }

    if (_.get(error, 'response.status') === 403) {
      if (this.authMode === AUTH_MODES.API_KEY) {
        throw new Error(
          'Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)',
        );
      }
    }
    throw error;
  }

  async _makeSingleUpdateRequest(requestType, requestParams) {
    const response = await this.axios.post(':batchUpdate', {
      requests: [{ [requestType]: requestParams }],
      includeSpreadsheetInResponse: true,
      // responseRanges: [string]
      // responseIncludeGridData: true
    });

    this._updateRawProperties(response.data.updatedSpreadsheet.properties);
    _.each(response.data.updatedSpreadsheet.sheets, (s) =>
      this._updateOrCreateSheet(s),
    );
    // console.log('API RESPONSE', response.data.replies[0][requestType]);
    return response.data.replies[0][requestType];
  }

  async _makeBatchUpdateRequest(requests, responseRanges) {
    // this is used for updating batches of cells
    const response = await this.axios.post(':batchUpdate', {
      requests,
      includeSpreadsheetInResponse: true,
      ...(responseRanges && {
        responseIncludeGridData: true,
        ...(responseRanges !== '*' && { responseRanges }),
      }),
    });

    this._updateRawProperties(response.data.updatedSpreadsheet.properties);
    _.each(response.data.updatedSpreadsheet.sheets, (s) =>
      this._updateOrCreateSheet(s),
    );
  }

  _ensureInfoLoaded() {
    if (!this._rawProperties) {
      throw new Error(
        'You must call `sheet.getInfo()` before accessing this property',
      );
    }
  }

  _updateRawProperties(newProperties) {
    this._rawProperties = newProperties;
  }

  _updateOrCreateSheet({ properties, data }) {
    if (!this._rawSheets[properties.sheetId]) {
      this._rawSheets[properties.sheetId] = new GoogleSpreadsheetWorksheet(
        this,
        { properties, data },
      );
    } else {
      this._rawSheets[properties.sheetId]._rawProperties = properties;
      this._rawSheets[properties.sheetId].fillCellData(data);
      // TODO: data?
    }
  }

  // PROPERTY GETTERS //////////////////////////////////////////////////////////////////////////////
  get title() {
    this._ensureInfoLoaded();
    return this._rawProperties.title;
  }

  set title(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get locale() {
    this._ensureInfoLoaded();
    return this._rawProperties.locale;
  }

  set locale(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get timeZone() {
    this._ensureInfoLoaded();
    return this._rawProperties.timeZone;
  }

  set timeZone(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get autoRecalc() {
    this._ensureInfoLoaded();
    return this._rawProperties.autoRecalc;
  }

  set autoRecalc(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get defaultFormat() {
    this._ensureInfoLoaded();
    return this._rawProperties.defaultFormat;
  }

  set defaultFormat(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get spreadsheetTheme() {
    this._ensureInfoLoaded();
    return this._rawProperties.spreadsheetTheme;
  }

  set spreadsheetTheme(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  get iterativeCalculationSettings() {
    this._ensureInfoLoaded();
    return this._rawProperties.iterativeCalculationSettings;
  }

  set iterativeCalculationSettings(newVal) {
    throw new Error('Do not update directly - use `updateProperties()`');
  }

  // OTHER GETTERS /////////////////////////////////////////////////////////////////////////////////
  get sheetCount() {
    this._ensureInfoLoaded();
    return this._rawSheets.length;
  }

  get sheetsById() {
    this._ensureInfoLoaded();
    return this._rawSheets;
  }

  get sheetsByIndex() {
    this._ensureInfoLoaded();
    return _.sortBy(this._rawSheets, 'index');
  }

  // OTHER UTILITIES
  resetLocalCache() {
    this._rawProperties = null;
    this._rawSheets = {};
  }

  // REQUESTS //////////////////////////////////////////////////////////////////////////////////////
  async getInfo(includeCells) {
    const response = await this.axios.get('/', {
      params: {
        ...(includeCells && { includeGridData: true }),
      },
    });
    this._rawProperties = response.data.properties;
    _.each(response.data.sheets, (s) => this._updateOrCreateSheet(s));
  }

  async updateProperties(properties) {
    // updateSpreadsheetProperties
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#SpreadsheetProperties

    /*
      title (string) - title of the spreadsheet
      locale (string) - ISO code
      autoRecalc (enum) - ON_CHANGE|MINUTE|HOUR
      timeZone (string) - timezone code
      iterativeCalculationSettings (object) - see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#IterativeCalculationSettings
     */

    await this._makeSingleUpdateRequest('updateSpreadsheetProperties', {
      properties,
      fields: getFieldMask(properties),
    });
  }

  async addSheet(properties = {}) {
    // Request type = `addSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest

    const response = await this._makeSingleUpdateRequest('addSheet', {
      properties: _.omit(properties, 'headers'),
    });
    // _makeSingleUpdateRequest already adds the sheet
    const newSheetId = response.properties.sheetId;
    const newSheet = this.sheetsById[newSheetId];

    if (properties.headers) {
      await newSheet.setHeaderRow(properties.headers);
    }

    return newSheet;
  }

  async addWorksheet(properties) {
    return this.addSheet(properties);
  }

  async deleteSheet(sheetId) {
    // Request type = `deleteSheet`
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteSheetRequest
    await this._makeSingleUpdateRequest('deleteSheet', { sheetId });
    delete this._rawSheets[sheetId];
  }

  async addNamedRange(name, range, namedRangeId) {
    // namedRangeId is optional
    return this._makeSingleUpdateRequest('addNamedRange', {
      name,
      range,
      namedRangeId,
    });
  }

  async deleteNamedRange(namedRangeId) {
    return this._makeSingleUpdateRequest('deleteNamedRange', { namedRangeId });
  }

  async loadCells(filters) {
    const dataFilters = [];

    // if you pass in just a string, we assume its an A1 Range
    if (_.isString(filters)) {
      dataFilters.push({ a1Range: filters });
    }

    const result = await this.axios.post(':getByDataFilter', {
      includeGridData: true,
      dataFilters,
    });
    const { sheets } = result.data;
    _.each(sheets, (sheet) => {
      this._updateOrCreateSheet(sheet);
    });
  }
}

// TODO - need to figure out how to handle auth in this situation
GoogleSpreadsheet.create = async function() {};

module.exports = GoogleSpreadsheet;
