import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { SessionHistory, SessionDetail, SessionEditor, SessionCompare } from '../components/history';

export function History() {
  const { id, action } = useParams<{ id: string; action?: string }>();
  const [searchParams] = useSearchParams();

  // Compare mode: /history/compare?a=ID1&b=ID2
  if (id === 'compare') {
    const a = searchParams.get('a');
    const b = searchParams.get('b');
    if (a && b) {
      return (
        <div className="page">
          <SessionCompare sessionIdA={a} sessionIdB={b} />
        </div>
      );
    }
    // Missing a/b params — never fall through to SessionDetail("compare")
    return <Navigate to="/history" replace />;
  }

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
