const axios = require('axios');
const xml2js = require("xml2js");
const _ = require('lodash');
const querystring = require("querystring");

const GoogleAuth = require("google-auth-library");

const GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";
const GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];

const REQUIRE_AUTH_MESSAGE = 'You must authenticate to modify sheet data';


class GoogleSpreadsheet {

    constructor(ss_key, auth = null, options = {}) {
        if ( !ss_key ) {
            throw new Error("Spreadsheet key not provided.");
        }
        this.ss_key = ss_key;
        this.google_auth = auth;

        this.auth_mode = 'anonymous';
        this.visibility = 'public';
        this.projection = 'values';
        this.auth_client = new GoogleAuth();
    }

    setAuthToken( auth ) {
        this.google_auth = auth;
        if (auth != null && this.auth_mode === 'anonymous') this.auth_mode = 'token';
        this.visibility = this.google_auth ? 'private' : 'public';
        this.projection = this.google_auth ? 'full' : 'values';


    }
    useServiceAccountAuth( creds, cb ){
        if (typeof creds == 'string') {
            try {
                creds = require(creds);
            } catch (err) {
                return cb(err);
            }
        }
        this.jwt_client = new this.auth_client.JWT(creds.client_email, null, creds.private_key, GOOGLE_AUTH_SCOPE, null);
        this.renewJwtAuth(cb);
    }

    renewJwtAuth(cb) {
        this.auth_mode = 'jwt';
        this.jwt_client.authorize(function (err, token) {
            if (err) return cb(err);
            this.setAuthToken({
                type: token.token_type,
                value: token.access_token,
                expires: token.expiry_date
            });
            cb()
        });
    }

    isAuthActive() {
        return !!this.google_auth;
    }
    async makeFeedRequest( url_params, method, query_or_data ){
        var url;
        var headers = {};

        if ( typeof(url_params) == 'string' ) {
            // used for edit / delete requests
            url = url_params;
        } else if ( Array.isArray( url_params )){
            //used for get and post requets
            url_params.push( this.visibility, this.projection );
            url = GOOGLE_FEED_URL + url_params.join("/");
        }

        if(this.auth_mode === 'jwt'){
            if (this.google_auth && this.google_auth.expires < +new Date()){
                // this.renewJwtAuth(step);
            }
        }

        if ( this.google_auth ) {
            if (this.google_auth.type === 'Bearer') {
                headers['Authorization'] = 'Bearer ' + this.google_auth.value;
            } else {
                headers['Authorization'] = "GoogleLogin auth=" + this.google_auth;
            }
        }
        headers['Gdata-Version'] = '3.0';

        if ( method === 'POST' || method === 'PUT' ) {
            headers['content-type'] = 'application/atom+xml';
        }

        if (method === 'PUT' || method === 'POST' && url.indexOf('/batch') !== -1) {
            headers['If-Match'] = '*';
        }

        if ( method === 'GET' && query_or_data ) {
            var query = "?" + querystring.stringify( query_or_data );
            // replacements are needed for using structured queries on getRows
            query = query.replace(/%3E/g,'>');
            query = query.replace(/%3D/g,'=');
            query = query.replace(/%3C/g,'<');
            url += query;
        }

        const resp = await axios.request({
            url,
            method,
            headers,
            data: method === 'POST' || method === 'PUT' ? query_or_data : null
        });
        if(resp.status  === 401) throw new Error("Invalid authorization key.");
        else if(resp.status >= 400 ) {
            const message = _.isObject(body) ? JSON.stringify(body) : body.replace(/&quot;/g, '"');
            throw new Error("HTTP error "+response.statusCode+" - "+message);
        } else if(resp.statusCode === 200 && resp.headers['content-type'].indexOf('text/html') >= 0){
            throw new Error("Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)");
        }
        const data = resp.data;
        if(data) {
            const xml_parser = new xml2js.Parser({
                // options carried over from older version of xml2js
                // might want to update how the code works, but for now this is fine
                explicitArray: false,
                explicitRoot: false
            });
            return await xml_parser.parseStringPromise(data);
        }
        // return false;
    }
    async getInfo(){
      const data = await this.makeFeedRequest( ["worksheets", this.ss_key], 'GET', null);
        // if (data === false) {
        //     throw new Error('No response to getInfo call');
        // }
        var ss_data = {
            id: data.id,
            title: data.title,
            updated: data.updated,
            author: data.author,
            worksheets: []
        };
        var worksheets = forceArray(data.entry);
        worksheets.forEach( ( ws_data ) =>  {
            ss_data.worksheets.push( new SpreadsheetWorksheet( this, ws_data ) );
        });
        this.info = ss_data;
        this.worksheets = ss_data.worksheets;
        return ss_data;
    }

