import React from 'react';
import { SparklesIcon } from './Icons';

const AIBadge: React.FC = () => {
  return (
    <div className="flex items-center gap-1 bg-brand-primary/20 text-brand-secondary text-xs font-bold px-2 py-1 rounded-full">
      <SparklesIcon className="w-3 h-3" />
      <span>AI</span>
    </div>
  );
};

export default AIBadge;