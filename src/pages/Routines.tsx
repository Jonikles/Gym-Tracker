import { useParams } from 'react-router-dom';
import { RoutineList, RoutineDetail } from '../components/routines';

export function Routines() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="page">
      {id ? <RoutineDetail routineId={id} /> : <RoutineList />}
    </div>
  );
}
