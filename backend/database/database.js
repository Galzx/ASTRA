const sqlite3 = require("sqlite3").verbose();
const path = require("path");


const db = new sqlite3.Database(
    path.join(__dirname, "astra.db"),
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