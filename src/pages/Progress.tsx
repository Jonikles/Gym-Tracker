import { useParams } from 'react-router-dom';
import { ProgressList, ExerciseProgress } from '../components/progress';

export function Progress() {
  const { exerciseId } = useParams<{ exerciseId: string }>();

  if (exerciseId) {
    return (
      <div className="page">
        <ExerciseProgress exerciseId={exerciseId} />
      </div>
    );
  }

  return (
    <div className="page">
      <ProgressList />
    </div>
  );
}
