import Chatbot from "./components/Chatbot";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  return (
    <div>

      <Header />

      <div className="app-container">

        <Sidebar />

        <main>

          <h2>Welcome to ASTRA Lite</h2>

          <p>
            Your intelligent student assistant for AsiaTech.
          </p>

          <h3>Latest Announcements</h3>

          <p>
            No announcements yet.
          </p>

          <Chatbot />

        </main>

      </div>

    </div>
  );
}

export default App;