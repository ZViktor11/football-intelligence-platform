const players = require("../data/players");

const getPlayers = (req, res) => {
  res.json(players);
};

const getPlayerById = (req, res) => {
  const playerId = Number(req.params.id);

  const player = players.find((player) => player.id === playerId);

  if (!player) {
    return res.status(404).json({
      message: "Player not found"
    });
  }

  res.json(player);
};

const createPlayer = (req, res) => {
  const newPlayer = req.body;

  if (!newPlayer.name || typeof newPlayer.goals !== "number") {
    return res.status(400).json({
      message: "Invalid player data. Name is required and goals must be a number."
    });
  }

  const playerWithId = {
    id: players.length + 1,
    name: newPlayer.name,
    goals: newPlayer.goals
  };

  players.push(playerWithId);

  res.status(201).json({
    message: "Player added successfully",
    player: playerWithId
  });
};

const updatePlayer = (req, res) => {
  const playerId = Number(req.params.id);
  const updatedPlayer = req.body;

  const playerIndex = players.findIndex((player) => player.id === playerId);

  if (playerIndex === -1) {
    return res.status(404).json({
      message: "Player not found"
    });
  }

  if (!updatedPlayer.name || typeof updatedPlayer.goals !== "number") {
    return res.status(400).json({
      message: "Invalid player data"
    });
  }

  players[playerIndex] = {
    id: playerId,
    name: updatedPlayer.name,
    goals: updatedPlayer.goals
  };

  res.json({
    message: "Player updated successfully",
    player: players[playerIndex]
  });
};

const deletePlayer = (req, res) => {
  const playerId = Number(req.params.id);

  const playerIndex = players.findIndex((player) => player.id === playerId);

  if (playerIndex === -1) {
    return res.status(404).json({
      message: "Player not found"
    });
  }

  players.splice(playerIndex, 1);

  res.json({
    message: "Player deleted successfully"
  });
};

module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
};