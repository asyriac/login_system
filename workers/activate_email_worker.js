// Queue to send activate email
const queue = require("../config/kue");
const sendEmail = require("../config/sendEmail");

queue.process("activate-email", function (job, done) {
  sendEmail(job.data);
  done();
});
