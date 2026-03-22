import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Smart Attendance System</h1>
      <button onClick={() => alert("Marked Present!")}>
        Mark Attendance
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
