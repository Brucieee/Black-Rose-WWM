
import React from 'react';

interface RichTextProps {
  text: string;
  className?: string;
  onMentionClick?: (name: string) => void;
}

export const RichText: React.FC<RichTextProps> = ({ text, className = "", onMentionClick }) => {
  if (!text) return null;

  // Split text by spaces to find tags starting with @
  // We use a capture group to keep the delimiter/tag in the array
  // Regex: matches @ followed by word characters, allowing for underscores or simple names
  // To handle names with spaces like @Shadow Blade, it's tricker without a specific format.
  // We will assume standard single-word or underscore tags, or handle specific known tags.
  // For simplicity in this regex, we look for @ + non-whitespace characters.
  const parts = text.split(/(@[\w-]+)/g);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const tagContent = part.substring(1); // Remove @
          const lowerTag = part.toLowerCase();
          
          let tagStyle = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:underline";
          
          if (lowerTag === '@admin') tagStyle = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 cursor-default";
          else if (lowerTag === '@officer') tagStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 cursor-default";
          else if (lowerTag === '@everyone') tagStyle = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 cursor-default";
          
          const isSystemTag = ['@admin', '@officer', '@everyone'].includes(lowerTag);

          return (
            <span 
              key={index} 
              onClick={(e) => {
                if (!isSystemTag && onMentionClick) {
                  e.stopPropagation();
                  onMentionClick(tagContent);
                }
              }}
              className={`inline-block px-1.5 py-0.5 mx-0.5 rounded text-xs font-bold ${tagStyle}`}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};
