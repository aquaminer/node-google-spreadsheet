const _ = require('lodash');

const { GoogleSpreadsheet } = require('../index');

const creds = require('./service-account-creds.json');

// https://docs.google.com/spreadsheets/d/1NEhf-RzqFuyyrHiURr2gi3yAz3L_Bbxee_audGqnirI/edit
// doc is shared with service account email
// const SHEET_ID = '1NEhf-RzqFuyyrHiURr2gi3yAz3L_Bbxee_audGqnirI';
const SHEET_ID = '148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y';

// call wrapped async function so we can use await
(async function main() {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID, {});
    await doc.useServiceAccountAuth(creds);
    await doc.getInfo();

    const sheet2 = await doc.addSheet();
    await sheet2.loadCells();
    return;

    // const sheets = doc.sheetsByIndex;
    // console.log(sheets.length);
    // for (let i = 1; i < sheets.length; i++) {
    //   console.log('deleting sheet #'+i);
    //   await sheets[i].delete();
    // }
    // return;

    // const newSheet = await doc.addSheet({
    //   title: 'sheet with headers',
    //   headers: ['col1', 'col2', 'col3'],
    // });

    // const cells = await doc.getCells();
    await doc.loadCells('B2:D5');
    const sheet = doc.sheetsByIndex[0];

    // const b2 = sheet.getCell(1,1);
    const b2 = sheet.getCellByA1('B2');
    const b3 = sheet.getCellByA1('B3');
    const b4 = sheet.getCellByA1('B4');
    const c2 = sheet.getCellByA1('C2');
    const c3 = sheet.getCellByA1('C3');
    const c4 = sheet.getCellByA1('C4');
    const d2 = sheet.getCellByA1('D2');
    const d3 = sheet.getCellByA1('D3');
    const d4 = sheet.getCellByA1('D4');

    // console.log(b2);
    // console.log(`address = ${b2.a1Address}`);
    // console.log({value: b2.value });
    // console.log(`formatted = ${b2.formattedValue}`);
    // console.log(`formula = ${b2.formula}`);
    // console.log(`format = ${JSON.stringify(b2.format)}`)
    // console.log(b2.formulaError);

    b2.formula = '=A1';
    await b2.save();
    // c2.value = 'C2 - '+(+new Date());
    // d2.value = 'D2 - '+(+new Date());
    // c4.value = 'C4 - '+(+new Date());

    // c2.value = 'C2!';
    // b3.value = 'B3';
    // b4.value = 'B4';
    // await sheet.saveUpdatedCells();

    console.log(b2.value);

    // console.log(newSheet.title);
    // newSheet.setHeaderRow(['col1', 'col2', 'col3']);
    // const row = await newSheet.addRow({ col1: 'c1', col2: 'c2', col3: 'c3' });
    // await row.delete();

    return;

    // // await sheet.updateProperties({
    // //   title: `node-google-spreadsheet playground ${+new Date()}`,
    // // });
    // // console.log(sheet.title);

    // const ws = sheet.sheetsByIndex[0];
    // // await ws.resize({ rowCount: 30, columnCount: 10 });
    // // await ws.updateProperties({ title: `sheet ${+new Date()}` });

    // // await ws.updateDimensionProperties('COLUMNS', { pixelSize: 100 });

    // console.log(ws.a1SheetName);
    // const rows = await ws.getRows();
    // rows[0].label = 'test';
    // rows[0].a = '2';
    // rows[0].b = '3';
    // rows[0].c = '=B2+C2';
    // await rows[0].save();
    // console.log(rows[0].c);
  } catch (err) {
    console.log(err);
  }
})();
