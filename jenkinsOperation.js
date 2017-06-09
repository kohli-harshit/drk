var async = require('async');
var jenkins = require('jenkins')({
        baseUrl: 'http://Bot:123456@noi-qa-jenkins:8080/',
        crumbIssuer: true,
});

var jobURL = "http://noi-qa-jenkins:8080/job/";

//Gets all the projects in Jenkins and there build status by color.
getJenkinsProject = function (name, callback) {
        try {
                var jobName = [];
                jenkins.job.list(function (err, data) {
                        data.forEach(function (element) {
                                if (element.name.toString().toLowerCase().indexOf(name.toString().toLowerCase()) != -1) {
                                        jobName.push(
                                                {
                                                        key: element.name,
                                                        value: element.color
                                                });
                                }
                        }, this);
                        callback(jobName);
                });
        }
        catch (err) {
                console.log('Error =' + err)
        }
}


//Invoke this function to Start Build by passing the exact name of Project(Building with parameter not possible here)
startBuild = function (projectName, callback) {
        var buildNumber = 0;
        var color;
        jenkins.job.get(projectName, function (err, data) {
                if (!err) {
                        buildNumber = data.nextBuildNumber;
                        color = data.color;
                }
                else {
                        console.log(err);
                }
        }), jenkins.job.build(projectName, function (err, data) {
                if (!err) {
                        if (color.toString().lastIndexOf("anime") != -1) {
                                callback("Job Already Running");
                        }
                        else {
                                callback(jobURL + projectName + "/" + buildNumber + "/console");
                        }
                }
                else {
                        callback("Error");
                }
        });
}

//Invoke this function to Stop Build by passing the exact name of Project and build number
stopBuild = function (projectName, callback) {
        var buildNumber = -1;
        var color;
        jenkins.job.get(projectName, function (err, data) {
                if (!err) {
                        color = data.color;
                        if (color.toString().lastIndexOf("anime") != -1) {
                                buildNumber = data.builds[0].number;
                                jenkins.build.stop(projectName, buildNumber, function (err) {
                                        if (!err) {
                                                callback("Stopped");
                                        }
                                        else {
                                                if (buildNumber == -1) {
                                                        callback("Job not running");
                                                }
                                                else {
                                                        callback("Error");
                                                }
                                        }
                                });
                        }

                }
                else {
                        console.log(err);
                }
        });


}


//Invoke this function to get the status of the last build
lastBuildStatus = function (projectName, buildNo, callback) {
        var lastBuildStatus = []
        try {
                if (buildNo == null) {
                        jenkins.job.get(projectName, function (err, data) {
                                jenkins.build.get(projectName, data.lastBuild.number, function (err, data) {
                                        lastBuildStatus.push(
                                                {
                                                        key: data.url,
                                                        value: data.result
                                                });
                                        callback(jobInfo)
                                });
                        });
                }
                else {
                        jenkins.build.get(projectName, buildNo, function (err, data) {
                                jobInfo.push(
                                        {
                                                key: data.url,
                                                value: data.result
                                        });
                                callback(jobInfo)
                        });
                }
        }
        catch (err) {
                console.log('Error =' + err)
        }
}


//Invoke this function to get the lastFailedBuild of a job
lastFailedBuild = function (projectName, callback) {
        var lastFailedBuild = []
        try {
                jenkins.job.get(projectName, function (err, data) {
                        jenkins.build.get(projectName, data.lastFailedBuild.number, function (err, data) {
                                lastFailedBuild.push(
                                        {
                                                key: data.url,
                                                value: data.result
                                        });
                                callback(lastFailedBuild)
                        });
                });

        }
        catch (err) {
                console.log('Error =' + err)
        }
}


//Invoke this function to get the lastSuccessfulBuild of a job
lastSuccessfulBuild = function (projectName, callback) {
        var lastSuccessfulBuild = []
        try {
                jenkins.job.get(projectName, function (err, data) {
                        jenkins.build.get(projectName, data.lastSuccessfulBuild.number, function (err, data) {
                                lastSuccessfulBuild.push(
                                        {
                                                key: data.url,
                                                value: data.result
                                        });
                                callback(lastSuccessfulBuild)
                        });
                });

        }
        catch (err) {
                console.log('Error =' + err)
        }
}