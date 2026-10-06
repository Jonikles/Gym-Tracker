import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { TemplateForm } from '../components/templates';
import { SkeletonList } from '../components/common';
import { db } from '../db';

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // undefined = loading, null = not found
  const template = useLiveQuery(
    async () => (id ? (await db.templates.get(id)) ?? null : null),
    [id]
  );

  if (!id) {
    return <Navigate to="/templates" replace />;
  }

  if (template === undefined) {
    return (
      <div className="page">
        <SkeletonList count={4} lines={2} />
      </div>
    );
  }

  if (template === null) {
    return <Navigate to="/templates" replace />;
  }

  return (
    <div className="page">
      <TemplateForm
        template={template}
        onSave={() => navigate(`/templates/${id}`)}
      />
    </div>
  );
}
