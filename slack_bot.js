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
var testrail = require('./testrail_operations.js');
var jira = require('./jira_operation.js');
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

controller.hears(['phone number for (.*)','need to call (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    getUserPhone(message.match[1],function(phone)
    {
        if(phone=="Not Found")
        {
            bot.reply(message, "No User found with name - " + message.match[1]);
        }
        else if(phone =="Number not present" )
        {
            bot.reply(message,":angry: Looks like " + message.match[1] +  " has not updated his Phone number in Slack :angry:");            
        }
        else
        {
            bot.reply(message, "Phone Number for " + message.match[1] + " is " + phone);
        }
    });
});

//When user want a project run status
controller.hears(['testrail status for (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want to see TestRail run information about project(s) having name \"' + message.match[1] + '\" ?', [
                {
                    pattern: 'yes',
                    callback: function (response, convo) {
                        try {  
                             bot.startConversation(message,function(err,convo)
                                {                          
                                getProjectId(message.match[1], function (Ids,callback) {
                                if(Ids.length>1)
                                 {
                                   bot.reply(message, 'There are multiple projects with the name '+message.match[1]+'. These are as follows :-',function()
                                   {          
                                          async.eachSeries(Ids, function (Ids, callback) {                                                                                   
                                          bot.reply(message, 'Project Id:= '+Ids.value + '  Project Name:=' + Ids.key, function (err, sent) {                                                    
                                                                    callback();
                                           }); 
                                           },function()
                                           {
                                            var flag=0;
                                            convo.ask(' Please Enter Project Id corresponding to project listed above', [{ 
                                            pattern: '[1-9][0-9]{0,2}',
                                            callback: function (response, convo) {
                                            var projectId=parseInt(response.text);
                                            async.eachSeries(Ids, function (Ids, callback) {        
                                                if(Ids.value===projectId)
                                                {
                                                flag=1;
                                                } 
                                                callback();
                                            },
                                           function()
                                           {
                                               if(flag==1)
                                               {
                                                convo.stop();
                                                bot.startConversation(message,function(err,convo)
                                                    {
                                                            
                                                        convo.ask('Please enter a choice(1,2 or 3):-\n1. All Runs\n2. Closed Runs Only\n3. Open Runs Only', [{                                        
                                                        pattern: '[1-3]',
                                                        callback: function (response, convo) {
                                                        getRunDetails(projectId, parseInt(response.text),bot,message,convo, function (runDetails) {
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
                                               });
                                            }
                                            else
                                            {
                                                bot.reply(message,':flushed: Wrong ProjectId! Please Enter only from above mentioned projectIds')
                                                convo.repeat();
                                            }
                                           });
                                              }
                                              },
                                              {
                                                    pattern: '*',
                                                    callback: function (response, convo) {
                                                        bot.reply(message, 'Input not supported');
                                                        convo.repeat();
                                                }
                                               }]);     
                                            }
                                        );
                                    });
                                 
                                }
                                else if (Ids.length===1) {
                                    convo.ask('Please enter a choice(1,2 or 3):-\n1. All Runs\n2. Closed Runs Only\n3. Open Runs Only', [{                                        
                                        pattern: '[1-3]',
                                        callback: function (response, convo) {
                                            getRunDetails(Ids[0].value, parseInt(response.text),bot,message,convo, function (runDetails) {
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
                                    bot.reply(message, ':flushed: Looks like the project is not valid. Please try again with correct Project :flushed:');
                                    convo.stop();    
                            };
                              });
                            });
                        } catch (err) {
                            console.log(err);
                            bot.reply(message, ':flushed: Oops ! Something went wrong here...Please try again later.');
                        }
                        convo.stop();
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


controller.hears(['where is (.*) hosted','environment for (.*)', '(.*) environment'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {                        
            convo.ask('Do you want to know Environment details for `' + message.match[1] + '`?', [{
                pattern: 'yes',
                callback: function (response, convo) {
                     getMTApplicationInfo(message.match[1],function (apps) {
                        if (apps[0] != null) {
                            bot.reply(message, 'Here you go! :-', function () {
                                for (index = 0, len = apps.length; index < len; ++index) {
                                    bot.reply(message, apps[index]);
                                }
                            });
                        }
                        else {                                                      
                            getAllMTApplications(function(applications)
                            {
                               bot.reply(message, ':white_frowning_face: I\'m sorry I don\'t have any such Application in my dossier! :white_frowning_face: \nPlease try again from the list of Applications supported - ', function () {
                                    for (index = 0, len = applications.length; index < len; ++index) {
                                        bot.reply(message, applications[index]);
                                    }
                                }); 
                            });
                            convo.repeat();
                        }
                    });
                    convo.stop();
                }
            },
            {
                pattern: 'no',
                callback: function (response, convo) {
                    bot.reply(message, 'Nevermind. Hope you have a great day!');
                    convo.stop();
                }
            },
            {
                default: true,
                callback: function (response, convo) {                    
                    convo.next();
                }
            }
            ]);                
        }
    });
});
//For task searching
controller.hears(['jira task info from taskid (.*)','jira task status from taskid (.*)','jira task info from task id (.*)','jira task status from task id(.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
          bot.startConversation(message, function (err, convo) {
            getInformationById(message.match[1], convo,message,bot, function (searchResult) {
            bot.reply(message,'Informations related to '+ message.match[1]+' are as follows',function(){
              bot.reply(message,'TaskId: '+searchResult.key+"\n"+
                 'TaskType: '+searchResult.fields.issuetype.name+"\n"+
                 'ParentId: '+ searchResult.fields.parent.key+"\n"+
                 'ProjectName: '+searchResult.fields.project.name+"\n"+
                 'OriginalEstimates: '+searchResult.fields.timetracking.originalEstimate+"\n"+
                 'RemainingEstimates: '+searchResult.fields.timetracking.remainingEstimate+"\n"+
                 'Task Name: ' +searchResult.fields.summary+"\n"+
                 'Creator: '+searchResult.fields.creator.displayName+"\n"+
                 'Reporter: '+searchResult.fields.reporter.displayName+"\n"+
                 'Assignee: '+searchResult.fields.assignee.displayName+"\n"+
                 'Status: '+ searchResult.fields.status.name+"\n")
            });
    });
});
});
//For jira Tasks of a user
controller.hears(['jira task assigned to user (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
            bot.startConversation(message, function (err, convo) {
            getInformationForUser(message.match[1], convo,message,bot, function (searchResult) {
            bot.reply(message,'All tasks in currently active sprints assigned to user '+ message.match[1]+' are as follows',function(){
            var counter=0;
            for(var index=0;index<searchResult.total;index++)
            {                                                                                      
                    bot.reply(message, searchResult.issues[index].key+" : https://jira.monotype.com/browse/"+searchResult.issues[index].key);
            }
});
})
})
});


function getUserPhone(username,callback) {
    bot.api.users.list({},function (err,list) {        
        var user = list.members.find(member => (member.real_name.toString().toLowerCase()===username.toString().toLowerCase()) || (member.name.toString().toLowerCase()===username.toString().toLowerCase()) || (member.profile.first_name.toString().toLowerCase().indexOf(username.toString().toLowerCase())!=-1));
        if(user)
        {
            if(user.profile.phone)
            {
                callback(user.profile.phone);
            }
            else
            {
                callback("Number not present");
            }
        }
        else
        {
            callback("Not Found");
        }
    });
}

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