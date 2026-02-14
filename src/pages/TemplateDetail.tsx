import { useParams, Navigate } from 'react-router-dom';
import { TemplateDetail as TemplateDetailComponent } from '../components/templates';
import { TemplateForm } from '../components/templates';

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (id === 'new') {
    return (
      <div className="page">
        <TemplateForm />
      </div>
    );
  }

  if (!id) {
    return <Navigate to="/templates" replace />;
  }

  return (
    <div className="page">
      <TemplateDetailComponent templateId={id} />
    </div>
  );
}
