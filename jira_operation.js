var Client = require('node-rest-client').Client;
var async = require('async');
var Q=require('q');
var baseUrl="https://jira.monotype.com/rest/api/2/";
getUrl=function(id)
{
   var jira_url=baseUrl + "issue/" + id; 
   return jira_url;
}
// Provide user credentials, which will be used to log in to JIRA.
var searchArgs = {

        headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic c3NoYXJtYTpHb29nbGVAMTIzNA=="
                 } 
};
getSearchResultFormatted = function(searchResult)
{
        var Info=[];
        Info.push({
                 TaskId: searchResult.key,
                 TaskType: searchResult.fields.issuetype.name,
                 ParentId: searchResult.fields.parent.key,
                 ProjectName:searchResult.fields.project.name,
                 OriginalEstimates: searchResult.timetracking.originalEstimates,
                 RemainingEstimates: searchResult.timetracking.remainingEstimates,
                 Summary: searchResul.fields.summary,
                 Creator:searchResult.fields.creator.displayName,
                 Reporter:searchResult.fields.reporter.displayName,
                 Assignee:searchResult.fields.assignee.displayName,
                 Status:searchResult.fields.status.name
               });
                        console.log(Info);                     				
                        return Id;
}
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
                console.log('search result:', searchResult);
                if(response.statusCode=='200')
                  {
                        var getSearchResultFormatted_Promise=Q.denodeify(getSearchResultFormatted);
                        var result=getSearchResultFormatted(searchResult);                        
                        result.then
                        {                                
                        callback(result);}
                  }
                      else{
                   bot.reply(message,'There is no issue with this taskid, Please recheck it');
                   convo.stop();   
                }    
        });

}catch(err)
{
console.log('error is' +err);
}
 }
}