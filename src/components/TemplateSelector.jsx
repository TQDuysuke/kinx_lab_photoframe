import React from 'react';

export default function TemplateSelector({ templates, selectedTemplate, onSelect }) {
  if (!templates || templates.length === 0) return null;

  return (
    <div className="template-selector">
      <h3 className="template-heading">Select Style</h3>
      <div className="template-options">
        {templates.map((tpl) => (
          <button
            key={tpl.name}
            className={`template-btn ${selectedTemplate?.name === tpl.name ? 'active' : ''}`}
            onClick={() => onSelect(tpl)}
          >
            {tpl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
