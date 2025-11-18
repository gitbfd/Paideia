// src/components/AddTextSection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Text = {
  id: string;
  title: string;
  author?: string;
  text_documents: Array<{
    id: string;
    meta?: { filename?: string };
    source_type: string;
  }>;
};

type TextSection = {
  id: string;
  start_line: number;
  end_line: number;
  title?: string;
  order_index: number;
  text_document_id: string;
  text_documents: {
    id: string;
    meta?: { filename?: string };
    text_id: string;
    texts: {
      id: string;
      title: string;
      author?: string;
    };
  };
};

type Props = {
  courseSlug: string;
};

export default function AddTextSection({ courseSlug }: Props) {
  const router = useRouter();
  const [texts, setTexts] = useState<Text[]>([]);
  const [sections, setSections] = useState<TextSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [rangeType, setRangeType] = useState<'entire' | 'range'>('range');
  const [startLine, setStartLine] = useState<string>('');
  const [endLine, setEndLine] = useState<string>('');
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [documentLineCount, setDocumentLineCount] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [initialSectionsSnapshot, setInitialSectionsSnapshot] = useState<TextSection[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sectionsRef = useRef<TextSection[]>(sections);
  const dropHandledRef = useRef(false);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Load available texts and existing sections
  useEffect(() => {
    loadData();
  }, [courseSlug]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Load available texts
      const textsRes = await fetch(`/admin/courses/${courseSlug}/available-texts`);
      const textsData = await textsRes.json();
      if (!textsRes.ok) {
        throw new Error(textsData.error || 'Failed to load texts');
      }
      setTexts(textsData.texts || []);

      // Load existing sections
      const sectionsRes = await fetch(`/admin/courses/${courseSlug}/text-sections`);
      const sectionsData = await sectionsRes.json();
      if (!sectionsRes.ok) {
        throw new Error(sectionsData.error || 'Failed to load sections');
      }
      setSections(sectionsData.sections || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocumentId || !startLine || !endLine) {
      setError('Please fill in all required fields');
      return;
    }

    const start = parseInt(startLine, 10);
    let end: number;

    // Handle "Last" in end line
    if (endLine.toLowerCase() === 'last') {
      if (!documentLineCount) {
        // Fetch line count if not already available
        try {
          const res = await fetch(`/admin/texts/${selectedTextId}/documents/${selectedDocumentId}/preview/api`);
          const data = await res.json();
          if (res.ok && data.lineCount) {
            end = data.lineCount;
            setDocumentLineCount(data.lineCount);
          } else {
            setError('Could not determine line count. Please enter a number.');
            return;
          }
        } catch (err) {
          setError('Could not determine line count. Please enter a number.');
          return;
        }
      } else {
        end = documentLineCount;
      }
    } else {
      end = parseInt(endLine, 10);
      if (isNaN(end)) {
        setError('End line must be a number or "Last"');
        return;
      }
    }

    if (isNaN(start) || start < 1 || end < start) {
      setError('Invalid line range');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/admin/courses/${courseSlug}/text-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_document_id: selectedDocumentId,
          start_line: start,
          end_line: end,
          title: sectionTitle || null,
          order_index: sections.length,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add text section');
      }

      // Reset form and reload data
      setSelectedTextId('');
      setSelectedDocumentId('');
      setRangeType('range');
      setStartLine('');
      setEndLine('');
      setSectionTitle('');
      setDocumentLineCount(null);
      setShowAddForm(false);
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add text section');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sectionId: string) {
    if (!confirm('Are you sure you want to remove this text section from the course?')) {
      return;
    }

    try {
      const res = await fetch(`/admin/courses/${courseSlug}/text-sections/${sectionId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete text section');
      }

      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete text section');
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    setInitialSectionsSnapshot(sections.map(section => ({ ...section })));
    setIsDragging(true);
    dropHandledRef.current = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Use default browser drag image - it's cleaner
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(index);
      return;
    }

    setSections(prevSections => {
      const newSections = [...prevSections];
      const [draggedSection] = newSections.splice(draggedIndex, 1);
      newSections.splice(index, 0, draggedSection);
      sectionsRef.current = newSections;
      return newSections;
    });

    setDraggedIndex(index);
    setDragOverIndex(index);
  }

  function handleDragLeave(e: React.DragEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    dropHandledRef.current = true;

    if (draggedIndex === null) {
      setDraggedIndex(null);
      setIsDragging(false);
      return;
    }

    // Update order_index for all affected sections
    const updates: Promise<void>[] = [];
    const currentSections = sectionsRef.current;

    currentSections.forEach((section, index) => {
      if (section.order_index !== index) {
        updates.push(
          fetch(`/admin/courses/${courseSlug}/text-sections/${section.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: index }),
          }).then(async (res) => {
            const json = await res.json();
            if (!res.ok) {
              throw new Error(json.error || 'Failed to update section order');
            }
          })
        );
      }
    });

    try {
      setDraggedIndex(null);
      setIsDragging(false);
      await Promise.all(updates);
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reorder sections');
      await loadData();
    } finally {
      setDraggedIndex(null);
      setInitialSectionsSnapshot(null);
      setIsDragging(false);
    }
  }

  function handleDragEnd() {
    if (!dropHandledRef.current && initialSectionsSnapshot) {
      const snapshotClone = initialSectionsSnapshot.map(section => ({ ...section }));
      setSections(snapshotClone);
      sectionsRef.current = snapshotClone;
    }
    dropHandledRef.current = false;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setInitialSectionsSnapshot(null);
    setIsDragging(false);
  }

  // Get documents for selected text
  const selectedText = texts.find(t => t.id === selectedTextId);
  const availableDocuments = selectedText?.text_documents || [];

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="border rounded p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sections</h3>
        {!showAddForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Text Section
            </button>
            <button
              onClick={() => {
                // TODO: Handle Add Assessment Module
                console.log('Add Assessment Module clicked');
              }}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Assessment Module
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Text</label>
            <select
              value={selectedTextId}
              onChange={(e) => {
                setSelectedTextId(e.target.value);
                setSelectedDocumentId(''); // Reset document when text changes
              }}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">-- Select a text --</option>
              {texts.map((text) => (
                <option key={text.id} value={text.id}>
                  {text.title} {text.author && `by ${text.author}`}
                </option>
              ))}
            </select>
          </div>

          {selectedTextId && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Document</label>
              <select
                value={selectedDocumentId}
                onChange={async (e) => {
                  setSelectedDocumentId(e.target.value);
                  setDocumentLineCount(null);
                  // Reset form when document changes
                  if (rangeType === 'entire') {
                    setStartLine('1');
                    setEndLine('');
                  } else {
                    setStartLine('');
                    setEndLine('');
                  }
                  // Fetch line count for the selected document
                  if (e.target.value && selectedTextId) {
                    try {
                      const res = await fetch(`/admin/texts/${selectedTextId}/documents/${e.target.value}/preview/api`);
                      const data = await res.json();
                      if (res.ok && data.lineCount) {
                        setDocumentLineCount(data.lineCount);
                        if (rangeType === 'entire') {
                          setEndLine(String(data.lineCount));
                        }
                      }
                    } catch (err) {
                      console.error('Failed to fetch line count:', err);
                    }
                  }
                }}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">-- Select a document --</option>
                {availableDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.meta?.filename || `Document (${doc.source_type})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rangeType"
                  value="entire"
                  checked={rangeType === 'entire'}
                  onChange={(e) => {
                    setRangeType('entire');
                    if (selectedDocumentId && documentLineCount) {
                      setStartLine('1');
                      setEndLine(String(documentLineCount));
                    } else {
                      setStartLine('1');
                      setEndLine('');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>Entire Text</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rangeType"
                  value="range"
                  checked={rangeType === 'range'}
                  onChange={(e) => {
                    setRangeType('range');
                    setStartLine('');
                    setEndLine('');
                  }}
                  className="w-4 h-4"
                />
                <span>Range</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Line</label>
                <input
                  type="number"
                  value={startLine}
                  onChange={(e) => setStartLine(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  disabled={rangeType === 'entire'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Line</label>
                <input
                  type="text"
                  value={endLine}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers or "Last" (case-insensitive, including partial matches as user types)
                    if (value === '' || /^\d+$/.test(value) || /^[lL][aA]?[sS]?[tT]?$/.test(value)) {
                      setEndLine(value);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                  disabled={rangeType === 'entire'}
                  placeholder={rangeType === 'entire' ? '' : 'e.g., 100 or Last'}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section Title (optional)</label>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Chapter 1, Introduction"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Section'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setError(null);
                setSelectedTextId('');
                setSelectedDocumentId('');
                setRangeType('range');
                setStartLine('');
                setEndLine('');
                setSectionTitle('');
                setDocumentLineCount(null);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sections.length > 0 && (
        <div className="border-t pt-4">
          <ul className="space-y-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group border rounded p-3 flex items-center gap-3 transition-all duration-150 ${
                  draggedIndex === index ? 'opacity-30 scale-95' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'border-blue-500 bg-blue-50 border-2 transform scale-[1.02]'
                    : draggedIndex !== null && draggedIndex !== index
                    ? 'hover:bg-gray-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-500 group-hover:text-black transition-colors">
                    {section.title || `${section.text_documents.texts.title} (Lines ${section.start_line}-${section.end_line})`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {section.text_documents.texts.title}
                    {section.text_documents.texts.author && ` by ${section.text_documents.texts.author}`}
                    {' • '}
                    {section.text_documents.meta?.filename || 'Document'}
                    {' • Lines '}
                    {section.start_line}-{section.end_line}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="text-gray-400 px-1 select-none leading-none"
                    style={{ cursor: draggedIndex === index ? 'grabbing' : 'grab', fontSize: '2.3rem' }}
                    aria-hidden="true"
                  >
                    ⇕
                  </div>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="text-sm text-red-600 hover:underline flex-shrink-0"
                  >
                    {section.text_documents ? 'Remove Text' : 'Remove Assessment'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length === 0 && !showAddForm && (
        <div className="text-sm text-gray-500 text-center py-4">
          No text sections added yet. Click "Add Text Section" to include text content in this course.
        </div>
      )}
    </div>
  );
}

