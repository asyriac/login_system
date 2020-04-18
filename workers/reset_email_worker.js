// Queue to send reset email
const queue = require("../config/kue");
const sendEmail = require("../config/sendEmail");

queue.process("reset-email", function (job, done) {
  sendEmail(job.data);
  done();
});
