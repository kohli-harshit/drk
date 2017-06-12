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
var giphy = require('./giphyOperation.js');
var jenkins = require('./jenkinsOperation.js');
var os = require('os');
var fs = require('fs');
var ping = require('ping');
var Q = require('q');
var async = require('async');
var team=["API"];

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
            getGiphy("welcome",function(link)
            {
                bot.reply(message, 'Hello ' + user.name + '!! ' + link);
            });
        } else {
            getGiphy("welcome",function(link)
            {
                bot.reply(message, 'Hello. ' + link);
            });
            getNameFromUser(bot,message,"For understanding how I work, ping me `help`");
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
            getNameFromUser(bot,message,"");
        }
    });
});


//User asks Bot Identity
controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'direct_message,direct_mention,mention', function (bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message, ':robot_face: I am a bot named <@' + bot.identity.name + '> and I like to help people with their daily tasks. I have been running for ' + uptime);
});

//User want to know status of a machine 
controller.hears(['who is using (.*)', 'what is the status of (.*)', 'i want to use (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
    try {
        var inputString = message.match[1];
        var finalInputString;
        if (inputString.indexOf("?") != -1) {
            finalInputString = inputString.substring(0, inputString.indexOf("?"));
        }
        else if (inputString.indexOf(".") != -1) {
            finalInputString = inputString.substring(0, inputString.indexOf("."));
        }
        else {
            finalInputString = inputString;
        }

        getMachineInfo(finalInputString, function (machineAssignee) {
            bot.reply(message, machineAssignee);
        });
    } catch (err) {
        console.log(err);
        bot.reply(message, ':flushed: Oops ! Failed to get machine status...Please try again later :flushed:');
    }
});

//When user want a Free Virtual Machine.
controller.hears(['want a free virtual machine', 'assign a machine', 'assign a virtual machine', 'want a free machine', 'need a free machine', 'want a VM', 'need a VM', 'want a free VM', 'need a free VM'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
bot.startConversation(message, function (err, convo) {
                if (!err) {
                    bot.reply(message,'List of available Teams in my dossier:-',function(err,sent){
                        bot.reply(message,team.toString().replace(/,/g,"\n"),function(err,sent){
                         convo.ask(':point_up: Please enter a Team name from the list above', function (response, convo) {
                          bot.reply(message, 'Looking for machines....', function (err, message) {
                            try {

                                getFreeMachine(response.text,function (searchFreeMachine) {

                                if (searchFreeMachine[0] != null) {
                                        bot.reply(message, 'Following machines are not logged in by any user right now:-', function () {
                                            for (index = 0, len = searchFreeMachine.length; index < len; ++index) {
                                                bot.reply(message, searchFreeMachine[index]);
                                            }
                                        });                                        
                                    }
                                    else {
                                        bot.reply(message, ':white_frowning_face: Hard Luck ! No Machines available for Team - ' + response.text + " :white_frowning_face:");
                                    }
                                });                                
                            } catch (err) {
                                console.log(err);
                                bot.reply(message, ':flushed: Oops ! Failed to get free machines list...Please try again later.');                                
                            }
                            convo.stop();
                        });
                    });
                });
            });
        }
    });
});

/*
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
*/

