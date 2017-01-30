/**
 * Created by jesusjaquezrueda on 1/16/17.
 */
var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1"
});
var docClient = new AWS.DynamoDB.DocumentClient();
var s3 = new AWS.S3();
var uuid = require("uuid");
var NodeRSA = require('node-rsa');
require("string_format");

var template = {
    "assignment_id": 0,
    "user": "xsdfg",
    "email": "jesus.jaquez@cetys.mx",
    "questions": [
        {
            "question_index": 0,
            "question_text": "",
            "answer": ""
        }
    ],
    "team_work": ""
};

var users = {
    "018416": true,
    "020159": true,
    "022546": true,
    "022786": true,
    "023408": true,
    "023584": true,
    "023684": true,
    "023858": true,
    "023863": true,
    "023871": true,
    "023913": true,
    "024020": true,
    "024040": true,
    "023373": true,
    "023570": true
};

module.exports.answer = function (event, callback) {
    var response = validateEvent(event);

    if (isValidUser(event.user)) {

        if (response.errors.length == 0) {
            delete response.errors;
            saveToDynamo(event, function (error, data) {
                if (error) {
                    return callback(error)
                }
                console.log(data);
                saveToS3(event, function (error, data) {
                    if (error) {
                        return callback(error)
                    }
                    console.log(data);
                    return callback(null, {"status": "succeed", "message": "Assignment saved successfully"})
                })
            })


        }
        else {
            return callback("400", response);
        }
    }
    else {
        return callback("403", '{ "errors": [ "Not a valid user. Check your key." ] }')
    }
};


function validateEvent(event) {
    var response = {
        "errors": []
    };

    try {
        for (var property in template) {
            if (!event[property]) {
                response.errors.push("The provided JSON does not contain the property " + property)
            }
        }

        for (var index = 0; index < event.questions.length; index++) {
            for (property in template.questions[0]) {
                if (!event.questions[index][property]) {
                    response.errors.push("The provided JSON does not contain the property " + property + " in one of the provided questions.")
                }
            }
        }
    }
    catch (exception) {
        response.errors.push("The provided JSON is not valid. Error: " + exception)
    }
    console.log(response);
    return response;
}

function saveToDynamo(event, callback) {
    var params = {
        TableName: "CC409_Assignments",
        Item: {
            "Id": uuid.v1(),
            "User": decryptUser(event.user),
            "Email": event.email,
            "Assignment": event.assignment_id,
            "Timestamp": Date.now(),
            "S3Url": "https://s3.amazonaws.com/cetys-cc409/{0}/{1}-{2}.json".format(event.assignment_id, decryptUser(event.user), event.email)
        }
    };

    docClient.put(params, function (error, data) {
        if (error) {
            console.log("Error while trying to insert to dynamo");
            console.log(error);
            return callback(error);
        } else {
            console.log(data);
            console.log("Success writing to dynamo");
            callback(null, 1);
        }
    });
}

function decryptUser(encryptedUser) {
    return encryptedUser;
    //var key = new NodeRSA({b: 512});
    //return key.decrypt(encryptedUser, 'utf8');
}

function isValidUser(encryptedUser) {
    var decrypted = decryptUser(encryptedUser);
    return users[decrypted];
}

function saveToS3(event, callback) {
    var params = {
        Bucket: "cetys-cc409",
        Key: "{0}/{1}-{2}.json".format(event.assignment_id, decryptUser(event.user), event.email),
        Body: JSON.stringify(event)
    };
    console.log(params);

    s3.upload(params, function (error, data) {
        if (error) {
            callback(error);
        }
        else {
            callback(null, data);
        }
    });
}


module.exports.getFromS3 = function (bucket, key, callback) {
    var params = {
        Bucket: bucket,
        Key: key
    };
    s3.getObject(params, function (error, data) {
        if (error) {
            callback(error);
        }
        callback(null, JSON.parse(data.Body));
    })
};

module.exports.listBucketObjects = function (bucket, callback) {

    var params = {
        Bucket: bucket
    }
    console.log(bucket);

    s3.listObjectsV2(params, function (error, data) {

        if (error) {
            callback(error);
        }
        else {
            var filenames = data.Contents.map(function (object) {
                return object.Key;
            })

            callback(null, filenames);
        }
    });
}