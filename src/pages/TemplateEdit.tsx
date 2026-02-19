import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { TemplateForm } from '../components/templates';
import { useTemplate } from '../hooks/useTemplates';

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = useTemplate(id);

  if (!id) {
    return <Navigate to="/templates" replace />;
  }

  // useLiveQuery returns undefined while loading
  if (template === undefined) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  // Template not found (null after loading)
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
