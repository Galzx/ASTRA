const User = require("./User");

class Student extends User {
  constructor(username, password, full_name) {
    super(username, password, full_name, "student");
  }

  describeRole() {
    return `${this.full_name} is a student at ASIATECH`;
  }
}

module.exports = Student;