//When user want a project run status
controller.hears(['testrail status for (.*)','testrail for (.*)','(.*) testrail'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want to see TestRail run information about project(s) having name `' + message.match[1] + '` ?', [
                {
                    pattern: 'yes',
                    callback: function (response, convo) {
                        try {  
                             bot.startConversation(message,function(err,convo)
                                {                          
                                getProjectId(message.match[1], function (Ids,callback) {
                                if(Ids.length>1)
                                 {
                                   bot.reply(message, 'There are multiple projects with the name '+message.match[1]+':-',function()
                                   {          
                                          async.eachSeries(Ids, function (Ids, callback) {                                                                                   
                                          bot.reply(message, 'Project Id:= '+Ids.value + '  Project Name:=' + Ids.key, function (err, sent) {                                                    
                                                                    callback();
                                           }); 
                                           },function()
                                           {
                                            var flag=0;
                                            convo.ask(':point_up_2: Please Enter Project Id corresponding to project listed above :point_up_2:', [{ 
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
                                                                    bot.reply(message, ":muscle: Looks like `" + message.match[1] + "` is in Good Shape! Average Pass Percentage for last 10 runs = " + avg + "% :muscle:");
                                                                }
                                                                else if(avg<90 && avg>=80)
                                                                {
                                                                    bot.reply(message, ":fearful: Looks like `" + message.match[1] +  "` needs some help. Average Pass Percentage for last 10 runs = " + avg + "% :fearful:");
                                                                }
                                                                else
                                                                {
                                                                    bot.reply(message, ":scream: Looks like `" + message.match[1] +  "` is drowning! Average Pass Percentage for last 10 runs = " + avg + "% :scream:");
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
                                                bot.reply(message,':flushed: Invalid Project ID Received! Please try again with full Project name or Correct ID in case of multiple projects :flushed:')
                                                convo.stop();
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
controller.hears(['jira task (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
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
controller.hears(['(.*) jira list','(.*) jira task'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
            bot.startConversation(message, function (err, convo) {
               getInformationForUser(message.match[1], convo,message,bot, function (searchResults) {
                
                   if(searchResults.warningMessages)
                   {                       
                        bot.reply(message, "Looks like `" + message.match[1] + "` is not a valid JIRA username(they are generally a combination of the lastname and the 1st character of firstname)\n Example: `kishorer` should be the JIRA username for a person with the name `Ram Kishore`");
                   }
                   else
                   {
                    async.eachSeries(searchResults.issues, function (searchResult, callback) {
                            getInformationById(searchResult.key, convo,message,bot, function (searchRes) {       
                                if(searchRes.fields.timetracking.remainingEstimate)
                                {                
                                    if(searchRes.fields.status.name=="Done") 
                                    {
                                        bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate+ "\nCurrent Status: " +searchRes.fields.status.name+' :trophy:', function (err, sent) { 
                                        bot.reply(message,"\n",function(err,sent) {
                                        callback();
                                    });
                                    });
                                }
                                else if(searchRes.fields.status.name=="To Do")
                                    {
                                    bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate+ "\nCurrent Status: " +searchRes.fields.status.name+' :cold_sweat:', function (err, sent) { 
                                    bot.reply(message,"\n",function(err,sent) {
                                    callback(); 
                                    });
                                    });
                                    }
                                    else
                                        {  
                                            bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+ searchRes.key + "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate + "\nCurrent Status: " +searchRes.fields.status.name+' :bicyclist: ', function (err, sent) { 
                                            bot.reply(message,"\n",function(err,sent) {
                                            callback();
                                            });
                                        });
                                        }
                                }
                                else
                                {
                                if(searchRes.fields.status.name=="Done") 
                                    {
                                        bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nCurrent Status: " +searchRes.fields.status.name+' :trophy:', function (err, sent) { 
                                        bot.reply(message,"\n",function(err,sent) {
                                        callback();
                                        });
                                    });
                                }
                                else if(searchRes.fields.status.name=="To Do")
                                    {
                                    bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nCurrent Status: " +searchRes.fields.status.name+' :cold_sweat:', function (err, sent) { 
                                    bot.reply(message,"\n",function(err,sent) {
                                    callback(); 
                                            });
                                        });
                                    }
                                    else
                                        {  
                                            bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nCurrent Status: " +searchRes.fields.status.name+' :bicyclist: ', function (err, sent) { 
                                            bot.reply(message,"\n",function(err,sent) {
                                            callback();
                                            });
                                        });
                                    }
                                }
                                });
    
                            });                          
                        }
                        convo.stop();
                        }); 
             });
    });
//For my own jira tasks
controller.hears(['my jira'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
  controller.storage.users.get(message.user, function (err, user)
   {
    if (user) {
           bot.startConversation(message, function (err, convo) {
           searchUserName(message.user,function(userName,name,status){
               if(status=="Not Found")
               {
                    convo.stop();
                    bot.startConversation(message, function (err, convo) {
                        convo.ask('I don\'t have your JIRA username, Please enter your JIRA Username (don\'t worry I won\'t ask for your Password! :sunglasses:) :-', function (response, convo) {
                        updateUserName(message.user,name,response.text,function(userName)
                        {
                            callAndPrintOutut(userName,convo,message,bot);
                        });                    
                        convo.stop();
                    });
              });
              }
              else if(status=="Found")
                {
                callAndPrintOutut(userName,convo,message,bot);
                }
           });
           convo.stop();
         });
    }
    else{
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
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.',function()
                                    {
                                        bot.reply(message," Got your name! Please retry with my jira to search jira assigned to you")
                                    });
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
   }
  )
}); 


controller.hears(['feedback','suggestion'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.reply(message, "For any feedback/suggestions please drop a mailto:harshit.kohli@monotype.com");
});

controller.hears(['start job (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want me to start a job on http://noi-qa-jenkins:8080 having name `' + message.match[1] + '` ?', [
            {
                pattern: 'yes',
                callback: function (response, convo) {                    
                    getJenkinsProject(message.match[1],function (jobs) {
                        if(jobs.length==0)
                        {
                            bot.reply(message,":disappointed: No Job found with name - " + message.match[1] + " :disappointed:" );                                
                            convo.stop();
                        }
                        else if(jobs.length==1)
                        {
                            startBuild(jobs[0].key,function(buildURL)
                            {
                                if(buildURL)
                                {
                                    if(buildURL=="Job Already Running")
                                    {
                                        bot.reply(message,":sunglasses: Job `" + jobs[0].key + "`. Is already running :sunglasses: \n ");
                                    }
                                    else if(buildURL.lastIndexOf("/console")!=-1)
                                    {
                                        bot.reply(message,":muscle: Job `" + jobs[0].key + "`. Successfully inititiated ! :muscle: \n " + buildURL );
                                    }
                                    else if(buildURL.lastIndexOf("/build")!=-1)
                                    {
                                        bot.reply(message,":innocent: Job `" + jobs[0].key + "`is a Parameterized Job. Please initiate it from the link below:- :innocent: \n " + buildURL );
                                    }
                                    else
                                    {
                                        bot.reply(message,":zipper_mouth_face: Not able to Start the job - " + jobs[0].key + " :zipper_mouth_face:" );                                        
                                    }
                                }
                                else
                                {
                                    bot.reply(message,":zipper_mouth_face: Not able to Start the job - `" + jobs[0].key + "` :zipper_mouth_face:" );
                                }
                            });
                            convo.stop();
                        }
                        else
                        {
                            bot.reply(message, 'There are multiple Jobs having the keyword `'+message.match[1]+'`:-',function(callback)
                            {          
                                var count=0;
                                async.eachSeries(jobs,function (job,callback) {
                                    bot.reply(message, ++count + '. ' + job.key, function (err, sent) {
                                        callback();
                                    }); 
                                },function(callback)
                                {
                                    convo.stop();
                                    bot.startConversation(message, function (err, convo) {
                                        if(err)
                                        {
                                            console.log(err);
                                        }
                                        convo.ask(':point_up_2: Please enter the Job number which you want to run', [{
                                            pattern: '[1-9][0-9]{0,2}',
                                            callback: function (response, convo) {            
                                                if(parseInt(response.text)<=jobs.length)
                                                {
                                                    startBuild(jobs[parseInt(response.text)-1].key,function(buildURL)
                                                    {
                                                        if(buildURL)
                                                        {
                                                            if(buildURL=="Job Already Running")
                                                            {
                                                                bot.reply(message,":sunglasses: Job `" + jobs[parseInt(response.text)-1].key + "`. Is already running :sunglasses: \n ");
                                                            }
                                                            else if(buildURL.lastIndexOf("/console")!=-1)
                                                            {
                                                                bot.reply(message,":muscle: Job `" + jobs[parseInt(response.text)-1].key + "`. Successfully inititiated ! :muscle: \n " + buildURL );
                                                            }
                                                            else if(buildURL.lastIndexOf("/build")!=-1)
                                                            {
                                                                bot.reply(message,":innocent: Job `" + jobs[parseInt(response.text)-1].key + "`is a Parameterized Job. Please initiate it from the link below:- :innocent: \n " + buildURL );
                                                            }
                                                            else
                                                            {
                                                                bot.reply(message,":zipper_mouth_face: Not able to Start the job - " + jobs[parseInt(response.text)-1].key + " :zipper_mouth_face:" );
                                                            }
                                                        }                                                        
                                                        else
                                                        {
                                                            bot.reply(message,":zipper_mouth_face: Not able to Start the job - " + jobs[parseInt(response.text)-1].key + "(Only Non Parameterized Jobs supported) :zipper_mouth_face:" );
                                                        }
                                                    });
                                                    convo.stop();
                                                }
                                                else
                                                {
                                                    bot.reply(message,"Please enter a valid number");
                                                    convo.repeat();
                                                }
                                            }
                                        },                                              
                                        {
                                            pattern: '*',
                                            callback: function (response, convo) {
                                                bot.reply(message, 'Input not supported');
                                                convo.repeat();
                                            }
                                        }]);                                    
                                    });
                                });
                            });                       
                        };
                    });
                }
            },
            {
                pattern: 'no',
                callback: function (response, convo) {
                    bot.reply(message, 'Nevermind. Hope you have a great day !');
                    convo.stop();
                }
            }]);
        }
    });    
});

controller.hears(['stop job (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want me to stop a job on http://noi-qa-jenkins:8080 having name `' + message.match[1] + '` ?', [
            {
                pattern: 'yes',
                callback: function (response, convo) {                    
                    getJenkinsProject(message.match[1],function (jobs) {
                        if(jobs.length==0)
                        {
                            bot.reply(message,":disappointed: No Job found with name - " + message.match[1] + " :disappointed:" );                                
                            convo.stop();
                        }
                        else if(jobs.length==1)
                        {
                            stopBuild(jobs[0].key,function(jobresult)
                            {
                                if(jobresult)
                                {
                                    if(jobresult=="Job not running")
                                    {
                                        bot.reply(message,":sunglasses: Job `" + jobs[0].key + "`. Is not in running state :sunglasses: \n ");
                                    }
                                    else if(jobresult!="Error")
                                    {
                                        bot.reply(message,":muscle: Job - " + jobs[0].key + " successfully stopped :muscle:" );
                                    }
                                }                                
                                else
                                {
                                    bot.reply(message,":zipper_mouth_face: Not able to Stop the job - " + jobs[0].key + " :zipper_mouth_face:" );
                                }
                            });
                            convo.stop();
                        }
                        else
                        {
                            bot.reply(message, 'There are multiple Jobs having the keyword `'+message.match[1]+'`:-',function(callback)
                            {          
                                var count=0;
                                async.eachSeries(jobs,function (job,callback) {
                                    bot.reply(message, ++count + '. ' + job.key, function (err, sent) {
                                        callback();
                                    }); 
                                },function(callback)
                                {
                                    convo.stop();
                                    bot.startConversation(message, function (err, convo) {
                                        if(err)
                                        {
                                            console.log(err);
                                        }
                                        convo.ask(':point_up_2: Please enter the Job number which you want to stop', [{
                                            pattern: '[1-9][0-9]{0,2}',
                                            callback: function (response, convo) {            
                                                if(parseInt(response.text)<=jobs.length)
                                                {                                                    
                                                    stopBuild(jobs[parseInt(response.text)-1].key,function(jobresult)
                                                    {   
                                                        if(jobresult)                                                     
                                                        {
                                                            if(jobresult=="Job not running")
                                                            {
                                                                bot.reply(message,":sunglasses: Job `" + jobs[parseInt(response.text)-1].key + "`. Is not in running state :sunglasses: \n ");
                                                            }
                                                            else if(jobresult!="Error")
                                                            {
                                                                bot.reply(message,":muscle: Job - " + jobs[parseInt(response.text)-1].key + " successfully stopped :muscle:" );
                                                            }
                                                        }                                                        
                                                        else
                                                        {
                                                            bot.reply(message,":zipper_mouth_face: Not able to Stop the job - " + jobs[parseInt(response.text)-1].key + " :zipper_mouth_face:" );
                                                        }
                                                    });
                                                    convo.stop();
                                                }
                                                else
                                                {
                                                    bot.reply(message,"Please enter a valid number");
                                                    convo.repeat();
                                                }
                                            }
                                        },                                              
                                        {
                                            pattern: '*',
                                            callback: function (response, convo) {
                                                bot.reply(message, 'Input not supported');
                                                convo.repeat();
                                            }
                                        }]);                                    
                                    });
                                });
                            });                       
                        };
                    });
                }
            },
            {
                pattern: 'no',
                callback: function (response, convo) {
                    bot.reply(message, 'Nevermind. Hope you have a great day !');
                    convo.stop();
                }
            }]);
        }
    });    
});

controller.hears(['job info (.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    bot.startConversation(message, function (err, convo) {
        if (!err) {
            convo.ask('Do you want me to look for job(s) on http://noi-qa-jenkins:8080 having name `' + message.match[1] + '` ?', [
            {
                pattern: 'yes',
                callback: function (response, convo) {                    
                    getJenkinsProject(message.match[1],function (jobs) {
                        if(jobs.length==0)
                        {
                            bot.reply(message,":disappointed: No Job found with name - " + message.match[1] + " :disappointed:" );                                
                            convo.stop();
                        }
                        else if(jobs.length==1)
                        {
                            getBuildStability(jobs[0].key,function(buildStability)
                            {
                                if(buildStability)
                                {
                                    if(buildStability=="Error")
                                    {                                        
                                        bot.reply(message,":zipper_mouth_face: Not able to get information about the job - `" + jobs[0].key + "` :zipper_mouth_face:" );
                                    }
                                    else if(buildStability=="No Build Information")
                                    {
                                        bot.reply(message,":relieved: Job `" + jobs[0].key + "` has no build information. I think it has not run till now :relieved: ");
                                    }
                                    else
                                    {
                                        bot.reply(message,buildStability);
                                    }
                                }
                                else
                                {
                                    bot.reply(message,":zipper_mouth_face: Not able to get information about the job - `" + jobs[0].key + "` :zipper_mouth_face:" );
                                }
                            });
                            convo.stop();
                        }
                        else
                        {
                            bot.reply(message, 'There are multiple Jobs having the keyword `'+message.match[1]+'`:-',function(callback)
                            {          
                                var count=0;
                                async.eachSeries(jobs,function (job,callback) {
                                    bot.reply(message, ++count + '. ' + job.key, function (err, sent) {
                                        callback();
                                    }); 
                                },function(callback)
                                {
                                    convo.stop();
                                    bot.startConversation(message, function (err, convo) {
                                        if(err)
                                        {
                                            console.log(err);
                                        }
                                        convo.ask(':point_up_2: Please enter the Job number which you want to know more about', [{
                                            pattern: '[1-9][0-9]{0,2}',
                                            callback: function (response, convo) {            
                                                if(parseInt(response.text)<=jobs.length)
                                                {
                                                    getBuildStability(jobs[parseInt(response.text)-1].key,function(buildStability)
                                                    {
                                                        if(buildStability)
                                                        {
                                                            if(buildStability=="Error")
                                                            {                                        
                                                                bot.reply(message,":zipper_mouth_face: Not able to get information about the job - `" + jobs[parseInt(response.text)-1].key + "` :zipper_mouth_face:" );
                                                            }
                                                            else if(buildStability=="No Build Information")
                                                            {
                                                                bot.reply(message,":relieved: Job `" + jobs[parseInt(response.text)-1].key + "` has no build information. I think it has not run till now :relieved: ");
                                                            }
                                                            else
                                                            {
                                                                bot.reply(message,buildStability);
                                                            }
                                                        }
                                                        else
                                                        {
                                                            bot.reply(message,":zipper_mouth_face: Not able to get information about the job - `" + jobs[0].key + "` :zipper_mouth_face:" );
                                                        }
                                                    });
                                                    convo.stop();
                                                }
                                                else
                                                {
                                                    bot.reply(message,"Please enter a valid number");
                                                    convo.repeat();
                                                }
                                            }
                                        },                                              
                                        {
                                            pattern: '*',
                                            callback: function (response, convo) {
                                                bot.reply(message, 'Input not supported');
                                                convo.repeat();
                                            }
                                        }]);                                    
                                    });
                                });
                            });                       
                        };
                    });
                }
            },
            {
                pattern: 'no',
                callback: function (response, convo) {
                    bot.reply(message, 'Nevermind. Hope you have a great day !');
                    convo.stop();
                }
            }]);
        }
    });    
});


