const express = require("express");
const cors = require("cors");

const playerRoutes = require("./routes/playerRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Football Intelligence API running" });
});

app.use("/players", playerRoutes);

app.get("/matches", (req, res) => {
  res.json([
    { homeTeam: "Barcelona", awayTeam: "Real Madrid", score: "3-2" },
    { homeTeam: "Inter Miami", awayTeam: "LA Galaxy", score: "2-1" }
  ]);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});