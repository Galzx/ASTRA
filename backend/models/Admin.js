const User = require("./User");

class Admin extends User {
  constructor(username, password, full_name) {
    super(username, password, full_name, "admin");
  }

  describeRole() {
    return `${this.full_name} is an administrator`;
  }
}

module.exports = Admin;