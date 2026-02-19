import { useParams } from 'react-router-dom';
import { ProgressionList, ProgressionDetail } from '../components/progressions';

export function Progressions() {
  const { progressionId } = useParams<{ progressionId: string }>();

  if (progressionId) {
    return (
      <div className="page">
        <ProgressionDetail progressionId={progressionId} />
      </div>
    );
  }

  return (
    <div className="page">
      <ProgressionList />
    </div>
  );
}
