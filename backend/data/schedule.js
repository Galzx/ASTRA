const db = require("../database/database");

function saveSchedule(userId, entries) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM schedules WHERE user_id = ?", [userId], (err) => {
        if (err) { reject(err); return; }
        if (!entries || entries.length === 0) { resolve([]); return; }

        const stmt = db.prepare(
          "INSERT INTO schedules (user_id, subject, day, time, room) VALUES (?, ?, ?, ?, ?)"
        );

        entries.forEach((entry) => {
          stmt.run([userId, entry.subject || "", entry.day || "", entry.time || "", entry.room || ""]);
        });

        stmt.finalize((err) => {
          if (err) { reject(err); return; }
          resolve(entries);
        });
      });
    });
  });
}

function getScheduleByUser(userId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM schedules WHERE user_id = ?", [userId], (err, rows) => {
      if (err) { reject(err); return; }
      resolve(rows);
    });
  });
}

function moveClassesByIds(userId, ids, toDay, toTime) {
  return new Promise((resolve, reject) => {
    if (!ids || ids.length === 0) { resolve({ movedCount: 0 }); return; }

    const placeholders = ids.map(() => "?").join(",");
    let query, params;

    if (toTime) {
      query = `UPDATE schedules SET day = ?, time = ? WHERE user_id = ? AND id IN (${placeholders})`;
      params = [toDay, toTime, userId, ...ids];
    } else {
      query = `UPDATE schedules SET day = ? WHERE user_id = ? AND id IN (${placeholders})`;
      params = [toDay, userId, ...ids];
    }

    db.run(query, params, function (err) {
      if (err) { reject(err); return; }
      resolve({ movedCount: this.changes });
    });
  });
}

function clearSchedule(userId) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM schedules WHERE user_id = ?", [userId], function (err) {
      if (err) { reject(err); return; }
      resolve({ deleted: this.changes });
    });
  });
}

function updateScheduleEntry(userId, id, subject, day, time, room) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE schedules SET subject = ?, day = ?, time = ?, room = ? WHERE id = ? AND user_id = ?",
      [subject, day, time, room, id, userId],
      function (err) {
        if (err) { reject(err); return; }
        resolve({ updated: this.changes });
      }
    );
  });
}

function deleteScheduleEntry(userId, id) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM schedules WHERE id = ? AND user_id = ?",
      [id, userId],
      function (err) {
        if (err) { reject(err); return; }
        resolve({ deleted: this.changes });
      }
    );
  });
}

module.exports = {
  saveSchedule,
  getScheduleByUser,
  moveClassesByIds,
  clearSchedule,
  updateScheduleEntry,
  deleteScheduleEntry
};