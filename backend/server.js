const express = require("express");
const cors = require("cors");
const searchAnswer = require("./data/knowledge");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req,res)=>{
    res.send("ASTRA Backend Running");
});


app.post("/chat",(req,res)=>{

    const question = req.body.question;

    const answer = searchAnswer(question);

    res.json({
        answer: answer
    });

});


app.listen(5000,()=>{
    console.log("ASTRA Server running on port 5000");
});