const sqlite3 = require("sqlite3").verbose();


const db = new sqlite3.Database(
    "./database/astra.db",
    (err)=>{
        if(err){
            console.log(err.message);
        }
        else{
            console.log("ASTRA Database Connected");
        }
    }
);


module.exports = db;