
// src/components/ui/code-block.tsx
import * as React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  return (
    <pre
      className={`bg-muted p-3 rounded-md text-xs overflow-x-auto ${className || ''}`}
    >
      <code className={language ? `language-${language}` : ''}>{code}</code>
    </pre>
  );
}

export default CodeBlock;
