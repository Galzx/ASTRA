import { useState } from "react";

function Chatbot() {

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);


  async function sendMessage() {


    if (message.trim() === "") return;


    const userMessage = {
      sender: "Student",
      text: message
    };


    setChat([...chat, userMessage]);


const response = await fetch(
  "http://localhost:5000/chat",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: message
    })
  }
);


const data = await response.json();


const botMessage = {
  sender: "ASTRA",
  text: data.answer
};


setChat(prev => [...prev, botMessage]);

setMessage("");
  }


  return (
    <div className="chatbox">

      <h2>🤖 Ask ASTRA</h2>

      <div className="chat-window">

        {chat.map((item, index) => (

          <div
            key={index}
            className={
              item.sender === "Student"
              ? "student-message"
              : "astra-message"
            }
          >

            <strong>{item.sender}</strong>

            <p>{item.text}</p>

          </div>

        ))}

      </div>


      <div className="chat-input">

        <input
          type="text"
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
          placeholder="Ask ASTRA..."
        />


        <button onClick={sendMessage}>
          Send
        </button>

      </div>

    </div>
  );
}


export default Chatbot;