var fs = require('fs');
var Random = require("random-js");

getGiphy = function(giphyType,callback)
{
    try
    {
        fs.readFile("./" + giphyType + ".txt", function(err, data) 
        {
            var random = new Random(Random.engines.mt19937().autoSeed());
            var array = data.toString().split("\n");
            var value = random.integer(0,array.length-1);
            callback(array[value]);
        });
    }
    catch(err)
    {
        console.log("Error ="+err);
    }
}