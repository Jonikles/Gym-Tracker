import { useParams } from 'react-router-dom';
import { SessionHistory, SessionDetail, SessionEditor } from '../components/history';

export function History() {
  const { id, action } = useParams<{ id: string; action?: string }>();

  if (id && action === 'edit') {
    return (
      <div className="page">
        <SessionEditor sessionId={id} />
      </div>
    );
  }

  if (id) {
    return (
      <div className="page">
        <SessionDetail sessionId={id} />
      </div>
    );
  }

  return (
    <div className="page">
      <SessionHistory />
    </div>
  );
}
