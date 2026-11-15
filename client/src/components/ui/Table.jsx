import { cn } from '../../utils/cn.js';

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="border-b border-ink-200 text-xs text-ink-500">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function Tr({ children, className }) {
  return <tr className={className}>{children}</tr>;
}

export function Th({ children, align = 'left', className }) {
  return (
    <th
      scope="col"
      className={cn('whitespace-nowrap px-4 py-3 font-medium', align === 'right' && 'text-right', className)}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', className }) {
  return <td className={cn('px-4 py-3 text-ink-800', align === 'right' && 'text-right tabular-nums', className)}>{children}</td>;
}
