const db = require("./database");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keywords TEXT,
      answer TEXT
    )
  `);

  db.run(`DELETE FROM knowledge`);

  db.run(`
    INSERT INTO knowledge (keywords, answer) VALUES
    ('registrar office',
     'The Registrar''s Office is located at the Administration Building.'),

    ('library',
     'The library is available for students during school operating hours.'),

    ('hello hi',
     'Hello! I am ASTRA, your AsiaTech Smart Technology & Resource Assistant.'),

    ('enrollment requirements',
     'Enrollment requirements can be requested from the Registrar''s Office.')
  `);

});

console.log("Database setup complete");