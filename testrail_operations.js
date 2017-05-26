var Client = require('node-rest-client').Client;
var url="https://type.testrail.com/index.php?/api/";
var auth="Basic dGFydW4ua3VtYXJAbW9ub3R5cGUuY29tOlRlc3RyYWlsLmNvbUAxMjM=";
var percentage;

var args = {
        headers:
        {
                "Content-Type": "application/json",
                "Authorization":auth.toString()
        }
};


getProjectId = function (name,callback)
{
        var getProjects_url=url + "v2/get_projects";
        try
        {
                client = new Client();
                client.get(getProjects_url, args, function(data, response)
                {       
                        data.forEach(function(element)
                        {
                                //console.log("Element Name - " + element.name);
                                if(element.name.toString().toLowerCase().indexOf(name.toString().toLowerCase()) != -1)
                                {
                                        console.log("Matched Element - " + element.id + ". " + element.name);
                                        callback(element.id);
                                }
                        }, this);
                });
        }
        catch(err)
        {
                console.log("Error = " + err);
        }
}
      
getRunDetails = function (id,callback)
{      
        var runDetails=[];
        var getRuns_url=url + "v2/get_runs/" + id;                
        try
        {
                client = new Client();
                client.get(getRuns_url,args,function(data,response)
                {                        
                        for(var i=0;i<10;i++)
                        {      
                                console.log("Run Name = " + data[i].name);
                                var percentage=(data[i].passed_count*100)/(data[i].passed_count+data[i].failed_count);
                                runDetails.push({
                                        key: data[i].name,
                                        value: percentage
                                });
                        }
                        callback(runDetails);
                });
                
        }
        catch(err)
        {
                console.log(err);
        }
}