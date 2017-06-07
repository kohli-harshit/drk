var Client = require('node-rest-client').Client;
var async = require('async');
var Q=require('q');
var baseUrl="https://jira.monotype.com/rest/api/2/";
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
                console.log(searchResult);
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