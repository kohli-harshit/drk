var XLSX = require('xlsx');
var basefile = 'UserInfo.xlsx';

module.exports = {
  getMachineInfo: function (machineName) {
    //Load Excel File
    var workbook = XLSX.readFile(basefile);
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    var result="Machine Not Found";

    //Remove all spaces from Machine Name
    machineName=machineName.replace(/\s/g, "") ;

    //Get the range
    var range = XLSX.utils.decode_range(worksheet['!ref']);

    //Find the Machine
    for(var R = range.s.r; R <= range.e.r; ++R) {
        for(var C = range.s.c; C <= range.e.c; ++C) {

            /* find the cell object */
            var cellref = XLSX.utils.encode_cell({c:C, r:R}); // construct A1 reference for cell
            if(!worksheet[cellref]) continue; // if cell doesn't exist, move on
            var cell = worksheet[cellref];

            /* if the cell is a text cell with the old string, change it */

            if(cell.v === machineName) {                
                var cellref2 = XLSX.utils.encode_cell({c:C+1, r:R}); // construct A1 reference for cell
                if(!worksheet[cellref2]) continue; // if cell doesn't exist, move on
                var cell2 = worksheet[cellref2];
                if (cell2.v==='NA'){
                    result="Not Assigned";
                }
                else
                {
                    result=cell2.v;
                }
            }
        }
    }
    return result;
  },
  bar: function () {
    // whatever
  }
};

function getMachineInfo(machineName)
{
    //Load Excel File
    var workbook = XLSX.readFile(basefile);
    var first_sheet_name = workbook.SheetNames[0];

    //Remove all spaces from Machine Name
    machineName=machineName.replace(/\s/g, "") ;

    //Get the range
    var range = XLSX.utils.decode_range(worksheet['!ref']);

    //Find the Machine
    for(var R = range.s.r; R <= range.e.r; ++R) {
        for(var C = range.s.c; C <= range.e.c; ++C) {

            /* find the cell object */
            var cellref = XLSX.utils.encode_cell({c:C, r:R}); // construct A1 reference for cell
            if(!worksheet[cellref]) continue; // if cell doesn't exist, move on
            var cell = worksheet[cellref];

            /* if the cell is a text cell with the old string, change it */

            if(cell.v === machineName) {                
                var cellref2 = XLSX.utils.encode_cell({c:C+1, r:R}); // construct A1 reference for cell
                if(!worksheet[cellref2]) continue; // if cell doesn't exist, move on
                var cell2 = worksheet[cellref2];
                if (cell2.v==='NA'){
                    return "Not Assigned";
                }
                else
                {
                    return cell2.v;
                }
            }
        }
    }
    return "Machine Not Found";
}