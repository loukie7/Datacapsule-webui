const typeStyles = {
    title: { label: 'H 标题', classes: 'bg-blue-100 text-blue-700' },
    text: { label: '段落', classes: 'bg-orange-100 text-orange-700' },
    table: { label: '表格', classes: 'bg-green-100 text-green-700' },
    image: { label: '图片', classes: 'bg-yellow-100 text-yellow-700' },
    equation: { label: '公式', classes: 'bg-teal-100 text-teal-700' },
    catalog: { label: '目录', classes: 'bg-purple-100 text-purple-700' },
    reference: { label: '引用', classes: 'bg-pink-100 text-pink-700' },
    stamp: { label: '印章', classes: 'bg-gray-200 text-gray-700' },
    page: { label: '页码', classes: 'bg-gray-100 text-gray-500' },
    handwriting: { label: '手写体', classes: 'bg-pink-100 text-pink-700' },
    header_footer: { label: '页眉页脚', classes: 'bg-indigo-100 text-indigo-700' },
    default: { label: '未知', classes: 'bg-gray-100 text-gray-700' },
};

export default function TypeTag({ type }) {
    const style = typeStyles[type] || typeStyles.default;
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.classes}`}>
            {style.label}
        </span>
    );
} 