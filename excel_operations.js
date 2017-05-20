var XLSX = require('xlsx');
var basefile = 'UserInfo.xlsx';

getMachineInfo = function (machineName) {
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
};

addMachine = function(machineName) {

    console.log("Add Machine called for Machine - " + machineName);
    return "(Mock) Machine Added successfully";
    /*
    var workbook = XLSX.readFile(basefile);
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    var range = XLSX.utils.decode_range(worksheet['!ref']); 
    for(var R = range.s.r; R <= range.e.r; ++R) {
        for(var C = range.s.c; C <= range.e.c; ++C) {
                //find the cell object
            var cellref = XLSX.utils.encode_cell({c:C, r:R}); // construct A1 reference for cell
                if(!worksheet[cellref]) continue; // if cell doesn't exist, move on
                    var cell = worksheet[cellref];

                // if the cell is a text cell with the old string, change it
                    if(cell.v === "Blank") 
                    {  
                                cell.v=completemachinenameinput;
                                XLSX.writeFile(workbook, './excelConverter/obj.xlsx');
                                bot.reply(message, 'Got it. The machine '+completemachinenameinput+ ' is added successfully ');
                                R=range.e.r;
                                C=range.s.c;
                                convo.next();

                    }
                                                                                                
        }
    }
    */
}

isMachinePresent = function(machineName){
    //Code to check wheather machine is already in dossier or not
    var workbook = XLSX.readFile(basefile);
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    var range = XLSX.utils.decode_range(worksheet['!ref']); 
    var flag=false;

    //Find the Machine
    for(var R = range.s.r; R <= range.e.r; ++R) {
        for(var C = range.s.c; C <= range.e.c; ++C) {

            /* find the cell object */
            var cellref = XLSX.utils.encode_cell({c:C, r:R}); // construct A1 reference for cell
            if(!worksheet[cellref]) continue; // if cell doesn't exist, move on
            var cell = worksheet[cellref];

            /* if the cell is a text cell with the old string, change it */

            if(cell.v === machineName) {                
                flag=true;
                break;
            }
        }
    }

    return flag;
}