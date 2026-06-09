import GameClient from '../jogar/GameClient';

export default function LivrePage() {
  return <GameClient puzzle={{ puzzleNumber: 0, formation: '4-3-3', startingPlayerId: '' }} mode="livre" />;
}
