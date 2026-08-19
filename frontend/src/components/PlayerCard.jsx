
function PlayerCard({ player }) {
  return (
    <div className="player-card">
      <p>
        {player.name} - Goals: {player.goals}
      </p>
    </div>
  );
}

export default PlayerCard;