controller.hears(['help'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    var helpString = "Usage Guide :-" +
    "\n\nFor a better experience, first time users should start the chat with `hi` or `hey` or `hello`" +
    "\n\n*Virtual Machine Management* :-\n" +
    "To know who is logged into a virtual machine, type - `who is using machinename` (or something similar)\n" +
    "To get a free machine, type - `i need a VM` (or something similar)\n" +
    "\n\n*TestRail Result Information* :-\n" +
    "To know the status of latest executions of a TestRail project, type - `testrail for projectname` (or something similar)\n" +
    "\n\n*JIRA Task Information* :-\n" +
    "To know the status of your JIRA tasks for the current sprint, type - `my jira` (or something similar)\n" +
    "To know the status of someone else's JIRA tasks for the current sprint, type - `jirausername jira task` (or something similar)\n" +
    "\n\n*Monotype Application Environment Information* :-\n" +
    "To know where an application is hosted, type - `environment for applicationname` (or something similar)\n" +
    "\n\n* Jenkins Integration* :-\n" +
    "Supported Jenkins Instance -  http://noi-qa-jenkins:8080\n" +
    "For Checking a job status, type - `job info jobname`\n"+
    "For Starting a job, type - `start job jobname`\n" +
    "For Stopping a job, type - `stop job jobname`\n";

    /*
    "\n\n* Slack User Phone Number Integration* :-\n" +
    "To know the phone number for a Slack User, type - `need to call personname` (or something similar)\n" +
    "\n\nTo provide any feedback or suggestions, type `feedback`";
    */
    bot.reply(message, helpString);
});


