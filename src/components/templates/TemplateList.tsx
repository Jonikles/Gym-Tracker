import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button } from '../common';
import { TemplateCard } from './TemplateCard';
import { useTemplates } from '../../hooks/useTemplates';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import styles from './TemplateList.module.css';

type SortOrder = 'recent' | 'name-asc' | 'name-desc';

export function TemplateList() {
    const navigate = useNavigate();
    useScrollRestore();
    const [searchQuery, setSearchQuery] = usePersistedState('templates.search', '');
    const [sortOrder, setSortOrder] = usePersistedState<SortOrder>('templates.sort', 'recent');

    const templates = useTemplates({
        search: searchQuery,
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
                    autoFocus
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
            <div className={styles.list}>
                {sortedTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                ))}
                {sortedTemplates.length === 0 && (
                    <p className={styles.empty}>
                        {searchQuery
                            ? 'No templates match your search.'
                            : 'No templates yet. Create one to get started!'}
                    </p>
                )}
            </div>
        </div>
    );
}