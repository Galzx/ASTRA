const db = require("./database/database");

db.all("SELECT * FROM knowledge", [], (err, rows) => {
    if (err) {
        console.log(err.message);
    } else {
        console.log(rows);
    }
});