controller.hears(['(.*)'], 'direct_message,direct_mention,message_received,mention', function (bot, message) {
    getGiphy("dontKnow",function(link)
    {
        bot.reply(message, "I'm sorry I don't understand that..." + link);
    });
});

function getUserPhone(username,callback) {
    bot.api.users.list({},function (err,list) {
        if(err)
        {
            console.log(err);
            callback("Error");
        }   
        else
        {
            if(!list.members)
            {
                console.log("No Members found");
                callback("Error");
            }
            else
            {
                
                var result=[];
                async.eachSeries(list.members, function (member, callback) {                    
                    if(member.profile.phone)
                    {
                        console.log(count++);
                    }
                    callback();
                });                
                
                /*
                var user = list.members.find(member => (member.profile.real_name.toString().toLowerCase()===username.toString().toLowerCase()) || (member.name.toString().toLowerCase()===username.toString().toLowerCase()) || (member.profile.first_name.toString().toLowerCase().indexOf(username.toString().toLowerCase())!=-1));
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
                */               
            }
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

callAndPrintOutut=function(userName,convo,message,bot)
{
   getInformationForUser(userName, convo,message,bot, function (searchResults) {
                   async.eachSeries(searchResults.issues, function (searchResult, callback) {
                        getInformationById(searchResult.key, convo,message,bot, function (searchRes) {       
                            if(searchRes.fields.timetracking.remainingEstimate)       
                            {                
                                if(searchRes.fields.status.name=="Done") 
                                {
                                    bot.reply(message,"Task: `" +searchRes.fields.summary+ "`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate+ "\nCurrent Status: " +searchRes.fields.status.name+' :trophy:', function (err, sent) {                                     
                                    bot.reply(message,"\n",function(err,sent) {
                                    callback();
                                   });
                                });
                               }
                               else if(searchRes.fields.status.name=="To Do")
                                {
                                   bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate+ "\nCurrent Status: " +searchRes.fields.status.name+' :cold_sweat:', function (err, sent) { 
                                   bot.reply(message,"\n",function(err,sent) {
                                   callback(); 
                                   });
                                 });
                                }
                                else
                                    {  
                                        bot.reply(message,"Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+ "\nRemaining Time: "+searchRes.fields.timetracking.remainingEstimate+ "\nCurrent Status: " +searchRes.fields.status.name+' :bicyclist: ', function (err, sent) { 
                                        bot.reply(message,"\n",function(err,sent) {
                                        callback();
                                        });
                                    });
                                    }
                            }
                            else
                            {
                            if(searchRes.fields.status.name=="Done") 
                                {
                                    bot.reply(message, "Task: `" + searchRes.fields.summary + "`\nLink: https://jira.monotype.com/browse/" + searchRes.key + "\nCurrent Status: " +searchRes.fields.status.name + " :trophy:", function (err, sent) { 
                                    bot.reply(message,"\n",function(err,sent) {
                                    callback();
                                    });
                                });
                               }
                               else if(searchRes.fields.status.name=="To Do")
                                {
                                   bot.reply("Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nCurrent Status: " +searchRes.fields.status.name+' :cold_sweat:', function (err, sent) { 
                                   bot.reply(message,"\n",function(err,sent) {
                                   callback(); 
                                         });
                                    });
                                }
                                else
                                    {  
                                        bot.reply("Task: `" +searchRes.fields.summary+"`\nLink: https://jira.monotype.com/browse/"+searchRes.key+ "\nCurrent Status: " +searchRes.fields.status.name+' :bicyclist: ', function (err, sent) { 
                                        bot.reply(message,"\n",function(err,sent) {
                                        callback();
                                        });
                                    });
                                 }
                             }
                             });
 
                          });
                       });
}

function getNameFromUser(bot,message,replyMessage)
{
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

                    controller.storage.users.get(message.user, function (err, user) {
                        if (!user) {
                            user = {
                                id: message.user,
                            };
                        }
                        user.name = convo.extractResponse('nickname');
                        controller.storage.users.save(user, function (err, id) {
                            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.',function()
                            {
                                bot.reply(message,replyMessage);
                            });
                        });
                    });
                } else {
                    // this happens if the conversation ended prematurely for some reason
                    bot.reply(message, 'Nevermind. Hope you have a great day!');
                }
            });
        }
    });
}