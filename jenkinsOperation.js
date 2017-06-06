var jenkins = require('jenkins')({
  baseUrl: 'http://roya:asdDEXTER_07@noi-qa-jenkins:8080/',
  crumbIssuer: true,
});
var jobName=[]

//Gets all the projects in Jenkins and there build status by color.
getProjectName = function (callback)
{
        try
        {
                jenkins.job.list(function(err, data) 
                {
                        data.forEach(function(element) 
                        {
                                jobName.push(
                                {
                                        key: element.name,
                                        value: element.color
                                });   
                        }, this);
                        callback(jobName)
                });
        }
        catch(err)
        {
                console.log('Error ='+err)
        }
}


//Invoke this function to Start Build by passing the exact name of Project(Building with parameter not possible here)
startBuild = function(projectName,callback)
{
        try
        {
                jenkins.job.build(projectName, function(err, data) 
                {
                        callback(data);
                });
        }
        catch(err)
        {
                console.log('Error ='+err)
        }
}

//Invoke this function to Stop Build by passing the exact name of Project and build number
stopBuild = function(projectName,buildNumber,callback)
{
        try
        {
                jenkins.build.stop(projectName,buildNumber, function(err) {
                });
        }
        catch(err)
        {
                console.log('Error ='+err);
        }
}


//Invoke this function to get the status of the last build
lastBuildStatus = function(projectName,callback)
{
        try
        {       
                jenkins.job.get(projectName, function(err, data) 
                {                        
                        jenkins.build.get(projectName, data.lastBuild.number, function(err, data) 
                        {
                        console.log("Pass Percentage:" +data.actions[4].text);
                        console.log("Status:"+data.result);
                        callback(data.result)
                        });
                });
        }
        catch(err)
        {

        }
}