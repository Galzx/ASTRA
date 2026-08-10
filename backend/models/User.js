const db = require("../database/database");
const bcrypt = require("bcrypt");

class User {
  constructor(username, password, full_name, role) {
    this.username = username;
    this.password = password;
    this.full_name = full_name;
    this.role = role;
  }

  async save() {
    const self = this;
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(this.password, 10);
      db.run(
        `INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)`,
        [this.username, hashedPassword, this.full_name, this.role],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, username: self.username, role: self.role });
        }
      );
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  describeRole() {
    return `${this.full_name} is a ${this.role}`;
  }
}

module.exports = User;