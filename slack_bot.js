//Exit if Token is not specified
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

//Initialize Required Packages and Start the Bot
var Botkit = require('./lib/Botkit.js'),
    mongoStorage = require('botkit-storage-mongo')({ mongoUri: 'mongodb://noi-qa-jenkins:27017/drk-db' }),
    controller = Botkit.slackbot({
        storage: mongoStorage
    });
var db = require('./db_operations.js');
var db = require('./testrail_operations.js');
var os = require('os');
var fs = require('fs');
var ping = require('ping');
var Q = require('q');
var async = require('async');

//This is for again opening connection if it closes 
function start_rtm() {
    bot.startRTM(function (err, bot, payload) {
        if (err) {
            console.log('Failed to start RTM')
            return setTimeout(start_rtm, 10000);
        }
        console.log("RTM started!");
    });
}

controller.on('rtm_close', function (bot, err) {
    start_rtm();
});

//This is used to specify token in bot
var bot = controller.spawn({
    token: process.env.token
}).startRTM();

//Reply to Hello and Hey
controller.hears(['hello', 'hey', '\\bhi\\b'], 'direct_message,direct_mention,mention', function (bot, message) {

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
controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'direct_message,direct_mention,mention', function (bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message, ':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '.');
});

//User want to know status of a machine 
controller.hears(['who is using (.*)', 'what is the status of (.*)', 'i want to use (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    try {
        var inputString = message.match[1];
        if (inputString.indexOf("?") != -1) {
            var finalInputString = inputString.substring(0, inputString.indexOf("?"));
        }
        else if (inputString.indexOf(".") != -1) {
            var finalInputString = inputString.substring(0, inputString.indexOf("."));
        }
        else {
            var finalInputString = inputString;
        }

        getMachineInfo(finalInputString, function (machineAssignee) {
            bot.reply(message, machineAssignee);
        });
    } catch (err) {
        console.log(err);
        bot.reply(message, ':flushed: Oops ! Failed to get machine status...Please try again later.');
    }
});

//When user want a Free Virtual Machine.
controller.hears(['want a free virtual machine', 'assign a machine', 'assign a virtual machine', 'want a free machine', 'need a free machine', 'want a VM', 'need a VM', 'want a free VM', 'need a free VM'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {


    bot.reply(message, 'Looking for machines....', function (err, message) {
        try {
            getFreeMachine(function (searchFreeMachine) {

                if (searchFreeMachine[0] != null) {
                    bot.reply(message, 'Following machines are not logged in by any user right now:-', function () {
                        for (index = 0, len = searchFreeMachine.length; index < len; ++index) {
                            bot.reply(message, searchFreeMachine[index]);
                        }
                    });
                }
                else {
                    bot.reply(message, ':white_frowning_face: Hard Luck ! We don\'t have any free machines right now.');
                }
            });
        } catch (err) {
            console.log(err);
            bot.reply(message, ':flushed: Oops ! Failed to get free machines list...Please try again later.');
        }
    });

});

controller.hears(['phone number for (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.api.users.info({ user: message.match[0] }, function (err, list) {
        bot.reply(message, "response goes here");
        console.log(message.match[0] + "Response = " + list);
    });
});

//When user want a project run status
controller.hears(['testrail status for (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want to see the last 10 results for \"' + message.match[1] + '\" Project ?', [
                {
                    pattern: 'yes',
                    callback: function (response, convo) {
                        try {  
                            bot.startConversation(message,function(err,convo)
                            {                          
                              getProjectId(message.match[1], function (Ids,callback) {
                                if (Ids.length===1) {
                                    convo.ask('Please enter a choice(1,2 or 3):-\n1. All Runs\n2. Closed Runs Only\n3. Open Runs Only', [{                                        
                                        pattern: '[1-3]',
                                        callback: function (response, convo) {
                                            getRunDetails(Ids[0], parseInt(response.text), function (runDetails) {
                                                console.log('returned');
                                                bot.reply(message, ' The project run details are as follows:-', function () {
                                                var sum=0;
                                                var count=0;
                                                var runInfo;
                                                async.eachSeries(runDetails, function (runDetail, callback) {                                                                                    
                                                    if(isNaN(runDetail.value))
                                                    {
                                                        count = count+1;
                                                        runInfo = "(No Test Case Info Available)";
                                                    }
                                                    else
                                                    {
                                                        sum = sum + runDetail.value;
                                                        count = count+1;
                                                        runInfo = "(Pass Percentage = " + parseFloat(Math.round(runDetail.value * 100) / 100).toFixed(2) + "\%)";
                                                    }
                                                    bot.reply(message, runDetail.key + " " + runInfo, function (err, sent) {                                                    
                                                        callback();
                                                    });
                                                },function()
                                                {
                                                    var avg = sum/count;
                                                    avg = parseFloat(Math.round(avg * 100) / 100).toFixed(2);
                                                    if(avg>=90)
                                                    {
                                                        bot.reply(message, ":muscle: Looks like \"" + message.match[1] + "\" is in Good Shape! Average Pass Percentage for last 10 runs = " + avg + "% :muscle:");
                                                    }
                                                    else if(avg<90 && avg>=80)
                                                    {
                                                        bot.reply(message, ":fearful: Looks like \"" + message.match[1] +  "\" needs some help. Average Pass Percentage for last 10 runs = " + avg + "% :fearful:");
                                                    }
                                                    else
                                                    {
                                                        bot.reply(message, ":scream: Looks like \"" + message.match[1] +  "\" is drowning! Average Pass Percentage for last 10 runs = " + avg + "% :scream:");
                                                    }                                                
                                                });
                                                convo.stop();
                                            });
                                        });
                                    }},
                                    {
                                        pattern: '*',
                                        callback: function (response, convo) {
                                             bot.reply(message, 'Input not supported');
                                             convo.repeat();
                                        }
                                    }]);
                                }
                                else{
                                    bot.reply(message, ':flushed: Looks like the project is not valid. Please try again with correct Project');
                                };
                              });
                            });
                        } catch (err) {
                            console.log(err);
                            bot.reply(message, ':flushed: Oops ! Something went wrong here...Please try again later.');
                        }
                        convo.next();
                    }
                },
                {
                    pattern: 'no',
                    callback: function (response, convo) {
                        bot.reply(message, 'No issues. Hope you have a great day!');
                        convo.stop();
                    }
                }
            ]);
        }
    });
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