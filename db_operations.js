const os = require('os')
const retry = require('retry')
const mongodb = require('mongodb')
const username = require('username')
const moment = require('moment')

const url = 'mongodb://noi-qa-jenkins:27017/drk-db';
const collection_name='vm-loggedin-details';
const mongoClient = mongodb.MongoClient
const currentTime = new Date()
const currentHost=os.hostname()
const operation = retry.operation()

getFreeMachine= function()
{
    var freeMachine=new Array();
     //Remove all spaces from Machine Name
    const operation = retry.operation()
    username().then(user => {
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                if (operation.retry(err)) return

                const vmDetailsCollection = db.collection(collection_name)
                var machineHostDocument = vmDetailsCollection.findAll({'status':'logout'}).then(function(doc) {
                    if(doc)
                    {  
                        console.log('Machine Found');  
                        freeMachine=machineHostDocument.userName.ToList();
                     }
                    else
                    {
                        console.log('No free virtual machine is found');
                        return 0;
                    }
                },dbOperationFinished);

                    var dbOperationFinished = function(){
                    return freeMachine;
                    db.close();    
                }
            })
        })
    })
}
getMachineInfo = function (machineName) {

    var result='Machine Not Found';
     //Remove all spaces from Machine Name
    machineName=machineName.replace(/\s/g, "") ;
    const operation = retry.operation()
    username().then(user => {
        operation.attempt(function (currentAttempt) {
            mongoClient.connect(url, (err, db) => {
                if (operation.retry(err)) return

                const vmDetailsCollection = db.collection(collection_name)
                var machineHostDocument = vmDetailsCollection.findOne({'hostName':machineName}).then(function(doc) {
                    if(doc)
                    {
                        console.log('Machine Found');
                        if(machineHostDocument.status=='login')
                        {  
                            result='This machine is currently logged in by '+machineHostDocument.userName;
                       
                        }
                        else
                        {
                            result='Hurry no one is currently using this machine, but it last logged in by '+machineHostDocument.userName;

                        }                
                    }
                    else
                    {
                        console.log('No Virtual machine found with this name in my dossier....Please retry with a correct machine');
                        result='No Virtual machine found with this name in my dossier....Please retry with a correct machine' ;
                    }
                },dbOperationFinished);

                    var dbOperationFinished = function(){
                    return result;
                    db.close();    
                }
            })
        })
    })
}