    async getCells(worksheet_id, opts) {
        var query = _.assign({}, opts);

        const data = await this.makeFeedRequest(["cells", this.ss_key, worksheet_id], 'GET', query);
        var cells = [];

        var entries = forceArray(data['entry']);

        while(entries.length > 0) {
            cells.push( new SpreadsheetCell( this, this.ss_key, worksheet_id, entries.shift() ) );
        }
        return cells;
    }
}
class SpreadsheetWorksheet {

    constructor(spreadsheet, data) {
        this.spreadsheet = spreadsheet;
        this.url = data.id;
        this.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
        this.title = data.title;
        this.rowCount = parseInt(data['gs:rowCount']);
        this.colCount = parseInt(data['gs:colCount']);

        this['_links'] = [];
        var links = forceArray( data.link );
        links.forEach(( link ) => {
            this['_links'][ link['$']['rel'] ] = link['$']['href'];
        });
        this['_links']['cells'] = this['_links']['http://schemas.google.com/spreadsheets/2006#cellsfeed'];
        this['_links']['bulkcells'] = this['_links']['cells']+'/batch';
    }

    async getCells(opts){
        return await this.spreadsheet.getCells(this.id, opts);
    }
}
class SpreadsheetCell {
    constructor(spreadsheet, ss_key, worksheet_id, data){
        this.spreadsheet = spreadsheet;
        this.row = parseInt(data['gs:cell']['$']['row']);
        this.col = parseInt(data['gs:cell']['$']['col']);
        this.batchId = 'R'+this.row+'C'+this.col;
        if(data['id'] === "https://spreadsheets.google.com/feeds/cells/" + ss_key + "/" + worksheet_id + '/' + this.batchId) {
            this.ws_id = worksheet_id;
            this.ss = ss_key;
        }else{
            this.id = data['id'];
        }

        this['_links'] = [];
        var links = forceArray( data.link );
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if(link['$']['rel'] === "this" && link['$']['href'] === this.getSelf()) continue;
            if(link['$']['rel'] === "edit" && link['$']['href'] === this.getEdit()) continue;
            this['_links'][ link['$']['rel'] ] = link['$']['href'];
        }
        if(this['_links'].length === 0) delete this['_links'];

        this.updateValuesFromResponseData(data);
    }
    updateValuesFromResponseData(_data) {
        // formula value
        var input_val = _data['gs:cell']['$']['inputValue'];
        // inputValue can be undefined so substr throws an error
        // still unsure how this situation happens
        if (input_val && input_val.substr(0,1) === '='){
            this._formula = input_val;
        } else {
            this._formula = undefined;
        }

        // numeric values
        if (_data['gs:cell']['$']['numericValue'] !== undefined) {
            this._numericValue = parseFloat(_data['gs:cell']['$']['numericValue']);
        } else {
            this._numericValue = undefined;
        }

        // the main "value" - its always a string
        this._value = _data['gs:cell']['_'] || '';
    }
    getId() {
        if(!!this.id) {
            return this.id;
        } else {
            return "https://spreadsheets.google.com/feeds/cells/" + this.ss + "/" + this.ws_id + '/' + this.batchId;
        }
    }
    getEdit() {
        if (!!this['_links'] && !!this['_links']['edit']) {
            return this['_links']['edit'];
        } else {
            return this.getId().replace(this.batchId, "private/full/" + this.batchId);
        }
    }
    getSelf() {
        if(!!this['_links'] && !!this['_links']['edit']) {
            return this['_links']['edit'];
        } else {
            return this.getId().replace(this.batchId, "private/full/" + this.batchId);
        }
    }
}
//utils
var forceArray = function(val) {
    if ( Array.isArray( val ) ) return val;
    if ( !val ) return [];
    return [ val ];
}
var xmlSafeValue = function(val){
    if ( val == null ) return '';
    return String(val).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g,'&#10;')
        .replace(/\r/g,'&#13;');
}
var xmlSafeColumnName = function(val){
    if (!val) return '';
    return String(val).replace(/[\s_]+/g, '')
        .toLowerCase();
}

module.exports = GoogleSpreadsheet;
