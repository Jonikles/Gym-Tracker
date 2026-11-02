import { useParams } from 'react-router-dom';
import { RunDetail, RunList } from '../components/running';

export function Running() {
  const { runId } = useParams<{ runId: string }>();
  return <div className="page">{runId ? <RunDetail runId={runId} /> : <RunList />}</div>;
}
