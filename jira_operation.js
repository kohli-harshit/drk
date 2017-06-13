var Client = require('node-rest-client').Client;
var async = require('async');
var Q=require('q');
var baseUrl="https://jira.monotype.com/rest/api/2/";
const os = require('os')
const retry = require('retry')
const mongodb = require('mongodb')
const username = require('username')
const moment = require('moment')
var Q=require('q')

const url = 'mongodb://noi-qa-jenkins:27017/drk-db';
const userCollection='users';
const mongoClient = mongodb.MongoClient
const currentTime = new Date()
const currentHost=os.hostname()
const operation = retry.operation()
getUrl=function(id)
{
   var jira_url=baseUrl + "issue/" + id; 
   return jira_url;
}
getUrlForUser=function(userName)
{
   var jira_url=baseUrl + "search?jql=assignee in ("+userName+") AND sprint in openSprints()";
   return jira_url;
}
getUrlForComment=function(taskId)
{
   var jira_url=baseUrl + "issue/"+taskId+"/comment";
   return jira_url;
}
// Provide user credentials, which will be used to log in to JIRA.
var searchArgs = {

        headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic c3NoYXJtYTpHb29nbGVAMTIzNA=="
                 } 
};
var argsForPost = {
        data: { body: "hello" },
        headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic c3NoYXJtYTpHb29nbGVAMTIzNA=="
                 } 
};

getInformationById = function (taskId,convo,message,bot,callback)
{
 
client = new Client();            
var getUrl_Promise=Q.denodeify(getUrl);
var result=getUrl(taskId);                        
result.then
 {   try{    
   client.get(result, searchArgs, function(searchResult, response)
       {        
                console.log(response.statusCode);
                if(response.statusCode=='200')
                  {
                        callback(searchResult);         
                  }  
                  else
                  {
                    bot.reply(message,':flushed:There is no issue with this taskid, Please recheck it:flushed:');
                    convo.stop();   
                  }    
        });

}catch(err)
{
console.log('error is' +err);
  }
 }
}

getInformationForUser = function (userName,convo,message,bot,callback)
{
 
client = new Client();            
var getUrl_Promise=Q.denodeify(getUrlForUser);
var result=getUrlForUser(userName);                        
result.then
 {   try{    
   client.get(result, searchArgs, function(searchResult, response)
       {        
                console.log(response.statusCode);
                if(response.statusCode=='200')
                  {
                        callback(searchResult);         
                  }  
                  else
                  {
                    bot.reply(message,'":flushed: Looks like there is no task on this users plate! :flushed:');
                    convo.stop();   
                  }    
        });

}catch(err)
{
console.log('error is' +err);
  }
 }
}
putCommentOnJira = function (taskId,comment,convo,message,bot,callback)
{
 
client = new Client();            
var getUrl_Promise=Q.denodeify(getUrlForComment);
var result=getUrlForComment(taskId);                        
result.then
 {   try{    
   client.post(result, argsForPost, function(searchResult, response)
       {        
                console.log(response.statusCode);
                if(response.statusCode=='200')
                  {     
                        callback(searchResult);         
                  }  
                  else
                  {
                    bot.reply(message,'":flushed:There is currently no task on this users plate! please retry later:flushed:');
                    convo.stop();   
                  }    
        });

}catch(err)
{
console.log('error is' +err);
  }
 }
}

searchUserName=function(userInfo,callback)
{
  var status="False";
  const operation = retry.operation()
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                //If there is an error in retry operation
                if (operation.retry(err)) return
                //otherwise do following
                const usersCollection = db.collection(userCollection);
                var currentHostDocument = usersCollection.findOne({'id':userInfo}).then(function(doc) {                  
                  if(doc)
                    {
                      if(doc.userName!=undefined)
                         {
                           console.log('Found the username and it is '+doc.userName);
                           db.close();
                           callback(doc.userName,doc.name,"Found");
                         }
                         else
                          {
                          console.log('Not found user name');
                          db.close();
                          callback(null,doc.name,"Not Found");
                          }
                        }                  
                    
                });
             });
           });
}
updateUserName=function(userInfo,name,userName,callback)
{
const operation = retry.operation()
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                //If there is an error in retry operation
                if (operation.retry(err)) return
                //otherwise do following
                const usersCollection = db.collection(userCollection);
                var currentHostDocument = usersCollection.findOne({'id':userInfo}).then(function(doc) {
                  if(doc)
                    {
                        usersCollection.update(
                            {_id:doc._id},
                            {$set:{
                                id: userInfo,
                                userName:userName,
                                name:name,
                            }},dbOperationFinished,callback(userName));                        
                    }
                });

                var dbOperationFinished = function(){
  
                    db.close();    
                }
             });
        });
}