//Exit if Token is not specified
if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

//Initialize Required Packages and Start the Bot
var Botkit = require('./lib/Botkit.js'),
    mongoStorage = require('botkit-storage-mongo')({mongoUri: 'mongodb://noi-qa-jenkins:27017/drk-db'}),
    controller = Botkit.slackbot({
        storage: mongoStorage
    });
var Excel = require('./excel_operations.js');
var os = require('os');
var fs = require('fs');
var ping = require('ping');
var bot = controller.spawn({
    token: process.env.token
}).startRTM();

//Reply to Hello and Hey
controller.hears(['hello', 'hey'], 'direct_message,direct_mention,mention', function (bot, message) {

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
    var machineAssignee=getMachineInfo(message.match[1]);
    bot.reply(message,machineAssignee);
});

controller.hears(['add new machine (.*)','add a new machine (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
     var machineNameEntered = message.match[1];
     
     bot.startConversation(message, function(err, convo) {
       convo.ask('Are you sure you want to add '+machineNameEntered + ' ?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    //If machine is not available in the dossier then ping the machine and add it
                    if(!isMachinePresent(machineNameEntered)) {

                        var isMachineReachable = ping.sys.probe(host, function(isAlive){
                            return isAlive;
                        });

                        if(isMachineReachable)
                        {                             
                            convo.ask('Please Enter Administrator password to continue....', function(response, convo) {
                                if(response.text=='Monotype456#') {
                                    bot.reply(message,addMachine(machineNameEntered));
                                }
                                else {
                                    bot.reply(message, 'Password is incorrect! Please retry to add a new machine again !');                                
                                }
                            });
                        }
                        else
                        {
                            bot.reply(message, 'The machine '+machineNameEntered+ ' is dead! Please check that you can ping the machine and then try again');
                        }
                    }
                    else
                    {
                        bot.reply(message,'This machine is already in my dossier please try with different machine');
                    }
                    convo.next();
                }
            },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: function(response, convo) {                    
                    bot.api.reactions.add({
                        timestamp: message.ts,
                        channel: message.channel,
                        name: 'rage',
                    }, function (err, res) {
                        if (err) {
                            bot.botkit.log('Failed to add emoji reaction :(', err);
                        }
                    });
                    convo.next();
                }
            }
        ]);
    });
    
});


controller.hears(['remove machine (.*)', 'remove a machine (.*)'], 'direct_message,direct_mention', function (bot, message) {
    
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
