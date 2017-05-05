
//Exit if Token is not specified
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

//Initialize Required Packages and Start the Bot
var Botkit = require('./lib/Botkit.js');
var Excel = require('./excel_operations.js');
var os = require('os');
var fs = require('fs');
var controller = Botkit.slackbot({
    debug: true,
});
var bot = controller.spawn({
    token: process.env.token
}).startRTM();

//Reply to Hello and Hey
controller.hears(['hello', 'hey','hi'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function (err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

//User wants to assign name
controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function (err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

//User asks name
controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function (bot, message) {

    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function (err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function (response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [{
                                pattern: 'yes',
                                callback: function (response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function (response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function (response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {
                        'key': 'nickname'
                    }); // store the results in a field called nickname

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');


                                });
                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

//User asks Bot Identity
controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],'direct_message,direct_mention,mention',function (bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + '.');
});

//User wants a machine
controller.hears(['who is using (.*)','what is the status of (.*)','i want to use (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
    var excelEntry=Excel.getMachineInfo(message.match[1]);
    bot.reply(message,excelEntry);
});

controller.hears(['add new machine (.*)', 'add a new machine (.*)'], 'direct_message,direct_mention', function (bot, message) {
    var completemachinenameinput = message.match[1];
    var machinenamechararray = completemachinenameinput.split('');
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    lengthofinput = completemachinenameinput.length - 1;
    var machinename = " ";
    var machinetype = " ";
    var machinelocation = " ";
    //to calculate machinename
    var numberofdash = 0;
    var lengthofinput1 = lengthofinput;
    //for number of dash calculation
    while (lengthofinput1 > 0) {
        if (machinenamechararray[lengthofinput1] == '-') {
            numberofdash++;
        }
        lengthofinput1--;
    }
    if (numberofdash == 2) {
        while ((machinenamechararray[lengthofinput] != '-')) //||(machinenamechararray[lengthofinput]!=" "))
        {
            machinename = machinename + completemachinenameinput[lengthofinput]
            lengthofinput--;

        }
        if (lengthofinput > 0) {
            lengthofinput--;
            // bot.reply(message, machinename);
            //to calculate machine type
            while ((machinenamechararray[lengthofinput] != '-')) //||(machinenamechararray[lengthofinput]!=" "))
            {
                machinetype = machinetype + completemachinenameinput[lengthofinput];
                lengthofinput--;
            }
        }
        if (lengthofinput > 0) {
            lengthofinput--;
            //bot.reply(message, machinename+machinetype+lengthofinput+);
            //to calculate machine location
            while (lengthofinput >= 0) {
                machinelocation = machinelocation + completemachinenameinput[lengthofinput];
                lengthofinput--;
            }
        }
        var machinename = reverse(machinename);
        var machinetype = reverse(machinetype);
        var machinelocation = reverse(machinelocation);
        // bot.reply(message, 'machinename:-' +machinename +'machinetype:-' +machinelocation+ 'machinetype:-' +machinetype);
        //length of machine name should be of length 2 
        if ((machinename.length) == 2) {
            machinename = "0" + machinename;
        }
        var machinetypechararray = machinetype.split('');
        var lengthofmachinetype = machinetype.length;
        var c = machinetypechararray[0];
        var newmachinetype = " ";
        if (c >= '0' && c <= '9') {
            newmachinetype = newmachinetype + "one";
            for (var i = 1; i < lengthofmachinetype; ++i) { // it is a number
                newmachinetype = newmachinetype + machinetypechararray[i];
            }
        } else {
            newmachinetype = " " + machinetype;
        }
        if (machinelocation.length == 1) {
            machinelocation = " noi";
        }
        //removing spaces globally
        machinelocation = machinelocation.replace(/\s/g, "");
        machinename = machinename.replace(/\s/g, "");
        newmachinetype = newmachinetype.replace(/\s/g, "");
        //bot.reply(message,machinelocation+'-'+newmachinetype+'-'+machinename);

        // creating complete machine name
        var completeoneboxname = machinelocation + '-' + newmachinetype + '-' + machinename;
        //bot.reply(message,completeoneboxname);
        var range = XLSX.utils.decode_range(worksheet['!ref']);
        var flag = 0; // get the range
        for (var R = range.s.r; R <= range.e.r; ++R) {
            for (var C = range.s.c; C <= range.e.c; ++C) {
                /* find the cell object */
                var cellref = XLSX.utils.encode_cell({
                    c: C,
                    r: R
                }); // construct A1 reference for cell
                if (!worksheet[cellref]) continue; // if cell doesn't exist, move on
                var cell = worksheet[cellref];

                /* if the cell is a text cell with the old string, change it */
                if (cell.v === completeoneboxname) {
                    flag = 1;
                }
            }
        }
        //bot.reply(message,'flag is'+flag)
        if (flag == 0) {
            var range = XLSX.utils.decode_range(worksheet['!ref']);
            for (var R = range.s.r; R <= range.e.r; ++R) {
                for (var C = range.s.c; C <= range.e.c; ++C) {
                    /* find the cell object */
                    var cellref = XLSX.utils.encode_cell({
                        c: C,
                        r: R
                    }); // construct A1 reference for cell
                    if (!worksheet[cellref]) continue; // if cell doesn't exist, move on
                    var cell = worksheet[cellref];
                    //bot.reply(message,'this is '+R+' '+C);
                    /* if the cell is a text cell with the old string, change it */
                    if (cell.v === "Blank") { //bot.reply(message,'this is '+R+' '+C);
                        cell.v = completeoneboxname;
                        XLSX.writeFile(workbook, './excelConverter/obj.xlsx');
                        bot.reply(message, 'Got it. The machine ' + completeoneboxname + ' is added successfully ');
                        R = range.e.r;
                        C = range.s.c;
                        /* var cell2 = { v: "NA" };
                                                                var cellref2 = XLSX.utils.encode_cell({c:C+1, r:R}); // construct A1 reference for cell
                                                                cell2.t = 's'
                                                                 // if cell doesn't exist, move on
                                                                worksheet[cellref2]=cell2;
                                                                worksheet['!ref'] = XLSX.utils.encode_range(range);
                                                                workbook.SheetNames.push(first_sheet_name);s
                                                                workbook.Sheets[first_sheet_name] = worksheet;
                                                                XLSX.writeFile(workbook, './excelConverter/obj.xlsx');
                                                                bot.reply(message, 'Got it. The machine'+completeoneboxname+ ' is added successfully ');

                                                                //var cellref3 = XLSX.utils.encode_cell({c:C, r:R+1}); // construct A1 reference for cell
                                                                //if(!worksheet[cellref3]) continue; // if cell doesn't exist, move on
                                                                //var cell3 = worksheet[cellref3];
                                                                //cell3.v="NEW";
                                                                //XLSX.writeFile(workbook, './excelConverter/obj.xlsx');
                                                                //sbot.reply(message, 'Got it. The machine'+completeoneboxname+ ' is added successfully ');
                                                            */
                    }
                }
            }

        }
        if (flag == 1) {
            bot.reply(message, ' This machine is already in my dossier please try with different machine');
        }
    } else {
        bot.reply(message, ' Please provide machine name in correct format i.e. machinelocation-machinetype-machinename');
    }
});

controller.hears(['remove machine (.*)', 'remove a machine (.*)'], 'direct_message,direct_mention', function (bot, message) {
    var completemachinenameinput = message.match[1];
    var machinenamechararray = completemachinenameinput.split('');
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    lengthofinput = completemachinenameinput.length - 1;
    var machinename = " ";
    var machinetype = " ";
    var machinelocation = " ";
    //to calculate machinename
    var numberofdash = 0;
    var lengthofinput1 = lengthofinput;
    //for number of dash calculation
    while (lengthofinput1 > 0) {
        if (machinenamechararray[lengthofinput1] == '-') {
            numberofdash++;
        }
        lengthofinput1--;
    }
    if (numberofdash == 2) {
        while ((machinenamechararray[lengthofinput] != '-')) //||(machinenamechararray[lengthofinput]!=" "))
        {
            machinename = machinename + completemachinenameinput[lengthofinput]
            lengthofinput--;

        }
        if (lengthofinput > 0) {
            lengthofinput--;
            // bot.reply(message, machinename);
            //to calculate machine type
            while ((machinenamechararray[lengthofinput] != '-')) //||(machinenamechararray[lengthofinput]!=" "))
            {
                machinetype = machinetype + completemachinenameinput[lengthofinput];
                lengthofinput--;
            }
        }
        if (lengthofinput > 0) {
            lengthofinput--;
            //bot.reply(message, machinename+machinetype+lengthofinput+);
            //to calculate machine location
            while (lengthofinput >= 0) {
                machinelocation = machinelocation + completemachinenameinput[lengthofinput];
                lengthofinput--;
            }
        }
        var machinename = reverse(machinename);
        var machinetype = reverse(machinetype);
        var machinelocation = reverse(machinelocation);
        // bot.reply(message, 'machinename:-' +machinename +'machinetype:-' +machinelocation+ 'machinetype:-' +machinetype);
        //length of machine name should be of length 2 
        if ((machinename.length) == 2) {
            machinename = "0" + machinename;
        }
        var machinetypechararray = machinetype.split('');
        var lengthofmachinetype = machinetype.length;
        var c = machinetypechararray[0];
        var newmachinetype = " ";
        if (c >= '0' && c <= '9') {
            newmachinetype = newmachinetype + "one";
            for (var i = 1; i < lengthofmachinetype; ++i) { // it is a number
                newmachinetype = newmachinetype + machinetypechararray[i];
            }
        } else {
            newmachinetype = " " + machinetype;
        }
        if (machinelocation.length == 1) {
            machinelocation = " noi";
        }
        //removing spaces globally
        machinelocation = machinelocation.replace(/\s/g, "");
        machinename = machinename.replace(/\s/g, "");
        newmachinetype = newmachinetype.replace(/\s/g, "");
        //bot.reply(message,machinelocation+'-'+newmachinetype+'-'+machinename);

        // creating complete machine name
        var completeoneboxname = machinelocation + '-' + newmachinetype + '-' + machinename;
        //bot.reply(message,completeoneboxname);
        var range = XLSX.utils.decode_range(worksheet['!ref']);
        var flag = 0; // get the range
        for (var R = range.s.r; R <= range.e.r; ++R) {
            for (var C = range.s.c; C <= range.e.c; ++C) {
                /* find the cell object */
                var cellref = XLSX.utils.encode_cell({
                    c: C,
                    r: R
                }); // construct A1 reference for cell
                if (!worksheet[cellref]) continue; // if cell doesn't exist, move on
                var cell = worksheet[cellref];

                /* if the cell is a text cell with the old string, change it */
                if (cell.v === completeoneboxname) {
                    flag = 1;
                    cell.v = "Deleted";
                    var cellref3 = XLSX.utils.encode_cell({
                        c: C + 1,
                        r: R
                    }); // construct A1 reference for cell
                    if (!worksheet[cellref3]) continue; // if cell doesn't exist, move on
                    var cell3 = worksheet[cellref3];
                    cell3.v = "Deleted";
                    XLSX.writeFile(workbook, './excelConverter/obj.xlsx');
                    bot.reply(message, 'Got it. The machine' + completeoneboxname + ' is deleted successfully ');

                }
            }
        }
        //bot.reply(message,'flag is'+flag)
        if (flag == 0) {
            bot.reply(message, ' This machine is not in my dossier please try with different machine'); //sbot.reply(message, 'Got it. The machine'+completeoneboxname+ ' is added successfully ');
        }
    } else {
        bot.reply(message, ' Please provide machine name in correct format i.e. machinelocation-machinetype-machinename');
    }
});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

function reverse(s) {
    return s.split("").reverse().join("");
}
