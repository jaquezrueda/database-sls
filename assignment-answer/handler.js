'use strict';

var assignmentRepository = require("../lib/assignmentRepository");

module.exports.handler = function (event, context, cb) {
    console.log(event);
    assignmentRepository.answer(event, function (error, data) {
        if (error) {
            return cb(error, data);
        }
        cb(null, data);
    });
};
