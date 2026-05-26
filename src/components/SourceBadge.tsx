interface Props {
  id: number;
  title: string;
  layer: 'company' | 'department' | 'personal';
}

const styles = {
  company:    'bg-purple-50 text-purple-700 border-purple-100',
  department: 'bg-brand-50 text-brand-600 border-brand-100',
  personal:   'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const labels = { company: '⬛ Company', department: '🔹 Dept', personal: '🔸 Mine' };

export default function SourceBadge({ id, title, layer }: Props) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border font-medium cursor-help ${styles[layer]}`}
    >
      {labels[layer]} #{id}
    </span>
  );
}
