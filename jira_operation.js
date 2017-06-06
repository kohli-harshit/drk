var Client = require('node-rest-client').Client;
// Provide user credentials, which will be used to log in to JIRA.
var searchArgs = {

        headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic c3NoYXJtYTpHb29nbGVAMTIzNA=="
                 } 
};
var searchUrl="https://jira.monotype.com/rest/api/2/issue/";
getInformationById = function (taskId,callback)
{
client = new Client();
var finalUrlToSearch=searchUrl+"taskId";
client.get(fianlUrlToSeach, Args, function(searchResult, response)
       {
                console.log(response.statusCode);
                callback(searchResult);
                console.log('search result:', searchResult);
                
        });

}