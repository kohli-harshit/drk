var Client = require('node-rest-client').Client;
var url="https://type.testrail.com/index.php?/api/";
var percentage;
client = new Client();

function getProjectId(name)
{       
        var api_url="v2/get_projects";
        var api_url=url+api_url;
        var loginArgs = {
        headers: 
        {
               "Content-Type": "application/json",
               "Authorization":"Basic dGFydW4ua3VtYXJAbW9ub3R5cGUuY29tOlRlc3RyYWlsLmNvbUAxMjM="
        }
};
client.get(api_url, loginArgs, function(data, response)
{
        data.forEach(function(element) 
        {
                if(element.name==name)
                {
                        return element.id;
                }
        }, this);
               });
}
      
function getRunDetails(id)
{       
        var runDetails=[];
        var api_url="v2/get_runs/";
        api_url=url+api_url+id;
        var loginArgs = {
        headers: 
        {
               "Content-Type": "application/json",
               "Authorization":"Basic dGFydW4ua3VtYXJAbW9ub3R5cGUuY29tOlRlc3RyYWlsLmNvbUAxMjM="
        }
        };
        url=url+id;
        client.get(api_url,loginArgs,function(data,reponse)
        {
        for(var i=0;i<10;i++)
        {       
                var percentage=(data[i].passed_count*100)/(data[i].passed_count+data[i].failed_count);
                runDetails.push({
                key: data[i].name,
                value: percentage
                });
        }
        });
        return runDetails;
}