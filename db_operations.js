const os = require('os')
const retry = require('retry')
const mongodb = require('mongodb')
const username = require('username')
const moment = require('moment')
var Q=require('q')

const url = 'mongodb://noi-qa-jenkins:27017/drk-db';
const collection_name='vm-loggedin-details';
const mongoClient = mongodb.MongoClient
const currentTime = new Date()
const currentHost=os.hostname()
const operation = retry.operation()
function getMachineStatus(document)
{
                 if(document)
                    {
                        console.log('Machine Found');
                         if(document.status=="login")
                           {  
                            console.log('Machine in use...');
                            result='This machine is currently logged in by '+document.userName;
                           }
                         else
                           {
                            console.log('Machine is not in use');
                            result='Hurry no one is currently using this machine, but it was last logged in by '+document.userName+'at'+document.updated_on;
                           }                
                    }
                    else
                    {
                        console.log('No Virtual machine found with this name in my dossier....Please retry with a correct machine');
                        result='No Virtual machine found with this name in my dossier....Please retry with a correct machine' ;
                    }
return result;
}

getFreeMachine= function(callback)
{
    var freeMachine=new Array();
     //Remove all spaces from Machine Name
    const operation = retry.operation()
    username().then(user => {
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                //If there is an error in retry operation
                if (operation.retry(err)) return
                //otherwise do following
                const vmDetailsCollection = db.collection(collection_name);
                 var cursorTomachineHostDocument = vmDetailsCollection.find({'status':'logout'});
                 cursorTomachineHostDocument.each(function(err,item)
                 { 
                     if(item !=null)
                     { freeMachine.push(item.hostName);
                     }
                     else
                     {
                         console.log('Reaching at end...... closing connection');
                         db.close();
                         callback(freeMachine);  
 
                     }
                 });

                })
            })
        
    })
}
                
getMachineInfo = function (machineName,callback)
{
   
    var result='Machine Not Found';
     //Remove all spaces from Machine Name
    machineName=machineName.replace(/\s/g, "") ;
    const operation = retry.operation()
    username().then(user => {
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                //If there is an error in retry operation
                if (operation.retry(err)) return
                //otherwise do following
                const vmDetailsCollection = db.collection(collection_name)
                var machineHostDocument = vmDetailsCollection.findOne({'hostName':machineName}).then(function(doc) {
                        var machineStatus_Promise=Q.denodeify(getMachineStatus);
                        var promiseGetMachineStatus=getMachineStatus(doc);
                        result=promiseGetMachineStatus.toString();
                        promiseGetMachineStatus.then
                        {
                        console.log('completing db operations ');
                        db.close();
                        callback(result);  
                        }
                   });

                })
            })
        
    })
}


