const db = require("./database");
const bcrypt = require("bcrypt");

db.serialize(async () => {

  db.run(`DROP TABLE IF EXISTS knowledge`);

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      title TEXT,
      keywords TEXT,
      content TEXT
    )
  `);

  db.run(`
    INSERT INTO knowledge (category, title, keywords, content) VALUES

    ('General', 'Greeting', 'hello,hi',
     'Hello! I am ASTRA, your AsiaTech Smart Technology & Resource Assistant.'),

    ('Student Services', 'Registrar''s Office', 'registrar,office',
     'The Registrar''s Office is located at the Administration Building.'),

    ('Attendance', 'Attendance Policy', 'attendance,absent,absences',
     'The maximum allowable absences per semester is 20% of total class hours. Arriving late counts as absent after 15 minutes for a 1-hour class, 25 minutes for a 90-minute class, 35 minutes for a 2-hour class, or 45 minutes for a 3-hour class. Three tardies count as one absence.'),

    ('Academics', 'Grading System', 'grading,passing grade',
     'The minimum passing grade for any subject is 75. Grades for Grades 1-10 are the average of all 4 quarterly grades. For Grades 11-12, the final grade is the average of the two quarters in a semester.'),

    ('Admissions', 'Enrollment Requirements', 'enrollment,admission,requirements',
     'New students need: original SF9/Form 138 or Report Card, photocopy of Certificate of Completion, original PSA birth certificate, a long ordinary folder, long brown and plastic envelopes, and 3 pcs each of 1x1 and 2x2 pictures with green background. Submit these to the Registrar''s Office.'),

    ('Admissions', 'Dropping/Withdrawal Policy', 'dropping,withdraw,withdrawal,refund',
     'Registration and reservation fees are not refundable. Dropping within the first week charges 10% of the semester tuition, within 2 weeks charges 20%, and within 3 weeks charges full payment of tuition and fees.'),

    ('Code of Conduct', 'ID Policy', 'id card,identification',
     'Every student is issued an official ID card, which must be validated at the start of every academic year and worn visibly at all times while on campus.'),

    ('Code of Conduct', 'Dress Code', 'uniform,dress code,haircut',
     'Students must wear the official ID and prescribed school uniform (or PE uniform during PE). Proper haircuts are required with no loud hair dye or outlandish hairstyles. Earrings are prohibited for boys, and more than one pair is prohibited for girls.'),

    ('Code of Discipline', 'Offenses and Penalties', 'discipline,offense,violation',
     'Minor offenses (like tardiness or improper uniform) are penalized with a written warning, then escalating suspensions. Major offenses (like cheating, bullying, or possession of prohibited items) carry penalties from a 3-day suspension up to dismissal, depending on severity and repetition.'),

    ('Scholarships', 'SHS Voucher Program', 'voucher,scholarship',
     'Grade 10 completers from public schools are automatically qualified for the Senior High School Voucher Program. Others may need to apply online. The voucher value ranges from 14,000 to 17,500 pesos depending on eligibility category.'),

    ('Student Services', 'Library', 'library',
     'The ASIATECH library is open to students during school operating hours and provides resources for education, research, and reading requirements.'),

    ('General', 'Contact Information', 'address,location,contact,email',
     'ASIATECH is located at 1506, Brgy. Dila, City of Santa Rosa, Laguna. You can reach the Office of Student Affairs at osa@asiatech.edu.ph.')
  `);

  db.run(`DROP TABLE IF EXISTS users`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      full_name TEXT,
      role TEXT
    )
  `);

  db.run(`DROP TABLE IF EXISTS schedules`);

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      subject TEXT,
      day TEXT,
      time TEXT,
      room TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

});

console.log("Database setup complete");