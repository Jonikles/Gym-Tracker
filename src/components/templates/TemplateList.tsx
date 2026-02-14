import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button } from '../common';
import { TemplateCard } from './TemplateCard';
import { useTemplates } from '../../hooks/useTemplates';
import styles from './TemplateList.module.css';

type SortOrder = 'recent' | 'name-asc' | 'name-desc';

export function TemplateList() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [sortOrder, setSortOrder] = useState<SortOrder>('recent');

    const templates = useTemplates({
        search: searchQuery,
        includeArchived: showArchived,
    }) ?? [];

    const sortedTemplates = useMemo(() => {
        const list = [...templates];
        switch (sortOrder) {
            case 'name-asc':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                list.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'recent':
            default:
                list.sort((a, b) => b.updatedAt - a.updatedAt);
                break;
        }
        return list;
    }, [templates, sortOrder]);

    const activeTemplates = sortedTemplates.filter((t) => !t.isArchived);
    const archivedTemplates = sortedTemplates.filter((t) => t.isArchived);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Templates</h1>
                <Button onClick={() => navigate('/templates/new')}>
                    New Template
                </Button>
            </header>

            <div className={styles.filters}>
                <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    options={[
                        { value: 'recent', label: 'Recent' },
                        { value: 'name-asc', label: 'A → Z' },
                        { value: 'name-desc', label: 'Z → A' },
                    ]}
                />
            </div>
            <div className={styles.toggleRow}>
                <label className={styles.toggle}>
                    <input className={styles.toggleInput}
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    <span>Show archived</span>
                </label>
            </div>

            <div className={styles.list}>
                {activeTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                ))}
                {activeTemplates.length === 0 && !showArchived && (
                    <p className={styles.empty}>
                        {searchQuery
                            ? 'No templates match your search.'
                            : 'No templates yet. Create one to get started!'}
                    </p>
                )}
            </div>

            {showArchived && archivedTemplates.length > 0 && (
                <>
                    <h2 className={styles.sectionTitle}>Archived</h2>
                    <div className={styles.list}>
                        {archivedTemplates.map((template) => (
                            <TemplateCard key={template.id} template={template} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}