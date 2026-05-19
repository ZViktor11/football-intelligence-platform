import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/players")
      .then((response) => response.json())
      .then((data) => {
        setPlayers(data);
      });
  }, []);

  return (
    <div>
      <h1>Football Intelligence Platform</h1>

      <h2>Players</h2>

      {players.map((player, index) => (
        <div key={index}>
          <p>
            {player.name} - Goals: {player.goals}
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;